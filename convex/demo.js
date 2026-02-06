// Demo helpers to make the achievements system testable quickly.

import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation } from "./_generated/server";

const CATEGORIES = ["general", "beach", "landmark"];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export const seedDemoActivity = mutation({
  args: {
    ownerId: v.string(),
    pinsToAdd: v.optional(v.number()),
    sharesToAdd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pinsToAdd = args.pinsToAdd ?? 12;
    const sharesToAdd = args.sharesToAdd ?? 3;

    for (let i = 0; i < pinsToAdd; i++) {
      const category = CATEGORIES[randInt(0, CATEGORIES.length - 1)];
      await ctx.db.insert("pins", {
        ownerId: args.ownerId,
        title: `Demo Pin #${i + 1}`,
        description: `Seeded pin for testing achievements (${category}).`,
        lat: 33.7701 + Math.random() * 0.02,
        lng: -118.1937 + Math.random() * 0.02,
        category,
        createdAt: Date.now(),
      });
    }

    for (let i = 0; i < sharesToAdd; i++) {
      await ctx.db.insert("pinShares", {
        pinId: `demo-pin-${i + 1}`,
        fromOwnerId: args.ownerId,
        toOwnerId: `friend_${(i % 6) + 1}`,
        createdAt: Date.now(),
      });
    }

    // ✅ Award anything that is now complete (correct way to call another mutation)
    const res = await ctx.runMutation(api.achievements.evaluateAndAward, {
      ownerId: args.ownerId,
    });

    // res should include { ok, newlyEarned }
    return res ?? { ok: true, newlyEarned: [] };
  },
});

export const resetDemoBadges = mutation({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    const badges = await ctx.db
      .query("userBadges")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.ownerId))
      .collect();

    for (const b of badges) {
      await ctx.db.delete(b._id);
    }

    return { ok: true };
  },
});
