// convex/pins.js
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation, query } from "./_generated/server";

// Validates that a user is logged in before allowing access.
function assertAuthed(userId) {
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function getAcceptedSharesForUser(ctx, userId) {
  return await ctx.db
    .query("pinShares")
    .withIndex("by_toOwnerId", (q) => q.eq("toOwnerId", userId))
    .collect();
}

async function canUserEditPin(ctx, userId, pinId, pinDoc) {
  const ownerIdStr = userId.toString();
  const pin = pinDoc ?? (await ctx.db.get(pinId));
  if (!pin) return false;

  if (pin.ownerId === ownerIdStr) {
    return true;
  }

  const acceptedShares = await getAcceptedSharesForUser(ctx, userId);
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

  const acceptedShares = await getAcceptedSharesForUser(ctx, userId);
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

async function areUsersFriends(ctx, userIdA, userIdB) {
  const requests = await ctx.db.query("friendRequests").collect();
  return requests.some((request) => {
    if (request.status !== "accepted") return false;

    const senderId = request.senderId.toString();
    const receiverId = request.receiverId.toString();
    const a = userIdA.toString();
    const b = userIdB.toString();
    return (
      (senderId === a && receiverId === b) ||
      (senderId === b && receiverId === a)
    );
  });
}

async function canUserCommentPin(ctx, userId, pinId, pinDoc) {
  const ownerIdStr = userId.toString();
  const pin = pinDoc ?? (await ctx.db.get(pinId));
  if (!pin) return false;

  if (pin.ownerId === ownerIdStr) {
    return true;
  }

  const acceptedShares = await getAcceptedSharesForUser(ctx, userId);
  return acceptedShares.some((share) => share.pinId.toString() === pin._id.toString());
}

// Generates a secure URL for uploading files to Convex storage.
export const generateUploadUrl = mutation({
  handler: async (ctx) => {
    assertAuthed(await getAuthUserId(ctx));
    return await ctx.storage.generateUploadUrl();
  },
});

// Retrieves a public URL for a specific storage ID.
export const getImageUrl = query({
  args: { storageId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Creates a new pin in the database.
export const createPin = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    category: v.optional(v.string()),
    address: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    pictures: v.optional(v.array(v.string())),
    // Stores text captions mapped to specific picture storage IDs.
    captions: v.optional(v.record(v.string(), v.string())),
    tags: v.optional(v.array(v.string())),

    // Landmark memory fields
    isLandmarkMemory: v.optional(v.boolean()),
    landmarkKey: v.optional(v.string()),
    landmarkName: v.optional(v.string()),
    landmarkRegion: v.optional(v.string()),
    landmarkCollectionKeys: v.optional(v.array(v.string())),
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
      thumbnail: args.thumbnail,
      pictures: args.pictures,
      captions: args.captions,
      tags: args.tags,

      isLandmarkMemory: args.isLandmarkMemory,
      landmarkKey: args.landmarkKey,
      landmarkName: args.landmarkName,
      landmarkRegion: args.landmarkRegion,
      landmarkCollectionKeys: args.landmarkCollectionKeys,
    });

    // Check for any achievements related to pin creation.
    await ctx.runMutation(api.achievements.evaluateAndAward, {});

    return pinId;
  },
});

// Returns all pins owned by the currently authenticated user.
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

// Retrieves full pin data by its unique ID.
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
    const acceptedShares = await getAcceptedSharesForUser(ctx, userId);
    const acceptedShare = acceptedShares.find((share) => share.pinId.toString() === pin._id.toString());
    const pendingShare = await ctx.db
      .query("sharedPins")
      .withIndex("by_shared_with", (q) => q.eq("sharedWith", userId))
      .collect();
    const pendingRequest = pendingShare.find(
      (request) =>
        request.pinId.toString() === pin._id.toString() &&
        request.status !== "rejected"
    );

    return {
      ...pin,
      canEdit,
      canComment,
      isOwner: pin.ownerId === userId.toString(),
      isShared: pin.ownerId !== userId.toString(),
      sharedBy: acceptedShare?.fromOwnerId ?? pendingRequest?.sharedBy,
    };
  },
});

// Fetches URLs and captions for all pictures associated with a pin.
export const getPinPictures = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const pin = await ctx.db.get(args.pinId);

    if (!pin) {
      return [];
    }

    const canView = await canUserViewPin(ctx, userId, args.pinId, pin);
    if (!canView) {
      throw new Error("Not authorized");
    }

    if (!pin?.pictures || pin.pictures.length === 0) {
      return [];
    }

    const captionsDict = pin.captions || {};

    const withUrls = await Promise.all(
      pin.pictures.map(async (storageId) => ({
        storageId,
        url: await ctx.storage.getUrl(storageId),
        caption: captionsDict[storageId] || "",
      }))
    );

    return withUrls.filter((item) => item.url !== null);
  },
});

// Fetches all accessible pins and attaches the first image URL for map display.
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

        const imageId = pin.pictures?.length > 0 ? pin.pictures[0] : pin.thumbnail;
        let imageUrl = null;
        if (imageId) {
          imageUrl = await ctx.storage.getUrl(imageId);
        }

        return {
          ...pin,
          imageUrl,
          isShared: true,
          sharedBy: share.fromOwnerId,
          canEdit: share.canEdit === true,
          canComment: true,
          isOwner: false,
          ownerId: pin.ownerId,
        };
      })
    );

    const deduped = new Map();
    for (const pin of ownerPins) {
      const imageId = pin.pictures?.length > 0 ? pin.pictures[0] : pin.thumbnail;
      let imageUrl = null;
      if (imageId) {
        imageUrl = await ctx.storage.getUrl(imageId);
      }

      deduped.set(pin._id.toString(), {
        ...pin,
        imageUrl,
        isShared: false,
        canEdit: true,
        canComment: true,
        isOwner: true,
        ownerId: pin.ownerId,
      });
    }

    for (const pin of sharedPins) {
      if (!pin) continue;
      deduped.set(pin._id.toString(), { ...pin, ownerId: pin.ownerId });
    }

    return [...deduped.values()];
  },
});

// Deletes a specific pin from the database.
export const deletePin = mutation({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerIdStr = userId.toString();

    const pin = await ctx.db.get(args.pinId);
    if (!pin) throw new Error("Pin not found");
    if (pin.ownerId !== ownerIdStr) throw new Error("Not authorized");

    await ctx.db.delete(args.pinId);
    return true;
  },
});

// Updates the properties of an existing pin.
export const updatePin = mutation({
  args: {
    pinId: v.id("pins"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    lat: v.optional(v.number()),
    lng: v.optional(v.number()),
    address: v.optional(v.string()),
    pictures: v.optional(v.array(v.string())),
    captions: v.optional(v.record(v.string(), v.string())),
    thumbnail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const pin = await ctx.db.get(args.pinId);
    if (!pin) {
      throw new Error("Pin not found");
    }

    const canEdit = await canUserEditPin(ctx, userId, args.pinId, pin);
    if (!canEdit) {
      throw new Error("Not authorized");
    }

    const updates = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.description !== undefined) updates.description = args.description;
    if (args.lat !== undefined) updates.lat = args.lat;
    if (args.lng !== undefined) updates.lng = args.lng;
    if (args.address !== undefined) updates.address = args.address;
    if (args.pictures !== undefined) updates.pictures = args.pictures;
    if (args.captions !== undefined) updates.captions = args.captions;
    if (args.thumbnail !== undefined) updates.thumbnail = args.thumbnail;

    await ctx.db.patch(args.pinId, updates);
  },
});

export const getPinsWithUrls = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const pins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", userId.toString()))
      .collect();

    // Map pictures storageIds to URLs
    const pinsWithUrls = await Promise.all(
      pins.map(async (pin) => {
        const picturesUrls =
          pin.pictures?.length > 0
            ? await Promise.all(
                pin.pictures.map(async (storageId) => ({
                  storageId,
                  url: await ctx.storage.getUrl(storageId),
                }))
              )
            : [];
        return { ...pin, picturesUrls };
      })
    );

    return pinsWithUrls;
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

    const friends = await ctx.db.query("friendRequests").collect();
    const isFriend = friends.some((request) => {
      if (request.status !== "accepted") return false;

      const senderId = request.senderId.toString();
      const receiverId = request.receiverId.toString();
      return (
        (senderId === ownerIdStr && receiverId === toUserIdStr) ||
        (senderId === toUserIdStr && receiverId === ownerIdStr)
      );
    });

    if (!isFriend) {
      throw new Error("You can only share pins with friends");
    }

    const existingRequestsForPin = await ctx.db
      .query("sharedPins")
      .withIndex("by_shared_with", (q) => q.eq("sharedWith", args.toUserId))
      .collect();

    const existingRequest = existingRequestsForPin.find(
      (request) =>
        request.pinId.toString() === args.pinId.toString() &&
        request.sharedBy.toString() === ownerIdStr
    );

    const existingShares = await ctx.db
      .query("pinShares")
      .withIndex("by_pinId", (q) => q.eq("pinId", args.pinId))
      .collect();

    const alreadyShared = existingShares.some(
      (share) =>
        share.fromOwnerId.toString() === ownerIdStr &&
        share.toOwnerId.toString() === toUserIdStr
    );

    if (alreadyShared) {
      return { alreadyRequested: true, requestStatus: "accepted" };
    }

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
    const users = await ctx.db.query("users").collect();

    const withDetails = await Promise.all(
      pending.map(async (request) => {
        const [pin, sharedByUser] = await Promise.all([
          ctx.db.get(request.pinId),
          ctx.db.get(request.sharedBy),
        ]);

        if (!pin) return null;

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
          canEdit: request.canEdit === true,
        };
      })
    );

    return withDetails.filter(Boolean);
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

// Fetches all comments for a specific pin, with user information.
export const getPinComments = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const pin = await ctx.db.get(args.pinId);
    if (!pin) {
      return [];
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

// Adds a new comment to a pin.
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

// gives a clean way to display/filter landmark memories later
export const getLandmarkPins = query({
  args: {},
  handler: async (ctx) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerIdStr = userId.toString();

    const pins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerIdStr))
      .collect();

    return pins.filter((pin) => pin.isLandmarkMemory === true);
  }
});
