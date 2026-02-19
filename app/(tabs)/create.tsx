import { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useMutation } from 'convex/react';
import * as Location from 'expo-location';
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
  const [address, setAddress] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Map coordinates to address function
  const fetchAddress = async (latitude: number, longitude: number) => {
    const fallbackCoords = `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

    try {
      const result = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (result.length > 0) {
        const item = result[0];
        const formattedAddress = `${item.streetNumber || ''} ${item.street || ''}, ${item.city || ''}`.trim();
        const cleanAddress = formattedAddress.replace(/^, /, '');

        // Use address if valid, otherwise fallback to coordinates
        if (cleanAddress.length > 0) {
          setAddress(cleanAddress);
        } else {
          setAddress(fallbackCoords);
        }
      } else {
        setAddress(fallbackCoords);
      }
    } catch (e) {
      console.log("Failed to find address", e);
      setAddress(fallbackCoords);
    }
  };

  // Auto fill from Map Long Press
  useEffect(() => {
    if (params.lat && params.lng) {
      const latitude = parseFloat(params.lat as string);
      const longitude = parseFloat(params.lng as string);

      setLat(params.lat as string);
      setLng(params.lng as string);

      // Fetch address for the given coordinates
      fetchAddress(latitude, longitude);
    }
  }, [params.lat, params.lng]);

  // Function to get current location
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
      const latitude = location.coords.latitude;
      const longitude = location.coords.longitude;

      setLat(latitude.toString());
      setLng(longitude.toString());

      // Fetch address for current location
      await fetchAddress(latitude, longitude);

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
        address, // Sent to Convex database (will be either physical address or coordinates)
        lat: latitude,
        lng: longitude,
        category: 'general',
      });
      Alert.alert('Success', 'Waymark created!');

      // Reset form
      setTitle('');
      setDescription('');
      setAddress('');
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

        {/* Address Display - Now permanently visible */}
        <View style={styles.addressBox}>
          <IconSymbol name="mappin.and.ellipse" size={16} color="#666" />
          <Text style={[styles.addressText, !address && { color: '#888' }]}>
            {address || "No location selected"}
          </Text>
        </View>

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
  addressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8
  },
  addressText: { marginLeft: 6, color: '#333', fontWeight: '500', flexShrink: 1 },
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
