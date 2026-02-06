import { View } from "react-native";
import MapView, { Marker, LongPressEvent } from "react-native-maps";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { router } from "expo-router"

export default function MapScreen() {
  // Get all pins to display on the map
  const pins = useQuery(api.pins.getAllPins);

  // Load Create Pin function
  const createPin = useMutation(api.pins.createPin);

  // Long Press handler to add new pin (placeholder for add pin tab)
  const handleLongPress = async (e: LongPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;

    // Send pin data to backend to create new pin (placeholder for now)
    await createPin({
      ownerId: "dev-user",  // TEMP placeholder
      lat: latitude,
      lng: longitude,
      title: "New Pin",
      address: "123 Placeholder St",
      caption: "This is a cool spot!",
      thumbnail: "https://example.com/thumbnail.jpg",
      pictures: ["https://example.com/pic1.jpg", "https://example.com/pic2.jpg"],
      tags: ["Coffee", "Food"],
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <MapView
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

