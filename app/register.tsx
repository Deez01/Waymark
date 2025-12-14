import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

function BackButton() {
  const router = useRouter();
  return (
    <TouchableOpacity style={styles.back} onPress={() => router.back()}>
      <Text style={styles.backText}>← Back</Text>
    </TouchableOpacity>
  );
}

export default function RegisterScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate() {
    if (!phone.trim()) return "Please enter your phone number";
    if (!email.trim()) return "Please enter your email";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Please enter a valid email";
    if (!username.trim()) return "Please choose a username";
    if (!password) return "Please enter a password";
    if (password.length < 8) return "Password must be at least 8 characters";
    return null;
  }

  async function handleRegister() {
    setError(null);
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    try {
      // Simulate async registration; replace with real API call later
      await new Promise((r) => setTimeout(r, 800));
      await AsyncStorage.setItem("userToken", "dummy-token");
      router.replace("/(tabs)");
    } catch (e) {
      console.error(e);
      setError("Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.background}>
      <BackButton />
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
        showsVerticalScrollIndicator={false}
      ><View style={styles.titleWrapper}>
        <Text style={styles.appTitle}>Waymark</Text>
      </View>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Create an account</Text>

          <TextInput
            style={styles.input}
            placeholder="Phone number"
            placeholderTextColor="#6b7280"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Username"
            placeholderTextColor="#6b7280"
            value={username}
            onChangeText={setUsername}
            editable={!loading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#6b7280"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            editable={!loading}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading ? styles.buttonDisabled : null]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Create account</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#ffffff' },
  titleWrapper: {
    position: 'absolute',
    top: 150,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1,
  },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 24, elevation: 3 },
  subtitle: { color: "#000000ff", marginBottom: 16, textAlign: 'center', fontSize: 18 },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: "#e6e6e6",
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: "#fff",
    color: '#111111',
  },
  button: {
    height: 48,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontWeight: "600" },
  error: { color: "#dc2626", marginTop: 4, textAlign: 'center' },
  appTitle: {
    fontSize: 64,
    fontWeight: "800",
    color: "#000000ff",
    textAlign: "center",
    fontFamily: "Helvetica",
    fontStyle: "italic",
  },
  back: { padding: 12, position: 'absolute', top: 16, left: 12, zIndex: 10 },
  backText: { fontSize: 16, color: '#111', paddingTop: 25 },
});
