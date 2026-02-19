import React, { useRef, useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ActivityIndicator, Keyboard, ScrollView } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';
import { useMutation } from 'convex/react';
import * as Location from 'expo-location';
import { api } from '@/convex/_generated/api';
import { IconSymbol } from '@/components/ui/icon-symbol';

interface AddPinSheetProps {
  isOpen: boolean;
  onClose: () => void;
  initialLat?: number;
  initialLng?: number;
}

export default function AddPinSheet({ isOpen, onClose, initialLat, initialLng }: AddPinSheetProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '85%'], []);

  const createPin = useMutation(api.pins.createPin);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle opening and closing the sheet
  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.expand();
      if (initialLat && initialLng) {
        setLat(initialLat);
        setLng(initialLng);
        fetchAddress(initialLat, initialLng);
      } else {
        handleGetLocation(); // Auto-locate if opened via the + tab button
      }
    } else {
      bottomSheetRef.current?.close();
      Keyboard.dismiss();
    }
  }, [isOpen, initialLat, initialLng]);

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
      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      setLat(latitude);
      setLng(longitude);
      await fetchAddress(latitude, longitude);
    } catch (error) {
      console.log('Could not fetch location', error);
    }
  };

  const handleCreate = async () => {
    if (!title || lat === null || lng === null) return;

    setIsSubmitting(true);
    try {
      await createPin({
        ownerId: "temp_user_id",
        title,
        description,
        address,
        lat,
        lng,
        category: 'general',
      });

      // Reset and close
      setTitle('');
      setDescription('');
      setAddress('');
      setLat(null);
      setLng(null);
      onClose();
    } catch (e: any) {
      console.error('Failed to create pin: ', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get current date for the UI
  const currentDate = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1} // Starts closed
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <BottomSheetView style={styles.contentContainer}>

        {/* Placeholder for Image Carousel */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll}>
          <TouchableOpacity style={styles.addImageButton}>
            <IconSymbol name="plus" size={32} color="#000" />
          </TouchableOpacity>
          <View style={styles.placeholderImageBox}>
            <IconSymbol name="photo" size={32} color="#ccc" />
          </View>
        </ScrollView>

        {/* Form Inputs */}
        <View style={styles.formContainer}>
          <View style={styles.titleRow}>
            <TextInput
              style={styles.titleInput}
              placeholder="Location Name"
              placeholderTextColor="#888"
              value={title}
              onChangeText={setTitle}
            />
            <Text style={styles.dateText}>{currentDate}</Text>
          </View>

          <View style={styles.metaRow}>
            <TouchableOpacity style={styles.metaButton}>
              <IconSymbol name="star" size={14} color="#666" />
              <Text style={styles.metaText}>Tags +</Text>
            </TouchableOpacity>

            <View style={styles.metaButton}>
              <IconSymbol name="mappin.and.ellipse" size={14} color="#666" />
              <Text style={styles.metaText} numberOfLines={1}>{address || "Locating..."}</Text>
            </View>
          </View>

          <TextInput
            style={styles.notesInput}
            placeholder="Add Notes"
            placeholderTextColor="#888"
            multiline
            value={description}
            onChangeText={setDescription}
          />
        </View>

        {/* Save Button */}
        <View style={styles.footer}>
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

      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBackground: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: '#fff',
  },
  handleIndicator: {
    width: 40,
    backgroundColor: '#ddd',
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  imageScroll: {
    flexGrow: 0,
    marginBottom: 20,
  },
  addImageButton: {
    width: 100,
    height: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  placeholderImageBox: {
    width: 100,
    height: 120,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  formContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    flex: 1,
    marginRight: 10,
  },
  dateText: {
    fontSize: 14,
    color: '#888',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  metaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  metaText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#666',
  },
  notesInput: {
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    alignItems: 'flex-end',
    paddingBottom: 30,
  },
  saveButton: {
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
