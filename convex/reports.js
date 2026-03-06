import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation } from "./_generated/server";

function assertAuthed(userId) {
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

// Creates a new moderation report record for a pin.
export const createPinReport = mutation({
  args: {
    pinId: v.id("pins"),
    reason: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Only signed-in users can submit reports.
    const userId = assertAuthed(await getAuthUserId(ctx));

    // Trim and validate minimum reason length to avoid empty/low-signal reports.
    const reason = args.reason.trim();
    if (reason.length < 3) {
      throw new Error("Reason must be at least 3 characters");
    }

    const description = args.description?.trim();

    // Store as pending so moderators can triage later.
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
