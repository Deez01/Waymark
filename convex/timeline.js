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

    const ownerPins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerIdStr))
      .collect();

    const sharedPinsLinks = await ctx.db
      .query("pinShares")
      .withIndex("by_toOwnerId", (q) => q.eq("toOwnerId", userId))
      .collect();

    const sharedPins = await Promise.all(
      sharedPinsLinks.map(async (share) => {
        const pin = await ctx.db.get(share.pinId);
        if (!pin) return null;

        return {
          ...pin,
          isShared: true,
          isOwner: false,
          canEdit: share.canEdit === true,
        };
      })
    );

    let pins = [...ownerPins.map((pin) => ({ ...pin, isShared: false, isOwner: true, canEdit: true })), ...sharedPins.filter(Boolean)];

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
      isShared: pin.isShared,
      isOwner: pin.isOwner,
      canEdit: pin.canEdit,
      ownerId: pin.ownerId,
    }));
  },
});