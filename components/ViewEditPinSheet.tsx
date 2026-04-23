// components/ViewEditPinSheet.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Keyboard, ScrollView, Dimensions, Platform, BackHandler, Modal, Alert, FlatList } from 'react-native';
import BottomSheet, { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { ScrollView as GHScrollView } from 'react-native-gesture-handler';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { compressPinImage } from '@/hooks/image-compressor';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface ViewEditPinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pin: any | null;
  pins?: any[];
  minimizeTrigger?: number;
  openTrigger?: number;
}
interface NewPinImage { storageId: string; uri: string; caption: string; }

export default function ViewEditPinSheet({ isOpen, onClose, pin, pins = [], minimizeTrigger, openTrigger }: ViewEditPinSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [activePin, setActivePin] = useState<any | null>(null);
  const targetPin = activePin || pin;

  // Uses identical snap points to AddPinSheet for consistency
  const snapPoints = useMemo(() => ['4%', '45%', '95%'], []);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [isSheetInputFocused, setIsSheetInputFocused] = useState(false);

  const updatePin = useMutation(api.pins.updatePin);
  const generateUploadUrl = useMutation(api.pins.generateUploadUrl);
  const allTags = useQuery(api.pinTags.getAllTags);
  const pinTags = useQuery(api.pinTags.getTagsForPin, targetPin ? { pinId: targetPin._id } : "skip");
  const pinPictures = useQuery(api.pins.getPinPictures, targetPin ? { pinId: targetPin._id } : "skip");
  const addTagToPin = useMutation(api.pinTags.addTagToPin);
  const removeTagFromPin = useMutation(api.pinTags.removeTagFromPin);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newImages, setNewImages] = useState<NewPinImage[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [thumbnailStorageId, setThumbnailStorageId] = useState<string | null>(null);

  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [captionEdits, setCaptionEdits] = useState<Record<string, string>>({});

  const tagsByCategory = allTags ? allTags.reduce((acc: any, tag: any) => {
    const category = tag.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {}) : {};

  const programmaticSnapRef = useRef(false);

  const snapTo = (index: number) => {
    programmaticSnapRef.current = true;
    bottomSheetRef.current?.snapToIndex(index);
    setTimeout(() => { programmaticSnapRef.current = false; }, 500);
  };

  useEffect(() => {
    if (minimizeTrigger && minimizeTrigger > 0 && isOpen) {
      Keyboard.dismiss();
      snapTo(0);
    }
  }, [minimizeTrigger, isOpen]);

  useEffect(() => {
    const backAction = () => {
      if (!isOpen) return false;
      if (viewerIndex !== null) { setViewerIndex(null); return true; }
      if (sheetIndex > 0) { snapTo(0); return true; }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [sheetIndex, viewerIndex, isOpen]);

  useEffect(() => {
    if (isOpen && pin) {
      setActivePin(pin);
      setTitle(pin.title || '');
      setDescription(pin.description || '');
      setNewImages([]);
      setThumbnailStorageId(null);
      setCaptionEdits({});
      // Ensure UI is ready before raising sheet
      setTimeout(() => snapTo(1), 50);
    } else {
      bottomSheetRef.current?.close();
      Keyboard.dismiss();
    }
  }, [isOpen, pin, openTrigger]);

  useEffect(() => {
    if (activePin) {
      setTitle(activePin.title || '');
      setDescription(activePin.description || '');
      setNewImages([]);
      setThumbnailStorageId(null);
      setCaptionEdits({});
    }
  }, [activePin]);

  const uploadImageUri = async (uri: string, mimeType?: string | null) => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uri);
    const uploadResult = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': mimeType || 'image/jpeg' }, body: await response.blob() });
    const { storageId } = await uploadResult.json();
    return storageId as string;
  };

  const handleTakePhoto = async () => {
    const currentTotal = (pinPictures?.length || 0) + newImages.length;
    if (currentTotal >= 10) return;
    const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
    if (cameraPermission.status !== 'granted') return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1
    });
    if (result.canceled || result.assets.length === 0) return;

    setIsUploadingImages(true);
    try {
      const asset = result.assets[0];
      const isFirstImage = (pinPictures?.length || 0) === 0 && newImages.length === 0;
      const processed = await compressPinImage(asset.uri, isFirstImage);
      const storageId = await uploadImageUri(processed.fullUri, 'image/jpeg');
      if (processed.thumbnailUri) { const thumbId = await uploadImageUri(processed.thumbnailUri, 'image/jpeg'); setThumbnailStorageId(thumbId); }
      setNewImages((prev) => [...prev, { storageId, uri: processed.fullUri, caption: '' }]);
    } catch (error: any) { Alert.alert('Upload failed', error?.message || 'Could not upload photo.'); }
    finally { setIsUploadingImages(false); }
  };

  const handlePickFromLibrary = async () => {
    const currentTotal = (pinPictures?.length || 0) + newImages.length;
    if (currentTotal >= 10) return;
    const remaining = 10 - currentTotal;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1
    });
    if (result.canceled || result.assets.length === 0) return;

    setIsUploadingImages(true);
    try {
      let isFirstImage = (pinPictures?.length || 0) === 0 && newImages.length === 0;
      for (const asset of result.assets.slice(0, remaining)) {
        const processed = await compressPinImage(asset.uri, isFirstImage);
        const storageId = await uploadImageUri(processed.fullUri, 'image/jpeg');
        if (processed.thumbnailUri) { const thumbId = await uploadImageUri(processed.thumbnailUri, 'image/jpeg'); setThumbnailStorageId(thumbId); isFirstImage = false; }
        setNewImages((prev) => [...prev, { storageId, uri: processed.fullUri, caption: '' }]);
      }
    } catch (error: any) { Alert.alert('Upload failed', error?.message || 'Could not upload selected images.'); }
    finally { setIsUploadingImages(false); }
  };

  const handleRemoveNewImage = (storageId: string) => setNewImages((prev) => prev.filter((image) => image.storageId !== storageId));

  const handleUpdateCaption = (text: string) => {
    if (viewerIndex === null) return;
    const existingLen = pinPictures?.length || 0;
    if (viewerIndex < existingLen) {
      if (!pinPictures) return;
      setCaptionEdits((prev) => ({ ...prev, [pinPictures[viewerIndex].storageId]: text }));
    } else {
      const updatedImages = [...newImages]; updatedImages[viewerIndex - existingLen].caption = text; setNewImages(updatedImages);
    }
  };

  const toggleTagSelection = async (tag: any) => {
    if (!targetPin) return;
    try {
      if (pinTags?.some((t: any) => t._id === tag._id)) {
        await removeTagFromPin({ pinId: targetPin._id, tagId: tag._id });
      } else {
        await addTagToPin({ pinId: targetPin._id, tagId: tag._id });
      }
    } catch (err: any) { console.log(err); }
  };

  const handleUpdate = async () => {
    if (!targetPin) return;
    setIsSubmitting(true);
    try {
      const existingStorageIds = Array.isArray(pinPictures)
        ? pinPictures.map((p: any) => p.storageId)
        : (targetPin.pictures || []);
      const combinedPictures = [...existingStorageIds, ...newImages.map(img => img.storageId)];
      const finalCaptions: Record<string, string> = {};

      if (Array.isArray(pinPictures)) {
        pinPictures.forEach((pic: any) => { if (pic.caption) finalCaptions[pic.storageId] = pic.caption; });
      } else if (targetPin.captions) {
        Object.assign(finalCaptions, targetPin.captions);
      }

      Object.entries(captionEdits).forEach(([storageId, text]) => { if (text.trim()) finalCaptions[storageId] = text.trim(); else delete finalCaptions[storageId]; });
      newImages.forEach(img => { if (img.caption.trim()) finalCaptions[img.storageId] = img.caption.trim(); });

      await updatePin({ pinId: targetPin._id, title, description, pictures: combinedPictures, captions: finalCaptions, ...(thumbnailStorageId ? { thumbnail: thumbnailStorageId } : {}) });

      setNewImages([]);
      setCaptionEdits({});
      setThumbnailStorageId(null);
      Keyboard.dismiss();
    } catch (e: any) { console.error(e.message); } finally { setIsSubmitting(false); }
  };

  const handleCopyAddress = async () => {
    const addressToCopy = targetPin?.address || "No address provided";
    if (addressToCopy !== "No address provided") {
      await Clipboard.setStringAsync(addressToCopy);
      Alert.alert("Copied", "Address copied to clipboard!");
    }
  };

  const allViewerPictures = [...(pinPictures || []).map((p: any) => ({ storageId: p.storageId, url: p.url, caption: p.caption, isExisting: true })), ...newImages.map(img => ({ storageId: img.storageId, url: img.uri, caption: img.caption, isExisting: false }))];
  let currentActiveCaption = '';
  if (viewerIndex !== null && allViewerPictures[viewerIndex]) {
    const activePic = allViewerPictures[viewerIndex];
    if (activePic.isExisting) currentActiveCaption = captionEdits[activePic.storageId] !== undefined ? captionEdits[activePic.storageId] : (activePic.caption || '');
    else currentActiveCaption = activePic.caption;
  }

  const displayDate = targetPin?.createdAt
    ? new Date(targetPin.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      onChange={setSheetIndex}
      backgroundStyle={{ backgroundColor: theme.background }}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
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
      {targetPin ? (
        <BottomSheetScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
          <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {pinPictures && pinPictures.map((picture: any, index: number) => (
              <TouchableOpacity key={picture.storageId} style={styles.imagePreviewContainer} onPress={() => setViewerIndex(index)}>
                {picture.url ? <Image source={{ uri: picture.url }} style={styles.previewImage} contentFit="cover" /> : null}
              </TouchableOpacity>
            ))}
            {newImages.map((image, index) => (
              <TouchableOpacity key={image.storageId} style={styles.imagePreviewContainer} onPress={() => setViewerIndex((pinPictures?.length || 0) + index)}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} contentFit="cover" />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => handleRemoveNewImage(image.storageId)}>
                  <Text style={styles.removeImageText}>x</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.addImageButton, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0' }]} onPress={() => Alert.alert('Add Photo', 'Source', [{ text: 'Camera', onPress: handleTakePhoto }, { text: 'Library', onPress: handlePickFromLibrary }, { text: 'Cancel', style: 'cancel' }])} disabled={isUploadingImages || isSubmitting}>
              {isUploadingImages ? <ActivityIndicator color={theme.text} /> : <IconSymbol name="add" size={48} color={theme.text} />}
            </TouchableOpacity>
          </GHScrollView>

          <View style={styles.formContainer}>
            {pins.length > 1 && (
              <View style={styles.groupSelectorContainer}>
                <Text style={[styles.groupSelectorLabel, { color: theme.text }]}>Memories at this location</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={styles.groupSelectorRow}>
                    {pins.map((groupPin: any, index: number) => {
                      const isActive = targetPin?._id === groupPin._id;
                      return (
                        <TouchableOpacity key={groupPin._id} onPress={() => setActivePin(groupPin)} style={[styles.groupSelectorChip, { backgroundColor: isActive ? theme.tint : (colorScheme === "dark" ? "#333" : "#e5e7eb"), borderColor: colorScheme === "dark" ? "#444" : "#ccc" }]}>
                          <Text style={{ color: isActive ? "#fff" : theme.text, fontWeight: "600" }}>{groupPin.title || `Memory ${index + 1}`}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            <View style={styles.titleRow}>
              <BottomSheetTextInput style={[styles.titleInput, { color: theme.text }]} placeholder="Name" value={title} onChangeText={setTitle} onFocus={() => setIsSheetInputFocused(true)} onBlur={() => setIsSheetInputFocused(false)} />
              <Text style={[styles.dateText, { color: colorScheme === 'dark' ? '#666' : '#888' }]}>{displayDate}</Text>
            </View>
            <View style={styles.metaRow}>
              <TouchableOpacity style={styles.metaButton} onPress={() => setShowTagModal(true)}>
                <IconSymbol name="star" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
                <Text style={[styles.metaText, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>Tags +</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addressContainer} onPress={handleCopyAddress}>
                <IconSymbol name="place" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
                <Text style={[styles.addressText, { color: colorScheme === 'dark' ? '#888' : '#666' }]} numberOfLines={2}>{targetPin.address || "No address provided"}</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.notesAndSaveRow, sheetIndex === 2 && styles.notesAndSaveRowExpanded]}>
              <BottomSheetTextInput
                style={[styles.notesInput, sheetIndex === 2 && styles.notesInputExpanded, { color: theme.text }]}
                placeholder="Add Notes..."
                placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
                multiline
                value={description}
                onChangeText={setDescription}
                onFocus={() => {
                  setIsSheetInputFocused(true);
                  snapTo(2);
                }}
                onBlur={() => setIsSheetInputFocused(false)}
                blurOnSubmit={true}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
              <TouchableOpacity style={styles.saveButton} onPress={handleUpdate} disabled={isSubmitting || isUploadingImages}>
                {isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Update</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </BottomSheetScrollView>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* GALLERY VIEWER MODAL */}
      <Modal visible={viewerIndex !== null} transparent animationType="fade" onRequestClose={() => setViewerIndex(null)}>
        <View style={styles.galleryOverlay}>
          <TouchableOpacity style={[styles.fullscreenCloseButton, { top: Platform.OS === 'ios' ? 50 : 30 }]} onPress={() => setViewerIndex(null)}>
            <Text style={styles.fullscreenCloseText}>✕</Text>
          </TouchableOpacity>
          <FlatList
            data={allViewerPictures}
            keyExtractor={(item) => item.storageId}
            horizontal
            pagingEnabled
            initialScrollIndex={viewerIndex ?? 0}
            getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
            onMomentumScrollEnd={(e) => setViewerIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth))}
            renderItem={({ item }) => (
              <View style={styles.fullscreenImageWrapper}>
                {item.url ? <Image source={{ uri: item.url }} style={styles.fullscreenImage} contentFit="contain" /> : null}
              </View>
            )}
          />
          {viewerIndex !== null && (
            <View style={[styles.captionInputContainer, { bottom: insets.bottom + 20 }]}>
              <BottomSheetTextInput
                style={styles.captionInput}
                placeholder="Add a caption..."
                placeholderTextColor="#a1a1aa"
                value={currentActiveCaption}
                onChangeText={handleUpdateCaption}
                multiline
                maxLength={150}
                blurOnSubmit={true}
                onSubmitEditing={() => Keyboard.dismiss()}
              />
            </View>
          )}
        </View>
      </Modal>

      {/* TAG MANAGEMENT MODAL */}
      <Modal visible={showTagModal} animationType="slide" transparent onRequestClose={() => setShowTagModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: theme.text }]}>Manage Tags</Text></View>
            <ScrollView style={{ padding: 16 }}>
              {Object.entries(tagsByCategory).map(([category, tags]: [string, any]) => (
                <View key={category} style={{ marginBottom: 20 }}>
                  <Text style={[styles.categoryTitle, { color: theme.text }]}>{category}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {tags.map((tag: any) => (
                      <TouchableOpacity key={tag._id} onPress={() => toggleTagSelection(tag)} style={[styles.tagOption, { backgroundColor: pinTags?.some((t: any) => t._id === tag._id) ? (tag.color || "#3b82f6") : (colorScheme === 'dark' ? '#333' : "#e5e7eb") }]}>
                        <Text style={{ color: pinTags?.some((t: any) => t._id === tag._id) ? "#fff" : theme.text }}>{tag.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  galleryOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)' },
  fullscreenCloseButton: { position: 'absolute', right: 20, zIndex: 100, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20, width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  fullscreenCloseText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  fullscreenImageWrapper: { width: screenWidth, height: screenHeight, justifyContent: 'center', alignItems: 'center' },
  fullscreenImage: { width: '100%', height: '100%' },
  captionInputContainer: { position: 'absolute', width: '90%', alignSelf: 'center', backgroundColor: 'rgba(28, 28, 30, 0.85)', borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', zIndex: 100 },
  captionInput: { color: '#ffffff', fontSize: 15, maxHeight: 100 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "85%", minHeight: "50%" },
  modalHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  categoryTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  tagOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  groupSelectorContainer: { marginBottom: 14 },
  groupSelectorLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, opacity: 0.8 },
  groupSelectorRow: { flexDirection: "row", gap: 8 },
  groupSelectorChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1 }
});
