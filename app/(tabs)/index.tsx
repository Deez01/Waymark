// app/(tabs)/index.tsx
import { api } from "@/convex/_generated/api";
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from "convex/react";
import * as Localization from 'expo-localization';
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Image, Keyboard, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useWindowDimensions, View } from "react-native";
import MapView, { LongPressEvent, Marker } from "react-native-maps";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddPinSheet from "@/components/AddPinSheet";
import ViewEditPinSheet from "@/components/ViewEditPinSheet";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { CURATED_LANDMARKS } from "@/lib/landmarks";

// Helper function to calculate real-world distance between two coordinates in km
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Renders an individual custom marker on the map.
function PinMarker({ pin, theme, isSelected, onPinPress }: { pin: any, theme: any, isSelected: boolean, onPinPress: any }) {
  const { width } = useWindowDimensions();

  const imageId = pin.thumbnail ? pin.thumbnail : (pin.pictures && pin.pictures.length > 0 ? pin.pictures[0] : null);
  const fetchedImageUrl = useQuery(api.pins.getImageUrl, imageId ? { storageId: imageId } : "skip");

  const PIN_SIZE = 36;
  const BORDER_THICKNESS = 4;
  const IMAGE_SIZE = PIN_SIZE - (BORDER_THICKNESS * 1);

  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    setTracksViewChanges(true); // Temporarily wake up the marker to redraw
    const timer = setTimeout(() => setTracksViewChanges(false), 500);
    return () => clearTimeout(timer);
  }, [imageId, fetchedImageUrl, isSelected]);

  // Black if selected, Adwaita Blue (#62a0ea) if not
  const frameColor = isSelected ? '#000000' : '#62a0ea';

  return (
    <Marker
      key={pin._id}
      coordinate={{ latitude: pin.markerLat ?? pin.lat, longitude: pin.markerLng ?? pin.lng }}
      tracksViewChanges={tracksViewChanges}
      onPress={onPinPress}
      style={{ zIndex: isSelected ? 999 : 1 }}
    >
      <View style={{
        width: PIN_SIZE,
        height: PIN_SIZE + 10,
        alignItems: 'center'
      }}>
        <View style={{
          width: PIN_SIZE,
          height: PIN_SIZE,
          backgroundColor: frameColor,
          borderRadius: 8,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 6,
          shadowColor: '#000',
          shadowOpacity: 0.35,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 3 },
        }}>
          <View style={{
            width: IMAGE_SIZE,
            height: IMAGE_SIZE,
            borderRadius: 6,
            overflow: 'hidden',
            backgroundColor: theme.background,
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {fetchedImageUrl ? (
              <Image
                source={{ uri: fetchedImageUrl }}
                resizeMode="cover"
                style={{
                  width: IMAGE_SIZE,
                  height: IMAGE_SIZE,
                }}
                onLoad={() => {
                  setTimeout(() => setTracksViewChanges(false), 500);
                }}
                onError={(e) => {
                  console.log("Marker image failed to download:", e.nativeEvent.error);
                  setTracksViewChanges(false);
                }}
              />
            ) : (
              <Text style={{
                color: theme.text,
                fontSize: IMAGE_SIZE * 0.4,
                fontWeight: 'bold',
              }}>
                {pin.title ? pin.title.charAt(0).toUpperCase() : '?'}
              </Text>
            )}
          </View>
        </View>
      </View>
    </Marker>
  );
}

// Main map screen component.
export default function MapScreen() {
  const pins = useQuery(api.pins.getAllPins);
  const allTags = useQuery(api.pinTags.getAllTags);
  const allPinTagsWithDetails = useQuery(api.pinTags.getAllPinTagsWithDetails);
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);
  const addTagToPin = useMutation(api.pinTags.addTagToPin);
  const removeTagFromPin = useMutation(api.pinTags.removeTagFromPin);
  const createTag = useMutation(api.pinTags.createTag);
  const deletePin = useMutation(api.pins.deletePin);

  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const adwaitaBlue = '#62a0ea';

  const getLatitudeOffset = (zoomDelta: number) => zoomDelta * 0.25;

  const [currentRegion, setCurrentRegion] = useState({
    latitude: 33.783,
    longitude: -118.114,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05
  });

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [addPinTrigger, setAddPinTrigger] = useState(0);

  const [selectedLat, setSelectedLat] = useState<number | undefined>();
  const [selectedLng, setSelectedLng] = useState<number | undefined>();
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>();
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>();

  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [selectedPinsAtLocation, setSelectedPinsAtLocation] = useState<any[]>([]);
  const [nearbyAnchorPin, setNearbyAnchorPin] = useState<any>(null);
  const [viewPinTrigger, setViewPinTrigger] = useState(0);

  const [minimizeTrigger, setMinimizeTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPinIds, setSelectedPinIds] = useState<string[]>([]);
  const [isBulkTagModalOpen, setIsBulkTagModalOpen] = useState(false);
  const [isBulkActionPending, setIsBulkActionPending] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");

  const focusPinOnMap = (pin: any) => {
    const targetZoom = 0.01;

    mapRef.current?.animateToRegion({
      latitude: pin.lat - getLatitudeOffset(targetZoom),
      longitude: pin.lng,
      latitudeDelta: targetZoom,
      longitudeDelta: targetZoom,
    }, 500);
  };

  const enterMultiSelectMode = () => {
    setIsMultiSelectMode(true);
    setSelectedPinIds([]);
    setIsSheetOpen(false);
    setIsViewSheetOpen(false);
    setSelectedPin(null);
    setNearbyAnchorPin(null);
  };

  const exitMultiSelectMode = () => {
    setIsMultiSelectMode(false);
    setSelectedPinIds([]);
    setIsBulkTagModalOpen(false);
  };

  const togglePinSelection = (pin: any) => {
    const pinId = String(pin._id);
    setSelectedPinIds((prev) =>
      prev.includes(pinId)
        ? prev.filter((id) => id !== pinId)
        : [...prev, pinId]
    );
  };

  const selectedPinsCount = selectedPinIds.length;

  const selectedPinsForCarousel = useMemo(() => {
    if (!pins?.length || !selectedPinIds.length) return [];

    const pinsById = new Map(pins.map((pin: any) => [String(pin._id), pin]));
    return selectedPinIds
      .map((pinId) => pinsById.get(pinId))
      .filter(Boolean);
  }, [pins, selectedPinIds]);

  const selectedPinsById = useMemo(() => {
    return new Map(selectedPinsForCarousel.map((pin: any) => [String(pin._id), pin]));
  }, [selectedPinsForCarousel]);

  const selectedPinIdSet = useMemo(() => new Set(selectedPinIds), [selectedPinIds]);

  const selectedTagCoverage = useMemo(() => {
    const coverage = new Map<string, Set<string>>();
    if (!allPinTagsWithDetails?.length || !selectedPinIds.length) return coverage;

    for (const row of allPinTagsWithDetails) {
      const pinId = String(row.pinId);
      if (!selectedPinIdSet.has(pinId)) continue;

      const tagId = String(row.tagId);
      if (!coverage.has(tagId)) coverage.set(tagId, new Set<string>());
      coverage.get(tagId)!.add(pinId);
    }

    return coverage;
  }, [allPinTagsWithDetails, selectedPinIdSet, selectedPinIds.length]);

  const selectedTagLinkCount = useMemo(() => {
    let total = 0;
    for (const coveredPinIds of selectedTagCoverage.values()) {
      total += coveredPinIds.size;
    }
    return total;
  }, [selectedTagCoverage]);

  const tagsByCategory = useMemo(() => {
    if (!allTags?.length) return {} as Record<string, any[]>;

    return allTags.reduce((acc: Record<string, any[]>, tag: any) => {
      const category = tag.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(tag);
      return acc;
    }, {});
  }, [allTags]);

  const toggleBulkTagSelection = async (tag: any) => {
    if (!selectedPinIds.length) return;

    const tagId = String(tag._id);
    const coveredPinIds = selectedTagCoverage.get(tagId) || new Set<string>();
    const coveredCount = selectedTagCoverage.get(tagId)?.size || 0;
    const isAppliedToAll = coveredCount === selectedPinIds.length;

    setIsBulkActionPending(true);

    for (const pinId of selectedPinIds) {
      try {
        if (isAppliedToAll) {
          await removeTagFromPin({ pinId: pinId as any, tagId: tag._id });
        } else if (!coveredPinIds.has(pinId)) {
          await addTagToPin({ pinId: pinId as any, tagId: tag._id });
        }
      } catch {
        // Continue to remaining pins if one operation fails.
      }
    }

    setIsBulkActionPending(false);
  };

  const handleCreateBulkTag = async () => {
    if (!newTagName.trim() || !selectedPinIds.length) return;

    setIsBulkActionPending(true);
    try {
      const tagId = await createTag({ name: newTagName.trim(), color: selectedColor });
      const existingCoverage = selectedTagCoverage.get(String(tagId)) || new Set<string>();

      for (const pinId of selectedPinIds) {
        if (existingCoverage.has(pinId)) {
          continue;
        }

        try {
          await addTagToPin({ pinId: pinId as any, tagId: tagId as any });
        } catch {
          // Continue to remaining pins if one operation fails.
        }
      }
      setNewTagName("");
      setSelectedColor("#3b82f6");
    } finally {
      setIsBulkActionPending(false);
    }
  };

  const confirmClearBulkTags = () => {
    if (!selectedPinIds.length || !selectedTagLinkCount || isBulkActionPending) return;

    const linksToRemove: Array<{ pinId: string; tagId: string }> = [];
    for (const [tagId, coveredPinIds] of selectedTagCoverage.entries()) {
      for (const pinId of coveredPinIds) {
        linksToRemove.push({ pinId, tagId });
      }
    }

    if (!linksToRemove.length) return;

    Alert.alert(
      "Clear Tags",
      `Remove all tags from ${selectedPinIds.length} selected pins?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Tags",
          style: "destructive",
          onPress: async () => {
            setIsBulkActionPending(true);
            let removedCount = 0;

            for (const link of linksToRemove) {
              try {
                await removeTagFromPin({ pinId: link.pinId as any, tagId: link.tagId as any });
                removedCount += 1;
              } catch {
                // Continue clearing other links if one operation fails.
              }
            }

            setIsBulkActionPending(false);
            Alert.alert("Clear Tags Complete", `${removedCount} tag links removed.`);
          },
        },
      ]
    );
  };

  const confirmDeleteSelectedPins = () => {
    if (!selectedPinIds.length) return;

    Alert.alert(
      "Delete Selected Pins",
      `Delete ${selectedPinIds.length} selected pins? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            setIsBulkActionPending(true);
            let deletedCount = 0;

            for (const pinId of selectedPinIds) {
              try {
                await deletePin({ pinId: pinId as any });
                deletedCount += 1;
              } catch {
                // Ignore and continue deleting remaining selected pins.
              }
            }

            setIsBulkActionPending(false);
            setSelectedPinIds([]);
            setIsMultiSelectMode(false);

            Alert.alert("Bulk Delete Complete", `${deletedCount} pins deleted.`);
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (params.openSheet === 'true') {
      setSelectedLat(undefined);
      setSelectedLng(undefined);
      setSelectedTitle(undefined);
      setSelectedAddress(undefined);
      setIsSheetOpen(true);
      setAddPinTrigger(prev => prev + 1);
      setIsViewSheetOpen(false);
      setSelectedPin(null);
      router.setParams({ openSheet: '' });
    }
  }, [params.openSheet]);

  useEffect(() => {
    const latParam = typeof params.lat === "string" ? Number(params.lat) : undefined;
    const lngParam = typeof params.lng === "string" ? Number(params.lng) : undefined;
    const pinIdParam = typeof params.pinId === "string" ? params.pinId : undefined;
    const openPinParam = typeof params.openPin === "string" ? params.openPin : undefined;

    let foundPin: any = null;

    if (openPinParam === "true" && pinIdParam && pins?.length) {
      foundPin = pins.find((p: any) => String(p._id) === String(pinIdParam));
      if (foundPin) {
        setSelectedPin(foundPin);
        setNearbyAnchorPin(foundPin);
        setIsViewSheetOpen(true);
        setViewPinTrigger((prev) => prev + 1);
        setIsSheetOpen(false);
      }
    }

    const targetLat = foundPin?.lat ?? (latParam !== undefined && !Number.isNaN(latParam) ? latParam : undefined);
    const targetLng = foundPin?.lng ?? (lngParam !== undefined && !Number.isNaN(lngParam) ? lngParam : undefined);

    if (targetLat !== undefined && targetLng !== undefined) {
      const isOpeningSheet = openPinParam === "true" || params.openSheet === "true";
      const offsetTarget = isOpeningSheet ? targetLat - getLatitudeOffset(0.01) : targetLat;

      setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: offsetTarget,
          longitude: targetLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 900);
      }, 350);
    }
  }, [params.lat, params.lng, params.pinId, params.openPin, pins]);

  const handleLongPress = (e: LongPressEvent) => {
    if (isMultiSelectMode) return;

    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLat(latitude);
    setSelectedLng(longitude);
    setSelectedTitle(undefined);
    setSelectedAddress(undefined);
    setIsSheetOpen(true);
    setIsViewSheetOpen(false);
    setSelectedPin(null);

    mapRef.current?.animateToRegion({
      latitude: latitude - getLatitudeOffset(0.02),
      longitude,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 500);
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setPredictions([]);
    }
  };

  const performSearch = async () => {
    if (searchQuery.length < 3) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);
    try {
      const lowered = searchQuery.toLowerCase();

      const curatedMatches = CURATED_LANDMARKS
        .filter((landmark) =>
          landmark.name.toLowerCase().includes(lowered) ||
          landmark.address.toLowerCase().includes(lowered)
        )
        .map((landmark) => ({
          place_id: `curated-${landmark.key}`,
          name: landmark.name,
          display_name: landmark.address,
          lat: String(landmark.lat),
          lon: String(landmark.lng),
          isCuratedLandmark: true,
          landmarkKey: landmark.key,
          distance: getDistanceFromLatLonInKm(currentRegion.latitude, currentRegion.longitude, landmark.lat, landmark.lng)
        }));

      const primaryLang = Localization.getLocales()[0]?.languageCode ?? 'en';
      const acceptLangString = `${primaryLang},en;q=0.9`;

      const searchRadius = 0.5;
      const lon1 = currentRegion.longitude - searchRadius;
      const lat1 = currentRegion.latitude + searchRadius;
      const lon2 = currentRegion.longitude + searchRadius;
      const lat2 = currentRegion.latitude - searchRadius;
      const viewbox = `${lon1},${lat1},${lon2},${lat2}`;

      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=15&accept-language=${acceptLangString}&viewbox=${viewbox}&bounded=1`, {
        headers: {
          'User-Agent': 'WaymarkApp/1.0',
          'Accept-Language': acceptLangString
        }
      });

      if (!response.ok) {
        setPredictions(curatedMatches.sort((a: any, b: any) => a.distance - b.distance).slice(0, 5));
        return;
      }

      const data = await response.json();

      const osmMatches = data.map((place: any) => ({
        ...place,
        distance: getDistanceFromLatLonInKm(
          currentRegion.latitude,
          currentRegion.longitude,
          parseFloat(place.lat),
          parseFloat(place.lon)
        )
      }));

      const combined = [...curatedMatches, ...osmMatches].sort((a: any, b: any) => a.distance - b.distance);

      const deduped = combined.filter(
        (item, index, arr) =>
          index ===
          arr.findIndex(
            (other) =>
              (other.name || other.display_name) ===
              (item.name || item.display_name)
          )
      );

      setPredictions(deduped.slice(0, 5));
    } catch (e) {
      console.log("Autocomplete error safely caught:", e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPlace = (place: any) => {
    if (isMultiSelectMode) return;

    const mainText = place.name || place.display_name.split(',')[0];
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);

    setSelectedTitle(mainText);
    setSelectedAddress(place.display_name);
    setSelectedLat(lat);
    setSelectedLng(lng);
    setSearchQuery('');
    setPredictions([]);
    Keyboard.dismiss();
    setIsSheetOpen(true);
    setAddPinTrigger(prev => prev + 1);
    setIsViewSheetOpen(false);
    setSelectedPin(null);

    mapRef.current?.animateToRegion({
      latitude: lat - getLatitudeOffset(0.02),
      longitude: lng,
      latitudeDelta: 0.02,
      longitudeDelta: 0.02,
    }, 800);
  };

  const pinsWithMarkerOffsets = useMemo(() => {
    if (!pins?.length) return [];

    const groups = new Map<string, any[]>();

    for (const pin of pins) {
      const groupKey =
        pin?.isLandmarkMemory && pin?.landmarkKey
          ? `landmark:${pin.landmarkKey}`
          : `coords:${pin.lat}:${pin.lng}`;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(pin);
    }

    const OFFSET_RADIUS = 0.0005;

    return pins.map((pin: any) => {
      const groupKey =
        pin?.isLandmarkMemory && pin?.landmarkKey
          ? `landmark:${pin.landmarkKey}`
          : `coords:${pin.lat}:${pin.lng}`;

      const group = groups.get(groupKey) ?? [];

      if (group.length <= 1) {
        return {
          ...pin,
          markerLat: pin.lat,
          markerLng: pin.lng,
        };
      }

      const indexInGroup = group.findIndex((p) => String(p._id) === String(pin._id));
      const angle = (2 * Math.PI * indexInGroup) / group.length;

      return {
        ...pin,
        markerLat: pin.lat + OFFSET_RADIUS * Math.cos(angle),
        markerLng: pin.lng + OFFSET_RADIUS * Math.sin(angle),
      };
    });
  }, [pins]);

  const getGroupedPinsForSelection = (pin: any) => {
    if (!pins?.length) return [pin];

    if (pin?.isLandmarkMemory && pin?.landmarkKey) {
      return pins.filter(
        (p: any) =>
          p.isLandmarkMemory === true &&
          p.landmarkKey === pin.landmarkKey
      );
    }

    return pins.filter(
      (p: any) =>
        p.lat === pin.lat &&
        p.lng === pin.lng
    );
  };

  const handleOpenPin = (pin: any) => {
    const groupedPins = getGroupedPinsForSelection(pin);
    setNearbyAnchorPin(pin);
    setSelectedPin(pin);
    setSelectedPinsAtLocation(groupedPins);
    setIsViewSheetOpen(true);
    setViewPinTrigger(prev => prev + 1);
    setIsSheetOpen(false);

    focusPinOnMap(pin);
  };

  const handleOpenNearbyPin = (pin: any) => {
    const groupedPins = getGroupedPinsForSelection(pin);
    setSelectedPin(pin);
    setSelectedPinsAtLocation(groupedPins);
    setIsViewSheetOpen(true);
    setViewPinTrigger(prev => prev + 1);
    setIsSheetOpen(false);

    focusPinOnMap(pin);
  };

  const nearbyPins = useMemo(() => {
    const anchorPin = nearbyAnchorPin || selectedPin;
    if (!pins?.length || !anchorPin) return [];

    const orderedNearbyPins = pins
      .filter((pin: any) => String(pin._id) !== String(anchorPin._id))
      .map((pin: any) => ({
        pin,
        distanceKm: getDistanceFromLatLonInKm(
          anchorPin.lat,
          anchorPin.lng,
          pin.lat,
          pin.lng
        ),
      }))
      .filter(({ distanceKm }) => distanceKm > 0.01)
      .sort((a: any, b: any) => a.distanceKm - b.distanceKm)
      .slice(0, 7);

    return [{ pin: anchorPin, distanceKm: 0 }, ...orderedNearbyPins];
  }, [pins, nearbyAnchorPin, selectedPin]);

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        provider="google"
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 33.783,
          longitude: -118.114,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        customMapStyle={colorScheme === 'dark' ? darkMapStyle : lightMapStyle}
        showsUserLocation={true}
        showsMyLocationButton={true}
        mapPadding={{ top: 100, right: 10, bottom: 35, left: 10 }}
        onLongPress={handleLongPress}
        onPress={() => {
          Keyboard.dismiss();
          setPredictions([]); // FIXED: Hides search results when clicking map
        }}
        onRegionChangeComplete={(region) => setCurrentRegion(region)}
        onPanDrag={() => {
          Keyboard.dismiss();
          setPredictions([]); // FIXED: Hides search results when moving map
          if (isSheetOpen || isViewSheetOpen) {
            setMinimizeTrigger(prev => prev + 1);
          }
        }}
      >
        {isSheetOpen && selectedLat !== undefined && selectedLng !== undefined && (
          <Marker
            coordinate={{ latitude: selectedLat, longitude: selectedLng }}
            zIndex={999}
            onPress={() => setAddPinTrigger(prev => prev + 1)}
          />
        )}

        {pinsWithMarkerOffsets?.map((pin: any) => (
          <PinMarker
            key={pin._id}
            pin={pin}
            theme={theme}
            isSelected={
              isMultiSelectMode
                ? selectedPinIds.includes(String(pin._id))
                : selectedPin?._id === pin._id
            }
            onPinPress={(e: any) => {
              e.stopPropagation();
              if (isMultiSelectMode) {
                togglePinSelection(pin);
              } else {
                handleOpenPin(pin);
              }
            }}
          />
        ))}
      </MapView>

      <View style={[styles.searchOverlay, { top: insets.top + 10 }]}>
        <View style={[styles.searchContainer, { backgroundColor: theme.background, shadowColor: colorScheme === 'dark' ? '#000' : '#888' }]}>
          {isSearching ? (
            <ActivityIndicator size="small" color={adwaitaBlue} style={styles.searchIcon} />
          ) : (
            <MaterialIcons name="search" size={24} color={adwaitaBlue} style={styles.searchIcon} />
          )}

          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search for a place..."
            placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
            value={searchQuery}
            onChangeText={handleSearchChange}
            onSubmitEditing={performSearch}
            blurOnSubmit={false}
            returnKeyType="search"
          // FIXED: Removed the onFocus minimizeTrigger that was causing the keyboard to close instantly
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]); }}>
              <MaterialIcons name="close" size={20} color={adwaitaBlue} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.mapActionsRow}>
          {!isMultiSelectMode ? (
            <TouchableOpacity
              style={[styles.multiSelectToggleButton, { backgroundColor: adwaitaBlue }]}
              onPress={enterMultiSelectMode}
            >
              <MaterialIcons name="checklist" size={16} color="#fff" />
              <Text style={styles.multiSelectToggleText}>Multi-select</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.multiSelectToggleButton, { backgroundColor: '#111827' }]}
              onPress={exitMultiSelectMode}
            >
              <MaterialIcons name="close" size={16} color="#fff" />
              <Text style={styles.multiSelectToggleText}>Exit Multi-select</Text>
            </TouchableOpacity>
          )}
        </View>

        {predictions.length > 0 && (
          <View style={[styles.predictionsContainer, { backgroundColor: theme.background }]}>
            {predictions.map((p: any, index: number) => (
              <TouchableOpacity
                key={p.place_id || index}
                style={[styles.predictionItem, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#f0f0f0' }]}
                onPress={() => handleSelectPlace(p)}
              >
                <Text style={[styles.predictionMainText, { color: theme.text }]} numberOfLines={1}>
                  {p.name || p.display_name.split(',')[0]}
                </Text>
                <Text style={[styles.predictionSubText, { color: colorScheme === 'dark' ? '#77767b' : '#9a9996' }]} numberOfLines={1}>
                  {p.distance < 1 ? `${(p.distance * 1000).toFixed(0)}m away • ` : `${p.distance.toFixed(1)}km away • `}{p.display_name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {isMultiSelectMode && (
        <View style={[styles.multiSelectActionBar, { bottom: insets.bottom + 18, backgroundColor: colorScheme === 'dark' ? '#171717' : '#ffffff', borderColor: colorScheme === 'dark' ? '#333' : '#d1d5db' }]}>
          <Text style={[styles.multiSelectCountText, { color: theme.text }]}>{selectedPinsCount} selected</Text>

          {selectedPinsForCarousel.length > 0 && (
            <View style={styles.selectedPinsCarouselWrap}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.selectedPinsCarouselContent}
              >
                {selectedPinsForCarousel.map((pin: any) => (
                  <View
                    key={String(pin._id)}
                    style={[
                      styles.selectedPinThumb,
                      {
                        borderColor: colorScheme === 'dark' ? '#3f3f46' : '#cbd5e1',
                        backgroundColor: colorScheme === 'dark' ? '#27272a' : '#f8fafc',
                      },
                    ]}
                  >
                    {pin.imageUrl ? (
                      <Image source={{ uri: pin.imageUrl }} style={styles.selectedPinThumbImage} />
                    ) : (
                      <View style={styles.selectedPinThumbFallback}>
                        <Text style={[styles.selectedPinThumbFallbackText, { color: theme.text }]}>
                          {pin.title ? pin.title.charAt(0).toUpperCase() : '?'}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.selectedPinRemoveButton}
                      onPress={() => togglePinSelection(pin)}
                      hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
                    >
                      <MaterialIcons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.multiSelectButtonsRow}>
            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: selectedPinsCount > 0 ? '#2563eb' : '#94a3b8' }]}
              disabled={selectedPinsCount === 0 || isBulkActionPending}
              onPress={() => setIsBulkTagModalOpen(true)}
            >
              <Text style={styles.bulkActionButtonText}>Edit Tags</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.bulkActionButton, { backgroundColor: selectedPinsCount > 0 ? '#b91c1c' : '#94a3b8' }]}
              disabled={selectedPinsCount === 0 || isBulkActionPending}
              onPress={confirmDeleteSelectedPins}
            >
              <Text style={styles.bulkActionButtonText}>Delete</Text>
            </TouchableOpacity>
          </View>

          {isBulkActionPending && <ActivityIndicator size="small" color={adwaitaBlue} style={{ marginTop: 8 }} />}
        </View>
      )}

      <Modal
        visible={isBulkTagModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsBulkTagModalOpen(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setIsBulkTagModalOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Manage Tags</Text>
              <TouchableOpacity onPress={() => setIsBulkTagModalOpen(false)}>
                <Text style={{ color: theme.text, fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={{ padding: 16 }}>
              <TouchableOpacity
                style={[
                  styles.clearTagsButton,
                  {
                    marginTop: 0,
                    marginBottom: 16,
                    backgroundColor: colorScheme === 'dark' ? '#3a1f1f' : '#fee2e2',
                    borderColor: colorScheme === 'dark' ? '#7f1d1d' : '#fca5a5',
                    opacity: selectedTagLinkCount > 0 ? 1 : 0.5,
                  },
                ]}
                onPress={confirmClearBulkTags}
                disabled={isBulkActionPending || selectedPinsCount === 0 || selectedTagLinkCount === 0}
              >
                <Text style={styles.clearTagsButtonText}>Clear Tags</Text>
              </TouchableOpacity>

              {Object.entries(tagsByCategory).map(([category, tags]: [string, any]) => (
                <View key={category} style={{ marginBottom: 20 }}>
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>{category}</Text>
                  <View style={styles.tagOptionRow}>
                    {tags.map((tag: any) => {
                      const coveredPinIds = Array.from(selectedTagCoverage.get(String(tag._id)) || []);
                      const isSelectedAny = coveredPinIds.length > 0;
                      const isSelectedAll = coveredPinIds.length === selectedPinsCount && selectedPinsCount > 0;

                      return (
                        <TouchableOpacity
                          key={String(tag._id)}
                          onPress={() => toggleBulkTagSelection(tag)}
                          disabled={isBulkActionPending || selectedPinsCount === 0}
                          style={[
                            styles.tagOption,
                            {
                              backgroundColor: isSelectedAny ? (tag.color || '#3b82f6') : (colorScheme === 'dark' ? '#333' : '#e5e7eb'),
                              borderWidth: 1,
                              borderColor: isSelectedAll ? '#111827' : (colorScheme === 'dark' ? '#444' : '#ccc'),
                              opacity: selectedPinsCount === 0 ? 0.5 : 1,
                            },
                          ]}
                        >
                          <Text style={{ color: isSelectedAny ? '#fff' : theme.text, fontWeight: '600' }}>{tag.name}</Text>

                          {coveredPinIds.length > 0 && (
                            <View style={styles.tagPinPreviewRow}>
                              {coveredPinIds.slice(0, 5).map((pinId) => {
                                const pin = selectedPinsById.get(String(pinId));
                                if (!pin) return null;

                                return (
                                  <View key={`${String(tag._id)}-${String(pinId)}`} style={styles.tagPinPreviewThumb}>
                                    {pin.imageUrl ? (
                                      <Image source={{ uri: pin.imageUrl }} style={styles.tagPinPreviewImage} />
                                    ) : (
                                      <View style={styles.tagPinPreviewFallback}>
                                        <Text style={styles.tagPinPreviewFallbackText}>
                                          {pin.title ? pin.title.charAt(0).toUpperCase() : '?'}
                                        </Text>
                                      </View>
                                    )}
                                  </View>
                                );
                              })}
                              {coveredPinIds.length > 5 && (
                                <Text style={styles.tagPinPreviewMoreText}>+{coveredPinIds.length - 5}</Text>
                              )}
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}

              <View style={[styles.createTagSection, { borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>Create New Tag</Text>
                <TextInput
                  value={newTagName}
                  onChangeText={setNewTagName}
                  placeholder="Tag name..."
                  placeholderTextColor="#666"
                  style={[styles.newTagInput, { color: theme.text, borderColor: colorScheme === 'dark' ? '#444' : '#ccc' }]}
                  editable={!isBulkActionPending}
                />
                <View style={styles.colorRow}>
                  {["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"].map((color) => (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      style={[styles.colorCircle, { backgroundColor: color, borderWidth: selectedColor === color ? 3 : 0, borderColor: theme.text }]}
                      disabled={isBulkActionPending}
                    />
                  ))}
                </View>
                <TouchableOpacity style={styles.createTagButton} onPress={handleCreateBulkTag} disabled={isBulkActionPending || selectedPinsCount === 0}>
                  <Text style={styles.createTagButtonText}>Create & Link Tag</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={[styles.saveButton, { marginTop: 20, marginBottom: 40, width: '100%' }]} onPress={() => setIsBulkTagModalOpen(false)}>
                <Text style={styles.saveButtonText}>Done</Text>
              </TouchableOpacity>
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AddPinSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        initialLat={selectedLat}
        initialLng={selectedLng}
        initialTitle={selectedTitle}
        initialAddress={selectedAddress}
        minimizeTrigger={minimizeTrigger}
        openTrigger={addPinTrigger}
        onLocationChange={(lat, lng) => {
          setSelectedLat(lat);
          setSelectedLng(lng);
          mapRef.current?.animateToRegion({
            latitude: lat - getLatitudeOffset(0.02),
            longitude: lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          }, 800);
        }}
      />

      <ViewEditPinSheet
        isOpen={isMultiSelectMode ? false : isViewSheetOpen}
        onClose={() => {
          setIsViewSheetOpen(false);
          setSelectedPin(null);
          setSelectedPinsAtLocation([]);
          setNearbyAnchorPin(null);
        }}
        pin={selectedPin}
        pins={selectedPinsAtLocation}
        nearbyPins={nearbyPins}
        minimizeTrigger={minimizeTrigger}
        openTrigger={viewPinTrigger}
        onNearbyPinSelect={(pin: any) => handleOpenNearbyPin(pin)}
      />
    </View>
  );
}

const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#2d2d2d" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#77767b" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#2d2d2d" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#303030" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#26a269" }, { "lightness": -45 }, { "saturation": -20 }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#424242" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#4f4f4f" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#1a5fb4" }, { "lightness": -20 }, { "saturation": -30 }] }
];

const lightMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#faf9f8" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#5e5c64" }] },
  { "featureType": "landscape", "elementType": "geometry", "stylers": [{ "color": "#faf9f8" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#8ff0a4" }, { "lightness": 30 }, { "saturation": -30 }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#eeeeee" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#dcdcdc" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#99c1f1" }, { "lightness": 20 }, { "saturation": -20 }] }
];

const styles = StyleSheet.create({
  searchOverlay: { position: 'absolute', left: 20, right: 20, zIndex: 10 },
  mapActionsRow: { alignItems: 'flex-start', marginTop: 8, marginBottom: 8 },
  multiSelectToggleButton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8 },
  multiSelectToggleText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 15, height: 50, elevation: 5, shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  predictionsContainer: { borderRadius: 16, marginTop: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden' },
  predictionItem: { padding: 14, borderBottomWidth: 1 },
  predictionMainText: { fontSize: 16, fontWeight: '600' },
  predictionSubText: { fontSize: 12, marginTop: 2 },
  multiSelectActionBar: { position: 'absolute', left: 20, right: 20, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 12, zIndex: 15, elevation: 8 },
  multiSelectCountText: { fontSize: 14, fontWeight: '700', marginBottom: 8 },
  selectedPinsCarouselWrap: { marginBottom: 10 },
  selectedPinsCarouselContent: { gap: 8, paddingRight: 2 },
  selectedPinThumb: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  selectedPinThumbImage: { width: '100%', height: '100%' },
  selectedPinThumbFallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  selectedPinThumbFallbackText: { fontSize: 20, fontWeight: '700' },
  selectedPinRemoveButton: { position: 'absolute', top: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  multiSelectButtonsRow: { flexDirection: 'row', gap: 10 },
  bulkActionButton: { flex: 1, borderRadius: 12, paddingVertical: 10, alignItems: 'center' },
  bulkActionButtonText: { color: '#fff', fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '85%', minHeight: '50%' },
  modalHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle: { fontSize: 18, fontWeight: '600' },
  categoryTitle: { fontSize: 14, fontWeight: '600', marginBottom: 10 },
  tagOptionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tagOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, minWidth: 96 },
  tagPinPreviewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  tagPinPreviewThumb: { width: 16, height: 16, borderRadius: 8, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)' },
  tagPinPreviewImage: { width: '100%', height: '100%' },
  tagPinPreviewFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  tagPinPreviewFallbackText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  tagPinPreviewMoreText: { color: '#fff', fontSize: 10, fontWeight: '700', marginLeft: 2 },
  createTagSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1 },
  newTagInput: { borderWidth: 1, padding: 10, borderRadius: 6, marginBottom: 12 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  colorCircle: { width: 40, height: 40, borderRadius: 20 },
  createTagButton: { backgroundColor: '#000', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  createTagButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  clearTagsButton: { marginTop: 20, borderWidth: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  clearTagsButtonText: { color: '#dc2626', fontWeight: '700', fontSize: 14 },
  saveButton: { backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' }
});
