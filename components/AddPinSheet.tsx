import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Keyboard, ScrollView, Modal, Alert } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useMutation, useQuery } from 'convex/react';
import * as Location from 'expo-location';
import { api } from '@/convex/_generated/api';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface AddPinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
  initialTitle?: string;
  initialAddress?: string;
}

export default function AddPinSheet({ isOpen, onClose, initialLat, initialLng, initialTitle, initialAddress }: AddPinSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%', '85%'], []);
  const [sheetIndex, setSheetIndex] = useState(0);

  const createPin = useMutation(api.pins.createPin);
  const allTags = useQuery(api.pinTags.getAllTags);
  const createTag = useMutation(api.pinTags.createTag);
  const addTagToPin = useMutation(api.pinTags.addTagToPin);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(0);

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
    }
  }, [isOpen, initialLat, initialLng, initialTitle, initialAddress]);

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

  const handleCreate = async () => {
    if (!title || lat === null || lng === null) return;
    setIsSubmitting(true);
    try {
      const newPinId = await createPin({
        ownerId: "temp_user_id",
        title,
        description,
        address,
        lat,
        lng,
        category: 'general',
      });

      if (selectedTags.length > 0) {
        await Promise.all(
          selectedTags.map(tag => addTagToPin({ pinId: newPinId, tagId: tag._id }))
        );
      }
      onClose();
    } catch (e: any) {
      console.error('Failed to create pin: ', e.message);
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
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          <TouchableOpacity style={styles.addImageButton}>
            <IconSymbol name="plus" size={32} color="#000" />
          </TouchableOpacity>
          <View style={styles.placeholderImageBox}>
            <IconSymbol name="photo" size={32} color="#ccc" />
          </View>
        </ScrollView>

        <View style={styles.formContainer}>
          <View style={styles.titleRow}>
            <BottomSheetTextInput
              style={styles.titleInput}
              placeholder="Location Name"
              placeholderTextColor="#888"
              value={title}
              onChangeText={setTitle}
              onFocus={() => bottomSheetRef.current?.snapToIndex(1)}
            />
            <Text style={styles.dateText}>{currentDate}</Text>
          </View>

          <View style={styles.metaRow}>
            <TouchableOpacity style={styles.metaButton} onPress={() => setShowTagModal(true)}>
              <IconSymbol name="star" size={14} color="#666" />
              <Text style={styles.metaText}>Tags +</Text>
            </TouchableOpacity>

            <View style={styles.addressContainer}>
              <IconSymbol name="mappin.and.ellipse" size={14} color="#666" />
              <Text style={styles.addressText} numberOfLines={2}>{address || "Locating..."}</Text>
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

          <View style={[styles.notesAndSaveRow, sheetIndex === 1 && styles.notesAndSaveRowExpanded]}>
            <BottomSheetTextInput
              style={[styles.notesInput, sheetIndex === 1 && styles.notesInputExpanded]}
              placeholder="Add Notes..."
              placeholderTextColor="#aaa"
              multiline={true}
              value={description}
              onChangeText={setDescription}
              onFocus={() => bottomSheetRef.current?.snapToIndex(1)}
            />

            <TouchableOpacity
              style={[styles.saveButton, (!title || lat === null) && styles.saveButtonDisabled]}
              onPress={handleCreate}
              disabled={isSubmitting || !title || lat === null}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Save Pin</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetView>

      <Modal visible={showTagModal} animationType="slide" transparent={true} onRequestClose={() => setShowTagModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Tags</Text>
              <TouchableOpacity onPress={() => setShowTagModal(false)}>
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: 16 }}>
              {Object.entries(tagsByCategory).map(([category, tags]: [string, any]) => (
                <View key={category} style={{ marginBottom: 20 }}>
                  <Text style={styles.categoryTitle}>{category}</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {tags && tags.map((tag: any) => {
                      const isSelected = selectedTags.some(t => t._id === tag._id);
                      return (
                        <TouchableOpacity
                          key={tag._id}
                          onPress={() => toggleTagSelection(tag)}
                          style={[styles.tagOption, { backgroundColor: isSelected ? (tag.color || "#3b82f6") : "#e5e7eb", borderWidth: isSelected ? 0 : 1 }]}
                        >
                          <Text style={[styles.tagOptionText, { color: isSelected ? "#fff" : "#000" }]}>{tag.name}{isSelected ? " ✓" : ""}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              <View style={styles.createTagSection}>
                <Text style={styles.categoryTitle}>Create New Tag</Text>
                <TextInput value={newTagName} onChangeText={setNewTagName} placeholder="Tag name..." placeholderTextColor="#666" style={styles.newTagInput} />
                <Text style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>Choose a color:</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                  {["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899"].map((color) => (
                    <TouchableOpacity key={color} onPress={() => setSelectedColor(color)} style={[styles.colorCircle, { backgroundColor: color, borderWidth: selectedColor === color ? 3 : 0 }]} />
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
  sheetBackground: { borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#fff' },
  handleIndicator: { width: 40, backgroundColor: '#ddd' },
  contentContainer: { flex: 1, paddingHorizontal: 20, paddingTop: 10 },
  imageScroll: { flexGrow: 0, marginBottom: 20 },
  addImageButton: { width: 100, height: 120, backgroundColor: '#f0f0f0', borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  placeholderImageBox: { width: 100, height: 120, backgroundColor: '#fafafa', borderRadius: 12, borderWidth: 1, borderColor: '#eee', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  formContainer: { flex: 1 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleInput: { fontSize: 24, fontWeight: '700', color: '#000', flex: 1, marginRight: 10 },
  dateText: { fontSize: 14, color: '#888' },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  metaButton: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 4, fontSize: 14, color: '#666' },
  addressContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-end', marginLeft: 15 },
  addressText: { marginLeft: 4, fontSize: 14, color: '#666', textAlign: 'right', flexShrink: 1 },

  selectedTagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 15 },
  selectedTagPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  selectedTagText: { color: '#fff', fontSize: 12, fontWeight: '500' },

  notesAndSaveRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, marginBottom: 20 },
  notesAndSaveRowExpanded: { flex: 1, alignItems: 'flex-start' },
  notesInput: { flex: 1, fontSize: 14, color: '#333', paddingVertical: 8, marginRight: 10, maxHeight: 60 },
  notesInputExpanded: { flex: 1, maxHeight: '100%', textAlignVertical: 'top' },

  saveButton: { backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20 },
  saveButtonDisabled: { backgroundColor: '#ccc' },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: 'flex-end' },
  modalContent: { backgroundColor: "#fff", borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: "85%", minHeight: "50%" },
  modalHeader: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modalTitle: { fontSize: 18, fontWeight: "600" },
  modalCloseText: { fontSize: 24, color: "#000" },
  categoryTitle: { fontSize: 14, fontWeight: "600", marginBottom: 10 },
  tagOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderColor: "#ccc" },
  tagOptionText: { fontSize: 13, fontWeight: "500" },
  createTagSection: { marginTop: 20, paddingTop: 16, borderTopWidth: 1, borderTopColor: "#e5e7eb", paddingBottom: 40 },
  newTagInput: { borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6, backgroundColor: "#fff", color: "#000", marginBottom: 12 },
  colorCircle: { width: 40, height: 40, borderRadius: 20, borderColor: "#000" },
  createTagButton: { backgroundColor: '#000', paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  createTagButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 }
});
