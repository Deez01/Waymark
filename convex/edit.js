// Name: Bryan Estrada-Cordoba

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
