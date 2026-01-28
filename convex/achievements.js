// Bare-bones achievements / badges system.
// - list all possible achievements (with requirements)
// - show progress toward each
// - persist earned badges in a table (userBadges)
// - allow easy demo/testing with a seed mutation (see convex/demo.js)

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// --- Achievement definitions ---
// Keep these server-side for now so the app works even before you build an admin UI.
// Keys must remain stable once you ship them, since they are stored in userBadges.badgeKey.

export const ACHIEVEMENTS = [
  // Pin count ladder
  {
    key: "pins_1",
    name: "First Drop",
    description: "Create your first pin.",
    category: "Pinning",
    requirementType: "pins_total",
    threshold: 1,
  },
  {
    key: "pins_5",
    name: "Trail Starter",
    description: "Drop 5 pins.",
    category: "Pinning",
    requirementType: "pins_total",
    threshold: 5,
  },
  {
    key: "pins_25",
    name: "Local Legend",
    description: "Drop 25 pins.",
    category: "Pinning",
    requirementType: "pins_total",
    threshold: 25,
  },
  {
    key: "pins_100",
    name: "Cartographer",
    description: "Drop 100 pins.",
    category: "Pinning",
    requirementType: "pins_total",
    threshold: 100,
  },

  // Sharing ladder
  {
    key: "shares_1",
    name: "Pass It On",
    description: "Share a pin with a friend.",
    category: "Sharing",
    requirementType: "shares_total",
    threshold: 1,
  },
  {
    key: "shares_10",
    name: "Social Scout",
    description: "Share 10 pins.",
    category: "Sharing",
    requirementType: "shares_total",
    threshold: 10,
  },
  {
    key: "shares_unique_5",
    name: "Connector",
    description: "Share pins with 5 different friends.",
    category: "Sharing",
    requirementType: "shares_unique_recipients",
    threshold: 5,
  },

  // Category-based ladders (simple substitutes for larger POI quests)
  {
    key: "beach_3",
    name: "Beach Day",
    description: "Drop 3 beach pins.",
    category: "Explorer",
    requirementType: "pins_category",
    categoryValue: "beach",
    threshold: 3,
  },
  {
    key: "beach_15",
    name: "Coastline Collector",
    description: "Drop 15 beach pins.",
    category: "Explorer",
    requirementType: "pins_category",
    categoryValue: "beach",
    threshold: 15,
  },
  {
    key: "landmark_5",
    name: "Postcard Hunter",
    description: "Drop 5 landmark pins.",
    category: "Explorer",
    requirementType: "pins_category",
    categoryValue: "landmark",
    threshold: 5,
  },
  {
    key: "landmark_25",
    name: "Landmark Legend",
    description: "Drop 25 landmark pins.",
    category: "Explorer",
    requirementType: "pins_category",
    categoryValue: "landmark",
    threshold: 25,
  },
];

function computeProgress({
  pinsTotal,
  sharesTotal,
  sharesUniqueRecipients,
  pinsByCategory,
  achievement,
}) {
  let current = 0;
  switch (achievement.requirementType) {
    case "pins_total":
      current = pinsTotal;
      break;
    case "shares_total":
      current = sharesTotal;
      break;
    case "shares_unique_recipients":
      current = sharesUniqueRecipients;
      break;
    case "pins_category":
      current = pinsByCategory[achievement.categoryValue] ?? 0;
      break;
    default:
      current = 0;
  }

  const target = achievement.threshold;
  const clamped = Math.min(current, target);
  return {
    current,
    target,
    ratio: target === 0 ? 1 : clamped / target,
    complete: current >= target,
  };
}

async function getStats(ctx, ownerId) {
  const pins = await ctx.db
    .query("pins")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
    .collect();

  const shares = await ctx.db
    .query("pinShares")
    .withIndex("by_fromOwnerId", (q) => q.eq("fromOwnerId", ownerId))
    .collect();

  const pinsTotal = pins.length;
  const sharesTotal = shares.length;
  const sharesUniqueRecipients = new Set(shares.map((s) => s.toOwnerId)).size;
  const pinsByCategory = pins.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] ?? 0) + 1;
    return acc;
  }, {});

  return {
    pinsTotal,
    sharesTotal,
    sharesUniqueRecipients,
    pinsByCategory,
  };
}

export const listDefinitions = query({
  args: {},
  handler: async () => {
    return ACHIEVEMENTS;
  },
});

export const getOverview = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const stats = await getStats(ctx, args.ownerId);
    const earned = await ctx.db
      .query("userBadges")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.ownerId))
      .collect();
    const earnedKeys = new Set(earned.map((b) => b.badgeKey));

    const achievements = ACHIEVEMENTS.map((a) => {
      const progress = computeProgress({ ...stats, achievement: a });
      return {
        ...a,
        progress,
        earned: earnedKeys.has(a.key),
      };
    });

    return {
      stats,
      earnedBadges: earned,
      achievements,
    };
  },
});

export const evaluateAndAward = mutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const stats = await getStats(ctx, args.ownerId);

    const existing = await ctx.db
      .query("userBadges")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.ownerId))
      .collect();
    const existingKeys = new Set(existing.map((b) => b.badgeKey));

    const newlyEarned = [];
    for (const a of ACHIEVEMENTS) {
      const { complete } = computeProgress({ ...stats, achievement: a });
      if (complete && !existingKeys.has(a.key)) {
        await ctx.db.insert("userBadges", {
          ownerId: args.ownerId,
          badgeKey: a.key,
          earnedAt: Date.now(),
        });
        newlyEarned.push(a.key);
      }
    }

    return { newlyEarned };
  },
});
