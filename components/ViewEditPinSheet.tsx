// components/ViewEditPinSheet.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Keyboard, ScrollView, Dimensions, Platform, BackHandler, Modal, Alert } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ViewEditPinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pin: any | null;
  minimizeTrigger?: number;
  openTrigger?: number;
}

export default function ViewEditPinSheet({ isOpen, onClose, pin, minimizeTrigger, openTrigger }: ViewEditPinSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [dynamicSnap, setDynamicSnap] = useState(Dimensions.get('window').height * 0.7);
  const snapPoints = useMemo(() => ['4%', '45%', dynamicSnap], [dynamicSnap]);
  const [sheetIndex, setSheetIndex] = useState(0);

  // --- Convex Queries & Mutations ---
  const updatePin = useMutation(api.pins.updatePin);
  const allTags = useQuery(api.pinTags.getAllTags);
  const pinTags = useQuery(api.pinTags.getTagsForPin, pin ? { pinId: pin._id } : "skip");
  const createTag = useMutation(api.pinTags.createTag);
  const addTagToPin = useMutation(api.pinTags.addTagToPin);
  const removeTagFromPin = useMutation(api.pinTags.removeTagFromPin);

  // --- State ---
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [selectedColor, setSelectedColor] = useState("#3b82f6");

  // Organize tags by category for the modal
  const tagsByCategory = allTags ? allTags.reduce((acc: any, tag: any) => {
    const category = tag.category || "Other";
    if (!acc[category]) acc[category] = [];
    acc[category].push(tag);
    return acc;
  }, {}) : {};

  // --- Smooth Snapping Logic ---
  const programmaticSnapRef = useRef(false);
  const programmaticTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
    if (isOpen && pin) {
      setTitle(pin.title || '');
      setDescription(pin.caption || pin.description || '');
      snapTo(1);
    } else {
      bottomSheetRef.current?.close();
      Keyboard.dismiss();
    }
  }, [isOpen, pin, openTrigger]);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      if (!isOpen) return;

      let kbHeight = e.endCoordinates.height;
      if (Platform.OS === 'android' && kbHeight < 100) {
        const screenHeight = Dimensions.get('screen').height;
        const windowHeight = Dimensions.get('window').height;
        kbHeight = screenHeight - windowHeight;
      }
      setDynamicSnap(kbHeight + 320);
      setTimeout(() => snapTo(2), 10);
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

  // --- Tag Logic ---
  const toggleTagSelection = async (tag: any) => {
    if (!pin) return;
    const isSelected = pinTags?.some((t: any) => t._id === tag._id);
    try {
      if (isSelected) {
        await removeTagFromPin({ pinId: pin._id, tagId: tag._id });
      } else {
        await addTagToPin({ pinId: pin._id, tagId: tag._id });
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to toggle tag");
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      Alert.alert("Error", "Tag name cannot be empty");
      return;
    }
    try {
      const newTagId = await createTag({ name: newTagName, color: selectedColor });
      if (pin) {
        await addTagToPin({ pinId: pin._id, tagId: newTagId });
      }
      setNewTagName("");
      setSelectedColor("#3b82f6");
    } catch (err: any) {
      Alert.alert("Error", err?.message ?? "Failed to create tag");
    }
  };

  const handleUpdate = async () => {
    if (!pin) return;
    setIsSubmitting(true);
    try {
      await updatePin({
        pinId: pin._id,
        title,
        description,
        caption: description
      });
      onClose();
    } catch (e: any) {
      console.error('Failed to update pin: ', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!pin) return null;

  // Format the date the pin was created (or fallback to today)
  const displayDate = pin.createdAt
    ? new Date(pin.createdAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
    : new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      onChange={setSheetIndex}
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
      <BottomSheetScrollView style={styles.scrollWrapper} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          <TouchableOpacity style={[styles.addImageButton, { backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f0f0f0' }]}>
            <IconSymbol name="plus" size={32} color={theme.text} />
          </TouchableOpacity>
        </ScrollView>

        <View style={styles.formContainer}>
          <View style={styles.titleRow}>
            <TextInput
              style={[styles.titleInput, { color: theme.text }]}
              placeholder="Location Name"
              placeholderTextColor={colorScheme === 'dark' ? '#666' : '#888'}
              value={title}
              onChangeText={setTitle}
              onFocus={() => snapTo(2)}
            />
            <Text style={[styles.dateText, { color: colorScheme === 'dark' ? '#666' : '#888' }]}>{displayDate}</Text>
          </View>

          <View style={styles.metaRow}>
            <TouchableOpacity style={styles.metaButton} onPress={() => setShowTagModal(true)}>
              <IconSymbol name="star" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
              <Text style={[styles.metaText, { color: colorScheme === 'dark' ? '#888' : '#666' }]}>Tags +</Text>
            </TouchableOpacity>

            <View style={styles.addressContainer}>
              <IconSymbol name="mappin.and.ellipse" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
              <Text style={[styles.addressText, { color: colorScheme === 'dark' ? '#888' : '#666' }]} numberOfLines={2}>
                {pin.address || "No address provided"}
              </Text>
            </View>
          </View>

          {/* Render Selected Tags */}
          {pinTags && pinTags.length > 0 && (
            <View style={styles.selectedTagsContainer}>
              {pinTags.map((tag: any) => (
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
              style={styles.saveButton}
              onPress={handleUpdate}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveButtonText}>Update</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetScrollView>

      {/* Tags Modal */}
      <Modal visible={showTagModal} animationType="slide" transparent={true} onRequestClose={() => setShowTagModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colorScheme === 'dark' ? '#333' : '#e5e7eb' }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Manage Tags</Text>
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
                      const isSelected = pinTags?.some((t: any) => t._id === tag._id);
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
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },

  // Modal styles
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
  }
});
