// Name: Bryan Estrada-Cordoba 

import{ View, TextInput, Button, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation } from "convex/react"
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";
import { ThemedText } from "@/components/themed-text";

export default function EditCaptionScreen() {
    const { pinId, currentCaption } = useLocalSearchParams();

    const typePinId = pinId as Id<"pins">;

    const [caption, setCaption] = useState(
        typeof currentCaption === "string" ? currentCaption : ""

    );

    const updateCaption = useMutation(api.pins.updateCaption);

    const handleSave = async () => {
        try {
            await updateCaption({
                pinId: typePinId,
                caption, 
            });
            Alert.alert("Success", "Caption updated");
            router.back();
        } catch (err: any) {
            const message = 
              err?.message ?? "Failed to save caption. Please try again.";

            Alert.alert("Error", message);
        }
    };

    return (
    <View style={{ padding: 16 }}>
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Edit caption..."
        maxLength={200}
        multiline
        style={{
          borderWidth: 1,
          borderColor: "#ccc",
          padding: 10,
          borderRadius: 6,
          minHeight: 80,
        }}
      />
     <ThemedText
        style={{
          textAlign: "right",
          color: caption.length > 200 ? "red" : "gray",
        }}
      >
        {caption.length}/200
      </ThemedText>
      <Button 
        title="Save Caption" 
        onPress={handleSave} 
        disabled={caption.length > 200}
      />
    </View>
  );
}
