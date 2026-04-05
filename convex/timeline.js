// convex/timeline.js
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { query } from "./_generated/server";

function assertAuthed(userId) {
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export const getTimelinePins = query({
  args: {
    sortOrder: v.union(v.literal("newest"), v.literal("oldest")),
    startDate: v.optional(v.number()), // timestamp ms
    endDate: v.optional(v.number()),   // timestamp ms
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerIdStr = userId.toString();

    const ownedPins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerIdStr))
      .collect();

    const sharedRefs = await ctx.db
      .query("pinShares")
      .withIndex("by_toOwnerId", (q) => q.eq("toOwnerId", userId))
      .collect();

    const sharedPins = await Promise.all(
      sharedRefs.map(async (share) => {
        const pin = await ctx.db.get(share.pinId);
        if (!pin) return null;
        return {
          ...pin,
          isShared: true,
          sharedBy: share.fromOwnerId,
          canEdit: share.canEdit === true,
          canComment: true,
          isOwner: false,
        };
      })
    );

    const deduped = new Map();
    for (const pin of ownedPins) {
      deduped.set(pin._id.toString(), { ...pin, isShared: false, canEdit: true, canComment: true, isOwner: true });
    }
    for (const pin of sharedPins) {
      if (!pin) continue;
      if (!deduped.has(pin._id.toString())) {
        deduped.set(pin._id.toString(), pin);
      }
    }

    let pins = Array.from(deduped.values());

    // Filter by date range if provided
    if (args.startDate !== undefined) {
      pins = pins.filter((pin) => pin.createdAt >= args.startDate);
    }

    if (args.endDate !== undefined) {
      pins = pins.filter((pin) => pin.createdAt <= args.endDate);
    }

    // Sort in memory for now
    pins.sort((a, b) =>
      args.sortOrder === "newest"
        ? b.createdAt - a.createdAt
        : a.createdAt - b.createdAt
    );

    return pins.map((pin) => ({
      _id: pin._id,
      title: pin.title,
      description: pin.description,
      caption: pin.caption,
      address: pin.address,
      category: pin.category,
      createdAt: pin.createdAt,
      thumbnail: pin.thumbnail,
      pictures: pin.pictures ?? [],
      lat: pin.lat,
      lng: pin.lng,
      isShared: pin.isShared ?? false,
      sharedBy: pin.sharedBy,
      canEdit: pin.canEdit === true,
      canComment: pin.canComment === true,
      isOwner: pin.isOwner !== false,
    }));
  },
});