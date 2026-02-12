import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import React, { useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';


import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const OWNER_ID = "demo-user"; // bare-bones testing; replace with Auth0 user.sub later

export default function AchievementsScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  // ✅ Match your backend exports
  const overview = useQuery(api.achievements.getOverview, { ownerId: OWNER_ID });
  const evaluateAndAward = useMutation(api.achievements.evaluateAndAward);
  const seedDemoActivity = useMutation(api.demo.seedDemoActivity);
  const resetDemoBadges = useMutation(api.demo.resetDemoBadges);

  const [busy, setBusy] = useState<null | "eval" | "seed" | "reset">(null);
  const [status, setStatus] = useState<string>("");

  const stats = overview?.stats;
  const earnedBadges = overview?.earnedBadges ?? [];
  const achievements = overview?.achievements ?? [];

  const earnedKeys = useMemo(() => new Set(earnedBadges.map((b) => b.badgeKey)), [earnedBadges]);

  const onEvaluate = async () => {
    try {
      setBusy("eval");
      setStatus("Evaluating achievements…");

      const res = await evaluateAndAward({ ownerId: OWNER_ID });

      setStatus(
        res?.newlyEarned?.length
          ? `✅ New badges: ${res.newlyEarned.join(", ")}`
          : "No new badges yet."
      );
    } catch (e: any) {
      console.error(e);
      setStatus(`Evaluate failed: ${e?.message ?? "unknown error"}`);
      if (Platform.OS !== "web") {
        Alert.alert("Error", e?.message ?? "Failed to evaluate achievements.");
      }
    } finally {
      setBusy(null);
    }
  };


  const onSeed = async () => {
    try {
      setBusy("seed");
      setStatus("Seeding demo activity…");

      const res = await seedDemoActivity({ ownerId: OWNER_ID, pinsToAdd: 12, sharesToAdd: 3 });

      setStatus(
        res?.newlyEarned?.length
          ? `Seeded! Newly earned: ${res.newlyEarned.join(", ")}`
          : "Seeded demo activity. Press Evaluate to award badges."
      );
    } catch (e: any) {
      console.error(e);
      setStatus(`Seed failed: ${e?.message ?? "unknown error"}`);
      if (Platform.OS !== "web") {
        Alert.alert("Error", e?.message ?? "Failed to seed demo activity.");
      }
    } finally {
      setBusy(null);
    }
  };


  const onReset = async () => {
    const proceed =
      Platform.OS === "web"
        ? window.confirm("Reset badges? This clears earned badges for demo testing.")
        : await new Promise<boolean>((resolve) => {
          Alert.alert("Reset badges?", "This clears earned badges for demo testing.", [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Reset", style: "destructive", onPress: () => resolve(true) },
          ]);
        });

    if (!proceed) return;

    try {
      setBusy("reset");
      setStatus("Resetting badges…");

      await resetDemoBadges({ ownerId: OWNER_ID });

      setStatus("♻️ Reset complete ✅");
    } catch (e: any) {
      console.error(e);
      setStatus(`Reset failed: ${e?.message ?? "unknown error"}`);
      if (Platform.OS !== "web") {
        Alert.alert("Error", e?.message ?? "Failed to reset badges.");
      }
    } finally {
      setBusy(null);
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Badges & Achievements</ThemedText>
          {status ? (
            <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <ThemedText>{status}</ThemedText>
            </View>
          ) : null}


          {!overview ? (
            <ThemedText style={{ marginTop: 8 }}>Loading…</ThemedText>
          ) : (
            <>
              {/* Stats */}
              <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <ThemedText type="subtitle">Your Progress</ThemedText>

                <View style={styles.row}>
                  <Stat label="Pins" value={stats?.pinsTotal ?? 0} />
                  <Stat label="Shares" value={stats?.sharesTotal ?? 0} />
                  <Stat label="Unique Friends" value={stats?.sharesUniqueRecipients ?? 0} />
                </View>

                <View style={[styles.row, { marginTop: 10 }]}>
                  <Stat label="Beach Pins" value={stats?.pinsByCategory?.beach ?? 0} />
                  <Stat label="Landmark Pins" value={stats?.pinsByCategory?.landmark ?? 0} />
                </View>

                <View style={{ marginTop: 12, gap: 8 }}>
                  <ActionButton text={busy === "eval" ? "Evaluating…" : "Evaluate"} disabled={!!busy} onPress={onEvaluate} />
                  <ActionButton text={busy === "seed" ? "Seeding…" : "Seed Demo"} disabled={!!busy} onPress={onSeed} />
                  <ActionButton text={busy === "reset" ? "Resetting…" : "Reset Badges"} disabled={!!busy} onPress={onReset} danger />
                </View>
              </View>

              {/* Earned badges */}
              <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <ThemedText type="subtitle">Earned Badges</ThemedText>

                {earnedBadges.length === 0 ? (
                  <ThemedText style={{ marginTop: 8 }}>No badges earned yet. Seed demo or start using the app!</ThemedText>
                ) : (
                  <View style={{ marginTop: 10, gap: 10 }}>
                    {earnedBadges.map((b) => (
                      <View key={b._id} style={[styles.badgeRow, { borderColor: theme.border }]}>
                        <ThemedText style={styles.badgeTitle}>{b.badgeKey}</ThemedText>
                        <ThemedText style={{ opacity: 0.7 }}>{new Date(b.earnedAt).toLocaleDateString()}</ThemedText>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              {/* All achievements */}
              <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
                <ThemedText type="subtitle">All Achievements</ThemedText>

                <View style={{ marginTop: 10, gap: 10 }}>
                  {achievements.map((a) => {
                    const earned = earnedKeys.has(a.key);
                    return (
                      <View key={a.key} style={[styles.achievementRow, { borderColor: theme.border }]}>
                        <View style={{ flex: 1, gap: 4 }}>
                          <ThemedText style={styles.badgeTitle}>
                            {a.name} {earned ? "✅" : ""}
                          </ThemedText>
                          <ThemedText style={{ opacity: 0.85 }}>{a.description}</ThemedText>
                          <ThemedText style={{ opacity: 0.75 }}>
                            Progress: {a.progress.current} / {a.progress.target}
                          </ThemedText>
                        </View>
                        <ThemedText style={{ opacity: 0.7 }}>{earned ? "Earned" : "Locked"}</ThemedText>
                      </View>
                    );
                  })}
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={{ flex: 1 }}>
      <ThemedText style={{ opacity: 0.7 }}>{label}</ThemedText>
      <ThemedText type="subtitle">{value}</ThemedText>
    </View>
  );
}

function ActionButton({
  text,
  onPress,
  disabled,
  danger,
}: {
  text: string;
  onPress: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[
        styles.button,
        {
          backgroundColor: danger ? theme.icon : theme.tint,
          opacity: disabled ? 0.6 : 1,
        },
      ]}
    >
      <ThemedText style={styles.buttonText}>{text}</ThemedText>
    </Pressable>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  row: { flexDirection: "row", gap: 12 },
  badgeRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  achievementRow: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  badgeTitle: { fontSize: 16, fontWeight: "600" },
  button: { borderRadius: 12, paddingVertical: 12, paddingHorizontal: 12, alignItems: "center" },
  buttonText: { fontWeight: "700" },
});
