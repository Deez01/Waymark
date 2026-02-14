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
import { useMutation, useQuery } from "convex/react";

export default function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];
  const errorColor = colorScheme === "dark" ? "#FFB4A2" : "#B00020";
  const currentUser = useQuery(api.users.getCurrentUser);
  const completeProfile = useMutation(api.users.completeProfile);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [age, setAge] = useState("");
  const [ethnicity, setEthnicity] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (currentUser === undefined) {
    return null;
  }

  if (!currentUser) {
    return <Redirect href="/sign-in" />;
  }

  if (currentUser.profileComplete) {
    return <Redirect href="/(tabs)" />;
  }

  const handleSubmit = async () => {
    if (busy) return;
    setError(null);

    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();

    if (!trimmedFirstName || !trimmedLastName) {
      setError("First and last name are required.");
      return;
    }

    let parsedAge = undefined;
    if (age.trim()) {
      const numericAge = Number(age);
      if (Number.isNaN(numericAge) || numericAge <= 0) {
        setError("Age must be a positive number.");
        return;
      }
      parsedAge = numericAge;
    }

    try {
      setBusy(true);
      await completeProfile({
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        age: parsedAge,
        ethnicity: ethnicity.trim() || undefined,
      });
    } catch (submitError) {
      console.error(submitError);
      setError("Profile update failed. Please try again.");
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
          <ThemedText type="title">Complete your profile</ThemedText>
          <ThemedText style={{ color: theme.icon }}>
            Add your details so we can personalize your experience.
          </ThemedText>

          <TextInput
            placeholder="First name"
            placeholderTextColor={theme.icon}
            autoCapitalize="words"
            autoCorrect={false}
            value={firstName}
            onChangeText={setFirstName}
            style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
          />
          <TextInput
            placeholder="Last name"
            placeholderTextColor={theme.icon}
            autoCapitalize="words"
            autoCorrect={false}
            value={lastName}
            onChangeText={setLastName}
            style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
          />
          <TextInput
            placeholder="Age (optional)"
            placeholderTextColor={theme.icon}
            keyboardType="number-pad"
            value={age}
            onChangeText={setAge}
            style={[styles.input, { borderColor: theme.icon, color: theme.text }]}
          />
          <TextInput
            placeholder="Ethnicity (optional)"
            placeholderTextColor={theme.icon}
            autoCapitalize="words"
            autoCorrect={false}
            value={ethnicity}
            onChangeText={setEthnicity}
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
              {busy ? "Saving…" : "Finish setup"}
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
