import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Toggle a like on a pin
export const toggleLike = mutation({
  args: { pinId: v.id("pins") },
  handler: async (ctx, { pinId }) => {
    const userId = await getAuthUserId(ctx);

    const existing = await ctx.db
      .query("likes")
      .withIndex("by_user_pin", (q) => 
        q.eq("userId", userId).eq("pinId", pinId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    } else {
      await ctx.db.insert("likes", { userId, pinId });
    }
  },
});

// Add a comment to a pin
export const addComment = mutation({
  args: {
    pinId: v.id("pins"),
    text: v.string(),
  },
  handler: async (ctx, { pinId, text }) => {
    const userId = await getAuthUserId(ctx);

    await ctx.db.insert("comments", {
      pinId,
      userId,
      text,
      createdAt: Date.now(),
    });
  },
});

// Get likes and comments for a pin
export const getPostDetails = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, { pinId }) => {
    const likes = await ctx.db
      .query("likes")
      .withIndex("by_pin", (q) => q.eq("pinId", pinId))
      .collect();

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_pin", (q) => q.eq("pinId", pinId))
      .collect();

    return {
      likesCount: likes.length,
      comments,
    };
  },
});
