import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { api } from '@/convex/_generated/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { CURATED_LANDMARKS } from "@/lib/landmarks";
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Dimensions, Keyboard, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AddPinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  initialTitle?: string;
  initialAddress?: string;
  minimizeTrigger?: number;
}

export default function AddPinSheet({ isOpen, onClose, initialLat, initialLng, initialTitle, initialAddress, minimizeTrigger }: AddPinSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colorScheme = useColorScheme();

  // Theme switch logic
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [dynamicSnap, setDynamicSnap] = useState(Dimensions.get('window').height * 0.7);
  const snapPoints = useMemo(() => ['4%', '45%', dynamicSnap], [dynamicSnap]);
  const [sheetIndex, setSheetIndex] = useState(0);

  const createPin = useMutation(api.pins.createPin);
  const generateUploadUrl = useMutation(api.pins.generateUploadUrl);
  const allTags = useQuery(api.pinTags.getAllTags);
  const createTag = useMutation(api.pinTags.createTag);
  const addTagToPin = useMutation(api.pinTags.addTagToPin);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [showLandmarkModal, setShowLandmarkModal] = useState(false);
  const [landmarkSearch, setLandmarkSearch] = useState("");
  const [selectedLandmark, setSelectedLandmark] = useState<any | null>(null);

  const filteredLandmarks = CURATED_LANDMARKS.filter((landmark) =>
    landmark.name.toLowerCase().includes(landmarkSearch.toLowerCase()) ||
    landmark.address.toLowerCase().includes(landmarkSearch.toLowerCase())
  );

  const getNearbyCuratedBeach = (latitude: number, longitude: number) => {
    const BEACH_DISTANCE_THRESHOLD = 0.02; // roughly ~1 km, good starting point

    const beachLandmarks = CURATED_LANDMARKS.filter((landmark) =>
      landmark.collectionKeys?.includes("ca_beaches")
    );

    let closestBeach: any | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;

    for (const beach of beachLandmarks) {
      const distance = Math.sqrt(
        Math.pow(latitude - beach.lat, 2) + Math.pow(longitude - beach.lng, 2)
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestBeach = beach;
      }
    }

    if (closestBeach && closestDistance <= BEACH_DISTANCE_THRESHOLD) {
      return closestBeach;
    }

    return null;
  };
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<Array<{ storageId: string; uri: string }>>([]);

  const [showTagModal, setShowTagModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState<any[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");

  const tagsByCategory = allTags ? allTags.reduce((acc: any, tag: any) => {
    const category = tag.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {}) : {};

  const programmaticSnapRef = useRef(false);
  const programmaticTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const snapTo = (index: number) => {
    programmaticSnapRef.current = true;
    bottomSheetRef.current?.snapToIndex(index);

    if (programmaticTimeoutRef.current) clearTimeout(programmaticTimeoutRef.current);
    programmaticTimeoutRef.current = setTimeout(() => {
      programmaticSnapRef.current = false;
    }, 100);
  };

  useEffect(() => {
    if (minimizeTrigger && minimizeTrigger > 0) {
      Keyboard.dismiss();
      snapTo(0);
    }
  }, [minimizeTrigger]);

  useEffect(() => {
    const backAction = () => {
      if (sheetIndex > 0) {
        snapTo(0);
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [sheetIndex]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      if (!isOpen) return;

      let kbHeight = e.endCoordinates.height;

      if (Platform.OS === 'android' && kbHeight < 100) {
        const screenHeight = Dimensions.get('screen').height;
        const windowHeight = Dimensions.get('window').height;
        kbHeight = screenHeight - windowHeight;
      }

      const perfectHeight = kbHeight + 320;
      setDynamicSnap(perfectHeight);

      setTimeout(() => {
        snapTo(2);
      }, 10);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (!isOpen) return;
      snapTo(1);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      snapTo(1);

      if (initialTitle) setTitle(initialTitle);
      if (initialAddress) setAddress(initialAddress);

      if (initialLat && initialLng) {
        setLat(initialLat);
        setLng(initialLng);
        if (!initialAddress) {
          fetchAddress(initialLat, initialLng);
        }
      } else {
        handleGetLocation();
      }
    } else {
      bottomSheetRef.current?.close();
      Keyboard.dismiss();
      setTitle('');
      setDescription('');
      setAddress('');
      setSelectedTags([]);
      setSelectedImages([]);
      setLat(null);
      setLng(null);
      setSelectedLandmark(null);
      setLandmarkSearch("");
      setShowLandmarkModal(false);
    }
  }, [isOpen, initialLat, initialLng, initialTitle, initialAddress]);

  const uploadImageUri = async (uri: string, mimeType?: string | null) => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uri);
    const blob = await response.blob();
    const uploadResult = await fetch(uploadUrl, {
      method: 'POST',
      headers: { 'Content-Type': mimeType || 'image/jpeg' },
      body: blob,
    });

    if (!uploadResult.ok) {
      throw new Error('Upload failed');
    }

    const { storageId } = await uploadResult.json();
    if (!storageId) {
      throw new Error('Missing storageId after upload');
    }

    return storageId as string;
  };

  const handleTakePhoto = async () => {
    if (selectedImages.length >= 10) {
      Alert.alert('Limit reached', 'You can add up to 10 photos per pin.');
      return;
    }

    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermission.status !== 'granted') {
      Alert.alert('Permission required', 'Camera permission is required to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    setIsUploadingImages(true);
    try {
      const asset = result.assets[0];
      const storageId = await uploadImageUri(asset.uri, asset.mimeType);
      setSelectedImages((prev) => [...prev, { storageId, uri: asset.uri }]);
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'Could not upload photo.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handlePickFromLibrary = async () => {
    if (selectedImages.length >= 10) {
      Alert.alert('Limit reached', 'You can add up to 10 photos per pin.');
      return;
    }

    const mediaPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (mediaPermission.status !== 'granted') {
      Alert.alert('Permission required', 'Photo library permission is required to choose images.');
      return;
    }

    const remaining = 10 - selectedImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });

    if (result.canceled || result.assets.length === 0) {
      return;
    }

    setIsUploadingImages(true);
    try {
      const nextImages: Array<{ storageId: string; uri: string }> = [];
      for (const asset of result.assets.slice(0, remaining)) {
        const storageId = await uploadImageUri(asset.uri, asset.mimeType);
        nextImages.push({ storageId, uri: asset.uri });
      }
      setSelectedImages((prev) => [...prev, ...nextImages]);
    } catch (error: any) {
      Alert.alert('Upload failed', error?.message || 'Could not upload selected images.');
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleAddImagePress = () => {
    Alert.alert('Add Photo', 'Choose a source', [
      { text: 'Take Photo', onPress: handleTakePhoto },
      { text: 'Choose from Library', onPress: handlePickFromLibrary },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleRemoveImage = (storageId: string) => {
    setSelectedImages((prev) => prev.filter((image) => image.storageId !== storageId));
  };

  const fetchAddress = async (latitude: number, longitude: number) => {
    const fallbackCoords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const item = result[0];
        const formattedAddress = `${item.streetNumber || ''} ${item.street || ''}, ${item.city || ''}`.trim();
        const cleanAddress = formattedAddress.replace(/^, /, '');
        setAddress(cleanAddress.length > 0 ? cleanAddress : fallbackCoords);
      } else {
        setAddress(fallbackCoords);
      }
    } catch (e) {
      setAddress(fallbackCoords);
    }
  };

  const handleGetLocation = async () => {
    try {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      setLat(location.coords.latitude);
      setLng(location.coords.longitude);
      await fetchAddress(location.coords.latitude, location.coords.longitude);
    } catch (error) {
      console.log('Could not fetch location', error);
    }
  };

  const toggleTagSelection = (tag: any) => {
    setSelectedTags((prev) => {
      if (prev.some((t) => t._id === tag._id)) {
        return prev.filter((t) => t._id !== tag._id);
      } else {
        return [...prev, tag];
      }
    });
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert("Error", "Tag name cannot be empty");
      return;
    }
    try {
      const newTagId = await createTag({ name: newTagName, color: selectedColor });
      setSelectedTags((prev) => [...prev, { _id: newTagId, name: newTagName, color: selectedColor }]);
      setNewTagName("");
      setSelectedColor("#3b82f6");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create tag");
    }
  };

  const handleSelectLandmark = (landmark: any) => {
    setSelectedLandmark(landmark);
    setTitle(landmark.name);
    setAddress(landmark.address);

    // Keep the user's dropped location if it already exists.
    // Only fall back to landmark coords if no coords are set yet.
    if (lat === null || lng === null) {
      setLat(landmark.lat);
      setLng(landmark.lng);
    }

    setShowLandmarkModal(false);
    setLandmarkSearch("");
  };

const handleCreate = async () => {
  if (!title.trim()) {
    Alert.alert("Title required", "Add a title to save this pin.");
    return;
  }
  if (lat === null || lng === null) return;

  setIsSubmitting(true);
  try {
    const nearbyBeach = getNearbyCuratedBeach(lat, lng);

    const newPinId = await createPin({
      title,
      description,
      address,
      lat,
      lng,
      category: selectedLandmark
        ? selectedLandmark.collectionKeys?.includes("ca_beaches")
          ? "beach"
          : "landmark"
        : nearbyBeach
        ? "beach"
        : "general",
      thumbnail: selectedImages[0]?.storageId,
      pictures: selectedImages.map((image) => image.storageId),

      isLandmarkMemory: !!selectedLandmark,
      landmarkKey: selectedLandmark?.key,
      landmarkName: selectedLandmark?.name,
      landmarkRegion: selectedLandmark?.region,
      landmarkCollectionKeys: selectedLandmark?.collectionKeys ?? [],
    });

    if (selectedTags.length > 0) {
      await Promise.all(
        selectedTags.map(tag => addTagToPin({ pinId: newPinId, tagId: tag._id }))
      );
    }

    setSelectedLandmark(null);
    setLandmarkSearch("");
    setShowLandmarkModal(false);

    onClose();
  } catch (e: any) {
    console.error("Failed to create pin: ", e.message);
  } finally {
    setIsSubmitting(false);
  }
};

  const currentDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      onChange={(index) => setSheetIndex(index)}
      onAnimate={(fromIndex, toIndex) => {
        if (programmaticSnapRef.current) return;
        if (toIndex - fromIndex > 1) {
          snapTo(fromIndex + 1);
        }
        else if (fromIndex - toIndex > 1) {
          snapTo(fromIndex - 1);
        }
      }}
      backgroundStyle={[styles.sheetBackground, { backgroundColor: theme.background }]}
      handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colorScheme === 'dark' ? '#444' : '#ddd' }]}
    >
      <BottomSheetScrollView
        style={styles.scrollWrapper}
        contentContainerStyle={styles.contentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          <TouchableOpacity
            style={[styles.addImageButton, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0' }]}
            onPress={handleAddImagePress}
            disabled={isUploadingImages || isSubmitting}
          >
            <IconSymbol name="add" size={48} color={theme.text} />
          </TouchableOpacity>
          {selectedImages.length === 0 ? (
            <View style={[styles.placeholderImageBox, { backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#fafafa', borderColor: colorScheme === 'dark' ? '#333' : '#eee' }]}>
              {isUploadingImages ? (
                <ActivityIndicator color={theme.text} />
              ) : (
                <IconSymbol name="photo-library" size={32} color={colorScheme === 'dark' ? '#444' : '#ccc'} />
              )}
            </View>
          ) : (
            selectedImages.map((image) => (
              <View key={image.storageId} style={styles.imagePreviewContainer}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} contentFit="cover" />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemoveImage(image.storageId)}>
                  <Text style={styles.removeImageText}>x</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.formContainer}>
          <View style={styles.titleRow}>
            <TextInput
              style={[styles.titleInput, { color: theme.text }]}
              placeholder="Title (required)"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
              value={title}
              onChangeText={setTitle}
              onFocus={() => snapTo(2)}
            />
            <Text style={[styles.dateText, { color: colorScheme === 'dark' ? '#666' : '#888' }]}>{currentDate}</Text>
          </View>

          <View style={styles.metaRow}>
            <TouchableOpacity style={styles.metaButton} onPress={() => setShowTagModal(true)}>
              <IconSymbol name="star" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
              <Text style={[styles.metaText, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>Tags +</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.metaButton} onPress={() => setShowLandmarkModal(true)}>
              <IconSymbol name="place" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
              <Text style={[styles.metaText, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>
                Landmark +
              </Text>
            </TouchableOpacity>

            <View style={styles.addressContainer}>
              <IconSymbol name="place" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
              <Text style={[styles.addressText, { color: colorScheme === 'dark' ? '#888' : '#666' }]} numberOfLines={2}>{address || "Locating..."}</Text>
            </View>
          </View>

          {selectedTags.length > 0 && (
            <View style={styles.selectedTagsContainer}>
              {selectedTags.map(tag => (
                <View key={tag._id} style={[styles.selectedTagPill, { backgroundColor: tag.color || '#3b82f6' }]}>
                  <Text style={styles.selectedTagText}>{tag.name}</Text>
                </View>
              ))}
            </View>
          )}

          <View style={[styles.notesAndSaveRow, sheetIndex === 2 && styles.notesAndSaveRowExpanded]}>
            <TextInput
              style={[styles.notesInput, sheetIndex === 2 && styles.notesInputExpanded, { color: theme.text }]}
              placeholder="Add Notes..."
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
              multiline={true}
              value={description}
              onChangeText={setDescription}
              onFocus={() => snapTo(2)}
            />

            <TouchableOpacity
              style={[styles.saveButton, (!title || lat === null) && styles.saveButtonDisabled]}
              onPress={handleCreate}
              disabled={isSubmitting || isUploadingImages || !title || lat === null}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Pin</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetScrollView>

      <Modal
        visible={showLandmarkModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLandmarkModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Choose Landmark</Text>
              <TouchableOpacity onPress={() => setShowLandmarkModal(false)}>
                <Text style={[styles.modalCloseText, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={{ padding: 16 }}>
              <TextInput
                value={landmarkSearch}
                onChangeText={setLandmarkSearch}
                placeholder="Search landmarks..."
                placeholderTextColor="#666"
                style={[
                  styles.newTagInput,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#fff',
                    color: theme.text,
                    borderColor: colorScheme === 'dark' ? '#444' : '#ccc',
                  },
                ]}
              />

              <ScrollView style={{ maxHeight: 380 }}>
                {filteredLandmarks.map((landmark) => (
                  <TouchableOpacity
                    key={landmark.key}
                    onPress={() => handleSelectLandmark(landmark)}
                    style={[
                      styles.predictionItem,
                      { borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' },
                    ]}
                  >
                    <Text style={[styles.predictionMainText, { color: theme.text }]}>
                      {landmark.name}
                    </Text>
                    <Text style={[styles.predictionSubText, { color: colorScheme === 'dark' ? '#77767b' : '#9a9996' }]}>
                      {landmark.address}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showTagModal} animationType="slide" transparent={true} onRequestClose={() => setShowTagModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Tags</Text>
              <TouchableOpacity onPress={() => setShowTagModal(false)}>
                <Text style={[styles.modalCloseText, { color: theme.text }]}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {Object.entries(tagsByCategory).map(([category, tags]: [string, any]) => (
                <View key={category} style={{ marginBottom: 20 }}>
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>{category}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {tags && tags.map((tag: any) => {
                      const isSelected = selectedTags.some(t => t._id === tag._id);
                      return (
                        <TouchableOpacity
                          key={tag._id}
                          onPress={() => toggleTagSelection(tag)}
                          style={[styles.tagOption, { backgroundColor: isSelected ? (tag.color || "#3b82f6") : (colorScheme === 'dark' ? '#333' : "#e5e7eb"), borderWidth: isSelected ? 0 : 1, borderColor: colorScheme === 'dark' ? '#444' : '#ccc' }]}
                        >
                          <Text style={[styles.tagOptionText, { color: isSelected ? "#fff" : theme.text }]}>{tag.name}{isSelected ? " ✓" : ""}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              <View style={[styles.createTagSection, { borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>Create New Tag</Text>
                <TextInput
                  value={newTagName}
                  onChangeText={setNewTagName}
                  placeholder="Tag name..."
                  placeholderTextColor="#666"
                  style={[styles.newTagInput, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#fff', color: theme.text, borderColor: colorScheme === 'dark' ? '#444' : '#ccc' }]}
                />
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Choose a color:</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"].map((color) => (
                    <TouchableOpacity key={color} onPress={() => setSelectedColor(color)} style={[styles.colorCircle, { backgroundColor: color, borderWidth: selectedColor === color ? 3 : 0, borderColor: theme.text }]} />
                  ))}
                </View>
                <TouchableOpacity style={styles.createTagButton} onPress={handleCreateTag}>
                  <Text style={styles.createTagButtonText}>Create Tag</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  handleIndicator: {
    width: 40
  },
  scrollWrapper: {
    flex: 1
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20
  },
  imageScroll: {
    flexGrow: 0,
    marginBottom: 20
  },
  addImageButton: {
    width: 100,
    height: 120,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  placeholderImageBox: {
    width: 100,
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10
  },
  imagePreviewContainer: {
    width: 100,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 10,
    position: 'relative'
  },
  previewImage: {
    width: '100%',
    height: '100%'
  },
  removeImageButton: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  removeImageText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 15
  },
  formContainer: {
    flex: 1
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    marginRight: 10
  },
  dateText: {
    fontSize: 14
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  metaButton: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  metaText: {
    marginLeft: 4,
    fontSize: 14
  },
  addressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
    marginLeft: 15
  },
  addressText: {
    marginLeft: 4,
    fontSize: 14,
    textAlign: 'right',
    flexShrink: 1
  },

  selectedTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 15
  },
  selectedTagPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  selectedTagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500'
  },

  notesAndSaveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 20
  },
  notesAndSaveRowExpanded: {
    flex: 1,
    alignItems: 'flex-start'
  },
  notesInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 8,
    marginRight: 10,
    maxHeight: 60
  },
  notesInputExpanded: {
    flex: 1,
    maxHeight: '100%',
    textAlignVertical: 'top'
  },

  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc'
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: 'flex-end'
  },
  modalContent: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "85%",
    minHeight: "50%"
  },
  modalHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600"
  },
  modalCloseText: {
    fontSize: 24
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10
  },
  tagOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16
  },
  tagOptionText: {
    fontSize: 13,
    fontWeight: "500"
  },
  createTagSection: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    paddingBottom: 40
  },
  newTagInput: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 6,
    marginBottom: 12
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20
  },
  createTagButton: {
    backgroundColor: '#000',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center'
  },
  createTagButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14
  },
  predictionItem: {
  paddingVertical: 12,
  borderBottomWidth: 1,
},
predictionMainText: {
  fontSize: 16,
  fontWeight: "600",
},
predictionSubText: {
  fontSize: 12,
  marginTop: 2,
}
});
