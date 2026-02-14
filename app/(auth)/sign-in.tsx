import { Redirect } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvex, useQuery } from "convex/react";

type AuthMode = "signIn" | "signUp";

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const errorColor = colorScheme === "dark" ? "#FFB4A2" : "#B00020";
  const { signIn } = useAuthActions();
  const convex = useConvex();
  const currentUser = useQuery(api.users.getCurrentUser);
  const [mode, setMode] = useState<AuthMode>("signIn");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (currentUser === undefined) {
    return null;
  }

  if (currentUser?.profileComplete) {
    return <Redirect href="/(tabs)" />;
  }

  if (currentUser && !currentUser.profileComplete) {
    return <Redirect href="/onboarding" />;
  }

  const handleSubmit = async () => {
    if (busy) return;
    setError(null);

    const trimmedPassword = password.trim();
    if (!trimmedPassword) {
      setError("Password is required.");
      return;
    }

    try {
      setBusy(true);
      if (mode === "signIn") {
        const rawIdentifier = identifier.trim();
        if (!rawIdentifier) {
          setError("Email or username is required.");
          return;
        }

        let resolvedEmail = rawIdentifier.toLowerCase();
        if (!resolvedEmail.includes("@")) {
          const result = await convex.query(
            api.users.resolveEmailFromIdentifier,
            { identifier: resolvedEmail }
          );
          if (!result?.email) {
            setError("We couldn't find an account for that username.");
            return;
          }
          resolvedEmail = result.email;
        }

        await signIn("password", {
          email: resolvedEmail,
          password: trimmedPassword,
          flow: "signIn",
        });
        return;
      }

      const trimmedEmail = email.trim().toLowerCase();
      const trimmedUsername = username.trim().toLowerCase();

      if (!trimmedEmail) {
        setError("Email is required.");
        return;
      }

      if (!trimmedUsername) {
        setError("Username is required.");
        return;
      }

      if (trimmedUsername.includes("@")) {
        setError("Username cannot include '@'.");
        return;
      }

      const usernameAvailable = await convex.query(
        api.users.isUsernameAvailable,
        { username: trimmedUsername }
      );

      if (!usernameAvailable) {
        setError("That username is already taken.");
        return;
      }

      await signIn("password", {
        email: trimmedEmail,
        password: trimmedPassword,
        username: trimmedUsername,
        flow: "signUp",
      });
    } catch (signInError) {
      console.error(signInError);
      setError("Sign in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ThemedView style={styles.container} lightColor="#ffffff" darkColor="#151718">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.content}
      >
        <View style={[styles.card, { borderColor: theme.icon, backgroundColor: theme.background }]}>
          <ThemedText type="title">Welcome to Waymark</ThemedText>
          <ThemedText style={{ color: theme.icon }}>
            {mode === "signIn"
              ? "Sign in with your email or username."
              : "Create your account with email, username, and password."}
          </ThemedText>

          {mode === "signIn" ? (
            <TextInput
              placeholder="Email or username"
              placeholderTextColor={theme.icon}
              autoCapitalize="none"
              autoCorrect={false}
              value={identifier}
              onChangeText={setIdentifier}
              style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
            />
          ) : (
            <>
              <TextInput
                placeholder="Email"
                placeholderTextColor={theme.icon}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
              />
              <TextInput
                placeholder="Username"
                placeholderTextColor={theme.icon}
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onChangeText={setUsername}
                style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
              />
            </>
          )}

          <TextInput
            placeholder="Password"
            placeholderTextColor={theme.icon}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
            style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
          />

          {error ? (
            <ThemedText style={{ color: errorColor }}>{error}</ThemedText>
          ) : null}

          <Pressable
            onPress={handleSubmit}
            disabled={busy}
            style={[
              styles.button,
              {
                backgroundColor: theme.tint,
                opacity: busy ? 0.6 : 1,
              },
            ]}
          >
            <ThemedText style={styles.buttonText}>
              {busy
                ? "Working…"
                : mode === "signIn"
                ? "Sign in"
                : "Create account"}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setMode(mode === "signIn" ? "signUp" : "signIn")}
            disabled={busy}
          >
            <ThemedText style={{ color: theme.tint }}>
              {mode === "signIn"
                ? "Need an account? Sign up"
                : "Already have an account? Sign in"}
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    gap: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonText: {
    fontWeight: "600",
  },
});
