import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

function assertAuthed(userId) {
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

export const createPinReport = mutation({
  args: {
    pinId: v.id("pins"),
    reason: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));

    const reason = args.reason.trim();
    if (reason.length < 3) {
      throw new Error("Reason must be at least 3 characters");
    }

    const description = args.description?.trim();

    return await ctx.db.insert("reports", {
      reportedBy: userId,
      reportType: "pin",
      reportedItemId: args.pinId,
      reason,
      description: description && description.length > 0 ? description : undefined,
      status: "pending",
    });
  },
});
