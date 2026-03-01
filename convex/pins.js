import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";

function assertAuthed(userId) {
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    assertAuthed(await getAuthUserId(ctx));
    return await ctx.storage.generateUploadUrl();
  },
});

export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const createPin = mutation({
  args: {
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
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerId = userId.toString();
    if (args.pictures && args.pictures.length > 10) {
      throw new Error("A pin can have up to 10 photos");
    }

    const pinId = await ctx.db.insert("pins", {
      ownerId,
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

    await ctx.runMutation(api.achievements.evaluateAndAward, {});

    return pinId;
  },
});

export const getPinsByOwner = query({
  args: {},
  handler: async (ctx) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerIdStr = userId.toString();

    return await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerIdStr))
      .collect();
  },
});

export const getPinById = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.pinId);
  },
});

export const getPinPictures = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const pin = await ctx.db.get(args.pinId);
    if (!pin?.pictures || pin.pictures.length === 0) {
      return [];
    }

    const withUrls = await Promise.all(
      pin.pictures.map(async (storageId) => ({
        storageId,
        url: await ctx.storage.getUrl(storageId),
      }))
    );

    return withUrls.filter((item) => item.url !== null);
  },
});

export const getAllPins = query({
  handler: async (ctx) => {
    return await ctx.db.query("pins").collect();
  },
});

export const deletePin = mutation({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerIdStr = userId.toString();

    const pin = await ctx.db.get(args.pinId);
    if (!pin) throw new Error("Pin not found");
    if (pin.ownerId !== ownerIdStr) throw new Error("Not authorized");

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
    assertAuthed(await getAuthUserId(ctx));
    if (args.caption.length > 400) throw new Error("Caption too long (max 400 characters)");
    await ctx.db.patch(args.pinId, { caption: args.caption });
  },
});

export const updatePin = mutation({
  args: {
    pinId: v.id("pins"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    caption: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertAuthed(await getAuthUserId(ctx));

    if (args.caption !== undefined && args.caption.length > 400) {
      throw new Error("Caption too long (max 400 characters)");
    }

    const updates = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.caption !== undefined) updates.caption = args.caption;
    if (args.lat !== undefined) updates.lat = args.lat;
    if (args.lng !== undefined) updates.lng = args.lng;
    if (args.address !== undefined) updates.address = args.address;

    await ctx.db.patch(args.pinId, updates);
  },
});