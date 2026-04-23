// app/(tabs)/index.tsx
import { api } from "@/convex/_generated/api";
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View, Image, useWindowDimensions } from "react-native";
import MapView, { LongPressEvent, Marker } from "react-native-maps";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Localization from 'expo-localization';

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
function PinMarker({ pin, colorScheme, theme, onPinPress, onCalloutPress }: { pin: any, colorScheme: string, theme: any, onPinPress: any, onCalloutPress: any }) {
  const { width } = useWindowDimensions();

  const imageId = pin.thumbnail ? pin.thumbnail : (pin.pictures && pin.pictures.length > 0 ? pin.pictures[0] : null);
  const fetchedImageUrl = useQuery(api.pins.getImageUrl, imageId ? { storageId: imageId } : "skip");

  const PIN_SIZE = 38;
  const BORDER_THICKNESS = 2;
  const IMAGE_SIZE = PIN_SIZE - (BORDER_THICKNESS * 2);

  const [tracksViewChanges, setTracksViewChanges] = useState(true);

  useEffect(() => {
    if (!imageId || fetchedImageUrl === null) {
      const timer = setTimeout(() => setTracksViewChanges(false), 500);
      return () => clearTimeout(timer);
    }
  }, [imageId, fetchedImageUrl]);

  const frameColor = colorScheme === 'dark' ? '#2c2c2e' : '#ffffff';

  return (
    <Marker
      key={pin._id}
      coordinate={{ latitude: pin.markerLat ?? pin.lat, longitude: pin.markerLng ?? pin.lng }}
      title={pin.title}
      tracksViewChanges={tracksViewChanges}
      onPress={onPinPress}
      onCalloutPress={onCalloutPress}
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
            borderRadius: 4,
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
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const adwaitaBlue = '#62a0ea';

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
  const [viewPinTrigger, setViewPinTrigger] = useState(0);

  const [minimizeTrigger, setMinimizeTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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
        setIsViewSheetOpen(true);
        setViewPinTrigger((prev) => prev + 1);
        setIsSheetOpen(false);
      }
    }

    const targetLat = foundPin?.lat ?? (latParam !== undefined && !Number.isNaN(latParam) ? latParam : undefined);
    const targetLng = foundPin?.lng ?? (lngParam !== undefined && !Number.isNaN(lngParam) ? lngParam : undefined);

    if (targetLat !== undefined && targetLng !== undefined) {
      setTimeout(() => {
        mapRef.current?.animateToRegion({
          latitude: targetLat,
          longitude: targetLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 900);
      }, 350);
    }
  }, [params.lat, params.lng, params.pinId, params.openPin, pins]);

  const handleLongPress = (e: LongPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLat(latitude);
    setSelectedLng(longitude);
    setSelectedTitle(undefined);
    setSelectedAddress(undefined);
    setIsSheetOpen(true);
    setIsViewSheetOpen(false);
    setSelectedPin(null);

    mapRef.current?.animateToRegion({
      latitude,
      longitude,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
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

      const searchRadius = 0.5; // roughly 50km in degrees
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
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.005,
      longitudeDelta: 0.005,
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

    return pins.map((pin) => {
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
    setSelectedPin(pin);
    setSelectedPinsAtLocation(groupedPins);
    setIsViewSheetOpen(true);
    setViewPinTrigger(prev => prev + 1);
    setIsSheetOpen(false);
  };

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
        onPress={() => Keyboard.dismiss()}
        onRegionChangeComplete={(region) => setCurrentRegion(region)}
        onPanDrag={() => {
          Keyboard.dismiss();
          if (isSheetOpen || isViewSheetOpen) {
            setMinimizeTrigger(prev => prev + 1);
          }
        }}
      >
        {isSheetOpen && selectedLat !== undefined && selectedLng !== undefined && (
          <Marker
            coordinate={{ latitude: selectedLat, longitude: selectedLng }}
            title="New Pin"
            zIndex={999}
            onPress={() => setAddPinTrigger(prev => prev + 1)}
          />
        )}

        {pinsWithMarkerOffsets?.map((pin: any) => (
          <PinMarker
            key={pin._id}
            pin={pin}
            colorScheme={colorScheme ?? 'light'}
            theme={theme}
            onPinPress={(e: any) => {
              e.stopPropagation();
              handleOpenPin(pin);
            }}
            onCalloutPress={() => {
              handleOpenPin(pin);
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
            onFocus={() => {
              if (isViewSheetOpen) {
                setMinimizeTrigger(prev => prev + 1);
              }
            }}
          />

          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]); }}>
              <MaterialIcons name="close" size={20} color={adwaitaBlue} />
            </TouchableOpacity>
          )}
        </View>

        {predictions.length > 0 && (
          <View style={[styles.predictionsContainer, { backgroundColor: theme.background }]}>
            {predictions.map((p, index) => (
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
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.005,
            longitudeDelta: 0.005,
          }, 800);
        }}
      />

      <ViewEditPinSheet
        isOpen={isViewSheetOpen}
        onClose={() => {
          setIsViewSheetOpen(false);
          setSelectedPin(null);
          setSelectedPinsAtLocation([]);
        }}
        pin={selectedPin}
        pins={selectedPinsAtLocation}
        minimizeTrigger={minimizeTrigger}
        openTrigger={viewPinTrigger}
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', borderRadius: 24, paddingHorizontal: 15, height: 50, elevation: 5, shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  predictionsContainer: { borderRadius: 16, marginTop: 8, elevation: 5, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, overflow: 'hidden' },
  predictionItem: { padding: 14, borderBottomWidth: 1 },
  predictionMainText: { fontSize: 16, fontWeight: '600' },
  predictionSubText: { fontSize: 12, marginTop: 2 },
});
