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

    let pins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerIdStr))
      .collect();

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
    }));
  },
});