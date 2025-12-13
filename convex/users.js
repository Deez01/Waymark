// Name: Bryan Estrada-Cordoba
// convex/users.js
import { mutation, query } from "./_generated/server";

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
