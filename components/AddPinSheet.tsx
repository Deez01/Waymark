// components/AddPinSheet.tsx
import { IconSymbol } from '@/components/ui/icon-symbol';
import { api } from '@/convex/_generated/api';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Dimensions, Keyboard, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { compressPinImage } from '@/hooks/image-compressor';
import { CURATED_LANDMARKS } from "@/lib/landmarks";

interface AddPinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  initialTitle?: string;
  initialAddress?: string;
  minimizeTrigger?: number;
  openTrigger?: number;
  onLocationChange?: (lat: number, lng: number) => void;
}

interface PinImage { storageId: string; uri: string; caption: string; }

export default function AddPinSheet({ isOpen, onClose, initialLat, initialLng, initialTitle, initialAddress, minimizeTrigger, openTrigger, onLocationChange }: AddPinSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [dynamicSnap, setDynamicSnap] = useState(Dimensions.get('window').height * 0.7);
  const snapPoints = useMemo(() => ['4%', '45%', dynamicSnap], [dynamicSnap]);
  const [sheetIndex, setSheetIndex] = useState(0);

  const [isSheetInputFocused, setIsSheetInputFocused] = useState(false);

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

  // Landmark state
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
  const [selectedImages, setSelectedImages] = useState<PinImage[]>([]);
  const [thumbnailStorageId, setThumbnailStorageId] = useState<string | null>(null);
  const [activeGalleryIndex, setActiveGalleryIndex] = useState<number | null>(null);

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
    programmaticTimeoutRef.current = setTimeout(() => { programmaticSnapRef.current = false; }, 100);
  };

  useEffect(() => {
    if (minimizeTrigger && minimizeTrigger > 0) snapTo(0);
  }, [minimizeTrigger]);

  useEffect(() => {
    const backAction = () => {
      if (activeGalleryIndex !== null) { setActiveGalleryIndex(null); return true; }
      if (sheetIndex > 0) { snapTo(0); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [sheetIndex, activeGalleryIndex]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      if (!isOpen || !isSheetInputFocused || activeGalleryIndex !== null) return;
      let kbHeight = e.endCoordinates.height;
      if (Platform.OS === 'android' && kbHeight < 100) kbHeight = Dimensions.get('screen').height - Dimensions.get('window').height;
      setDynamicSnap(kbHeight + 320);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      if (!isOpen || !isSheetInputFocused || activeGalleryIndex !== null) return;
      snapTo(1);
    });

    return () => { keyboardDidShowListener.remove(); keyboardDidHideListener.remove(); };
  }, [isOpen, activeGalleryIndex, isSheetInputFocused]);

  useEffect(() => {
    if (isOpen) {
      snapTo(1);
      if (initialTitle) setTitle(initialTitle);
      if (initialAddress) setAddress(initialAddress);
      if (initialLat && initialLng) {
        setLat(initialLat); setLng(initialLng);
        if (!initialAddress) fetchAddress(initialLat, initialLng);
      } else { handleGetLocation(); }
    } else {
      bottomSheetRef.current?.close();
      Keyboard.dismiss();
      setTitle(''); setDescription(''); setAddress('');
      setSelectedTags([]); // FIXED: Changed from '' to []
      setSelectedImages([]); setThumbnailStorageId(null); setActiveGalleryIndex(null);
      setLat(null); setLng(null); setSelectedLandmark(null); setLandmarkSearch(""); setShowLandmarkModal(false);
    }
  }, [isOpen, initialLat, initialLng, initialTitle, initialAddress, openTrigger]);

  const uploadImageUri = async (uri: string, mimeType?: string | null) => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uri);
    const uploadResult = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': mimeType || 'image/jpeg' }, body: await response.blob() });
    if (!uploadResult.ok) throw new Error('Upload failed');
    const { storageId } = await uploadResult.json();
    return storageId as string;
  };

  const handleTakePhoto = async () => {
    if (selectedImages.length >= 10) return Alert.alert('Limit reached', 'You can add up to 10 photos per pin.');
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') return Alert.alert('Permission required', 'Camera permission is required.');
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
    if (result.canceled || result.assets.length === 0) return;

    setIsUploadingImages(true);
    try {
      const processed = await compressPinImage(result.assets[0].uri, selectedImages.length === 0);
      const storageId = await uploadImageUri(processed.fullUri, 'image/jpeg');
      if (processed.thumbnailUri) setThumbnailStorageId(await uploadImageUri(processed.thumbnailUri, 'image/jpeg'));
      setSelectedImages((prev) => [...prev, { storageId, uri: processed.fullUri, caption: '' }]);
    } catch (e: any) { Alert.alert('Upload failed', e?.message || 'Could not upload photo.'); }
    finally { setIsUploadingImages(false); }
  };

  const handlePickFromLibrary = async () => {
    if (selectedImages.length >= 10) return Alert.alert('Limit reached', 'You can add up to 10 photos per pin.');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return Alert.alert('Permission required', 'Photo library permission is required.');
    const remaining = 10 - selectedImages.length;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: remaining, quality: 1 });
    if (result.canceled || result.assets.length === 0) return;

    setIsUploadingImages(true);
    try {
      const nextImages: PinImage[] = [];
      let isFirstImage = selectedImages.length === 0;
      for (const asset of result.assets.slice(0, remaining)) {
        const processed = await compressPinImage(asset.uri, isFirstImage);
        const storageId = await uploadImageUri(processed.fullUri, 'image/jpeg');
        if (processed.thumbnailUri) { setThumbnailStorageId(await uploadImageUri(processed.thumbnailUri, 'image/jpeg')); isFirstImage = false; }
        nextImages.push({ storageId, uri: processed.fullUri, caption: '' });
      }
      setSelectedImages((prev) => [...prev, ...nextImages]);
    } catch (e: any) { Alert.alert('Upload failed', e?.message || 'Could not upload images.'); }
    finally { setIsUploadingImages(false); }
  };

  const handleAddImagePress = () => Alert.alert('Add Photo', 'Choose a source', [{ text: 'Take Photo', onPress: handleTakePhoto }, { text: 'Choose from Library', onPress: handlePickFromLibrary }, { text: 'Cancel', style: 'cancel' }]);
  const handleRemoveImage = (id: string) => setSelectedImages(prev => { const newImgs = prev.filter(img => img.storageId !== id); if (!newImgs.length) setThumbnailStorageId(null); return newImgs; });
  const handleUpdateCaption = (txt: string) => { if (activeGalleryIndex === null) return; const imgs = [...selectedImages]; imgs[activeGalleryIndex].caption = txt; setSelectedImages(imgs); };

  const fetchAddress = async (lat: number, lng: number) => {
    const fallback = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      setAddress(res.length > 0 ? `${res[0].streetNumber || ''} ${res[0].street || ''}, ${res[0].city || ''}`.trim().replace(/^, /, '') || fallback : fallback);
    } catch { setAddress(fallback); }
  };

  const handleGetLocation = async () => {
    try {
      if ((await Location.requestForegroundPermissionsAsync()).status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setLat(loc.coords.latitude);
      setLng(loc.coords.longitude);
      if (onLocationChange) onLocationChange(loc.coords.latitude, loc.coords.longitude);
      await fetchAddress(loc.coords.latitude, loc.coords.longitude);
    } catch (e) { console.log('Could not fetch location', e); }
  };

  const toggleTagSelection = (tag: any) => setSelectedTags(prev => prev.some(t => t._id === tag._id) ? prev.filter(t => t._id !== tag._id) : [...prev, tag]);

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return Alert.alert("Error", "Tag name cannot be empty");
    try {
      const id = await createTag({ name: newTagName, color: selectedColor });
      setSelectedTags(prev => [...prev, { _id: id, name: newTagName, color: selectedColor }]);
      setNewTagName(""); setSelectedColor("#3b82f6");
    } catch (err: any) { Alert.alert("Error", err?.message ?? "Failed to create tag"); }
  };

  const handleSelectLandmark = (landmark: any) => {
    setSelectedLandmark(landmark);
    setTitle(landmark.name);
    setAddress(landmark.address);

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

      const captionsDict: Record<string, string> = {};
      selectedImages.forEach(img => { if (img.caption.trim()) captionsDict[img.storageId] = img.caption.trim(); });

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
        thumbnail: thumbnailStorageId || undefined,
        pictures: selectedImages.map((image) => image.storageId),
        captions: captionsDict,
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
    <BottomSheet ref={bottomSheetRef} index={-1} snapPoints={snapPoints} enablePanDownToClose onClose={onClose} onChange={setSheetIndex} backgroundStyle={[styles.sheetBackground, { backgroundColor: theme.background }]}
      onAnimate={(from, to) => { if (programmaticSnapRef.current) return; if (to - from > 1) snapTo(from + 1); else if (from - to > 1) snapTo(from - 1); }}
      handleComponent={() => (
        <TouchableOpacity activeOpacity={1} onPress={() => { if (sheetIndex === 0) snapTo(1); }} style={styles.handleContainer}>
          <View style={[styles.handleIndicator, { backgroundColor: colorScheme === 'dark' ? '#444' : '#ddd' }]} />
        </TouchableOpacity>
      )}
    >
      <BottomSheetScrollView style={styles.scrollWrapper} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {selectedImages.map((img, idx) => (
            <TouchableOpacity key={img.storageId} style={styles.imagePreviewContainer} onPress={() => setActiveGalleryIndex(idx)} activeOpacity={0.8}>
              <Image source={{ uri: img.uri }} style={styles.previewImage} contentFit="cover" />
              <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemoveImage(img.storageId)}><Text style={styles.removeImageText}>x</Text></TouchableOpacity>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.addImageButton, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0' }]} onPress={handleAddImagePress} disabled={isUploadingImages || isSubmitting}>
            {isUploadingImages ? <ActivityIndicator color={theme.text} /> : <IconSymbol name="add" size={48} color={theme.text} />}
          </TouchableOpacity>
        </GHScrollView>

        <View style={styles.formContainer}>
          <View style={styles.titleRow}>
            <TextInput style={[styles.titleInput, { color: theme.text }]} placeholder="Title (required)" placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'} value={title} onChangeText={setTitle} onFocus={() => { setIsSheetInputFocused(true); snapTo(2); }} onBlur={() => setIsSheetInputFocused(false)} />
            <Text style={[styles.dateText, { color: colorScheme === 'dark' ? '#666' : '#888' }]}>{currentDate}</Text>
          </View>

          <View style={styles.metaRow}>
            <TouchableOpacity style={styles.metaButton} onPress={() => setShowTagModal(true)}><IconSymbol name="star" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} /><Text style={[styles.metaText, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>Tags +</Text></TouchableOpacity>
            <TouchableOpacity style={styles.metaButton} onPress={() => setShowLandmarkModal(true)}><IconSymbol name="place" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} /><Text style={[styles.metaText, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>Landmark +</Text></TouchableOpacity>
            <View style={styles.addressContainer}><IconSymbol name="place" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} /><Text style={[styles.addressText, { color: colorScheme === 'dark' ? '#888' : '#666' }]} numberOfLines={2}>{address || "Locating..."}</Text></View>
          </View>

          {selectedTags.length > 0 && (
            <View style={styles.selectedTagsContainer}>
              {selectedTags.map(tag => (<View key={tag._id} style={[styles.selectedTagPill, { backgroundColor: tag.color || '#3b82f6' }]}><Text style={styles.selectedTagText}>{tag.name}</Text></View>))}
            </View>
          )}

          <View style={[styles.notesAndSaveRow, sheetIndex === 2 && styles.notesAndSaveRowExpanded]}>
            <TextInput style={[styles.notesInput, sheetIndex === 2 && styles.notesInputExpanded, { color: theme.text }]} placeholder="Add Notes..." placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'} multiline value={description} onChangeText={setDescription} onFocus={() => { setIsSheetInputFocused(true); snapTo(2); }} onBlur={() => setIsSheetInputFocused(false)} />
            <TouchableOpacity style={[styles.saveButton, (!title || lat === null) && styles.saveButtonDisabled]} onPress={handleCreate} disabled={isSubmitting || isUploadingImages || !title || lat === null}>
              {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save Pin</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetScrollView>

      <Modal visible={showLandmarkModal} animationType="slide" transparent={true} onRequestClose={() => setShowLandmarkModal(false)}>
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

      <Modal visible={showTagModal} animationType="slide" transparent onRequestClose={() => setShowTagModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Add Tags</Text>
              <TouchableOpacity onPress={() => setShowTagModal(false)}><Text style={[styles.modalCloseText, { color: theme.text }]}>✕</Text></TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {Object.entries(tagsByCategory).map(([category, tags]: [string, any]) => (
                <View key={category} style={{ marginBottom: 20 }}>
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>{category}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {tags && tags.map((tag: any) => {
                      const isSelected = selectedTags.some(t => t._id === tag._id);
                      return (<TouchableOpacity key={tag._id} onPress={() => toggleTagSelection(tag)} style={[styles.tagOption, { backgroundColor: isSelected ? (tag.color || "#3b82f6") : (colorScheme === 'dark' ? '#333' : "#e5e7eb"), borderWidth: isSelected ? 0 : 1, borderColor: colorScheme === 'dark' ? '#444' : '#ccc' }]}><Text style={[styles.tagOptionText, { color: isSelected ? "#fff" : theme.text }]}>{tag.name}{isSelected ? " ✓" : ""}</Text></TouchableOpacity>);
                    })}
                  </View>
                </View>
              ))}
              <View style={[styles.createTagSection, { borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
                <Text style={[styles.categoryTitle, { color: theme.text }]}>Create New Tag</Text>
                <TextInput value={newTagName} onChangeText={setNewTagName} placeholder="Tag name..." placeholderTextColor="#666" style={[styles.newTagInput, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#fff', color: theme.text, borderColor: colorScheme === 'dark' ? '#444' : '#ccc' }]} />
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Choose a color:</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"].map(color => (<TouchableOpacity key={color} onPress={() => setSelectedColor(color)} style={[styles.colorCircle, { backgroundColor: color, borderWidth: selectedColor === color ? 3 : 0, borderColor: theme.text }]} />))}
                </View>
                <TouchableOpacity style={styles.createTagButton} onPress={handleCreateTag}><Text style={styles.createTagButtonText}>Create Tag</Text></TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={activeGalleryIndex !== null} transparent animationType="fade" onRequestClose={() => setActiveGalleryIndex(null)}>
        <View style={styles.galleryOverlay}>
          <TouchableOpacity style={[styles.galleryCloseButton, { top: insets.top + 10 }]} onPress={() => setActiveGalleryIndex(null)}><Text style={styles.galleryCloseText}>✕</Text></TouchableOpacity>
          {activeGalleryIndex !== null && selectedImages[activeGalleryIndex] && (
            <View style={styles.galleryContent}>
              <Image source={{ uri: selectedImages[activeGalleryIndex].uri }} style={styles.galleryMainImage} contentFit="contain" />
              <View style={[styles.captionInputContainer, { bottom: insets.bottom + 20 }]}><TextInput style={styles.captionInput} placeholder="Add a caption..." placeholderTextColor="#a1a1aa" value={selectedImages[activeGalleryIndex].caption} onChangeText={handleUpdateCaption} multiline maxLength={150} /></View>
            </View>
          )}
        </View>
      </Modal>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handleContainer: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 10 },
  handleIndicator: { width: 40, height: 4, borderRadius: 2 },
  scrollWrapper: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  imageScroll: { flexGrow: 0, marginBottom: 20 },
  addImageButton: { width: 100, height: 120, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  placeholderImageBox: { width: 100, height: 120, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  imagePreviewContainer: { width: 100, height: 120, borderRadius: 12, overflow: 'hidden', marginRight: 10, position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  removeImageButton: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
  removeImageText: { color: '#fff', fontSize: 13, fontWeight: '700', lineHeight: 15 },
  formContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleInput: { fontSize: 24, fontWeight: '700', flex: 1, marginRight: 10 },
  dateText: { fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  metaButton: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 4, fontSize: 14 },
  addressContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', marginLeft: 15 },
  addressText: { marginLeft: 4, fontSize: 14, textAlign: 'right', flexShrink: 1 },
  selectedTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 15 },
  selectedTagPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  selectedTagText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  notesAndSaveRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, marginBottom: 20 },
  notesAndSaveRowExpanded: { flex: 1, alignItems: 'flex-start' },
  notesInput: { flex: 1, fontSize: 14, paddingVertical: 8, marginRight: 10, maxHeight: 60 },
  notesInputExpanded: { flex: 1, maxHeight: '100%', textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20 },
  saveButtonDisabled: { backgroundColor: '#ccc' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "85%", minHeight: "50%" },
  modalHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  modalCloseText: { fontSize: 24 },
  categoryTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  tagOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  tagOptionText: { fontSize: 13, fontWeight: "500" },
  createTagSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, paddingBottom: 40 },
  newTagInput: { borderWidth: 1, padding: 10, borderRadius: 6, marginBottom: 12 },
  colorCircle: { width: 40, height: 40, borderRadius: 20 },
  createTagButton: { backgroundColor: '#000', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  createTagButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  galleryOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' },
  galleryCloseButton: { position: 'absolute', right: 20, zIndex: 50, padding: 10 },
  galleryCloseText: { color: '#ffffff', fontSize: 28, fontWeight: '600' },
  galleryContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  galleryMainImage: { width: '100%', height: '100%' },
  captionInputContainer: { position: 'absolute', width: '90%', alignSelf: 'center', backgroundColor: 'rgba(28, 28, 30, 0.85)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  captionInput: { color: '#ffffff', fontSize: 15, maxHeight: 100 },
  predictionItem: { paddingVertical: 12, borderBottomWidth: 1 },
  predictionMainText: { fontSize: 16, fontWeight: "600" },
  predictionSubText: { fontSize: 12, marginTop: 2 }
});
