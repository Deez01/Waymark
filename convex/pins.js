// Bare-bones pins API for testing gamification + basic app flows.
// Extend / tighten types as the project grows.

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getPinsByOwner = query({
  args: { ownerId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.ownerId))
      .collect();
  },
});

export const getPinById = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.pinId);
  },
});

export const createPin = mutation({
  args: {
    ownerId: v.string(),
    title: v.string(),
    description: v.string(),
    lat: v.number(),
    lng: v.number(),
    category: v.string(),
  },
  handler: async (ctx, args) => {
    const pinId = await ctx.db.insert("pins", {
      ownerId: args.ownerId,
      title: args.title,
      description: args.description,
      lat: args.lat,
      lng: args.lng,
      category: args.category,
      createdAt: Date.now(),
    });
    return pinId;
  },
});

export const deletePin = mutation({
  args: {
    ownerId: v.string(),
    pinId: v.id("pins"),
  },
  handler: async (ctx, args) => {
    const pin = await ctx.db.get(args.pinId);
    if (!pin) throw new Error("Pin not found");
    if (pin.ownerId !== args.ownerId) throw new Error("Not authorized");
    await ctx.db.delete(args.pinId);
    return true;
  },
});
