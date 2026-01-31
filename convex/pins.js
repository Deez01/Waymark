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

export const getAllPins = query({
  handler: async (ctx) => {
    return await ctx.db.query("pins").collect();
  },
});

export const createPin = mutation({
  args: {
    ownerId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    category: v.optional(v.string()),
    address: v.optional(v.string()),
    caption: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    pictures: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const pinId = await ctx.db.insert("pins", {
ownerId: args.ownerId,
      title: args.title,
      description: args.description,
      lat: args.lat,
      lng: args.lng,
      category: args.category ?? "general",
      createdAt: Date.now(),
      address: args.address,
      caption: args.caption,
      thumbnail: args.thumbnail,
      pictures: args.pictures,
      tags: args.tags,    
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

export const updateCaption = mutation({
  args: {
    pinId: v.id("pins"), 
    caption: v.string(),
  }, 
  handler: async (ctx, args) => {
    // Vaildtion 
    if (args.caption.length > 400) {
      throw new Error("Caption too long (max 400 characters)")
    }

    await ctx.db.patch(args.pinId, {
      caption: args.caption,
    });
  },
});
