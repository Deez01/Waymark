// convex/pins.js
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";

// Validates that a user is logged in before allowing access.
function assertAuthed(userId) {
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

// Generates a secure URL for uploading files to Convex storage.
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    assertAuthed(await getAuthUserId(ctx));
    return await ctx.storage.generateUploadUrl();
  },
});

// Retrieves a public URL for a specific storage ID.
export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Creates a new pin in the database.
export const createPin = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    category: v.optional(v.string()),
    address: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    pictures: v.optional(v.array(v.string())),
    // Stores text captions mapped to specific picture storage IDs.
    captions: v.optional(v.record(v.string(), v.string())),
    tags: v.optional(v.array(v.string())),

    // Landmark memory fields
    isLandmarkMemory: v.optional(v.boolean()),
    landmarkKey: v.optional(v.string()),
    landmarkName: v.optional(v.string()),
    landmarkRegion: v.optional(v.string()),
    landmarkCollectionKeys: v.optional(v.array(v.string())),
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
      thumbnail: args.thumbnail,
      pictures: args.pictures,
      captions: args.captions,
      tags: args.tags,

      isLandmarkMemory: args.isLandmarkMemory,
      landmarkKey: args.landmarkKey,
      landmarkName: args.landmarkName,
      landmarkRegion: args.landmarkRegion,
      landmarkCollectionKeys: args.landmarkCollectionKeys,
    });

    // Check for any achievements related to pin creation.
    await ctx.runMutation(api.achievements.evaluateAndAward, {});

    return pinId;
  },
});

// Returns all pins owned by the currently authenticated user.
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

// Retrieves full pin data by its unique ID.
export const getPinById = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.pinId);
  },
});

// Fetches URLs and captions for all pictures associated with a pin.
export const getPinPictures = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const pin = await ctx.db.get(args.pinId);

    if (!pin?.pictures || pin.pictures.length === 0) {
      return [];
    }

    const captionsDict = pin.captions || {};

    const withUrls = await Promise.all(
      pin.pictures.map(async (storageId) => ({
        storageId,
        url: await ctx.storage.getUrl(storageId),
        caption: captionsDict[storageId] || "",
      }))
    );

    return withUrls.filter((item) => item.url !== null);
  },
});

// Fetches all user pins and attaches the first image URL for map display.
export const getAllPins = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const pins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId.toString()))
      .collect();

    const pinsWithUrls = await Promise.all(
      pins.map(async (pin) => {
        const imageId = (pin.pictures && pin.pictures.length > 0) ? pin.pictures[0] : pin.thumbnail;
        let imageUrl = null;

        if (imageId) {
          imageUrl = await ctx.storage.getUrl(imageId);
        }

        return { ...pin, imageUrl };
      })
    );

    return pinsWithUrls;
  },
});

// Deletes a specific pin from the database.
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

// Updates the properties of an existing pin.
export const updatePin = mutation({
  args: {
    pinId: v.id("pins"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    address: v.optional(v.string()),
    pictures: v.optional(v.array(v.string())),
    captions: v.optional(v.record(v.string(), v.string())),
    thumbnail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    assertAuthed(await getAuthUserId(ctx));

    const updates = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.lat !== undefined) updates.lat = args.lat;
    if (args.lng !== undefined) updates.lng = args.lng;
    if (args.address !== undefined) updates.address = args.address;
    if (args.pictures !== undefined) updates.pictures = args.pictures;
    if (args.captions !== undefined) updates.captions = args.captions;
    if (args.thumbnail !== undefined) updates.thumbnail = args.thumbnail;

    await ctx.db.patch(args.pinId, updates);
  },
});

// gives a clean way to display/filter landmark memories later
export const getLandmarkPins = query({
  args: {},
  handler: async (ctx) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerIdStr = userId.toString();

    const pins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerIdStr))
      .collect();

    return pins.filter((pin) => pin.isLandmarkMemory === true);
  },
});
