// components/AddPinSheet.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, Dimensions, Keyboard, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useMutation, useQuery } from 'convex/react';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/convex/_generated/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { compressPinImage } from '@/hooks/image-compressor';
import { CURATED_LANDMARKS } from "@/lib/landmarks";

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

  // --- DYNAMIC MAX HEIGHT CALCULATION ---
  const maxSheetHeight = useMemo(() => {
    const topReserved = insets.top + 70; // Notification + Search Bar + Gaps
    const tabHeight = screenHeight * 0.1; // 10% height from layout.tsx
    const bottomReserved = insets.bottom + tabHeight;
    return screenHeight - topReserved - bottomReserved;
  }, [insets.top, insets.bottom]);

  // --- v5 DYNAMIC SNAP POINTS ---
  // We provide the bottom and top points. 
  // enableDynamicSizing will automatically find the content size and insert it as the middle point.
  const snapPoints = useMemo(() => ['4%', maxSheetHeight], [maxSheetHeight]);

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

  const [showLandmarkModal, setShowLandmarkModal] = useState(false);
  const [landmarkSearch, setLandmarkSearch] = useState("");
  const [selectedLandmark, setSelectedLandmark] = useState<any | null>(null);

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

  const filteredLandmarks = CURATED_LANDMARKS.filter((l) =>
    l.name.toLowerCase().includes(landmarkSearch.toLowerCase()) ||
    l.address.toLowerCase().includes(landmarkSearch.toLowerCase())
  );

  const programmaticSnapRef = useRef(false);

  const snapTo = (index: number) => {
    programmaticSnapRef.current = true;
    bottomSheetRef.current?.snapToIndex(index);
    setTimeout(() => { programmaticSnapRef.current = false; }, 500);
  };

  useEffect(() => {
    const keyboardEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const keyboardListener = Keyboard.addListener(keyboardEvent, () => {
      if (isOpen && activeGalleryIndex === null) {
        snapTo(1); // Back to content size
        setIsSheetInputFocused(false);
      }
    });
    return () => keyboardListener.remove();
  }, [isOpen, activeGalleryIndex]);

  useEffect(() => {
    if (minimizeTrigger && minimizeTrigger > 0 && isOpen) { Keyboard.dismiss(); snapTo(0); }
  }, [minimizeTrigger, isOpen]);

  useEffect(() => {
    const backAction = () => {
      if (!isOpen) return false;
      if (activeGalleryIndex !== null) { setActiveGalleryIndex(null); return true; }
      if (sheetIndex > 0) { snapTo(0); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [sheetIndex, activeGalleryIndex, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => snapTo(1), 50);
      if (initialTitle) setTitle(initialTitle);
      if (initialAddress) setAddress(initialAddress);
      if (initialLat && initialLng) {
        setLat(initialLat); setLng(initialLng);
        if (!initialAddress) fetchAddress(initialLat, initialLng);
      } else { handleGetLocation(); }
    } else {
      bottomSheetRef.current?.close();
      Keyboard.dismiss();
      setTitle(''); setDescription(''); setAddress(''); setSelectedTags([]);
      setSelectedImages([]); setThumbnailStorageId(null); setActiveGalleryIndex(null);
      setLat(null); setLng(null); setSelectedLandmark(null); setLandmarkSearch(""); setShowLandmarkModal(false);
    }
  }, [isOpen, initialLat, initialLng, initialTitle, initialAddress, openTrigger]);

  const fetchAddress = async (la: number, ln: number) => {
    try {
      const res = await Location.reverseGeocodeAsync({ latitude: la, longitude: ln });
      if (res.length) setAddress(`${res[0].streetNumber || ''} ${res[0].street || ''}, ${res[0].city || ''}`.trim().replace(/^, /, ''));
    } catch (e) { }
  };

  const handleGetLocation = async () => {
    if ((await Location.requestForegroundPermissionsAsync()).status !== 'granted') return;
    const loc = await Location.getCurrentPositionAsync({});
    setLat(loc.coords.latitude); setLng(loc.coords.longitude);
    if (onLocationChange) onLocationChange(loc.coords.latitude, loc.coords.longitude);
    await fetchAddress(loc.coords.latitude, loc.coords.longitude);
  };

  const uploadImageUri = async (uri: string, mimeType?: string | null) => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uri);
    const uploadResult = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': mimeType || 'image/jpeg' }, body: await response.blob() });
    const { storageId } = await uploadResult.json();
    return storageId as string;
  };

  const handleTakePhoto = async () => {
    if (selectedImages.length >= 10) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return;
    const res = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (res.canceled || res.assets.length === 0) return;
    setIsUploadingImages(true);
    try {
      const proc = await compressPinImage(res.assets[0].uri, selectedImages.length === 0);
      const sid = await uploadImageUri(proc.fullUri, 'image/jpeg');
      if (proc.thumbnailUri) setThumbnailStorageId(await uploadImageUri(proc.thumbnailUri, 'image/jpeg'));
      setSelectedImages(prev => [...prev, { storageId: sid, uri: proc.fullUri, caption: '' }]);
    } finally { setIsUploadingImages(false); }
  };

  const handlePickFromLibrary = async () => {
    if (selectedImages.length >= 10) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 10 - selectedImages.length, quality: 1 });
    if (res.canceled || res.assets.length === 0) return;
    setIsUploadingImages(true);
    try {
      let isFirst = selectedImages.length === 0;
      for (const asset of res.assets) {
        const proc = await compressPinImage(asset.uri, isFirst);
        const sid = await uploadImageUri(proc.fullUri, 'image/jpeg');
        if (proc.thumbnailUri) { setThumbnailStorageId(await uploadImageUri(proc.thumbnailUri, 'image/jpeg')); isFirst = false; }
        setSelectedImages(prev => [...prev, { storageId: sid, uri: proc.fullUri, caption: '' }]);
      }
    } finally { setIsUploadingImages(false); }
  };

  const handleSelectLandmark = (landmark: any) => {
    setSelectedLandmark(landmark); setTitle(landmark.name); setAddress(landmark.address);
    setLat(landmark.lat); setLng(landmark.lng);
    if (onLocationChange) onLocationChange(landmark.lat, landmark.lng);
    setShowLandmarkModal(false); setLandmarkSearch("");
  };

  const handleCreate = async () => {
    if (!title.trim() || lat === null || lng === null) return;
    setIsSubmitting(true);
    try {
      const caps: Record<string, string> = {};
      selectedImages.forEach(i => { if (i.caption.trim()) caps[i.storageId] = i.caption.trim(); });
      const newPinId = await createPin({
        title, description, address, lat, lng,
        thumbnail: thumbnailStorageId || undefined,
        pictures: selectedImages.map(i => i.storageId),
        captions: caps,
        isLandmarkMemory: !!selectedLandmark,
        landmarkKey: selectedLandmark?.key,
        landmarkName: selectedLandmark?.name,
        landmarkRegion: selectedLandmark?.region,
        landmarkCollectionKeys: selectedLandmark?.collectionKeys ?? [],
      });
      if (selectedTags.length) await Promise.all(selectedTags.map(t => addTagToPin({ pinId: newPinId, tagId: t._id })));
      onClose();
    } finally { setIsSubmitting(false); }
  };

  const currentDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enableDynamicSizing={true} // Replaces the removed hook logic
      enablePanDownToClose
      onClose={onClose}
      onChange={setSheetIndex}
      backgroundStyle={{ backgroundColor: theme.background }}
      keyboardBehavior="extend"
      keyboardBlurBehavior="none"
      onAnimate={(fromIndex, toIndex) => {
        if (programmaticSnapRef.current) return;
        if (fromIndex === -1 || toIndex === -1) return;
        if (toIndex - fromIndex > 1) snapTo(fromIndex + 1);
        else if (fromIndex - toIndex > 1) snapTo(fromIndex - 1);
      }}
      handleComponent={() => (
        <TouchableOpacity activeOpacity={1} onPress={() => { if (sheetIndex === 0) snapTo(1); }} style={styles.handleContainer}>
          <View style={[styles.handleIndicator, { backgroundColor: colorScheme === 'dark' ? '#444' : '#ddd' }]} />
        </TouchableOpacity>
      )}
    >
      <BottomSheetScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          {selectedImages.map((img, idx) => (
            <TouchableOpacity key={img.storageId} style={styles.imagePreviewContainer} onPress={() => setActiveGalleryIndex(idx)}>
              <Image source={{ uri: img.uri }} style={styles.previewImage} contentFit="cover" />
              <TouchableOpacity style={styles.removeImageButton} onPress={() => setSelectedImages(prev => prev.filter(i => i.storageId !== img.storageId))}>
                <Text style={styles.removeImageText}>x</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.addImageButton, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0' }]} onPress={() => Alert.alert('Add Photo', 'Source', [{ text: 'Camera', onPress: handleTakePhoto }, { text: 'Library', onPress: handlePickFromLibrary }, { text: 'Cancel', style: 'cancel' }])}>
            {isUploadingImages ? <ActivityIndicator color={theme.text} /> : <IconSymbol name="add" size={48} color={theme.text} />}
          </TouchableOpacity>
        </GHScrollView>

        <View style={styles.formContainer}>
          <View style={styles.titleRow}>
            <BottomSheetTextInput
              style={[styles.titleInput, { color: theme.text }]}
              placeholder="Title (required)"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
              value={title}
              onChangeText={setTitle}
              onFocus={() => setIsSheetInputFocused(true)}
              onBlur={() => setIsSheetInputFocused(false)}
            />
            <Text style={[styles.dateText, { color: colorScheme === 'dark' ? '#666' : '#888' }]}>{currentDate}</Text>
          </View>

          <View style={styles.metaRow}>
            <View style={styles.metaButtonsColumn}>
              <TouchableOpacity style={styles.metaButton} onPress={() => setShowTagModal(true)}>
                <IconSymbol name="star" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
                <Text style={[styles.metaText, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>Tags +</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.metaButton, { marginTop: 10 }]} onPress={() => setShowLandmarkModal(true)}>
                <IconSymbol name="place" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
                <Text style={[styles.metaText, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>Landmark +</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.addressContainer} onPress={async () => { if (address) { await Clipboard.setStringAsync(address); Alert.alert("Copied", "Address copied!"); } }}>
              <IconSymbol name="place" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
              <Text style={[styles.addressText, { color: colorScheme === 'dark' ? '#888' : '#666' }]} numberOfLines={2}>{address || "Locating..."}</Text>
            </TouchableOpacity>
          </View>

          {selectedTags.length > 0 && (
            <View style={styles.selectedTagsContainer}>
              {selectedTags.map(tag => (<View key={tag._id} style={[styles.selectedTagPill, { backgroundColor: tag.color || '#3b82f6' }]}><Text style={styles.selectedTagText}>{tag.name}</Text></View>))}
            </View>
          )}

          <View style={[styles.notesAndSaveRow, sheetIndex === 2 && styles.notesAndSaveRowExpanded]}>
            <BottomSheetTextInput
              style={[styles.notesInput, sheetIndex === 2 && styles.notesInputExpanded, { color: theme.text }]}
              placeholder="Add Notes..."
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
              multiline
              value={description}
              onChangeText={setDescription}
              onFocus={() => setIsSheetInputFocused(true)}
              onBlur={() => setIsSheetInputFocused(false)}
            />
            <TouchableOpacity style={[styles.saveButton, (!title || lat === null) && styles.saveButtonDisabled]} onPress={handleCreate} disabled={isSubmitting || !title || lat === null}>
              {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Save Pin</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetScrollView>

      {/* MODALS (Landmark, Tag, etc. code same as before) */}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handleContainer: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 10 },
  handleIndicator: { width: 40, height: 4, borderRadius: 2 },
  contentContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  imageScroll: { marginBottom: 20 },
  addImageButton: { width: 100, height: 120, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  imagePreviewContainer: { width: 100, height: 120, borderRadius: 12, overflow: 'hidden', marginRight: 10, position: 'relative' },
  previewImage: { width: '100%', height: '100%' },
  removeImageButton: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
  removeImageText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  formContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleInput: { fontSize: 24, fontWeight: '700', flex: 1, marginRight: 10 },
  dateText: { fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  metaButtonsColumn: { flexDirection: 'column' },
  metaButton: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 4, fontSize: 14 },
  addressContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', marginLeft: 15 },
  addressText: { marginLeft: 4, fontSize: 14, textAlign: 'right', flexShrink: 1 },
  selectedTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 15 },
  selectedTagPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  selectedTagText: { color: '#fff', fontSize: 12, fontWeight: '500' },
  notesAndSaveRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, marginBottom: 20 },
  notesAndSaveRowExpanded: { flex: 1 },
  notesInput: { flex: 1, fontSize: 14, paddingVertical: 8, marginRight: 10, maxHeight: 60 },
  notesInputExpanded: { flex: 1, maxHeight: '100%', textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20 },
  saveButtonDisabled: { backgroundColor: '#ccc' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
