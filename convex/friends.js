// Name: Bryan Estrada-Cordoba

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Search Users
export const searchUsers = query({
    args: { 
        search: v.string(), 
        currentUserId: v.string("users"),
    },
    handler: async (ctx, args) => { 
        if (!args.search) return [];

        const searchLower = args.search.toLowerCase();

        const users = await ctx.db.query("users").collect();

        return users.filter (
            (u) =>
                u._id !== args.currentUserId &&
                (
                    u.username?.toLowerCase().includes(searchLower) ||
                    u.firstName?.toLowerCase().includes(searchLower) ||
                    u.lastName?.toLowerCase().includes(searchLower)
                )
        ) 
        .map((u) => ({
            _id: u._id,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
        }));
    },
});

// Send Friend Request
export const sendFriendRequest = mutation({
    args: {
        senderId: v.id("users"),
        receiverId: v.id("users"),
    },
    handler: async (ctx, args) => {
        // Prevents self requests
        if (args.senderId === args.receiverId) return;

        const existing = await ctx.db 
            .query("friendRequests")
            .withIndex("by_senderId", (q) => q.eq("senderId", args.senderId))
            .collect();

        const duplicate = existing.find(
            (r) => 
                r.receiverId === args.receiverId && 
            r.status === "pending"
        );
        
        if (duplicate) {
            return { alreadySent: true };
        }

        await ctx.db.insert("friendRequests", {
            senderId: args.senderId, 
            receiverId: args.receiverId,
            status: "pending",
            createdAt: Date.now(),
        });

        return { success: true };
    },
});

export const getIncomingRequests = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        const requests = await ctx.db
            .query("friendRequests")
            .withIndex("by_receiverId", (q) =>
            q.eq("receiverId", args.userId)
            )
            .collect();

        const users = await ctx.db.query("users").collect();

        return requests
            .filter((r) => r.status === "pending")
            .map((r) => {
                const sender = users.find((u) => u._id === r.senderId);

                return {
                    requestId: r._id, 
                    senderId: r.senderId,
                    senderName: 
                        sender?.username ??
                        (
                            `${sender?.firstName ?? ""} ${sender?.lastName ?? ""}`.trim() ||
                            "Unknown"
                        )
                };
            });
    },
});

export const respondToRequest = mutation({
    args: {
        requestId: v.id("friendRequests"),
        action: v.union(
            v.literal("accepted"),
            v.literal("rejected")
        ),  // accept or reject
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.requestId, {
            status: args.action,
        });
    },
});

export const listFriends = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        // Query logic to find accepted friends
        const requests = await ctx.db
            .query("friendRequests")
            .collect();
        
        const users = await ctx.db.query("users").collect();
        
        const accepted = requests.filter(
            r => 
                r.status === "accepted" && 
            (r.senderId === args.userId || r.receiverId === args.userId)
        );
        return accepted.map((r) => {
            const friendId = 
                r.senderId === args.userId ? r.receiverId : r.senderId;

            const friend = users.find((u) => u._id === friendId);

            return {
                _id: friendId, 
                username: friend?.username,
                name: 
                    friend?.username ?? 
                    (
                        `${friend?.firstName ?? ""} ${friend?.lastName ?? ""}`.trim() ||
                        "Unknown"
                    )
            };
        });
    },
});
