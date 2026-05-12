import { ThemedText } from "@/components/themed-text";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useQuery } from "convex/react";
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

const ACCENTS = ["#7c3aed", "#db2777", "#0f766e", "#ea580c", "#2563eb"];

function formatRankedStats(items: Array<{ name: string; count: number; percent?: number }>, valueMode: "percent" | "count") {
  return items.map((item, index) => ({
    label: `${index + 1}. ${item.name}`,
    value: valueMode === "percent" ? `${item.percent ?? 0}%` : `${item.count} pins`,
  }));
}

function buildSlides(period: RecapPeriod, recap: any): RecapSlide[] {
  if (!recap || recap.empty) {
    return [
      {
        eyebrow: period === "monthly" ? `${recap?.label ?? "This Month"} Recap` : `${recap?.label ?? "This Year"} Recap`,
        title: recap?.intro?.headline ?? "Your recap is waiting to be written.",
        body:
          recap?.intro?.body ??
          "Drop your first pins and this space will turn into a full recap of your categories, places, and wins.",
        accent: ACCENTS[0],
        stats: [
          { label: "Pins dropped", value: "0" },
          { label: "Places visited", value: "0" },
          { label: "Achievements", value: "0" },
        ],
      },
      {
        eyebrow: "Next Up",
        title: period === "monthly" ? "Start building this month." : "Start building this year.",
        body: "Every new pin adds another chapter. Once activity picks up, this recap will automatically reflect it.",
        accent: ACCENTS[1],
      },
    ];
  }

  return [
    {
      eyebrow: period === "monthly" ? `${recap.label} Recap` : `${recap.label} Wrapped`,
      title: recap.intro.headline,
      body: recap.intro.body,
      accent: ACCENTS[0],
      stats: [
        { label: "Pins dropped", value: String(recap.totals.pins) },
        { label: "Photo moments", value: String(recap.totals.photos) },
        { label: "Places visited", value: String(recap.totals.places) },
      ],
    },
    {
      eyebrow: "Top Categories",
      title:
        recap.topCategories.length > 0
          ? `${recap.topCategories[0].name} led the way.`
          : "Your categories are still taking shape.",
      body:
        recap.topCategories.length > 0
          ? "The strongest themes from your pins rose to the top and gave this recap its rhythm."
          : "As you pin more places, your favorite categories will start to stand out here.",
      accent: ACCENTS[1],
      stats: formatRankedStats(recap.topCategories, "percent"),
    },
    {
      eyebrow: "Favorite Places",
      title:
        recap.topPlaces.length > 0
          ? `${recap.topPlaces[0].name} kept pulling you back.`
          : "Your go-to places will show up here.",
      body:
        recap.topPlaces.length > 0
          ? "Some places became anchors in your map, with repeat visits and memorable saves setting the tone."
          : "Keep exploring and this slide will start to surface your most-pinned areas.",
      accent: ACCENTS[2],
      stats: formatRankedStats(recap.topPlaces, "count"),
    },
    {
      eyebrow: "Achievements",
      title:
        recap.achievementHighlights.length > 0
          ? `You unlocked ${recap.achievementHighlights.length} new milestone${recap.achievementHighlights.length === 1 ? "" : "s"}.`
          : "Your next milestone is in sight.",
      body:
        recap.achievementHighlights.length > 0
          ? "Badges and milestones turned your movement into something bigger than a list of saved places."
          : "Keep pinning and sharing to unlock new achievements in future recaps.",
      accent: ACCENTS[3],
      stats:
        recap.achievementHighlights.length > 0
          ? recap.achievementHighlights.map((achievement: any) => ({
              label: achievement.name,
              value: achievement.category,
            }))
          : [
              { label: "Shares this period", value: String(recap.totals.shares) },
              { label: "Active days", value: String(recap.totals.activeDays) },
            ],
    },
    {
      eyebrow: "Wrap",
      title: period === "monthly" ? "More places. More stories. More pins." : "Your year was mapped one stop at a time.",
      body:
        period === "monthly"
          ? `You shared ${recap.totals.shares} pin${recap.totals.shares === 1 ? "" : "s"} and stayed active across ${recap.totals.activeDays} day${recap.totals.activeDays === 1 ? "" : "s"}.`
          : `Across ${recap.totals.activeDays} active day${recap.totals.activeDays === 1 ? "" : "s"}, your pins built a living record of where you went and what mattered.`,
      accent: ACCENTS[4],
    },
  ];
}

export default function RecapScreen() {
  const params = useLocalSearchParams<{ period?: string }>();
  const colorScheme = useColorScheme();
  const [slideIndex, setSlideIndex] = useState(0);

  const period: RecapPeriod = params.period === "yearly" ? "yearly" : "monthly";
  const recap = useQuery(api.recaps.getRecap, { period });

  const slides = useMemo(() => buildSlides(period, recap), [period, recap]);
  const slide = slides[Math.min(slideIndex, slides.length - 1)] ?? slides[0];
  const isLastSlide = slideIndex >= slides.length - 1;

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

  if (recap === undefined) {
    return (
      <SafeAreaView
        style={[
          styles.safeArea,
          { backgroundColor: colorScheme === "dark" ? "#050816" : "#f8fafc" },
        ]}
      >
        <View style={[styles.screen, { backgroundColor: ACCENTS[0], justifyContent: "center" }]}>
          <ThemedText style={styles.heading} lightColor="#ffffff" darkColor="#ffffff">
            Building your recap...
          </ThemedText>
          <ThemedText style={styles.body} lightColor="rgba(255,255,255,0.88)" darkColor="rgba(255,255,255,0.88)">
            Pulling together your pins, places, and milestones.
          </ThemedText>
        </View>
      </SafeAreaView>
    );
  }

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
          {slides.map((_, index) => (
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
            <ThemedText style={styles.metaLabel}>{recap.period === "monthly" ? "Your Month in Waymark" : "Your Year in Waymark"}</ThemedText>
            <ThemedText style={styles.metaBody}>
              {recap.period === "monthly"
                ? "A live recap built from your real pin activity this month."
                : "A live recap built from your real pin activity this year."}
            </ThemedText>
          </View>

          {slide.stats?.length ? (
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
