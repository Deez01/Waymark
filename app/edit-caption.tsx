// Name: Bryan Estrada-Cordoba 

import{ View, TextInput, Button, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useMutation } from "convex/react"
import { api } from "../convex/_generated/api";
import { useState } from "react";
import { Id } from "../convex/_generated/dataModel";

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
            Alert.alert("Error", err.message);
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
      <Button title="Save Caption" onPress={handleSave} />
    </View>
  );
}
