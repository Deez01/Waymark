import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation } from "convex/react";
import { Alert, Text, TouchableOpacity } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from "../../convex/_generated/api";


export default function UserDummyScreen() {
    // Mutation hook
  const changeVisibility = useMutation(api.memories.changeVisibility);

  const handleChangeToPrivate = async () => {
    try {
      await changeVisibility({
        memoryId: memory._id,
        visibility: "Private",
      });

      Alert.alert("Success", "Memory set to Private");
    } catch(err: any) {
      Alert.alert("Error", err.message);
    }
  };

  const { signOut } = useAuthActions();

  return (
    < SafeAreaView >
    <TouchableOpacity
      onPress={handleChangeToPrivate}
      style={{
        backgroundColor: "#007AFF",
        paddingHorizontal: 12, 
        paddingVertical: 6,
        borderRadius: 8, 
        marginBottom: 10
      }}
    >
      <Text style={{ color: "white"}}>
        Set Memory Private (Test)
      </Text>
    </TouchableOpacity>
    
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
