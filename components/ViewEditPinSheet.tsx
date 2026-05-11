// components/ViewEditPinSheet.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Keyboard, ScrollView, Dimensions, Platform, BackHandler, Modal, FlatList, Animated, Alert, TouchableWithoutFeedback } from 'react-native';
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
  nearbyPins?: Array<{ pin: any; distanceKm: number }>;
  minimizeTrigger?: number;
  openTrigger?: number;
  onNearbyPinSelect?: (pin: any) => void;
}
interface NewPinImage { storageId: string; uri: string; caption: string; }

export default function ViewEditPinSheet({ isOpen, onClose, pin, pins = [], nearbyPins = [], minimizeTrigger, openTrigger, onNearbyPinSelect }: ViewEditPinSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;
  const isMinimizing = useRef(false);

  const [activePin, setActivePin] = useState<any | null>(null);
  const [nearbyIndex, setNearbyIndex] = useState(0);
  const targetPin = activePin || pin;

  const maxSheetHeight = useMemo(() => {
    const topReserved = insets.top + 70;
    const tabHeight = screenHeight * 0.1;
    const bottomReserved = insets.bottom + tabHeight;
    return screenHeight - topReserved - bottomReserved;
  }, [insets.top, insets.bottom]);

  const snapPoints = useMemo(() => ['4%', maxSheetHeight], [maxSheetHeight]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [isSheetInputFocused, setIsSheetInputFocused] = useState(false);

  const [toastVisible, setToastVisible] = useState(false);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const showToast = () => {
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToastVisible(false));
  };

  const updatePin = useMutation(api.pins.updatePin);
  const generateUploadUrl = useMutation(api.pins.generateUploadUrl);
  const allTags = useQuery(api.pinTags.getAllTags);
  const pinTags = useQuery(api.pinTags.getTagsForPin, targetPin ? { pinId: targetPin._id } : "skip");
  const pinPictures = useQuery(api.pins.getPinPictures, targetPin ? { pinId: targetPin._id } : "skip");
  const addTagToPin = useMutation(api.pinTags.addTagToPin);
  const removeTagFromPin = useMutation(api.pinTags.removeTagFromPin);
  const createTag = useMutation(api.pinTags.createTag);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newImages, setNewImages] = useState<NewPinImage[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [thumbnailStorageId, setThumbnailStorageId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [captionEdits, setCaptionEdits] = useState<Record<string, string>>({});
  const [isClearingTags, setIsClearingTags] = useState(false);

  const tagsByCategory = allTags ? allTags.reduce((acc: any, tag: any) => {
    const category = tag.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {}) : {};

  const handleCopyAddress = async () => {
    const addr = targetPin?.address;
    if (addr && addr !== "No address provided") {
      await Clipboard.setStringAsync(addr);
      showToast();
    }
  };

  const toggleTagSelection = async (tag: any) => {
    if (!targetPin) return;
    try {
      const isSelected = pinTags?.some((t: any) => t._id === tag._id);
      if (isSelected) await removeTagFromPin({ pinId: targetPin._id, tagId: tag._id });
      else await addTagToPin({ pinId: targetPin._id, tagId: tag._id });
    } catch (err: any) { console.error(err); }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim() || !targetPin) return;
    try {
      const id = await createTag({ name: newTagName, color: selectedColor });
      await addTagToPin({ pinId: targetPin._id, tagId: id });
      setNewTagName(""); setSelectedColor("#3b82f6");
    } catch (err: any) { Alert.alert("Error", err?.message); }
  };

  
  const handleClearAllTags = () => {
    if (!targetPin || !pinTags?.length || isClearingTags) return;

    Alert.alert(
      "Clear all tags?",
      "This will remove every tag from this pin.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Tags",
          style: "destructive",
          onPress: async () => {
            setIsClearingTags(true);
            try {
              await Promise.allSettled(
                pinTags.map((tag: any) =>
                  removeTagFromPin({ pinId: targetPin._id, tagId: tag._id })
                )
              );
            } finally {
              setIsClearingTags(false);
            }
          },
        },
      ]
    );
  };

  const handleUpdateCaption = (text: string) => {
    if (viewerIndex === null) return;
    const existingLen = pinPictures?.length || 0;
    if (viewerIndex < existingLen) {
      if (!pinPictures) return;
      setCaptionEdits((prev) => ({ ...prev, [pinPictures[viewerIndex].storageId]: text }));
    } else {
      const updatedImages = [...newImages];
      updatedImages[viewerIndex - existingLen].caption = text;
      setNewImages(updatedImages);
    }
  };

  const uploadImageUri = async (uri: string) => {
    const uploadUrl = await generateUploadUrl();
    const response = await fetch(uri);
    const result = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: await response.blob() });
    const { storageId } = await result.json();
    return storageId as string;
  };

  const handleTakePhoto = async () => {
    const currentTotal = (pinPictures?.length || 0) + newImages.length;
    if (currentTotal >= 10) return;
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (perm.status !== 'granted') return;
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 1 });
    if (result.canceled || result.assets.length === 0) return;
    setIsUploadingImages(true);
    try {
      const processed = await compressPinImage(result.assets[0].uri, currentTotal === 0);
      const sid = await uploadImageUri(processed.fullUri);
      if (processed.thumbnailUri) setThumbnailStorageId(await uploadImageUri(processed.thumbnailUri));
      setNewImages(prev => [...prev, { storageId: sid, uri: processed.fullUri, caption: '' }]);
    } finally { setIsUploadingImages(false); }
  };

  const handlePickFromLibrary = async () => {
    const currentTotal = (pinPictures?.length || 0) + newImages.length;
    if (currentTotal >= 10) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 10 - currentTotal, quality: 1 });
    if (result.canceled || result.assets.length === 0) return;
    setIsUploadingImages(true);
    try {
      let isFirst = currentTotal === 0;
      for (const asset of result.assets) {
        const processed = await compressPinImage(asset.uri, isFirst);
        const sid = await uploadImageUri(processed.fullUri);
        if (processed.thumbnailUri) { setThumbnailStorageId(await uploadImageUri(processed.thumbnailUri)); isFirst = false; }
        setNewImages(prev => [...prev, { storageId: sid, uri: processed.fullUri, caption: '' }]);
      }
    } finally { setIsUploadingImages(false); }
  };

  const handleUpdate = async () => {
    if (!targetPin) return;
    setIsSubmitting(true);
    try {
      const existingStorageIds = pinPictures?.map((p: any) => p.storageId) || [];
      const combined = [...existingStorageIds, ...newImages.map(img => img.storageId)];
      const finalCaps: Record<string, string> = {};
      pinPictures?.forEach((pic: any) => { if (pic.caption) finalCaps[pic.storageId] = pic.caption; });
      Object.entries(captionEdits).forEach(([sid, text]) => { if (text.trim()) finalCaps[sid] = text.trim(); else delete finalCaps[sid]; });
      newImages.forEach(img => { if (img.caption.trim()) finalCaps[img.storageId] = img.caption.trim(); });
      await updatePin({ pinId: targetPin._id, title, description, pictures: combined, captions: finalCaps, thumbnail: thumbnailStorageId || undefined });
      setNewImages([]); setCaptionEdits({}); Keyboard.dismiss();
    } finally { setIsSubmitting(false); }
  };

  useEffect(() => {
    const keyboardEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const keyboardListener = Keyboard.addListener(keyboardEvent, () => {
      if (isOpen && viewerIndex === null && !isMinimizing.current) {
        bottomSheetRef.current?.snapToIndex(1);
      }
      setIsSheetInputFocused(false);
    });
    return () => keyboardListener.remove();
  }, [isOpen, viewerIndex]);

  useEffect(() => {
    if (minimizeTrigger && minimizeTrigger > 0 && isOpen) {
      isMinimizing.current = true;
      Keyboard.dismiss();
      bottomSheetRef.current?.snapToIndex(0);
      setTimeout(() => { isMinimizing.current = false; }, 800);
    }
  }, [minimizeTrigger, isOpen]);

  useEffect(() => {
    if (isOpen && pin) {
      setActivePin(pin); setTitle(pin.title || ''); setDescription(pin.description || '');
      setNewImages([]); setThumbnailStorageId(null); setCaptionEdits({});
      setTimeout(() => bottomSheetRef.current?.snapToIndex(1), 50);
    } else {
      bottomSheetRef.current?.close(); Keyboard.dismiss();
    }
  }, [isOpen, pin, openTrigger]);

  useEffect(() => {
    const currentNearbyIndex = nearbyPins.findIndex((entry) => String(entry.pin._id) === String(targetPin?._id));
    setNearbyIndex(currentNearbyIndex >= 0 ? currentNearbyIndex : 0);
  }, [targetPin?._id, nearbyPins]);

  const allViewerPictures = [...(pinPictures || []).map((p: any) => ({ storageId: p.storageId, url: p.url, caption: p.caption, isExisting: true })), ...newImages.map(img => ({ storageId: img.storageId, url: img.uri, caption: img.caption, isExisting: false }))];
  let currentActiveCaption = '';
  if (viewerIndex !== null && allViewerPictures[viewerIndex]) {
    const activePic = allViewerPictures[viewerIndex];
    if (activePic.isExisting) currentActiveCaption = captionEdits[activePic.storageId] !== undefined ? captionEdits[activePic.storageId] : (activePic.caption || '');
    else currentActiveCaption = activePic.caption;
  }

  const displayDate = targetPin?.createdAt ? new Date(targetPin.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) : '';
  const hasNearbyPins = nearbyPins.length > 1;

  const navigateNearby = (direction: -1 | 1) => {
    if (!nearbyPins.length) return;

    const nextIndex = (nearbyIndex + direction + nearbyPins.length) % nearbyPins.length;
    setNearbyIndex(nextIndex);
    onNearbyPinSelect?.(nearbyPins[nextIndex].pin);
  };

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enableDynamicSizing={true}
      enablePanDownToClose={false}
      onClose={onClose}
      onChange={setSheetIndex}
      backgroundStyle={{ backgroundColor: theme.background }}
      keyboardBehavior="extend"
      handleComponent={() => (
        <TouchableOpacity activeOpacity={1} onPress={() => { if (sheetIndex === 0) bottomSheetRef.current?.snapToIndex(1); }} style={styles.handleContainer}>
          <View style={[styles.handleIndicator, { backgroundColor: colorScheme === 'dark' ? '#444' : '#ddd' }]} />
        </TouchableOpacity>
      )}
    >
      {targetPin ? (
        <BottomSheetScrollView contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
          {hasNearbyPins && (
            <View style={styles.topNavRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.nearbyArrowButton, styles.nearbyArrowButtonLeft, { backgroundColor: colorScheme === 'dark' ? '#242424' : '#f3f4f6', borderColor: colorScheme === 'dark' ? '#3a3a3a' : '#d4d4d8' }]}
                onPress={() => navigateNearby(-1)}
              >
                <IconSymbol name="chevron-left" size={24} color={theme.text} />
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.nearbyArrowButton, styles.nearbyArrowButtonRight, { backgroundColor: colorScheme === 'dark' ? '#242424' : '#f3f4f6', borderColor: colorScheme === 'dark' ? '#3a3a3a' : '#d4d4d8' }]}
                onPress={() => navigateNearby(1)}
              >
                <IconSymbol name="chevron-right" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>
          )}

          <GHScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
            {pinPictures && pinPictures.map((picture: any, index: number) => (
              <TouchableOpacity key={picture.storageId} style={styles.imagePreviewContainer} onPress={() => setViewerIndex(index)}>
                {picture.url ? <Image source={{ uri: picture.url }} style={styles.previewImage} contentFit="cover" /> : null}
              </TouchableOpacity>
            ))}
            {newImages.map((image, index) => (
              <TouchableOpacity key={image.storageId} style={styles.imagePreviewContainer} onPress={() => setViewerIndex((pinPictures?.length || 0) + index)}>
                <Image source={{ uri: image.uri }} style={styles.previewImage} contentFit="cover" />
                <TouchableOpacity style={styles.removeImageButton} onPress={() => setNewImages(prev => prev.filter(img => img.storageId !== image.storageId))}>
                  <Text style={styles.removeImageText}>x</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.addImageButton, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0' }]} onPress={() => Alert.alert('Add Photo', 'Source', [{ text: 'Camera', onPress: handleTakePhoto }, { text: 'Library', onPress: handlePickFromLibrary }, { text: 'Cancel', style: 'cancel' }])}>
              {isUploadingImages ? <ActivityIndicator color={theme.text} /> : <IconSymbol name="add" size={48} color={theme.text} />}
            </TouchableOpacity>
          </GHScrollView>

          <View style={styles.formContainer}>
            {pins.length > 1 && (
              <View style={styles.groupSelectorContainer}>
                <Text style={[styles.groupSelectorLabel, { color: theme.text }]}>Memories at this location</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}><View style={styles.groupSelectorRow}>
                  {pins.map((groupPin: any) => {
                    const isActive = targetPin?._id === groupPin._id;
                    return (<TouchableOpacity key={groupPin._id} onPress={() => setActivePin(groupPin)} style={[styles.groupSelectorChip, { backgroundColor: isActive ? theme.tint : (colorScheme === "dark" ? "#333" : "#e5e7eb"), borderColor: colorScheme === "dark" ? "#444" : "#ccc" }]}><Text style={{ color: isActive ? "#fff" : theme.text, fontWeight: "600" }}>{groupPin.title || "Memory"}</Text></TouchableOpacity>);
                  })}
                </View></ScrollView>
              </View>
            )}

            <View style={styles.titleRow}>
              <BottomSheetTextInput style={[styles.titleInput, { color: theme.text }]} placeholder="Name" value={title} onChangeText={setTitle} onFocus={() => setIsSheetInputFocused(true)} />
              <Text style={[styles.dateText, { color: colorScheme === 'dark' ? '#666' : '#888' }]}>{displayDate}</Text>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.tagTriggerContainer}>
                {pinTags && pinTags.length > 0 ? (
                  <View style={styles.tagFlow}>
                    {pinTags.map((tag: any) => (
                      <TouchableOpacity key={tag._id} onPress={() => setShowTagModal(true)}><View style={[styles.selectedTagPill, { backgroundColor: tag.color || '#3b82f6' }]}><Text style={styles.selectedTagText}>{tag.name}</Text></View></TouchableOpacity>
                    ))}
                    <TouchableOpacity onPress={() => setShowTagModal(true)} style={styles.smallAddTagButton}><IconSymbol name="add" size={18} color={theme.text} /></TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.metaButton} onPress={() => setShowTagModal(true)}><IconSymbol name="star" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} /><Text style={[styles.metaText, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>Tags +</Text></TouchableOpacity>
                )}
              </View>
              <TouchableOpacity style={styles.addressContainer} onPress={handleCopyAddress}><IconSymbol name="place" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} style={{ marginTop: 2 }} /><Text style={[styles.addressText, { color: colorScheme === 'dark' ? '#888' : '#666' }]} numberOfLines={2}>{targetPin.address || "No address provided"}</Text></TouchableOpacity>
            </View>

            <View style={[styles.notesAndSaveRow, sheetIndex === 2 && styles.notesAndSaveRowExpanded]}>
              <BottomSheetTextInput style={[styles.notesInput, sheetIndex === 2 && styles.notesInputExpanded, { color: theme.text }]} placeholder="Add Notes..." placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'} multiline value={description} onChangeText={setDescription} onFocus={() => setIsSheetInputFocused(true)} blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} />
              <TouchableOpacity style={styles.saveButton} onPress={handleUpdate} disabled={isSubmitting}>{isSubmitting ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.saveButtonText}>Update</Text>}</TouchableOpacity>
            </View>
          </View>
        </BottomSheetScrollView>
      ) : <View style={{ flex: 1 }} />}

      {toastVisible && <Animated.View style={[styles.toastContainer, { opacity: toastOpacity, bottom: insets.bottom + 80 }]}><Text style={styles.toastText}>Address copied!</Text></Animated.View>}

      <Modal visible={viewerIndex !== null} transparent animationType="fade" onRequestClose={() => setViewerIndex(null)}>
        <View style={styles.galleryOverlay}><TouchableOpacity style={[styles.fullscreenCloseButton, { top: Platform.OS === 'ios' ? 50 : 30 }]} onPress={() => setViewerIndex(null)}><Text style={styles.fullscreenCloseText}>✕</Text></TouchableOpacity>
          <FlatList data={allViewerPictures} keyExtractor={(item) => item.storageId} horizontal pagingEnabled initialScrollIndex={viewerIndex ?? 0} getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })} onMomentumScrollEnd={(e) => setViewerIndex(Math.round(e.nativeEvent.contentOffset.x / screenWidth))} renderItem={({ item }) => (<View style={styles.fullscreenImageWrapper}>{item.url ? <Image source={{ uri: item.url }} style={styles.fullscreenImage} contentFit="contain" /> : null}</View>)} />
          {viewerIndex !== null && (<View style={[styles.captionInputContainer, { bottom: insets.bottom + 20 }]}><BottomSheetTextInput style={styles.captionInput} placeholder="Add a caption..." placeholderTextColor="#a1a1aa" value={currentActiveCaption} onChangeText={handleUpdateCaption} multiline maxLength={150} blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} /></View>)}
        </View>
      </Modal>

      <Modal visible={showTagModal} animationType="slide" transparent onRequestClose={() => setShowTagModal(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowTagModal(false)}>
          <TouchableWithoutFeedback><View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={styles.modalHeader}><Text style={[styles.modalTitle, { color: theme.text }]}>Manage Tags</Text><TouchableOpacity onPress={() => setShowTagModal(false)}><Text style={{ color: theme.text, fontSize: 24 }}>✕</Text></TouchableOpacity></View>
            <ScrollView style={{ padding: 16 }}>
              <TouchableOpacity
                style={[
                  styles.clearTagsButton,
                  {
                    backgroundColor: colorScheme === 'dark' ? '#3a1f1f' : '#fee2e2',
                    borderColor: colorScheme === 'dark' ? '#7f1d1d' : '#fca5a5',
                    opacity: pinTags?.length ? 1 : 0.5,
                  },
                ]}
                onPress={handleClearAllTags}
                disabled={!pinTags?.length || isClearingTags}
              >
                <Text style={styles.clearTagsButtonText}>{isClearingTags ? 'Clearing...' : 'Clear Tags'}</Text>
              </TouchableOpacity>
              {Object.entries(tagsByCategory).map(([category, tags]: [string, any]) => (
                <View key={category} style={{ marginBottom: 20 }}><Text style={[styles.categoryTitle, { color: theme.text }]}>{category}</Text>
                  <View style={styles.tagOptionRow}>{tags.map((tag: any) => {
                    const isSelected = pinTags?.some((t: any) => t._id === tag._id);
                    return (<TouchableOpacity key={tag._id} onPress={() => toggleTagSelection(tag)} style={[styles.tagOption, { backgroundColor: isSelected ? (tag.color || "#3b82f6") : (colorScheme === 'dark' ? '#333' : "#e5e7eb"), borderWidth: 1, borderColor: colorScheme === 'dark' ? '#444' : '#ccc' }]}><Text style={{ color: isSelected ? "#fff" : theme.text }}>{tag.name}</Text></TouchableOpacity>);
                  })}</View>
                </View>
              ))}
              <View style={[styles.createTagSection, { borderTopColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}><Text style={[styles.categoryTitle, { color: theme.text }]}>Create New Tag</Text>
                <BottomSheetTextInput value={newTagName} onChangeText={setNewTagName} placeholder="Tag name..." placeholderTextColor="#666" style={[styles.newTagInput, { color: theme.text, borderColor: colorScheme === 'dark' ? '#444' : '#ccc' }]} />
                <View style={styles.colorRow}>{["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"].map(color => (<TouchableOpacity key={color} onPress={() => setSelectedColor(color)} style={[styles.colorCircle, { backgroundColor: color, borderWidth: selectedColor === color ? 3 : 0, borderColor: theme.text }]} />))}</View>
                <TouchableOpacity style={styles.createTagButton} onPress={handleCreateTag}><Text style={styles.createTagButtonText}>Create & Link Tag</Text></TouchableOpacity>
              </View>
              <TouchableOpacity style={[styles.saveButton, { marginTop: 20, marginBottom: 40, width: '100%' }]} onPress={() => setShowTagModal(false)}><Text style={styles.saveButtonText}>Done</Text></TouchableOpacity>
            </ScrollView>
          </View></TouchableWithoutFeedback>
        </TouchableOpacity>
      </Modal>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  handleContainer: { width: '100%', alignItems: 'center', paddingTop: 12, paddingBottom: 10 },
  handleIndicator: { width: 40, height: 4, borderRadius: 2 },
  contentContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  topNavRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  imageScroll: { marginBottom: 20 },
  nearbyArrowButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center' },
  nearbyArrowButtonLeft: { alignSelf: 'flex-start' },
  nearbyArrowButtonRight: { alignSelf: 'flex-end' },
  addImageButton: { width: 100, height: 120, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  imagePreviewContainer: { width: 100, height: 120, borderRadius: 12, overflow: 'hidden', marginRight: 10 },
  previewImage: { width: '100%', height: '100%', borderRadius: 12 },
  removeImageButton: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
  removeImageText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  formContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleInput: { fontSize: 24, fontWeight: '700', flex: 1, marginRight: 10 },
  dateText: { fontSize: 14 },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 },
  tagTriggerContainer: { flex: 1, marginRight: 10 },
  tagFlow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  smallAddTagButton: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  metaButton: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 4, fontSize: 14 },
  addressContainer: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'flex-end', marginLeft: 15, maxWidth: '65%' },
  addressText: { marginLeft: 4, fontSize: 14, textAlign: 'left', flexShrink: 1 },
  selectedTagPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  selectedTagText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  notesAndSaveRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, marginBottom: 20 },
  notesAndSaveRowExpanded: { flex: 1 },
  notesInput: { flex: 1, fontSize: 14, paddingVertical: 8, marginRight: 10, maxHeight: 60 },
  notesInputExpanded: { flex: 1, maxHeight: '100%', textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  toastContainer: { position: 'absolute', left: '20%', right: '20%', backgroundColor: 'rgba(0,0,0,0.8)', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 25, alignItems: 'center', zIndex: 2000 },
  toastText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "85%", minHeight: "50%" },
  modalHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  categoryTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  tagOptionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tagOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16 },
  groupSelectorContainer: { marginBottom: 14 },
  groupSelectorLabel: { fontSize: 13, fontWeight: "600", marginBottom: 8, opacity: 0.8 },
  groupSelectorRow: { flexDirection: "row", gap: 8 },
  groupSelectorChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1 },
  galleryOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.95)', zIndex: 999 },
  fullscreenCloseButton: { position: 'absolute', right: 20, zIndex: 1000, padding: 10, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
  fullscreenCloseText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  fullscreenImageWrapper: { width: screenWidth, height: screenHeight, justifyContent: 'center', alignItems: 'center' },
  fullscreenImage: { width: '100%', height: '100%' },
  captionInputContainer: { position: 'absolute', width: '90%', alignSelf: 'center', backgroundColor: 'rgba(28, 28, 30, 0.85)', borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)', zIndex: 1000 },
  captionInput: { color: '#ffffff', fontSize: 15, maxHeight: 100 },
  createTagSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1 },
  newTagInput: { borderWidth: 1, padding: 10, borderRadius: 6, marginBottom: 12 },
  colorRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  colorCircle: { width: 40, height: 40, borderRadius: 20 },
  createTagButton: { backgroundColor: '#000', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  createTagButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  clearTagsButton: { marginTop: 10, marginBottom: 20, borderWidth: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', paddingBottom: 10 },
  clearTagsButtonText: { color: '#dc2626', fontWeight: '700', fontSize: 14, paddingBottom: 2 },
});
