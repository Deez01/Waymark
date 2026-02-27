// convex/demo.js
// Demo helpers to make the achievements system testable quickly (viewer-based).
// Uses authId (subject/tokenIdentifier) instead of email.

import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation } from "./_generated/server";

const CATEGORIES = ["general", "beach", "landmark"];

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getOrCreateViewerUser(ctx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const authId = identity.subject ?? identity.tokenIdentifier ?? null;
  if (!authId) throw new Error("Authenticated user missing subject/tokenIdentifier");

  const email = identity.email ?? null;

  let user = await ctx.db
    .query("users")
    .withIndex("by_authId", (q) => q.eq("authId", authId))
    .unique();

  if (!user) {
    const userId = await ctx.db.insert("users", {
      authId,
      email: email ?? undefined,
      profileComplete: false,
    });
    user = await ctx.db.get(userId);
  } else if (email && user.email !== email) {
    await ctx.db.patch(user._id, { email });
    user = await ctx.db.get(user._id);
  }

  return user;
}

export const seedDemoActivity = mutation({
  args: {
    pinsToAdd: v.optional(v.number()),
    sharesToAdd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getOrCreateViewerUser(ctx);

    const pinsToAdd = args.pinsToAdd ?? 12;
    const sharesToAdd = args.sharesToAdd ?? 3;

    // Create/find some demo "friend" users.
    // NOTE: your schema requires users.authId, so we must provide it.
    const friendUsers = [];
    for (let i = 1; i <= 6; i++) {
      const friendAuthId = `demo_friend_${i}`;

      let friend = await ctx.db
        .query("users")
        .withIndex("by_authId", (q) => q.eq("authId", friendAuthId))
        .unique();

      if (!friend) {
        const friendId = await ctx.db.insert("users", {
          authId: friendAuthId,
          email: undefined,
          username: `demo_friend_${i}`,
          profileComplete: false,
        });
        friend = await ctx.db.get(friendId);
      }

      friendUsers.push(friend);
    }

    // pins.ownerId is a STRING in your schema, so store viewer._id.toString()
    const viewerOwnerIdStr = viewer._id.toString();

    // Seed pins owned by viewer
    const createdPinIds = [];
    for (let i = 0; i < pinsToAdd; i++) {
      const category = CATEGORIES[randInt(0, CATEGORIES.length - 1)];
      const pinId = await ctx.db.insert("pins", {
        ownerId: viewerOwnerIdStr,
        title: `Demo Pin #${i + 1}`,
        description: `Seeded pin for testing achievements (${category}).`,
        lat: 33.7701 + Math.random() * 0.02,
        lng: -118.1937 + Math.random() * 0.02,
        category,
        createdAt: Date.now(),
      });
      createdPinIds.push(pinId);
    }

    // Seed shares from viewer -> demo friends
    for (let i = 0; i < sharesToAdd; i++) {
      const toUser = friendUsers[i % friendUsers.length];

      await ctx.db.insert("pinShares", {
        pinId: createdPinIds[i % createdPinIds.length], // v.id("pins")
        fromOwnerId: viewer._id,                         // v.id("users")
        toOwnerId: toUser._id,                           // v.id("users")
        createdAt: Date.now(),
      });
    }

    // Award anything now complete
    const res = await ctx.runMutation(api.achievements.evaluateAndAward, {});
    return res ?? { ok: true, newlyEarned: [] };
  },
});

export const resetDemoBadges = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = await getOrCreateViewerUser(ctx);
    const viewerOwnerIdStr = viewer._id.toString();

    // 1) Delete badges for viewer
    const badges = await ctx.db
      .query("userBadges")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .collect();
    for (const b of badges) {
      await ctx.db.delete(b._id);
    }

    // 2) Delete pins owned by viewer (ownerId is STRING)
    const pins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", viewerOwnerIdStr))
      .collect();
    for (const p of pins) {
      await ctx.db.delete(p._id);
    }

    // 3) Delete shares sent by viewer
    const shares = await ctx.db
      .query("pinShares")
      .withIndex("by_fromOwnerId", (q) => q.eq("fromOwnerId", viewer._id))
      .collect();
    for (const s of shares) {
      await ctx.db.delete(s._id);
    }

    return { ok: true };
  },
});