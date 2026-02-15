// app/(tabs)/map.tsx
import { View } from "react-native";
import MapView, { Marker, LongPressEvent } from "react-native-maps";
import { useQuery } from "convex/react"; // Removed useMutation since we don't create here anymore
import { api } from "@/convex/_generated/api";
import { router } from "expo-router";

export default function MapScreen() {
  const pins = useQuery(api.pins.getAllPins);

  // New Handler: Navigate to the Create Tab with coordinates
  const handleLongPress = (e: LongPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    router.push({
      pathname: "/(tabs)/create",
      params: {
        lat: latitude.toString(),
        lng: longitude.toString()
      },
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
        provider="google" // Makes sure we use Google Maps
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
                pathname: "/edit-caption", // Make sure this route exists or change to valid route
                params: {
                  pinId: pin._id,
                  currentCaption: pin.caption
                },
              });
            }}
          />
        ))}
      </MapView>
    </View>
  );
}
