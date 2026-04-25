// app/(tabs)/index.tsx
import { api } from "@/convex/_generated/api";
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import MapView, { LongPressEvent, Marker } from "react-native-maps";
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import AddPinSheet from "@/components/AddPinSheet";
import ViewEditPinSheet from "@/components/ViewEditPinSheet";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

export default function MapScreen() {
  const pins = useQuery(api.pins.getAllPins);
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView | null>(null);

  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const adwaitaBlue = '#62a0ea';
  const adwaitaRed = '#e01b24';

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedLat, setSelectedLat] = useState<number | undefined>();
  const [selectedLng, setSelectedLng] = useState<number | undefined>();
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>();
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>();

  const [isViewSheetOpen, setIsViewSheetOpen] = useState(false);
  const [selectedPin, setSelectedPin] = useState<any>(null);
  const [viewPinTrigger, setViewPinTrigger] = useState(0);

  const [minimizeTrigger, setMinimizeTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    if (params.openSheet === 'true') {
      setSelectedLat(undefined);
      setSelectedLng(undefined);
      setSelectedTitle(undefined);
      setSelectedAddress(undefined);

      setIsSheetOpen(true);
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

  console.log("MAP PARAM DEBUG", {
    rawLat: params.lat,
    rawLng: params.lng,
    rawPinId: params.pinId,
    rawOpenPin: params.openPin,
    latParam,
    lngParam,
    pinIdParam,
    openPinParam,
  });

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

  const targetLat =
    foundPin?.lat ??
    (latParam !== undefined && !Number.isNaN(latParam) ? latParam : undefined);

  const targetLng =
    foundPin?.lng ??
    (lngParam !== undefined && !Number.isNaN(lngParam) ? lngParam : undefined);

  if (targetLat !== undefined && targetLng !== undefined) {
    setTimeout(() => {
      mapRef.current?.animateToRegion(
        {
          latitude: targetLat,
          longitude: targetLng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        },
        900
      );
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
  };

  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setPredictions([]);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5&accept-language=es,en&lat=33.783&lon=-118.114`, {
        headers: { 'User-Agent': 'WaymarkApp/1.0' }
      });
      if (!response.ok) return;
      const textResponse = await response.text();
      const data = JSON.parse(textResponse);
      setPredictions(data);
    } catch (e) {
      console.log("Autocomplete error safely caught:", e);
    }
  };

  const handleSelectPlace = (place: any) => {
    const mainText = place.name || place.display_name.split(',')[0];
    setSelectedTitle(mainText);
    setSelectedAddress(place.display_name);
    setSelectedLat(parseFloat(place.lat));
    setSelectedLng(parseFloat(place.lon));
    setSearchQuery('');
    setPredictions([]);
    Keyboard.dismiss();

    setIsSheetOpen(true);
    setIsViewSheetOpen(false);
    setSelectedPin(null);
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
        mapPadding={{
          top: 100,
          right: 10,
          bottom: 35,
          left: 10
        }}
        onLongPress={handleLongPress}
        onPress={() => Keyboard.dismiss()}
        onPanDrag={() => {
          if (isSheetOpen || isViewSheetOpen) {
            setMinimizeTrigger(prev => prev + 1);
          }
        }}
      >
        {pins?.map((pin: any) => (
          <Marker
            key={pin._id}
            coordinate={{ latitude: pin.lat, longitude: pin.lng }}
            title={pin.title}
            pinColor={adwaitaRed}
            onPress={(e) => {
              e.stopPropagation();
              setSelectedPin(pin);
              setIsViewSheetOpen(true);
              setViewPinTrigger(prev => prev + 1);
              setIsSheetOpen(false);
            }}
            onCalloutPress={() => {
              router.push({
                pathname: "/edit-caption",
                params: { pinId: pin._id, currentCaption: pin.caption },
              });
            }}
          />
        ))}
      </MapView>

      <View style={[styles.searchOverlay, { top: insets.top + 10 }]}>
        <View style={[
          styles.searchContainer,
          {
            backgroundColor: theme.background,
            shadowColor: colorScheme === 'dark' ? '#000' : '#888'
          }
        ]}>
          <MaterialIcons name="search" size={24} color={adwaitaBlue} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search for a place..."
            placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
            value={searchQuery}
            onChangeText={handleSearchChange}
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
                  {p.display_name}
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
      />

      <ViewEditPinSheet
        isOpen={isViewSheetOpen}
        onClose={() => {
          setIsViewSheetOpen(false);
          setSelectedPin(null);
        }}
        pin={selectedPin}
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
