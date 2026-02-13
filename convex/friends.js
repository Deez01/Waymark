// Name: Bryan Estrada-Cordoba

import { query, mutation } from "./_generated/server"
import { v } from "convex/values"

// Search Users
export const searchUsers = query({
    args: { 
        search: v.string(), 
        currentUserId: v.string() 
    },
    handler: async (ctx, args) => { 
        if (!args.search) return [];

        const users = await ctx.db.query("users").collect();

        return users.filter (
            (u) =>
                u.auth0Id !== args.currentUserId &&
                u.name.toLowerCase().includes(args.search.toLowerCase())
        );
    },
});

// Send Friend Request

export const sendFriendRequest = mutation({
    args: {
        senderId: v.string(),
        receiverId: v.string(),
    },
    handler: async (ctx, args) => {
        // Prevents duplicates requests
        const existing = await ctx.db 
            .query("friendRequests")
            .filter((q) =>
                q.and(
                    q.eq(q.field("senderId"), args.senderId),
                    q.eq(q.field("receiverId"), args.receiverId)
                )
            )
            .first();

        if (existing) return { alreadySent: true}
        
        await ctx.db.insert("friendRequests", {
            senderId: args.senderId, 
            receiverId: args.receiverId,
            status: "pending",
        });

        return { success: true}
    },
});

/*
export const listFriends = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Query logic to find accepted friends
        return await ctx.db.query("friends")
            .filter(q => q.eq(q.field("user1"), args.userId))
            .collect();
    },
});
*/