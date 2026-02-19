// app/(tabs)/map.tsx
import { useState, useEffect } from "react";
import { View } from "react-native";
import MapView, { Marker, LongPressEvent } from "react-native-maps";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { router, useLocalSearchParams } from "expo-router";

// Import new sheet component
import AddPinSheet from "@/components/AddPinSheet";

export default function MapScreen() {
  const pins = useQuery(api.pins.getAllPins);
  const params = useLocalSearchParams();

  // State to control the bottom sheet
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [selectedLat, setSelectedLat] = useState<number | undefined>();
  const [selectedLng, setSelectedLng] = useState<number | undefined>();

  // Listen for the "Add Pin" tab button press
  useEffect(() => {
    if (params.openSheet === 'true') {
      setSelectedLat(undefined); // Clear any old coordinates
      setSelectedLng(undefined);
      setIsSheetOpen(true);

      // Clear the parameter so it doesn't trigger again randomly
      router.setParams({ openSheet: '' });
    }
  }, [params.openSheet]);

  // Handler: Open sheet with coordinates on long press
  const handleLongPress = (e: LongPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setSelectedLat(latitude);
    setSelectedLng(longitude);
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
              // Navigate to edit/view details
              router.push({
                pathname: "/edit-caption",
                params: {
                  pinId: pin._id,
                  currentCaption: pin.caption
                },
              });
            }}
          />
        ))}
      </MapView>

      {/* The new Bottom Sheet Overlay */}
      <AddPinSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        initialLat={selectedLat}
        initialLng={selectedLng}
      />
    </View>
  );
}
