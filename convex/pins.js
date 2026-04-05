import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";

function assertAuthed(userId) {
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function canUserEditPin(ctx, userId, pinId, pinDoc) {
  const ownerIdStr = userId.toString();
  const pin = pinDoc ?? (await ctx.db.get(pinId));
  if (!pin) return false;

  if (pin.ownerId === ownerIdStr) {
    return true;
  }

  const acceptedShares = await ctx.db
    .query("pinShares")
    .withIndex("by_toOwnerId", (q) => q.eq("toOwnerId", userId))
    .collect();

  return acceptedShares.some(
    (share) =>
      share.pinId.toString() === pin._id.toString() &&
      share.canEdit === true
  );
}

async function canUserViewPin(ctx, userId, pinId, pinDoc) {
  const ownerIdStr = userId.toString();
  const pin = pinDoc ?? (await ctx.db.get(pinId));
  if (!pin) return false;

  if (pin.ownerId === ownerIdStr) {
    return true;
  }

  const acceptedShares = await ctx.db
    .query("pinShares")
    .withIndex("by_toOwnerId", (q) => q.eq("toOwnerId", userId))
    .collect();

  if (acceptedShares.some((share) => share.pinId.toString() === pin._id.toString())) {
    return true;
  }

  const pendingRequests = await ctx.db
    .query("sharedPins")
    .withIndex("by_shared_with", (q) => q.eq("sharedWith", userId))
    .collect();

  return pendingRequests.some(
    (request) =>
      request.pinId.toString() === pin._id.toString() &&
      request.status !== "rejected"
  );
}

async function canUserCommentPin(ctx, userId, pinId, pinDoc) {
  const ownerIdStr = userId.toString();
  const pin = pinDoc ?? (await ctx.db.get(pinId));
  if (!pin) return false;

  if (pin.ownerId === ownerIdStr) {
    return true;
  }

  const acceptedShares = await ctx.db
    .query("pinShares")
    .withIndex("by_toOwnerId", (q) => q.eq("toOwnerId", userId))
    .collect();

  return acceptedShares.some((share) => share.pinId.toString() === pin._id.toString());
}

export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    assertAuthed(await getAuthUserId(ctx));
    return await ctx.storage.generateUploadUrl();
  },
});

export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const createPin = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    category: v.optional(v.string()),
    address: v.optional(v.string()),
    caption: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    pictures: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerId = userId.toString();
    if (args.pictures && args.pictures.length > 10) {
      throw new Error("A pin can have up to 10 photos");
    }

    const pinId = await ctx.db.insert("pins", {
      ownerId,
      title: args.title,
      description: args.description,
      lat: args.lat,
      lng: args.lng,
      category: args.category ?? "general",
      createdAt: Date.now(),
      address: args.address,
      caption: args.caption,
      thumbnail: args.thumbnail,
      pictures: args.pictures,
      tags: args.tags,
    });

    await ctx.runMutation(api.achievements.evaluateAndAward, {});

    return pinId;
  },
});

export const getPinsByOwner = query({
  args: {},
  handler: async (ctx) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerIdStr = userId.toString();

    return await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerIdStr))
      .collect();
  },
});

export const sharePin = mutation({
  args: {
    pinId: v.id("pins"),
    toUserId: v.id("users"),
    canEdit: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerIdStr = userId.toString();
    const toUserIdStr = args.toUserId.toString();

    const pin = await ctx.db.get(args.pinId);
    if (!pin) throw new Error("Pin not found");
    if (pin.ownerId !== ownerIdStr) throw new Error("Only the owner can share this pin");
    if (toUserIdStr === ownerIdStr) throw new Error("You cannot share a pin with yourself");

    const recipient = await ctx.db.get(args.toUserId);
    if (!recipient) throw new Error("Selected user no longer exists");

    const sentRequests = await ctx.db
      .query("friendRequests")
      .withIndex("by_senderId", (q) => q.eq("senderId", userId))
      .collect();

    const receivedRequests = await ctx.db
      .query("friendRequests")
      .withIndex("by_receiverId", (q) => q.eq("receiverId", userId))
      .collect();

    const areFriends = [...sentRequests, ...receivedRequests].some((request) => {
      if (request.status !== "accepted") return false;

      const senderId = request.senderId.toString();
      const receiverId = request.receiverId.toString();
      return (
        (senderId === ownerIdStr && receiverId === toUserIdStr) ||
        (senderId === toUserIdStr && receiverId === ownerIdStr)
      );
    });

    if (!areFriends) {
      throw new Error("You can only share pins with friends");
    }

    const existingRequestsForPin = await ctx.db
      .query("sharedPins")
      .withIndex("by_pin", (q) => q.eq("pinId", args.pinId))
      .collect();

    const existingRequest = existingRequestsForPin.find(
      (request) =>
        request.sharedBy.toString() === ownerIdStr &&
        request.sharedWith.toString() === toUserIdStr
    );

    if (existingRequest && existingRequest.status !== "rejected") {
      if (existingRequest.status === "pending") {
        await ctx.db.patch(existingRequest._id, {
          canEdit: args.canEdit === true,
        });
      }

      return {
        alreadyRequested: true,
        requestStatus: existingRequest.status,
      };
    }

    if (existingRequest && existingRequest.status === "rejected") {
      await ctx.db.delete(existingRequest._id);
    }

    await ctx.db.insert("sharedPins", {
      pinId: args.pinId,
      sharedBy: userId,
      sharedWith: args.toUserId,
      canEdit: args.canEdit === true,
      status: "pending",
      createdAt: Date.now(),
    });

    return { ok: true, alreadyRequested: false, requestStatus: "pending" };
  },
});

export const getIncomingShareRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = assertAuthed(await getAuthUserId(ctx));

    const incoming = await ctx.db
      .query("sharedPins")
      .withIndex("by_shared_with", (q) => q.eq("sharedWith", userId))
      .collect();

    const pending = incoming.filter((request) => request.status === "pending");

    const withDetails = await Promise.all(
      pending.map(async (request) => {
        const [pin, sharedByUser] = await Promise.all([
          ctx.db.get(request.pinId),
          ctx.db.get(request.sharedBy),
        ]);

        if (!pin) {
          return null;
        }

        const sharedByName =
          sharedByUser?.username ||
          `${sharedByUser?.firstName ?? ""} ${sharedByUser?.lastName ?? ""}`.trim() ||
          "Unknown";

        return {
          requestId: request._id,
          pinId: request.pinId,
          pinTitle: pin.title || "Untitled Pin",
          pinAddress: pin.address,
          sharedBy: request.sharedBy,
          sharedByName,
          createdAt: request.createdAt,
        };
      })
    );

    return withDetails.filter(Boolean);
  },
});

export const getShareRequestPreviewPin = query({
  args: { requestId: v.id("sharedPins") },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const request = await ctx.db.get(args.requestId);

    if (!request) {
      return null;
    }
    if (request.sharedWith.toString() !== userId.toString()) {
      return null;
    }
    if (request.status !== "pending") {
      return null;
    }

    const pin = await ctx.db.get(request.pinId);
    if (!pin) {
      return null;
    }

    return {
      ...pin,
      isShared: true,
      sharedBy: request.sharedBy,
    };
  },
});

export const respondToShareRequest = mutation({
  args: {
    requestId: v.id("sharedPins"),
    action: v.union(v.literal("accepted"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const request = await ctx.db.get(args.requestId);

    if (!request) throw new Error("Share request not found");
    if (request.sharedWith.toString() !== userId.toString()) {
      throw new Error("Not authorized");
    }
    if (request.status !== "pending") {
      throw new Error("This share request is no longer pending");
    }

    if (args.action === "accepted") {
      const existingSharesForPin = await ctx.db
        .query("pinShares")
        .withIndex("by_pinId", (q) => q.eq("pinId", request.pinId))
        .collect();

      const alreadyShared = existingSharesForPin.some(
        (share) =>
          share.fromOwnerId.toString() === request.sharedBy.toString() &&
          share.toOwnerId.toString() === request.sharedWith.toString()
      );

      if (!alreadyShared) {
        await ctx.db.insert("pinShares", {
          pinId: request.pinId,
          fromOwnerId: request.sharedBy,
          toOwnerId: request.sharedWith,
          canEdit: request.canEdit === true,
          createdAt: Date.now(),
        });
      }
    }

    await ctx.db.patch(args.requestId, {
      status: args.action,
      respondedAt: Date.now(),
    });

    return { ok: true };
  },
});

export const getPinById = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const pin = await ctx.db.get(args.pinId);
    if (!pin) return null;

    const canView = await canUserViewPin(ctx, userId, args.pinId, pin);
    if (!canView) {
      throw new Error("Not authorized");
    }

    const canEdit = await canUserEditPin(ctx, userId, args.pinId, pin);
    const canComment = await canUserCommentPin(ctx, userId, args.pinId, pin);

    return {
      ...pin,
      canEdit,
      canComment,
      isOwner: pin.ownerId === userId.toString(),
    };
  },
});

export const getPinComments = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const pin = await ctx.db.get(args.pinId);
    if (!pin) {
      throw new Error("Pin not found");
    }

    const canView = await canUserViewPin(ctx, userId, args.pinId, pin);
    if (!canView) {
      throw new Error("Not authorized");
    }

    const comments = await ctx.db
      .query("comments")
      .withIndex("by_pin", (q) => q.eq("pinId", args.pinId))
      .collect();

    const withUsers = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        const userName =
          user?.username ||
          `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() ||
          "Unknown";

        return {
          _id: comment._id,
          pinId: comment.pinId,
          userId: comment.userId,
          userName,
          text: comment.text,
          updatedAt: comment.updatedAt,
          isMine: comment.userId.toString() === userId.toString(),
        };
      })
    );

    withUsers.sort((a, b) => a.updatedAt - b.updatedAt);
    return withUsers;
  },
});

export const addPinComment = mutation({
  args: {
    pinId: v.id("pins"),
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const pin = await ctx.db.get(args.pinId);
    if (!pin) {
      throw new Error("Pin not found");
    }

    const canComment = await canUserCommentPin(ctx, userId, args.pinId, pin);
    if (!canComment) {
      throw new Error("Not authorized");
    }

    const text = args.text.trim();
    if (!text) {
      throw new Error("Comment cannot be empty");
    }
    if (text.length > 500) {
      throw new Error("Comment is too long (max 500 characters)");
    }

    return await ctx.db.insert("comments", {
      pinId: args.pinId,
      userId,
      text,
      updatedAt: Date.now(),
    });
  },
});

export const getPinPictures = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const pin = await ctx.db.get(args.pinId);
    if (!pin) {
      throw new Error("Pin not found");
    }

    const canView = await canUserViewPin(ctx, userId, args.pinId, pin);
    if (!canView) {
      throw new Error("Not authorized");
    }

    if (!pin?.pictures || pin.pictures.length === 0) {
      return [];
    }

    const withUrls = await Promise.all(
      pin.pictures.map(async (storageId) => ({
        storageId,
        url: await ctx.storage.getUrl(storageId),
      }))
    );

    return withUrls.filter((item) => item.url !== null);
  },
});

export const getAllPins = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized");
    }

    const ownerPins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId.toString()))
      .collect();

    const sharesToUser = await ctx.db
      .query("pinShares")
      .withIndex("by_toOwnerId", (q) => q.eq("toOwnerId", userId))
      .collect();

    const sharedPins = await Promise.all(
      sharesToUser.map(async (share) => {
        const pin = await ctx.db.get(share.pinId);
        if (!pin) return null;
        return {
          ...pin,
          isShared: true,
          sharedBy: share.fromOwnerId,
          canEdit: share.canEdit === true,
          canComment: true,
          isOwner: false,
        };
      })
    );

    const deduped = new Map();
    for (const pin of ownerPins) {
      deduped.set(pin._id.toString(), { ...pin, isShared: false, canEdit: true, canComment: true, isOwner: true });
    }
    for (const pin of sharedPins) {
      if (!pin) continue;
      if (!deduped.has(pin._id.toString())) {
        deduped.set(pin._id.toString(), pin);
      }
    }

    return Array.from(deduped.values());
  },
});

export const deletePin = mutation({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerIdStr = userId.toString();

    const pin = await ctx.db.get(args.pinId);
    if (!pin) throw new Error("Pin not found");
    if (pin.ownerId !== ownerIdStr) throw new Error("Not authorized");

    const sharesForPin = await ctx.db
      .query("pinShares")
      .withIndex("by_pinId", (q) => q.eq("pinId", args.pinId))
      .collect();

    for (const share of sharesForPin) {
      await ctx.db.delete(share._id);
    }

    await ctx.db.delete(args.pinId);
    return true;
  },
});

export const updateCaption = mutation({
  args: {
    pinId: v.id("pins"),
    caption: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const pin = await ctx.db.get(args.pinId);
    if (!pin) throw new Error("Pin not found");

    const canEdit = await canUserEditPin(ctx, userId, args.pinId, pin);
    if (!canEdit) throw new Error("Not authorized");

    if (args.caption.length > 400) throw new Error("Caption too long (max 400 characters)");
    await ctx.db.patch(args.pinId, { caption: args.caption });
  },
});

export const updatePin = mutation({
  args: {
    pinId: v.id("pins"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    caption: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));

    const pin = await ctx.db.get(args.pinId);
    if (!pin) throw new Error("Pin not found");

    const canEdit = await canUserEditPin(ctx, userId, args.pinId, pin);
    if (!canEdit) throw new Error("Not authorized");

    if (args.caption !== undefined && args.caption.length > 400) {
      throw new Error("Caption too long (max 400 characters)");
    }

    const updates = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.caption !== undefined) updates.caption = args.caption;
    if (args.lat !== undefined) updates.lat = args.lat;
    if (args.lng !== undefined) updates.lng = args.lng;
    if (args.address !== undefined) updates.address = args.address;

    await ctx.db.patch(args.pinId, updates);
  },
});
