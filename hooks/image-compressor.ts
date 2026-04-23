// hooks/imageCompressor.ts
import * as ImageManipulator from 'expo-image-manipulator';

export interface ProcessedImages {
  fullUri: string;
  thumbnailUri?: string;
}

export async function compressPinImage(originalUri: string, generateThumbnail: boolean): Promise<ProcessedImages> {
  // 1. The high-res image for the detail view (max 1080p width)
  const fullImage = await ImageManipulator.manipulateAsync(
    originalUri,
    [{ resize: { width: 1080 } }],
    { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
  );

  let thumbnailUri;

  // 2. The tiny thumbnail for the map pin (ONLY if requested)
  if (generateThumbnail) {
    const thumbImage = await ImageManipulator.manipulateAsync(
      originalUri,
      [{ resize: { width: 150 } }],
      { compress: 0.5, format: ImageManipulator.SaveFormat.JPEG }
    );
    thumbnailUri = thumbImage.uri;
  }

  return {
    fullUri: fullImage.uri,
    thumbnailUri: thumbnailUri
  };
}
