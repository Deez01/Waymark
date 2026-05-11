import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

/* -------------------------
   GET MESSAGES (WITH IMAGE URL FIX)
--------------------------*/
export const getMessages = query({
  args: {
    userId: v.id("users"),
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages").collect();

    const filtered = messages
      .filter(
        (m) =>
          (m.senderId === args.userId &&
            m.receiverId === args.friendId) ||
          (m.senderId === args.friendId &&
            m.receiverId === args.userId)
      )
      .sort((a, b) => a.createdAt - b.createdAt);

    // convert imageId -> usable URL
    return Promise.all(
      filtered.map(async (m) => ({
        ...m,
        imageUrl: m.imageId
          ? await ctx.storage.getUrl(m.imageId)
          : undefined,
      }))
    );
  },
});

/* -------------------------
   SEND MESSAGE
--------------------------*/
export const sendMessage = mutation({
  args: {
    senderId: v.id("users"),
    receiverId: v.id("users"),
    text: v.optional(v.string()),
    imageId: v.optional(v.string()),
    clientId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.text && !args.imageId) return;

    return await ctx.db.insert("messages", {
      senderId: args.senderId,
      receiverId: args.receiverId,
      text: args.text,
      imageId: args.imageId,
      createdAt: Date.now(),
      seen: false,
      clientId: args.clientId,
    });
  },
});

/* -------------------------
   EDIT MESSAGE
--------------------------*/
export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      text: args.text,
      editedAt: Date.now(),
    });
  },
});

/* -------------------------
   DELETE MESSAGE
--------------------------*/
export const deleteMessage = mutation({
  args: {
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.messageId);
  },
});

/* -------------------------
   MARK AS SEEN
--------------------------*/
export const markSeen = mutation({
  args: {
    userId: v.id("users"),
    friendId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("messages").collect();

    for (const m of messages) {
      if (
        m.senderId === args.friendId &&
        m.receiverId === args.userId &&
        !m.seen
      ) {
        await ctx.db.patch(m._id, {
          seen: true,
        });
      }
    }
  },
});

/* -------------------------
   UPLOAD URL (FIXED)
--------------------------*/
export const generateMessageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
