import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Colors } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SortOrder = "newest" | "oldest";
type QuickFilter = "all" | "thisMonth" | "last30Days" | "thisYear";

function getDateRange(filter: QuickFilter): { startDate?: number; endDate?: number } {
  const now = new Date();

  switch (filter) {
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return { startDate: start, endDate: now.getTime() };
    }
    case "last30Days": {
      const start = Date.now() - 30 * 24 * 60 * 60 * 1000;
      return { startDate: start, endDate: Date.now() };
    }
    case "thisYear": {
      const start = new Date(now.getFullYear(), 0, 1).getTime();
      return { startDate: start, endDate: now.getTime() };
    }
    case "all":
    default:
      return {};
  }
}

export default function TimelineScreen() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? "light"];

  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const dateRange = useMemo(() => getDateRange(quickFilter), [quickFilter]);

  const pins = useQuery(api.timeline.getTimelinePins, {
    sortOrder,
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
  });

  const deletePin = useMutation(api.pins.deletePin);

  const handleOpenOnMap = (pin: any) => {
  router.push({
    pathname: "/(tabs)",
    params: {
      pinId: String(pin._id),
      lat: String(pin.lat),
      lng: String(pin.lng),
      openPin: "true",
    },
  });
};

  const handleEditCaption = (pin: any) => {
  router.push({
    pathname: "/edit-caption",
    params: {
      pinId: String(pin._id),
      currentCaption: pin.caption ?? pin.description ?? "",
    },
  });
};

  const handleDelete = async (pin: any) => {
    const confirmed =
      await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Delete Pin",
          `Are you sure you want to delete "${pin.title || "this pin"}"?`,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Delete", style: "destructive", onPress: () => resolve(true) },
          ]
        );
      });

    if (!confirmed) return;

    try {
      await deletePin({ pinId: pin._id });
    } catch (e: any) {
      Alert.alert("Error", e?.message ?? "Failed to delete pin.");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title">Timeline</ThemedText>
          <ThemedText style={{ opacity: 0.75 }}>
            View your pins in chronological order.
          </ThemedText>

          <View style={styles.controlRow}>
            <FilterButton
              label="Newest"
              active={sortOrder === "newest"}
              onPress={() => setSortOrder("newest")}
              theme={theme}
            />
            <FilterButton
              label="Oldest"
              active={sortOrder === "oldest"}
              onPress={() => setSortOrder("oldest")}
              theme={theme}
            />
          </View>

          <View style={styles.controlWrap}>
            <FilterButton
              label="All"
              active={quickFilter === "all"}
              onPress={() => setQuickFilter("all")}
              theme={theme}
            />
            <FilterButton
              label="This Month"
              active={quickFilter === "thisMonth"}
              onPress={() => setQuickFilter("thisMonth")}
              theme={theme}
            />
            <FilterButton
              label="Last 30 Days"
              active={quickFilter === "last30Days"}
              onPress={() => setQuickFilter("last30Days")}
              theme={theme}
            />
            <FilterButton
              label="This Year"
              active={quickFilter === "thisYear"}
              onPress={() => setQuickFilter("thisYear")}
              theme={theme}
            />
          </View>

          {!pins ? (
            <ThemedText style={{ marginTop: 16 }}>Loading timeline…</ThemedText>
          ) : pins.length === 0 ? (
            <View style={[styles.card, { borderColor: theme.border, backgroundColor: theme.card }]}>
              <ThemedText type="subtitle">No pins found</ThemedText>
              <ThemedText style={{ opacity: 0.75 }}>
                Try another sort/filter, or create a new pin.
              </ThemedText>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {pins.map((pin) => {
                const imageUri =
                  pin.thumbnail ||
                  (pin.pictures && pin.pictures.length > 0 ? pin.pictures[0] : null);

                return (
                  <View
                    key={pin._id}
                    style={[
                      styles.card,
                      { borderColor: theme.border, backgroundColor: theme.card },
                    ]}
                  >
                    {imageUri ? (
                      <Image source={{ uri: imageUri }} style={styles.thumbnail} />
                    ) : null}

                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <ThemedText type="subtitle">{pin.title || "Untitled Pin"}</ThemedText>
                        <ThemedText style={{ opacity: 0.7 }}>
                          {new Date(pin.createdAt).toLocaleString()}
                        </ThemedText>
                      </View>

                      {pin.category ? (
                        <View style={[styles.badge, { borderColor: theme.border }]}>
                          <ThemedText style={{ fontSize: 12 }}>{pin.category}</ThemedText>
                        </View>
                      ) : null}
                    </View>

                    {pin.address ? (
                      <ThemedText style={{ opacity: 0.8 }}>{pin.address}</ThemedText>
                    ) : null}

                    {pin.caption ? (
                      <ThemedText style={{ marginTop: 8 }}>{pin.caption}</ThemedText>
                    ) : pin.description ? (
                      <ThemedText style={{ marginTop: 8 }}>{pin.description}</ThemedText>
                    ) : null}

                    <View style={styles.metaRow}>
                      <ThemedText style={{ opacity: 0.65 }}>
                        {pin.pictures?.length ? `${pin.pictures.length} photo(s)` : "No photos"}
                      </ThemedText>
                      <ThemedText style={{ opacity: 0.65 }}>
                        {pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}
                      </ThemedText>
                    </View>

                    <View style={styles.actionRow}>
                      <ActionButton
                        label="Open on Map"
                        onPress={() => handleOpenOnMap(pin)}
                        theme={theme}
                      />
                      <ActionButton
                        label="Edit"
                        onPress={() => handleEditCaption(pin)}
                        theme={theme}
                      />
                      <ActionButton
                        label="Delete"
                        onPress={() => handleDelete(pin)}
                        theme={theme}
                        danger
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

function FilterButton({
  label,
  active,
  onPress,
  theme,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.filterButton,
        {
          backgroundColor: active ? theme.tint : theme.card,
          borderColor: theme.border,
        },
      ]}
    >
      <ThemedText style={{ fontWeight: "600" }}>{label}</ThemedText>
    </Pressable>
  );
}

function ActionButton({
  label,
  onPress,
  theme,
  danger,
}: {
  label: string;
  onPress: () => void;
  theme: any;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionButton,
        {
          borderColor: theme.border,
          backgroundColor: danger ? theme.icon : theme.card,
        },
      ]}
    >
      <ThemedText style={styles.actionButtonText}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  controlRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  controlWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  filterButton: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 8,
  },
  thumbnail: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "flex-start",
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  metaRow: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  actionButtonText: {
    fontWeight: "600",
  },
});