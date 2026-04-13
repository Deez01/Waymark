// hooks/image.ts
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export interface ProcessedImages {
  fullUri: string;
  thumbnailUri: string;
}

export async function pickAndProcessImage(): Promise<ProcessedImages | null> {
  try {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const originalUri = result.assets[0].uri;

    // The high-res image for the detail view
    const fullImage = await ImageManipulator.manipulateAsync(
      originalUri,
      [{ resize: { width: 1080 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );

    // The tiny thumbnail for the map pin
    const thumbnailImage = await ImageManipulator.manipulateAsync(
      originalUri,
      [{ resize: { width: 150, height: 150 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );

    return {
      fullUri: fullImage.uri,
      thumbnailUri: thumbnailImage.uri
    };

  } catch (error) {
    console.error("Error processing images:", error);
    return null;
  }
}
