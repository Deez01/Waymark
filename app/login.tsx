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

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function validate() {
    if (!email.trim()) return "Please enter your email";
    // simple email check
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return "Please enter a valid email";
    if (!password) return "Please enter your password";
    if (password.length < 8) return "Password must be at least 8 characters";
    return null;
  }

  async function handleLogin() {
    setError(null);
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setLoading(true);
    try {
      // UI-only mode: simulate async login and store a dummy token.
      // Replace this with real auth logic when backend is ready.
      await new Promise((r) => setTimeout(r, 800));
      await AsyncStorage.setItem("userToken", "dummy-token");

      // after login, navigate to main tabs
      router.replace("/(tabs)");
    } catch (e) {
      console.error(e);
      setError("Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.background}>
      {/* <View style={styles.titleWrapper}>
        <Text style={styles.appTitle}>Waymark</Text>
      </View> */}
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'on-drag' : 'interactive'}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
        <Text style={styles.subAppTitle}>Welcome to</Text>
          <View style={styles.titleWrapper}>
            <Text style={styles.appTitle}>Waymark</Text>
          </View>
          <Text style={styles.title}></Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

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
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Sign in</Text>
            )}
          </TouchableOpacity>

          <View style={styles.row}>
            <TouchableOpacity onPress={() => router.push("/register")}>
              <Text style={styles.link}>Create an account</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => router.push("/forgot")}>
              <Text style={styles.link}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  background: { flex: 1, backgroundColor: '#ffffff' },
  titleWrapper: { width: '100%', alignItems: 'center', marginTop: 12, marginBottom: 8 },
  container: { flex: 1, justifyContent: "center", padding: 24 },
  scrollContainer: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  card: { backgroundColor: "#fff", borderRadius: 12, padding: 2, elevation: 3 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 4 },
  subtitle: { color: "#000000ff", marginBottom: 16 },
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
    backgroundColor: "#7297e7ff",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontWeight: "600" },
  row: { flexDirection: "row", justifyContent: "space-between", marginTop: 12 },
  link: { color: "#000000ff", fontWeight: "600" },
  error: { color: "#dc2626", marginTop: 4 },
  appTitle: {
    fontSize: 64,
    fontWeight: "800",
    color: "#000000ff",
    textAlign: "center",
    fontFamily: "Helvetica",
    fontStyle: "italic",
  },
  subAppTitle: {
    fontSize: 24,
    color: "#000000ff",
    textAlign: "center",
    fontStyle: "italic",
  }
});
