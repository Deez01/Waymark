import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getAllPins = query({
  handler: async (ctx) => {
    return await ctx.db.query("pins").collect();
  },
});

export const createPin = mutation({
  args: {
    lat: v.number(),
    lng: v.number(),
    title: v.string(),
    address: v.string(),
    caption: v.string(),
    thumbnail: v.string(),
    pictures: v.array(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const newPinId = await ctx.db.insert("pins", {
      lat: args.lat,
      lng: args.lng,
      title: args.title,
      address: args.address,
      caption: args.caption,
      thumbnail: args.thumbnail,
      pictures: args.pictures,
      tags: args.tags,
    });
    return newPinId;
  },
})
