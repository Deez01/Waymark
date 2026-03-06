import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useMutation } from "convex/react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

// Preset report reasons shown as quick-select chips in the form.
const REASONS = [
  "Spam",
  "Harassment",
  "Hate speech",
  "Violence",
  "False information",
  "Inappropriate content",
  "Other",
];

export default function ReportPinScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;

  // Route params can arrive as string[] in Expo Router, so normalize first.
  const pinIdParam = Array.isArray(params.pinId) ? params.pinId[0] : params.pinId;
  const pinTitleParam = Array.isArray(params.pinTitle) ? params.pinTitle[0] : params.pinTitle;
  const pinAddressParam = Array.isArray(params.pinAddress) ? params.pinAddress[0] : params.pinAddress;

  const pinId = pinIdParam as Id<"pins">;
  const pinTitle = typeof pinTitleParam === "string" ? pinTitleParam : "Untitled pin";
  const pinAddress = typeof pinAddressParam === "string" ? pinAddressParam : "";

  const [selectedReason, setSelectedReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calls Convex to create a moderation report for this pin.
  const submitReport = useMutation(api.reports.createPinReport);

  // Keep submit disabled until required fields are selected.
  const isDisabled = useMemo(() => {
    return isSubmitting || !pinId || selectedReason.length === 0;
  }, [isSubmitting, pinId, selectedReason]);

  const handleSubmit = async () => {
    // Guard against missing navigation params before sending data to backend.
    if (!pinId) {
      Alert.alert("Error", "Missing pin id");
      return;
    }

    if (!selectedReason) {
      Alert.alert("Reason required", "Please select a reason for reporting this pin.");
      return;
    }

    setIsSubmitting(true);
    try {
      // The selected reason is required and extra details are optional context.
      await submitReport({
        pinId,
        reason: selectedReason,
        description: details.trim() || undefined,
      });

      Alert.alert("Report submitted", "Thanks. We will review this report.", [
        {
          text: "OK",
          onPress: () => router.back(),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error?.message ?? "Failed to submit report");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ title: "Report Pin" }} />
      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        contentContainerStyle={styles.content}
      >
        <Text style={[styles.label, { color: theme.text }]}>Pin</Text>
        <Text style={[styles.pinTitle, { color: theme.text }]}>{pinTitle}</Text>
        {pinAddress ? (
          <Text style={[styles.pinAddress, { color: colorScheme === "dark" ? "#9aa0a6" : "#666" }]}>{pinAddress}</Text>
        ) : null}

        <Text style={[styles.label, { color: theme.text, marginTop: 18 }]}>Why are you reporting this pin?</Text>
        <View style={styles.reasonWrap}>
          {REASONS.map((reason) => {
            const selected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonChip,
                  selected && styles.reasonChipSelected,
                  {
                    borderColor: selected ? "#62a0ea" : colorScheme === "dark" ? "#444" : "#ccc",
                  },
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text style={[styles.reasonChipText, { color: selected ? "#fff" : theme.text }]}>{reason}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={[styles.label, { color: theme.text, marginTop: 18 }]}>Additional details (optional)</Text>
        <TextInput
          multiline
          value={details}
          onChangeText={setDetails}
          maxLength={500}
          placeholder="Share any context that helps our team review this pin"
          placeholderTextColor={colorScheme === "dark" ? "#777" : "#888"}
          style={[
            styles.detailsInput,
            {
              color: theme.text,
              borderColor: colorScheme === "dark" ? "#3a3a3a" : "#d9d9d9",
              backgroundColor: colorScheme === "dark" ? "#161616" : "#f8f8f8",
            },
          ]}
        />

        <TouchableOpacity
          style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isDisabled}
        >
          <Text style={styles.submitButtonText}>{isSubmitting ? "Submitting..." : "Submit Report"}</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 8,
  },
  pinTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  pinAddress: {
    marginTop: 4,
    fontSize: 13,
  },
  reasonWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  reasonChipSelected: {
    backgroundColor: "#62a0ea",
  },
  reasonChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  detailsInput: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 130,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: "top",
    fontSize: 14,
  },
  submitButton: {
    marginTop: 18,
    backgroundColor: "#62a0ea",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
});
