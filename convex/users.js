// Name: Bryan Estrada-Cordoba
// convex/users.js
import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

const normalizeIdentifier = (value) => value.trim().toLowerCase();

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    return await ctx.db.get(userId);
  },
});

export const resolveEmailFromIdentifier = query({
  args: { identifier: v.string() },
  handler: async (ctx, args) => {
    const identifier = normalizeIdentifier(args.identifier);
    if (!identifier) {
      return null;
    }

    if (identifier.includes("@")) {
      return { email: identifier };
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", identifier))
      .first();

    if (!user?.email) {
      return null;
    }

    return { email: user.email };
  },
});

export const isUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const username = normalizeIdentifier(args.username);
    if (!username) {
      return false;
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .first();

    return !existing;
  },
});

export const completeProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    age: v.optional(v.number()),
    ethnicity: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenticated.");
    }

    const firstName = args.firstName.trim();
    const lastName = args.lastName.trim();

    if (!firstName || !lastName) {
      throw new ConvexError("First and last name are required.");
    }

    const updates = {
      firstName,
      lastName,
      profileComplete: true,
    };

    if (args.age !== undefined) {
      updates.age = args.age;
    }

    if (args.ethnicity !== undefined) {
      const ethnicity = args.ethnicity.trim();
      if (ethnicity) {
        updates.ethnicity = ethnicity;
      }
    }

    await ctx.db.patch(userId, updates);
  },
});
