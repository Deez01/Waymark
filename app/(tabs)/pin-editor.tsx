import { IconSymbol } from '@/components/ui/icon-symbol';
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function PinEditorScreen() {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [sharedWith, setSharedWith] = useState("");

  useEffect(() => {
    // load draft if present
    (async () => {
      try {
        const json = await AsyncStorage.getItem('draftPin');
        if (json) {
          const data = JSON.parse(json);
          setImageUri(data.imageUri ?? null);
          setDescription(data.description ?? '');
          setTags((data.tags ?? []).join(', '));
        }
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  async function handleSave() {
    setLoading(true);
    try {
      const payload = {
        imageUri,
        description,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
        updatedAt: Date.now(),
      };
      await AsyncStorage.setItem('draftPin', JSON.stringify(payload));
      Alert.alert('Saved', 'Draft pin saved locally.');
    } catch (e) {
      Alert.alert('Error', 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    await AsyncStorage.removeItem('draftPin');
    setImageUri(null);
    setDescription('');
    setTags('');
    setLocation('');
    setSharedWith('');
  }

  function pickImagePlaceholder() {
    // Placeholder handler — replace with real image picker when ready
    // We'll toggle a sample placeholder image to simulate selection
    if (imageUri) {
      setImageUri(null);
    } else {
      setImageUri('https://via.placeholder.com/600x400.png?text=Photo');
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.pinEditorTitle}>Pin Editor</Text>
      </View>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
        <Text style={styles.label}>Photo</Text>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImagePlaceholder}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.imagePreview} />
          ) : (
            <View style={styles.emptyImage}>
              <IconSymbol name="photo" size={36} color="#9CA3AF" />
              <Text style={styles.emptyImageText}>Tap to add photo</Text>
            </View>
          )}
        </TouchableOpacity>

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="Write a description for this pin"
          placeholderTextColor="#6b7280"
          multiline
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Tags (comma separated)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. hiking, waterfall"
          placeholderTextColor="#6b7280"
          value={tags}
          onChangeText={setTags}
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          placeholderTextColor="#6b7280"
          value={location}
          onChangeText={setLocation}
        />

        <Text style={styles.label}>Shared With</Text>
        <TextInput
          style={styles.input}
          placeholder=""
          placeholderTextColor="#6b7280"
          value={sharedWith}
          onChangeText={setSharedWith}
        />

        <View style={styles.row}>
          <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} disabled={loading}>
            <Text style={styles.buttonText}>{loading ? 'Saving...' : 'Save Draft'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.clearButton]} onPress={handleClear}>
            <Text style={styles.clearText}>Delete Pin</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 0, justifyContent: 'flex-start' },
  screen: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 24, paddingTop: 18, paddingBottom: 8, backgroundColor: '#ffffff' },
  titleWrapper: { marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '700', borderBottomWidth: 0, color: '#000'},
  pinEditorTitle: {
    fontSize: 28,
    fontWeight: '700',
    borderBottomWidth: 0,
    color: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    fontFamily: "Helvetica",
    paddingTop: 40
  },
  subtitle: { marginTop: 4, color: '#6b7280' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, elevation: 2 },
  label: { color: '#6b7280', marginBottom: 6 },
  imagePicker: { marginBottom: 12, borderRadius: 8, overflow: 'hidden' },
  imagePreview: { width: '100%', height: 180, resizeMode: 'cover' },
  emptyImage: { height: 180, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center' },
  emptyImageText: { color: '#9CA3AF', marginTop: 6 },
  input: { height: 44, borderWidth: 1, borderColor: '#E6E6E6', borderRadius: 8, paddingHorizontal: 12, marginBottom: 12, color: '#111' },
  multiline: { height: 120, textAlignVertical: 'top', paddingTop: 12 },
  row: { flexDirection: 'row', gap: 8 },
  button: { flex: 1, height: 48, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  saveButton: { backgroundColor: '#2563eb' },
  clearButton: { backgroundColor: '#F3F4F6', borderWidth: 1, borderColor: '#E6E6E6' },
  buttonText: { color: '#fff', fontWeight: '600' },
  clearText: { color: '#111' },
});
