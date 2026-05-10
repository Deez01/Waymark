import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Send Message
export const sendMessage = mutation({
  args: {
    senderId: v.id("users"),
    receiverId: v.id("users"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    if (!args.text.trim()) {
      throw new Error("Message cannot be empty");
    }

    await ctx.db.insert("messages", {
      senderId: args.senderId,
      receiverId: args.receiverId,
      text: args.text,
      createdAt: Date.now(),
    });
  },
});

// Get Conversation
export const getMessages = query({
  args: {
    userId: v.id("users"),
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages").collect();

    return messages
      .filter(
        (m) =>
          (m.senderId === args.userId && m.receiverId === args.friendId) ||
          (m.senderId === args.friendId && m.receiverId === args.userId)
      )
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});
