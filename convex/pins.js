import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";

function assertAuthed(userId) {
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

function parseDateInputToMs(dateInput, endOfDay) {
  if (!dateInput) return null;
  const trimmed = dateInput.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;

  const iso = endOfDay ? `${trimmed}T23:59:59.999Z` : `${trimmed}T00:00:00.000Z`;
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? null : ms;
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

export const searchAndFilterMyPins = query({
  args: {
    searchText: v.optional(v.string()),
    locationQuery: v.optional(v.string()),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    tagIds: v.optional(v.array(v.id("tags"))),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerIdStr = userId.toString();

    let pins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerIdStr))
      .collect();

    if (args.tagIds && args.tagIds.length > 0) {
      const taggedPinIds = new Set();

      for (const tagId of args.tagIds) {
        const pinTags = await ctx.db
          .query("pinTags")
          .withIndex("by_tag", (q) => q.eq("tagId", tagId))
          .collect();

        for (const pt of pinTags) {
          taggedPinIds.add(pt.pinId);
        }
      }

      pins = pins.filter((pin) => taggedPinIds.has(pin._id));
    }

    if (args.searchText && args.searchText.trim()) {
      const term = args.searchText.trim().toLowerCase();
      pins = pins.filter((pin) => {
        const haystack = [pin.title, pin.description, pin.caption, pin.address]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      });
    }

    if (args.locationQuery && args.locationQuery.trim()) {
      const locationTerm = args.locationQuery.trim().toLowerCase();
      pins = pins.filter((pin) => (pin.address || "").toLowerCase().includes(locationTerm));
    }

    const startMs = parseDateInputToMs(args.startDate, false);
    const endMs = parseDateInputToMs(args.endDate, true);

    if (startMs !== null || endMs !== null) {
      const lowerBound = startMs !== null && endMs !== null ? Math.min(startMs, endMs) : startMs;
      const upperBound = startMs !== null && endMs !== null ? Math.max(startMs, endMs) : endMs;

      pins = pins.filter((pin) => {
        if (lowerBound !== null && pin.createdAt < lowerBound) return false;
        if (upperBound !== null && pin.createdAt > upperBound) return false;
        return true;
      });
    }

    return pins.sort((a, b) => b.createdAt - a.createdAt);
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
