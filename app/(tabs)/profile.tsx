import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Profile = {
  phone?: string | null;
  email?: string | null;
  username?: string | null;
  token?: string | null;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const token = await AsyncStorage.getItem("userToken");
        // try a stored profile object first
        const profileJson = await AsyncStorage.getItem("userProfile");
        let parsed: any = null;
        if (profileJson) {
          try {
            parsed = JSON.parse(profileJson);
          } catch (e) {
            // ignore parse errors
            parsed = null;
          }
        }

        // fallback to individual keys
        const phone = parsed?.phone ?? (await AsyncStorage.getItem("userPhone"));
        const email = parsed?.email ?? (await AsyncStorage.getItem("userEmail"));
        const username = parsed?.username ?? (await AsyncStorage.getItem("username"));

        if (mounted) {
          setProfile({ phone, email, username, token });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function signOut() {
    setLoading(true);
    try {
      await AsyncStorage.removeItem("userToken");
      // optional: remove profile fields
      await AsyncStorage.removeItem("userProfile");
      await AsyncStorage.removeItem("userPhone");
      await AsyncStorage.removeItem("userEmail");
      await AsyncStorage.removeItem("username");
      router.replace("/login");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.titleWrapper}>
        <Text style={styles.appTitle}>Waymark</Text>
        <Text style={styles.subtitle}>Profile</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#0a7ea4" />
      ) : (
        <View style={styles.card}>
          <View style={styles.rowItem}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{profile.phone ?? 'Not available'}</Text>
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{profile.email ?? 'Not available'}</Text>
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.label}>Username</Text>
            <Text style={styles.value}>{profile.username ?? 'Not available'}</Text>
          </View>

          <View style={styles.rowItem}>
            <Text style={styles.label}>Token</Text>
            <Text style={styles.value}>{profile.token ?? 'Not available'}</Text>
          </View>

          <TouchableOpacity style={styles.button} onPress={signOut} disabled={loading}>
            <Text style={styles.buttonText}>Sign out</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: 'flex-start' },
  titleWrapper: { alignItems: 'center', marginBottom: 16, paddingTop: 40 },
  appTitle: { fontSize: 36, fontWeight: '800', color: '#000', fontStyle: 'italic' },
  subtitle: { marginTop: 6, fontSize: 18, color: '#444' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20, elevation: 2 },
  rowItem: { marginBottom: 12 },
  label: { color: '#6b7280', fontSize: 13, marginBottom: 4 },
  value: { color: '#111827', fontSize: 16 },
  button: { marginTop: 12, height: 48, borderRadius: 8, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
