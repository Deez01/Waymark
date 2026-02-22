// app/(tabs)/map.tsx
import { useState, useEffect } from "react";
import { View, TextInput, StyleSheet, TouchableOpacity, Text, Keyboard } from "react-native";
import MapView, { Marker, LongPressEvent } from "react-native-maps";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { router, useLocalSearchParams } from "expo-router";
import { MaterialIcons } from '@expo/vector-icons';

import AddPinSheet from "@/components/AddPinSheet";

export default function MapScreen() {
  const pins = useQuery(api.pins.getAllPins);
  const params = useLocalSearchParams();

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedLat, setSelectedLat] = useState<number | undefined>();
  const [selectedLng, setSelectedLng] = useState<number | undefined>();
  const [selectedTitle, setSelectedTitle] = useState<string | undefined>();
  const [selectedAddress, setSelectedAddress] = useState<string | undefined>();

  const [searchQuery, setSearchQuery] = useState('');
  const [predictions, setPredictions] = useState<any[]>([]);

  useEffect(() => {
    if (params.openSheet === 'true') {
      setSelectedLat(undefined);
      setSelectedLng(undefined);
      setSelectedTitle(undefined);
      setSelectedAddress(undefined);
      setIsSheetOpen(true);
      router.setParams({ openSheet: '' });
    }
  }, [params.openSheet]);

  const handleLongPress = (e: LongPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLat(latitude);
    setSelectedLng(longitude);
    setSelectedTitle(undefined);
    setSelectedAddress(undefined);
    setIsSheetOpen(true);
  };

  const handleSearchChange = async (text: string) => {
    setSearchQuery(text);
    if (text.length < 3) {
      setPredictions([]);
      return;
    }
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&format=json&addressdetails=1&limit=5`, {
        headers: { 'User-Agent': 'WaymarkApp/1.0' }
      });
      const data = await response.json();
      setPredictions(data);
    } catch (e) {
      console.error("Autocomplete error:", e);
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
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        provider="google"
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 33.783,
          longitude: -118.114,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
        onLongPress={handleLongPress}
      >
        {pins?.map((pin: any) => (
          <Marker
            key={pin._id}
            coordinate={{
              latitude: pin.lat,
              longitude: pin.lng,
            }}
            title={pin.title}
            description={pin.caption}
            onCalloutPress={() => {
              router.push({
                pathname: "/edit-caption",
                params: { pinId: pin._id, currentCaption: pin.caption },
              });
            }}
          />
        ))}
      </MapView>

      <View style={styles.searchOverlay}>
        <View style={styles.searchContainer}>
          <MaterialIcons name="search" size={24} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for a place..."
            placeholderTextColor="#888"
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(''); setPredictions([]); }}>
              <MaterialIcons name="close" size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>

        {predictions.length > 0 && (
          <View style={styles.predictionsContainer}>
            {predictions.map((p, index) => (
              <TouchableOpacity
                key={p.place_id || index}
                style={styles.predictionItem}
                onPress={() => handleSelectPlace(p)}
              >
                <Text style={styles.predictionMainText} numberOfLines={1}>
                  {p.name || p.display_name.split(',')[0]}
                </Text>
                <Text style={styles.predictionSubText} numberOfLines={1}>
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  searchOverlay: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    zIndex: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 24,
    paddingHorizontal: 15,
    height: 50,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16, color: '#000' },
  predictionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginTop: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    overflow: 'hidden',
  },
  predictionItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  predictionMainText: { fontSize: 16, fontWeight: '600', color: '#000' },
  predictionSubText: { fontSize: 12, color: '#666', marginTop: 2 },
});
