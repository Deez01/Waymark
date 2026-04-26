import { ThemedText } from "@/components/themed-text";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type RecapPeriod = "monthly" | "yearly";

type RecapSlide = {
  eyebrow: string;
  title: string;
  body: string;
  accent: string;
  stats?: Array<{ label: string; value: string }>;
};

const RECAPS: Record<RecapPeriod, { heading: string; subheading: string; slides: RecapSlide[] }> = {
  monthly: {
    heading: "Your Month in Waymark",
    subheading: "A pin-first story built from your places, patterns, and highlights.",
    slides: [
      {
        eyebrow: "April Recap",
        title: "This month was all about coastal detours.",
        body: "You kept bouncing between quick food stops, waterfront hangs, and a few late-night landmark saves.",
        accent: "#7c3aed",
        stats: [
          { label: "Pins dropped", value: "18" },
          { label: "Photo moments", value: "46" },
          { label: "New places", value: "9" },
        ],
      },
      {
        eyebrow: "Top Categories",
        title: "Food and views ran the month.",
        body: "Your strongest themes rose to the top, with food spots, scenic pins, and hidden gems leading the way.",
        accent: "#db2777",
        stats: [
          { label: "Food spots", value: "42%" },
          { label: "Scenic pins", value: "31%" },
          { label: "Hidden gems", value: "17%" },
        ],
      },
      {
        eyebrow: "Favorite Places",
        title: "Long Beach kept stealing the spotlight.",
        body: "Your most visited places set the tone for the month, from favorite neighborhoods to repeat go-to stops.",
        accent: "#0f766e",
        stats: [
          { label: "1. Long Beach", value: "7 pins" },
          { label: "2. Seal Beach", value: "4 pins" },
          { label: "3. Downtown LA", value: "3 pins" },
        ],
      },
      {
        eyebrow: "Achievement Pulse",
        title: "Your explorer streak looked strong.",
        body: "Badges, streaks, and standout wins turned the month into more than a list of saved places.",
        accent: "#ea580c",
        stats: [
          { label: "Badge unlocked", value: "Trail Starter" },
          { label: "Best streak", value: "6 days" },
          { label: "Rank vibe", value: "Weekend Scout" },
        ],
      },
      {
        eyebrow: "Next Month",
        title: "More places. More stories. More pins.",
        body: "Every pin adds another piece to the story. Next month starts with a fresh map to fill.",
        accent: "#2563eb",
      },
    ],
  },
  yearly: {
    heading: "Your Year in Waymark",
    subheading: "A year-end story built around your biggest themes, places, and milestones.",
    slides: [
      {
        eyebrow: "2026 Recap",
        title: "You turned casual pins into a real map of memories.",
        body: "This yearly version leans more cinematic and wide-angle, with bigger totals and bigger themes.",
        accent: "#1d4ed8",
        stats: [
          { label: "Pins dropped", value: "143" },
          { label: "Photos saved", value: "382" },
          { label: "Cities visited", value: "24" },
        ],
      },
      {
        eyebrow: "Year Themes",
        title: "Landmarks, cafes, and beach days defined your map.",
        body: "Across the year, a few clear themes shaped your map and gave your pins a recognizable rhythm.",
        accent: "#7c2d12",
        stats: [
          { label: "Landmarks", value: "39%" },
          { label: "Cafe finds", value: "28%" },
          { label: "Beach escapes", value: "21%" },
        ],
      },
      {
        eyebrow: "Place Leaders",
        title: "You kept coming back to a few anchor spots.",
        body: "Some places became anchors in your year, pulling you back again and again for new memories.",
        accent: "#0f766e",
        stats: [
          { label: "1. Long Beach", value: "31 pins" },
          { label: "2. Pasadena", value: "19 pins" },
          { label: "3. Santa Monica", value: "15 pins" },
        ],
      },
      {
        eyebrow: "Achievements",
        title: "You finished the year with momentum.",
        body: "Your badges, streaks, and milestones gave the year a sense of momentum from start to finish.",
        accent: "#9333ea",
        stats: [
          { label: "Top badge", value: "Local Legend" },
          { label: "Pins shared", value: "27" },
          { label: "Explorer mode", value: "Always on" },
        ],
      },
      {
        eyebrow: "Wrap",
        title: "Your year was mapped one stop at a time.",
        body: "One stop led to the next, and by the end of the year your map told a story only you could make.",
        accent: "#be123c",
      },
    ],
  },
};

export default function RecapScreen() {
  const params = useLocalSearchParams<{ period?: string }>();
  const colorScheme = useColorScheme();
  const [slideIndex, setSlideIndex] = useState(0);

  const period: RecapPeriod = params.period === "yearly" ? "yearly" : "monthly";
  const recap = useMemo(() => RECAPS[period], [period]);
  const slide = recap.slides[slideIndex];
  const isLastSlide = slideIndex === recap.slides.length - 1;

  const handleAdvance = () => {
    if (isLastSlide) {
      router.back();
      return;
    }
    setSlideIndex((current) => current + 1);
  };

  const handleBack = () => {
    if (slideIndex === 0) {
      router.back();
      return;
    }
    setSlideIndex((current) => current - 1);
  };

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        { backgroundColor: colorScheme === "dark" ? "#050816" : "#f8fafc" },
      ]}
    >
      <Pressable
        style={[styles.screen, { backgroundColor: slide.accent }]}
        onPress={handleAdvance}
      >
        <View style={styles.progressRow}>
          {recap.slides.map((_, index) => (
            <View
              key={`${period}-${index}`}
              style={[
                styles.progressTrack,
                { opacity: index <= slideIndex ? 1 : 0.28 },
              ]}
            />
          ))}
        </View>

        <View style={styles.topRow}>
          <Pressable onPress={handleBack} style={styles.chromeButton}>
            <ThemedText style={styles.chromeText} lightColor="#ffffff" darkColor="#ffffff">
              {slideIndex === 0 ? "Close" : "Back"}
            </ThemedText>
          </Pressable>

          <Pressable onPress={() => router.back()} style={styles.chromeButton}>
            <ThemedText style={styles.chromeText} lightColor="#ffffff" darkColor="#ffffff">
              Exit
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.content}>
          <ThemedText style={styles.eyebrow} lightColor="#ffffff" darkColor="#ffffff">
            {slide.eyebrow}
          </ThemedText>
          <ThemedText style={styles.heading} lightColor="#ffffff" darkColor="#ffffff">
            {slide.title}
          </ThemedText>
          <ThemedText style={styles.body} lightColor="rgba(255,255,255,0.88)" darkColor="rgba(255,255,255,0.88)">
            {slide.body}
          </ThemedText>

          <View style={styles.metaCard}>
            <ThemedText style={styles.metaLabel}>
              {recap.heading}
            </ThemedText>
            <ThemedText style={styles.metaBody}>
              {recap.subheading}
            </ThemedText>
          </View>

          {slide.stats ? (
            <View style={styles.statsList}>
              {slide.stats.map((item) => (
                <View key={item.label} style={styles.statCard}>
                  <ThemedText style={styles.statValue}>{item.value}</ThemedText>
                  <ThemedText style={styles.statLabel}>{item.label}</ThemedText>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        <View style={styles.footer}>
          <ThemedText style={styles.footerText} lightColor="#ffffff" darkColor="#ffffff">
            {isLastSlide ? "Tap anywhere to close" : "Tap anywhere to continue"}
          </ThemedText>
        </View>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  screen: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingTop: 8,
  },
  progressTrack: {
    flex: 1,
    height: 4,
    borderRadius: 999,
    backgroundColor: "#ffffff",
  },
  topRow: {
    marginTop: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chromeButton: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chromeText: {
    fontSize: 14,
    fontWeight: "700",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    gap: 18,
  },
  eyebrow: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  heading: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "800",
  },
  body: {
    fontSize: 18,
    lineHeight: 27,
  },
  metaCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    gap: 6,
  },
  metaLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metaBody: {
    fontSize: 16,
    lineHeight: 24,
  },
  statsList: {
    gap: 12,
  },
  statCard: {
    borderRadius: 24,
    padding: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    gap: 2,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 15,
    opacity: 0.72,
  },
  footer: {
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.92,
  },
});
