import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useMutation } from "convex/react";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";

const REASONS = [
  "Spam",
  "Harassment",
  "Hate speech",
  "Violence",
  "False information",
  "Inappropriate content",
  "Other",
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function ReportPinScreen() {
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? Colors.dark : Colors.light;

  const pinId = firstParam(params.pinId);
  const pinTitle = firstParam(params.pinTitle) || "Untitled pin";
  const pinAddress = firstParam(params.pinAddress) || "";

  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitReport = useMutation(api.reports.createPinReport);

  const isDisabled = useMemo(() => {
    return isSubmitting || !pinId || selectedReason.length === 0;
  }, [isSubmitting, pinId, selectedReason]);

  const handleSubmit = async () => {
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
      await submitReport({
        pinId,
        reason: selectedReason,
        description: details.trim() || undefined,
      });

      Alert.alert("Report submitted", "Thanks. We will review this report.", [
        { text: "OK", onPress: () => router.back() },
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
      <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
        <Text style={[styles.kicker, { color: colorScheme === "dark" ? "#9ca3af" : "#6b7280" }]}>Reporting</Text>
        <Text style={[styles.title, { color: theme.text }]}>{pinTitle}</Text>
        {pinAddress ? <Text style={[styles.address, { color: colorScheme === "dark" ? "#9ca3af" : "#6b7280" }]}>{pinAddress}</Text> : null}

        <Text style={[styles.label, { color: theme.text }]}>Why are you reporting this pin?</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reasonWrap}>
          {REASONS.map((reason) => {
            const selected = selectedReason === reason;
            return (
              <TouchableOpacity
                key={reason}
                style={[
                  styles.reasonChip,
                  selected && styles.reasonChipSelected,
                  { borderColor: selected ? "#62a0ea" : colorScheme === "dark" ? "#444" : "#d1d5db" },
                ]}
                onPress={() => setSelectedReason(reason)}
              >
                <Text style={[styles.reasonChipText, { color: selected ? "#fff" : theme.text }]}>{reason}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <Text style={[styles.label, { color: theme.text, marginTop: 20 }]}>Additional details</Text>
        <TextInput
          multiline
          value={details}
          onChangeText={setDetails}
          maxLength={500}
          placeholder="Share any context that helps our team review this pin"
          placeholderTextColor={colorScheme === "dark" ? "#777" : "#9ca3af"}
          style={[
            styles.detailsInput,
            {
              color: theme.text,
              borderColor: colorScheme === "dark" ? "#374151" : "#d1d5db",
              backgroundColor: colorScheme === "dark" ? "#111827" : "#f8fafc",
            },
          ]}
        />

        <TouchableOpacity style={[styles.submitButton, isDisabled && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={isDisabled}>
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
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
  },
  address: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 10,
  },
  reasonWrap: {
    gap: 8,
    paddingRight: 16,
  },
  reasonChip: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
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
    borderRadius: 14,
    minHeight: 140,
    paddingHorizontal: 14,
    paddingVertical: 12,
    textAlignVertical: "top",
    fontSize: 14,
  },
  submitButton: {
    marginTop: 18,
    backgroundColor: "#62a0ea",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
  },
});