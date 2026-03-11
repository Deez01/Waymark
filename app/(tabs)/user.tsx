import { useAuthActions } from "@convex-dev/auth/react";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserDummyScreen() {
  const { signOut } = useAuthActions();

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <View style={{ gap: 12 }}>

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