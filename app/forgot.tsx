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

export default function ForgotScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function validate() {
    if (!email.trim()) return "Please enter your email";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Please enter a valid email";
    return null;
  }

  async function handleSend() {
    setError(null);
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setLoading(true);
    try {
      // Simulate network request
      await new Promise((r) => setTimeout(r, 800));
      setMessage("If an account with that email exists, a password reset link has been sent.");
      // Optionally navigate back to login after a short delay
      setTimeout(() => router.push("/login"), 1200);
    } catch (e) {
      console.error(e);
      setError("Failed to send reset link. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function BackButton() {
    const router = useRouter();
    return (
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.background}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleWrapper}>
        <Text style={styles.appTitle}>Waymark</Text>
      </View>
        <View style={styles.card}>
          <Text style={styles.subtitle}>Locked out? Enter your email and we'll send a link to reset your password!</Text>

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

          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading ? styles.buttonDisabled : null]}
            onPress={handleSend}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send reset link</Text>}
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity onPress={() => router.push('/login')}>
              <Text style={styles.link}>Back to sign in</Text>
            </TouchableOpacity>
          </View>
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
  row: { flexDirection: "row", justifyContent: "center", marginTop: 12 },
  link: { color: "#000000ff", fontWeight: "600" },
  error: { color: "#dc2626", marginTop: 4, textAlign: 'center' },
  message: { color: '#0a7ea4', marginTop: 8, textAlign: 'center' },
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
