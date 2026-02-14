import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";

const normalizeIdentifier = (value) => value.trim().toLowerCase();

const PasswordWithProfile = Password({
  profile(params) {
    const email = normalizeIdentifier(String(params.email ?? ""));
    const rawUsername = String(params.username ?? "");
    const username = normalizeIdentifier(rawUsername);
    const flow = String(params.flow ?? "");

    if (!email) {
      throw new ConvexError("Email is required.");
    }

    if (flow === "signUp") {
      if (!username) {
        throw new ConvexError("Username is required.");
      }

      if (username.includes("@")) {
        throw new ConvexError("Username cannot include '@'.");
      }

      return {
        email,
        username,
        profileComplete: false,
      };
    }

    return { email };
  },
});

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [PasswordWithProfile],
  callbacks: {
    async createOrUpdateUser(ctx, args) {
      if (args.existingUserId) {
        return args.existingUserId;
      }

      const email = String(args.profile.email ?? "").trim().toLowerCase();
      const username = String(args.profile.username ?? "").trim().toLowerCase();

      if (!email || !username) {
        throw new ConvexError("Email and username are required.");
      }

      const existingByEmail = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", email))
        .first();

      if (existingByEmail) {
        throw new ConvexError("Email already in use.");
      }

      const existingByUsername = await ctx.db
        .query("users")
        .withIndex("by_username", (q) => q.eq("username", username))
        .first();

      if (existingByUsername) {
        throw new ConvexError("Username already taken.");
      }

      return await ctx.db.insert("users", {
        ...args.profile,
        email,
        username,
        profileComplete: false,
      });
    },
  },
});
