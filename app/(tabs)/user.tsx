import { useAuthActions } from "@convex-dev/auth/react";
import { TouchableOpacity, Text } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';


export default function UserDummyScreen() {
  const { signOut } = useAuthActions();

  return (
    < SafeAreaView >
      <TouchableOpacity
        onPress={() => signOut()}
        style={{
          backgroundColor: true
            ? "#999"
            : "#007AFF",
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 8,
        }}
      >
        <Text style={{ color: "black" }}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView >
  )
}
