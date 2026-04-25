// convex/achievements.js
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";

export const ACHIEVEMENTS = [
  { key: "pins_1", name: "First Drop", description: "Create your first pin.", category: "Pinning", requirementType: "pins_total", threshold: 1 },
  { key: "pins_5", name: "Trail Starter", description: "Drop 5 pins.", category: "Pinning", requirementType: "pins_total", threshold: 5 },
  { key: "pins_25", name: "Local Legend", description: "Drop 25 pins.", category: "Pinning", requirementType: "pins_total", threshold: 25 },
  { key: "pins_100", name: "Cartographer", description: "Drop 100 pins.", category: "Pinning", requirementType: "pins_total", threshold: 100 },

  { key: "shares_1", name: "Pass It On", description: "Share a pin with a friend.", category: "Sharing", requirementType: "shares_total", threshold: 1 },
  { key: "shares_10", name: "Social Scout", description: "Share 10 pins.", category: "Sharing", requirementType: "shares_total", threshold: 10 },
  { key: "shares_unique_5", name: "Connector", description: "Share pins with 5 different friends.", category: "Sharing", requirementType: "shares_unique_recipients", threshold: 5 },

  { key: "beach_3", name: "Beach Day", description: "Create 3 beach memories.", category: "Explorer", requirementType: "beach_total", threshold: 3 },
  { key: "beach_15", name: "Coastline Collector", description: "Create 15 beach memories.", category: "Explorer", requirementType: "beach_total", threshold: 15 },
  { key: "landmark_5", name: "Postcard Hunter", description: "Create 5 landmark memories.", category: "Explorer", requirementType: "landmark_total", threshold: 5 },
  { key: "landmark_25", name: "Landmark Legend", description: "Create 25 landmark memories.", category: "Explorer", requirementType: "landmark_total", threshold: 25 },
  { key: "landmark_1", name: "Landmark Hunter", description: "Create your first landmark memory.", category: "Explorer", requirementType: "landmark_total", threshold: 1, },
  { key: "major_league_fan", name: "Major League Fan", description: "Create landmark memories at all curated California MLB stadiums.", category: "Collections", requirementType: "landmark_collection", collectionKey: "ca_ballparks", threshold: 3, },
  { key: "capital_sightseer", name: "Capital Sightseer", description: "Create landmark memories at key Washington, DC memorials.", category: "Collections", requirementType: "landmark_collection", collectionKey: "dc_memorials", threshold: 3, },
  { key: "california_beach_goer", name: "California Beach Goer", description: "Create landmark memories at all curated California beaches.", category: "Collections", requirementType: "landmark_collection", collectionKey: "ca_beaches", threshold: 4, },
  { key: "campus_collector", name: "Campus Collector", description: "Create landmark memories at all curated California university campuses.", category: "Collections", requirementType: "landmark_collection", collectionKey: "ca_universities", threshold: 4, },
];

const LANDMARK_COLLECTIONS = {
  ca_ballparks: [
    "dodger_stadium",
    "angel_stadium",
    "petco_park",
  ],
  dc_memorials: [
    "lincoln_memorial",
    "washington_monument",
    "jefferson_memorial",
  ],
  ca_beaches: [
    "santa_monica_beach",
    "venice_beach",
    "laguna_beach",
    "huntington_beach",
  ],
  ca_universities: [
    "csulb",
    "ucla",
    "uc_berkeley",
    "ucsd",
  ],
};

function computeProgress({
  pinsTotal,
  sharesTotal,
  sharesUniqueRecipients,
  pinsByCategory,
  landmarkTotal,
  beachTotal,
  unlockedCollectionCounts,
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
    case "landmark_total":
      current = landmarkTotal;
      break;
    case "landmark_collection":
      current = unlockedCollectionCounts[achievement.collectionKey] ?? 0;
      break;
    case "beach_total":
      current = beachTotal;
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

async function getStats(ctx, userId) {
  const ownerIdStr = userId.toString();

  const pins = await ctx.db
    .query("pins")
    .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerIdStr))
    .collect();

  const shares = await ctx.db
    .query("pinShares")
    .withIndex("by_fromOwnerId", (q) => q.eq("fromOwnerId", userId))
    .collect();

  const pinsTotal = pins.length;
  const sharesTotal = shares.length;
  const sharesUniqueRecipients = new Set(shares.map((s) => s.toOwnerId.toString())).size;

  const pinsByCategory = pins.reduce((acc, p) => {
    const cat = p.category ?? "general";
    acc[cat] = (acc[cat] ?? 0) + 1;
    return acc;
  }, {});

  const landmarkPins = pins.filter((p) => p.isLandmarkMemory === true);
  const landmarkTotal = landmarkPins.length;

  const beachPins = pins.filter((p) => {
  const isCategoryBeach = p.category === "beach";
  const isCuratedBeachLandmark =
    p.isLandmarkMemory === true &&
    Array.isArray(p.landmarkCollectionKeys) &&
    p.landmarkCollectionKeys.includes("ca_beaches");

  return isCategoryBeach || isCuratedBeachLandmark;
});

const beachTotal = beachPins.length;

  const uniqueLandmarkKeys = new Set(
    landmarkPins
      .map((p) => p.landmarkKey)
      .filter(Boolean)
  );

  const unlockedCollectionCounts = Object.fromEntries(
    Object.entries(LANDMARK_COLLECTIONS).map(([collectionKey, requiredKeys]) => {
      const count = requiredKeys.filter((key) => uniqueLandmarkKeys.has(key)).length;
      return [collectionKey, count];
    })
  );

  return {
    pinsTotal,
    sharesTotal,
    sharesUniqueRecipients,
    pinsByCategory,
    beachTotal,
    landmarkTotal,
    unlockedCollectionCounts,
  };
}

export const listDefinitions = query({
  args: {},
  handler: async () => ACHIEVEMENTS,
});

export const getOverview = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stats = await getStats(ctx, userId);

    const earned = await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const earnedKeys = new Set(earned.map((b) => b.badgeKey));

    const achievements = ACHIEVEMENTS.map((a) => {
      const progress = computeProgress({ ...stats, achievement: a });
      return { ...a, progress, earned: earnedKeys.has(a.key) };
    });

    return { stats, earnedBadges: earned, achievements };
  },
});

export const evaluateAndAward = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stats = await getStats(ctx, userId);

    const existing = await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const existingKeys = new Set(existing.map((b) => b.badgeKey));

    const newlyEarned = [];
    for (const a of ACHIEVEMENTS) {
      const { complete } = computeProgress({ ...stats, achievement: a });
      if (complete && !existingKeys.has(a.key)) {
        await ctx.db.insert("userBadges", {
          userId,
          badgeKey: a.key,
          earnedAt: Date.now(),
        });
        newlyEarned.push(a.key);
      }
    }

    return { ok: true, newlyEarned };
  },
});