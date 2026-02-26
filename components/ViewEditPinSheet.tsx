// components/ViewEditPinSheet.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Keyboard, ScrollView, Dimensions, Platform, BackHandler } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { IconSymbol } from '@/components/ui/icon-symbol';

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ViewEditPinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pin: any | null;
  minimizeTrigger?: number;
  openTrigger?: number; // Forces the sheet to snap up even if it's already "open" at 4%
}

export default function ViewEditPinSheet({ isOpen, onClose, pin, minimizeTrigger, openTrigger }: ViewEditPinSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [dynamicSnap, setDynamicSnap] = useState(Dimensions.get('window').height * 0.7);
  const snapPoints = useMemo(() => ['4%', '45%', dynamicSnap], [dynamicSnap]);
  const [sheetIndex, setSheetIndex] = useState(0);

  const updatePin = useMutation(api.pins.updatePin);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Smooth Snapping Logic (from AddPinSheet) ---
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

  // 1. Minimize when map is dragged
  useEffect(() => {
    if (minimizeTrigger && minimizeTrigger > 0) {
      Keyboard.dismiss();
      snapTo(0);
    }
  }, [minimizeTrigger]);

  // 2. Hardware back button support
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

  // 3. Sync state when a new pin is passed in or openTrigger fires
  useEffect(() => {
    if (isOpen && pin) {
      setTitle(pin.title || '');
      setDescription(pin.caption || pin.description || '');
      snapTo(1); // Force snap up whenever triggered
    } else {
      bottomSheetRef.current?.close();
      Keyboard.dismiss();
    }
  }, [isOpen, pin, openTrigger]); // Watch openTrigger!

  // 4. Keyboard avoiding logic
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
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
      snapTo(1);
    });

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

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

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      onChange={setSheetIndex}
      // Staged Animation Logic (from AddPinSheet)
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
          </View>

          <View style={styles.metaRow}>
            <View style={styles.addressContainer}>
              <IconSymbol name="mappin.and.ellipse" size={14} color={colorScheme === 'dark' ? '#888' : '#666'} />
              <Text style={[styles.addressText, { color: colorScheme === 'dark' ? '#888' : '#666' }]} numberOfLines={2}>
                {pin.address || "No address provided"}
              </Text>
            </View>
          </View>

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
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: { borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  handleIndicator: { width: 40 },
  scrollWrapper: { flex: 1 },
  contentContainer: { flexGrow: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  imageScroll: { flexGrow: 0, marginBottom: 20 },
  addImageButton: { width: 100, height: 120, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  formContainer: { flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  titleInput: { fontSize: 24, fontWeight: '700', flex: 1, marginRight: 10 },
  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  addressContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'flex-start' },
  addressText: { marginLeft: 4, fontSize: 14, flexShrink: 1 },
  notesAndSaveRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 10, marginBottom: 20 },
  notesAndSaveRowExpanded: { flex: 1, alignItems: 'flex-start' },
  notesInput: { flex: 1, fontSize: 14, paddingVertical: 8, marginRight: 10, maxHeight: 60 },
  notesInputExpanded: { flex: 1, maxHeight: '100%', textAlignVertical: 'top' },
  saveButton: { backgroundColor: '#000', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 20 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
