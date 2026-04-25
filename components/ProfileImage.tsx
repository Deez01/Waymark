import * as ImagePicker from "expo-image-picker";
import { TouchableOpacity, View, Alert, ActivityIndicator } from "react-native";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Image } from "expo-image";
import { useState } from "react";
import Animated, { FadeIn } from "react-native-reanimated";

export default function ProfileImage({
  uri,
  size = 90,
  editable = false,
}: any) {
  const [uploading, setUploading] = useState(false);

  const updateProfilePicture = useMutation(api.users.updateProfilePicture);
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  const handlePickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert("Permission required");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, 
      allowsEditing: true, 
      aspect: [1, 1],
      quality: 1,
    });

    if (result.canceled) return;

    try {
      setUploading(true);

      const uploadUrl = await generateUploadUrl();

      const response = await fetch(result.assets[0].uri);
      const blob = await response.blob();

      const upload = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "image/jpeg" },
        body: blob,
      });

      const { storageId } = await upload.json();

      await updateProfilePicture({ storageId });
    } catch (e) {
      console.log(e);
      Alert.alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <TouchableOpacity onPress={editable ? handlePickImage : undefined}>
      <View>
        {/* IMAGE */}
        {uri ? (
          <Animated.View entering={FadeIn.duration(300)}>
            <Image
              source={{ uri }}
              style={{
                width: size,
                height: size,
                borderRadius: size / 2,
              }}
              contentFit="cover"
            />
          </Animated.View>
        ) : (
          <View
            style={{
              width: size,
              height: size,
              borderRadius: size / 2,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#eee",
            }}
          >
            {uploading ? (
              <ActivityIndicator />
            ) : (
              <Ionicons
                name="person-circle-outline"
                size={size * 0.8}
                color="black"
              />
            )}
          </View>
        )}

        {/* CAMERA ICON */}
        {editable && (
          <View
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              backgroundColor: "#000",
              borderRadius: 12,
              padding: 4,
            }}
          >
            <Ionicons name="camera" size={14} color="white" />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}
