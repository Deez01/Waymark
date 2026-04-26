import { useAuthActions } from "@convex-dev/auth/react";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function UserDummyScreen() {
  const { signOut } = useAuthActions();

  return (
    <SafeAreaView style={{ flex: 1, padding: 20 }}>
      <View style={{ gap: 12 }}>
        <TouchableOpacity
          onPress={() => router.push("../recap?period=monthly")}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#7c3aed",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            Generate Monthly Recap
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.76)", fontSize: 12, marginTop: 4 }}>
            Opens your monthly Waymark recap.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("../recap?period=yearly")}
          activeOpacity={0.8}
          style={{
            backgroundColor: "#1d4ed8",
            paddingHorizontal: 12,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            Generate Yearly Recap
          </Text>
          <Text style={{ color: "rgba(255,255,255,0.76)", fontSize: 12, marginTop: 4 }}>
            Opens your yearly Waymark recap.
          </Text>
        </TouchableOpacity>

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
