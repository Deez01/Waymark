import { View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function MapScreen() {
  const pins = useQuery(api.pins.getAllPins);

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
      >
        {pins?.map(pin => (
          <Marker
            key={pin._id}
            coordinate={{
              latitude: pin.lat,
              longitude: pin.lng,
            }}
            title={pin.title}
          />
        ))}
      </MapView>
    </View>
  );
}

