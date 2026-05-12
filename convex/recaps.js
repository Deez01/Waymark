import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { ACHIEVEMENTS } from "./achievements.js";
import { query } from "./_generated/server";

function assertAuthed(userId) {
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

function getDateRange(period, now) {
  const current = new Date(now);
  const start = new Date(current);
  const end = new Date(current);

  if (period === "monthly") {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(end.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);

    end.setMonth(11, 31);
    end.setHours(23, 59, 59, 999);
  }

  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
    label:
      period === "monthly"
        ? current.toLocaleString("en-US", { month: "long", year: "numeric" })
        : String(current.getFullYear()),
  };
}

function titleCase(value) {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getPlaceLabel(address) {
  if (!address) return null;

  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length >= 3) return parts[parts.length - 3];
  if (parts.length >= 2) return parts[0];
  return parts[0] || null;
}

function sortCounts(map, total) {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({
      name,
      count,
      percent: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
}

export const getRecap = query({
  args: {
    period: v.union(v.literal("monthly"), v.literal("yearly")),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerId = userId.toString();
    const now = Date.now();
    const { startMs, endMs, label } = getDateRange(args.period, now);

    const [allPins, shares, earnedBadges] = await Promise.all([
      ctx.db
        .query("pins")
        .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
        .collect(),
      ctx.db
        .query("pinShares")
        .withIndex("by_fromOwnerId", (q) => q.eq("fromOwnerId", userId))
        .collect(),
      ctx.db
        .query("userBadges")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect(),
    ]);

    const pins = allPins.filter((pin) => pin.createdAt >= startMs && pin.createdAt <= endMs);
    const periodShares = shares.filter((share) => share.createdAt >= startMs && share.createdAt <= endMs);
    const periodBadges = earnedBadges
      .filter((badge) => badge.earnedAt >= startMs && badge.earnedAt <= endMs)
      .sort((a, b) => b.earnedAt - a.earnedAt);

    const totalPins = pins.length;
    const totalPhotos = pins.reduce(
      (sum, pin) => sum + (pin.pictures?.length ?? (pin.thumbnail ? 1 : 0)),
      0
    );

    const categoryCounts = {};
    const placeCounts = {};

    for (const pin of pins) {
      const category = titleCase(pin.category ?? "General");
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;

      const place = getPlaceLabel(pin.address);
      if (place) {
        placeCounts[place] = (placeCounts[place] ?? 0) + 1;
      }
    }

    const topCategories = sortCounts(categoryCounts, totalPins).slice(0, 3);
    const topPlaces = sortCounts(placeCounts, totalPins).slice(0, 3);

    const badgeDefinitions = new Map(ACHIEVEMENTS.map((achievement) => [achievement.key, achievement]));
    const achievementHighlights = periodBadges.slice(0, 3).map((badge) => {
      const definition = badgeDefinitions.get(badge.badgeKey);
      return {
        key: badge.badgeKey,
        name: definition?.name ?? titleCase(badge.badgeKey),
        description: definition?.description ?? "Achievement unlocked.",
        category: definition?.category ?? "Milestone",
        earnedAt: badge.earnedAt,
      };
    });

    const activeDays = new Set(
      pins.map((pin) => new Date(pin.createdAt).toISOString().slice(0, 10))
    ).size;

    const intro = totalPins > 0
      ? {
          headline:
            args.period === "monthly"
              ? `${label} was full of movement.`
              : `${label} turned into a year of pinned memories.`,
          body: `You dropped ${totalPins} pin${totalPins === 1 ? "" : "s"}, saved ${totalPhotos} photo${totalPhotos === 1 ? "" : "s"}, and stayed active across ${activeDays} day${activeDays === 1 ? "" : "s"}.`,
        }
      : {
          headline:
            args.period === "monthly"
              ? `${label} is still waiting for its first pin.`
              : `${label} is ready for the first story on your map.`,
          body: "Once you start dropping pins, this recap will fill in with your places, categories, and earned milestones.",
        };

    return {
      period: args.period,
      label,
      startMs,
      endMs,
      empty: totalPins === 0,
      intro,
      totals: {
        pins: totalPins,
        photos: totalPhotos,
        places: Object.keys(placeCounts).length,
        shares: periodShares.length,
        activeDays,
      },
      topCategories,
      topPlaces,
      achievementHighlights,
    };
  },
});
