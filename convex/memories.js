import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const changeVisibility = mutation({
    args: {
        memoryId: v.id("memories"),
        visibility: v.union(
            v.literal("Public"),
            v.literal("Private")
        ),
    },
    handler: async (ctx, args) => {
        // Get Logged-In user
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("User not authenicated");
        }

        // Get memory
        const memory = await ctx.db.get(args.memoryId)
        if (!memory) throw new Error("Memory not found");

        // Check ownership 
        if (memory.userId !== identity.subject) {
            throw new Error("Not authorized to modify this memory");
        }

        // Prevent redundant update
        if (memory.visibility === args.visibility) {
            throw new Error("Visibility already set to this value");
        }

        // Update visibility
        await ctx.db.patch(args.memoryId, {
            visibility: args.visibility,
        });

        return { success: true };
    },
});

export const getUserMemories = query({
    args: {}, 
    handler: async (ctx) => {
        const userId = await getAuthUserId(ctx);

        return await ctx.db
            .query("memories")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
    },
});
