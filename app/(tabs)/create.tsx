import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation } from 'convex/react';
import * as Location from 'expo-location'; // <--- 1. Import Location
import { api } from '@/convex/_generated/api';
import { Colors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function CreatePinScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const createPin = useMutation(api.pins.createPin);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false); // <--- New state for location loading

  // Auto-fill from Map Long Press
  useEffect(() => {
    if (params.lat && params.lng) {
      setLat(params.lat as string);
      setLng(params.lng as string);
    }
  }, [params.lat, params.lng]);

  // NEW: Function to get current location
  const handleGetLocation = async () => {
    setIsLocating(true);
    try {
      // 1. Request Permission
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Allow location access to use this feature.');
        return;
      }

      // 2. Get Location
      let location = await Location.getCurrentPositionAsync({});
      setLat(location.coords.latitude.toString());
      setLng(location.coords.longitude.toString());
    } catch (error) {
      Alert.alert('Error', 'Could not fetch location.');
    } finally {
      setIsLocating(false);
    }
  };

  const ownerId = "temp_user_id";

  const handleCreate = async () => {
    if (!title || !lat || !lng) {
      Alert.alert('Missing Fields', 'Title and Location are required.');
      return;
    }
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      Alert.alert('Invalid Location', 'Latitude and Longitude must be valid numbers.');
      return;
    }

    setIsSubmitting(true);
    try {
      await createPin({
        ownerId,
        title,
        description,
        lat: latitude,
        lng: longitude,
        category: 'general',
        createdAt: Date.now(),
      });
      Alert.alert('Success', 'Waymark created!');
      setTitle('');
      setDescription('');
      setLat('');
      setLng('');
      router.push('/(tabs)');
    } catch (e: any) {
      Alert.alert('Error', 'Failed to create pin: ' + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const themeColors = Colors[colorScheme ?? 'light'];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.header, { color: themeColors.text }]}>New Waymark</Text>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: themeColors.text }]}>Title *</Text>
        <TextInput
          style={[styles.input, { color: themeColors.text, borderColor: themeColors.icon }]}
          placeholder="e.g., Secret Sunset Spot"
          placeholderTextColor="#888"
          value={title}
          onChangeText={setTitle}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: themeColors.text }]}>Location *</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { flex: 1, marginRight: 8, color: themeColors.text, borderColor: themeColors.icon }]}
            placeholder="Latitude"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={lat}
            onChangeText={setLat}
          />
          <TextInput
            style={[styles.input, { flex: 1, color: themeColors.text, borderColor: themeColors.icon }]}
            placeholder="Longitude"
            placeholderTextColor="#888"
            keyboardType="numeric"
            value={lng}
            onChangeText={setLng}
          />
        </View>

        {/* Updated Button */}
        <TouchableOpacity
          style={styles.locationButton}
          onPress={handleGetLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <IconSymbol name="location.fill" size={16} color="#fff" />
              <Text style={styles.locationButtonText}>Get Current Location</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.formGroup}>
        <Text style={[styles.label, { color: themeColors.text }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea, { color: themeColors.text, borderColor: themeColors.icon }]}
          placeholder="What makes this place special?"
          placeholderTextColor="#888"
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />
      </View>

      <TouchableOpacity
        style={[styles.createButton, { backgroundColor: themeColors.tint }]}
        onPress={handleCreate}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.createButtonText}>Create Pin</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24, paddingTop: 60 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 30 },
  formGroup: { marginBottom: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 16, fontSize: 16 },
  textArea: { height: 100, textAlignVertical: 'top' },
  row: { flexDirection: 'row', marginBottom: 10 },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#34C759',
    padding: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    minWidth: 160,
  },
  locationButtonText: { color: '#fff', fontWeight: '600', marginLeft: 6 },
  createButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  createButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
