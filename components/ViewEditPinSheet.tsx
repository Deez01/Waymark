// components/ViewEditPinSheet.tsx
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Keyboard, ScrollView, Dimensions, Platform } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

interface ViewEditPinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pin: any | null; // Pass the selected pin object
}

export default function ViewEditPinSheet({ isOpen, onClose, pin }: ViewEditPinSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? Colors.dark : Colors.light;

  const [dynamicSnap, setDynamicSnap] = useState(Dimensions.get('window').height * 0.7);
  const snapPoints = useMemo(() => ['4%', '45%', dynamicSnap], [dynamicSnap]);
  const [sheetIndex, setSheetIndex] = useState(0);

  // Local state for edits
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state when a new pin is passed in or sheet opens
  useEffect(() => {
    if (isOpen && pin) {
      setTitle(pin.title || '');
      setDescription(pin.caption || pin.description || ''); // Handle however you saved the caption/notes
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.close();
      Keyboard.dismiss();
    }
  }, [isOpen, pin]);

  // Adjust snap points for keyboard (similar to AddPinSheet)
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', (e) => {
      let kbHeight = e.endCoordinates.height;
      if (Platform.OS === 'android' && kbHeight < 100) {
        const screenHeight = Dimensions.get('screen').height;
        const windowHeight = Dimensions.get('window').height;
        kbHeight = screenHeight - windowHeight;
      }
      setDynamicSnap(kbHeight + 320);
      setTimeout(() => bottomSheetRef.current?.snapToIndex(2), 10);
    });

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      bottomSheetRef.current?.snapToIndex(1);
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
      // TODO: Hook this up to your Convex mutation to update the pin
      // Example: await updatePin({ id: pin._id, title, description });
      console.log("Updating pin...", { id: pin._id, title, description });

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
      backgroundStyle={[styles.sheetBackground, { backgroundColor: theme.background }]}
      handleIndicatorStyle={[styles.handleIndicator, { backgroundColor: colorScheme === 'dark' ? '#444' : '#ddd' }]}
    >
      <BottomSheetScrollView style={styles.scrollWrapper} contentContainerStyle={styles.contentContainer} keyboardShouldPersistTaps="handled">
        {/* Images Placeholder */}
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
