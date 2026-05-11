// convex/users.js
import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";

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

export const updateProfile = mutation({
  args: {
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new ConvexError("Not authenicated.");
    }

    const updates = {};

    if (args.username !== undefined) {
      const username = args.username.trim().toLowerCase();
      if (!username) {
        throw new ConvexError("Username cannot be empty.");
      }

      // check if taken
      const existing = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", username))
        .first();

        if (existing && existing._id !== userId) {
          throw new ConvexError("Username already taken.")
        }

        updates.username = username;
    }

    if (args.bio !== undefined) {
      updates.bio = args.bio.trim();
    }

    if (args.profilePicture !== undefined) {
      updates.profilePicture = args.profilePicture;
    }

    await ctx.db.patch(userId, updates);
  },
});

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const updateProfilePicture = mutation({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    await ctx.db.patch(userId, {
      profilePicture: args.storageId,
    });
  },
});

export const getProfilePictureUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const updateAccountSettings = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    email: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    if (!userId) {
      throw new ConvexError("Not authenticated");
    }

    const updates = {};

    if (args.firstName !== undefined) {
      updates.firstName = args.firstName.trim();
    }

    if (args.lastName !== undefined) {
      updates.lastName = args.lastName.trim();
    }

    if (args.email !== undefined) {
      const email = args.email.trim().toLowerCase();

      const existing = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (existing && existing._id !== userId) {
        throw new ConvexError("Email already in use.");
      }

      updates.email = email;
    }

    await ctx.db.patch(userId, updates);
  },
});

export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError("Not authenticated");
    }

    // Find user by auth subject (this is the correct way in Convex Auth)
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("_id"), identity.subject))
      .unique();

    if (!user) {
      throw new ConvexError("User not found");
    }

    // Get auth account (where password auth lives)
    const authAccount = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", user._id).eq("provider", "password")
      )
      .unique();

    const email =
      identity.email ||
      authAccount?.providerAccountId ||
      user.email;

    if (!email) {
      throw new ConvexError("No email found");
    }

    // Verify current password
    await ctx.runAction("auth:verifyPassword", {
      email,
      password: args.currentPassword,
    });

    // Set new password
    await ctx.runAction("auth:resetPassword", {
      email,
      newPassword: args.newPassword,
    });

    return true;
  },
});
