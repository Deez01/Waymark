import { useAuthActions } from "@convex-dev/auth/react";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  checkGeofencingPermissions,
  requestAllGeofencingPermissions,
  type GeofencingPermissions,
} from "@/lib/permissions";

export default function UserDummyScreen() {
  const { signOut } = useAuthActions();
  const [perms, setPerms] = useState<GeofencingPermissions | null>(null);

  useEffect(() => {
    checkGeofencingPermissions().then(setPerms);
  }, []);

  const allGranted =
    perms?.foregroundLocation && perms?.backgroundLocation && perms?.notifications;

  const handleEnableAlerts = async () => {
    const result = await requestAllGeofencingPermissions();
    setPerms(result);

    // If background location was denied, the user likely needs to go to Settings
    if (!result.backgroundLocation && result.foregroundLocation) {
      Linking.openSettings();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <View style={{ gap: 12 }}>

        {/* Nearby Pin Alerts */}
        <TouchableOpacity
          onPress={allGranted ? undefined : handleEnableAlerts}
          activeOpacity={allGranted ? 1 : 0.7}
          style={{
            backgroundColor: allGranted ? "#26a269" : "#e01b24",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            {allGranted ? "Nearby Pin Alerts Enabled" : "Enable Nearby Pin Alerts"}
          </Text>
          {!allGranted && perms && (
            <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 }}>
              {!perms.backgroundLocation
                ? "Requires 'Always Allow' location access"
                : "Tap to grant notification permission"}
            </Text>
          )}
        </TouchableOpacity>

        {/* View Timeline Button */}
        <TouchableOpacity
          onPress={() => router.push("/timeline")}
          style={{
            backgroundColor: "#007AFF",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            View Timeline
          </Text>
        </TouchableOpacity>

        {/* Sign Out Button */}
        <TouchableOpacity
          onPress={() => signOut()}
          style={{
            backgroundColor: "#999",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "black", fontWeight: "600" }}>
            Sign Out
          </Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}
