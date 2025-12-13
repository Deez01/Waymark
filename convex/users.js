// Name: Bryan Estrada-Cordoba
// convex/users.js
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createUser = mutation({
  args: {
    auth0Id: v.string(),
    email: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", q => q.eq("auth0Id", args.auth0Id))
      .first();

    if (!existing) {
      await ctx.db.insert("users", args);
    }
  },
});

export const updateUser = mutation({
  args: {
    auth0Id: v.string(),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", q => q.eq("auth0Id", args.auth0Id))
      .first();

    await ctx.db.patch(user._id, { name: args.name });
  },
});

export const deleteUser = mutation({
  args: { auth0Id: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_auth0Id", q => q.eq("auth0Id", args.auth0Id))
      .first();

    await ctx.db.delete(user._id);
  },
});
