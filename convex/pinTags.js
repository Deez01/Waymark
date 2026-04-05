import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

function assertAuthed(userId) {
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

function isTagVisibleToUser(tag, userId) {
  return Boolean(tag && (tag.isDefault || (tag.createdBy && tag.createdBy === userId)));
}

async function canUserEditPin(ctx, userId, pin) {
  if (!pin) return false;
  if (pin.ownerId === userId.toString()) return true;

  const shares = await ctx.db
    .query("pinShares")
    .withIndex("by_toOwnerId", (q) => q.eq("toOwnerId", userId))
    .collect();

  return shares.some(
    (share) =>
      share.pinId.toString() === pin._id.toString() &&
      share.canEdit === true
  );
}

async function getVisibleTagsForUser(ctx, userId) {
  const defaultTags = await ctx.db
    .query("tags")
    .withIndex("by_is_default", (q) => q.eq("isDefault", true))
    .collect();
  const userTags = await ctx.db
    .query("tags")
    .withIndex("by_creator", (q) => q.eq("createdBy", userId))
    .collect();

  const byId = new Map();
  for (const tag of defaultTags) byId.set(tag._id, tag);
  for (const tag of userTags) byId.set(tag._id, tag);

  return [...byId.values()];
}

// Get all tags (default + user-created)
export const getAllTags = query({
  handler: async (ctx) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    return await getVisibleTagsForUser(ctx, userId);
  },
});

// Get all pinTags with associated pin title and tag name
export const getAllPinTagsWithDetails = query({
  handler: async (ctx) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const ownerId = userId.toString();
    const visibleTags = await getVisibleTagsForUser(ctx, userId);
    const visibleTagIds = new Set(visibleTags.map((tag) => tag._id));

    const pins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", ownerId))
      .collect();
    const pinIds = new Set(pins.map((pin) => pin._id));

    const pinTags = await ctx.db.query("pinTags").collect();
    
    const result = await Promise.all(
      pinTags
        .filter((pt) => pinIds.has(pt.pinId) && visibleTagIds.has(pt.tagId))
        .map(async (pt) => {
        const pin = await ctx.db.get(pt.pinId);
        const tag = await ctx.db.get(pt.tagId);
        
        return {
          _id: pt._id,
          pinId: pt.pinId,
          pinTitle: pin?.title || "Unknown Pin",
          tagId: pt.tagId,
          tagName: tag?.name || "Unknown Tag",
          tagColor: tag?.color,
        };
        })
    );
    
    return result;
  },
});

// Get pinTags for a specific user's pins with details
export const getUserPinTagsWithDetails = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const viewerId = assertAuthed(await getAuthUserId(ctx));
    const ownerId = viewerId.toString();
    if (args.userId !== ownerId) {
      throw new Error("Not authorized");
    }

    const visibleTags = await getVisibleTagsForUser(ctx, viewerId);
    const visibleTagIds = new Set(visibleTags.map((tag) => tag._id));

    // Get all pins for this user
    const pins = await ctx.db
      .query("pins")
      .withIndex("by_ownerId", (q) => q.eq("ownerId", args.userId))
      .collect();
    
    const pinIds = new Set(pins.map((p) => p._id));
    
    // Get all pinTags
    const allPinTags = await ctx.db.query("pinTags").collect();
    
    // Filter to only pinTags for this user's pins and enrich with details
    const result = await Promise.all(
      allPinTags
        .filter((pt) => pinIds.has(pt.pinId) && visibleTagIds.has(pt.tagId))
        .map(async (pt) => {
          const pin = await ctx.db.get(pt.pinId);
          const tag = await ctx.db.get(pt.tagId);
          
          return {
            _id: pt._id,
            pinId: pt.pinId,
            pinTitle: pin?.title || "Unknown Pin",
            tagId: pt.tagId,
            tagName: tag?.name || "Unknown Tag",
            tagColor: tag?.color,
          };
        })
    );
    
    return result;
  },
});

// Get all pinTags for a specific pin with tag details
export const getPinTagsWithDetails = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const pin = await ctx.db.get(args.pinId);
    
    if (!pin) {
      throw new Error("Pin not found");
    }
    
    const visibleTags = await getVisibleTagsForUser(ctx, userId);
    const visibleTagIds = new Set(visibleTags.map((tag) => tag._id));

    const pinTags = await ctx.db
      .query("pinTags")
      .withIndex("by_pin", (q) => q.eq("pinId", args.pinId))
      .collect();
    
    const result = await Promise.all(
      pinTags
        .filter((pt) => visibleTagIds.has(pt.tagId))
        .map(async (pt) => {
        const tag = await ctx.db.get(pt.tagId);
        
        return {
          _id: pt._id,
          pinId: args.pinId,
          pinTitle: pin.title,
          tagId: pt.tagId,
          tagName: tag?.name || "Unknown Tag",
          tagColor: tag?.color,
        };
        })
    );
    
    return result;
  },
});

// Get all unique tag categories
export const getAllCategories = query({
  handler: async (ctx) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const allTags = await getVisibleTagsForUser(ctx, userId);
    const categories = [...new Set(allTags.map((tag) => tag.category).filter(Boolean))];
    return categories.sort();
  },
});

// Get tags by category
export const getTagsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const tagsInCategory = await ctx.db
      .query("tags")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    return tagsInCategory.filter((tag) => isTagVisibleToUser(tag, userId));
  },
});

// Get all tags for a specific pin
export const getTagsForPin = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const viewerIdStr = userId.toString();
    const pin = await ctx.db.get(args.pinId);

    if (!pin) {
      throw new Error("Pin not found");
    }

    const isOwner = pin.ownerId === viewerIdStr;

    const acceptedShares = await ctx.db
      .query("pinShares")
      .withIndex("by_toOwnerId", (q) => q.eq("toOwnerId", userId))
      .collect();

    const hasAcceptedShare = acceptedShares.some(
      (share) => share.pinId.toString() === args.pinId.toString()
    );

    const incomingShareRequests = await ctx.db
      .query("sharedPins")
      .withIndex("by_shared_with", (q) => q.eq("sharedWith", userId))
      .collect();

    const hasPendingRequest = incomingShareRequests.some(
      (request) =>
        request.pinId.toString() === args.pinId.toString() &&
        request.status === "pending"
    );

    if (!isOwner && !hasAcceptedShare && !hasPendingRequest) {
      throw new Error("Not authorized");
    }

    const pinTags = await ctx.db
      .query("pinTags")
      .withIndex("by_pin", (q) => q.eq("pinId", args.pinId))
      .collect();

    // Fetch the actual tag documents
    const tags = await Promise.all(
      pinTags.map((pt) => ctx.db.get(pt.tagId))
    );

    return tags.filter(Boolean);
  },
});

// Add a tag to a pin
export const addTagToPin = mutation({
  args: {
    pinId: v.id("pins"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));

    // Get pin and tag details
    const pin = await ctx.db.get(args.pinId);
    const tag = await ctx.db.get(args.tagId);

    if (!pin) {
      throw new Error("Pin not found");
    }

    if (!tag) {
      throw new Error("Tag not found");
    }

    const canEdit = await canUserEditPin(ctx, userId, pin);
    if (!canEdit) {
      throw new Error("Not authorized");
    }

    if (!isTagVisibleToUser(tag, userId)) {
      throw new Error("Not authorized to use this tag");
    }

    // Check if already exists
    const existing = await ctx.db
      .query("pinTags")
      .withIndex("by_pin_and_tag", (q) =>
        q.eq("pinId", args.pinId).eq("tagId", args.tagId)
      )
      .first();

    if (existing) {
      throw new Error("Tag already on this pin");
    }

    // Add the tag with denormalized pin and tag data
    await ctx.db.insert("pinTags", {
      pinId: args.pinId,
      pinTitle: pin.title,
      tagId: args.tagId,
      tagName: tag.name,
      tagColor: tag.color,
    });

    return true;
  },
});

// Remove a tag from a pin
export const removeTagFromPin = mutation({
  args: {
    pinId: v.id("pins"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const pin = await ctx.db.get(args.pinId);

    if (!pin) {
      throw new Error("Pin not found");
    }

    const canEdit = await canUserEditPin(ctx, userId, pin);
    if (!canEdit) {
      throw new Error("Not authorized");
    }

    const pinTag = await ctx.db
      .query("pinTags")
      .withIndex("by_pin_and_tag", (q) =>
        q.eq("pinId", args.pinId).eq("tagId", args.tagId)
      )
      .first();

    if (!pinTag) {
      throw new Error("Tag not found on this pin");
    }

    await ctx.db.delete(pinTag._id);
    return true;
  },
});

// Create a new tag (user-created)
export const createTag = mutation({
  args: {
    name: v.string(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const normalizedName = args.name.trim().toLowerCase();
    if (!normalizedName) {
      throw new Error("Tag name cannot be empty");
    }

    const sameNameTags = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", normalizedName))
      .collect();

    const existingDefault = sameNameTags.find((tag) => tag.isDefault);
    if (existingDefault) {
      return existingDefault._id;
    }

    const existingUserTag = sameNameTags.find((tag) => tag.createdBy === userId);

    if (existingUserTag) {
      return existingUserTag._id;
    }

    // Create new tag
    const tagId = await ctx.db.insert("tags", {
      name: normalizedName,
      color: args.color,
      isDefault: false,
      createdBy: userId,
    });

    return tagId;
  },
});

// Delete a tag (only user-created tags)
export const deleteTag = mutation({
  args: {
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    const userId = assertAuthed(await getAuthUserId(ctx));
    const tag = await ctx.db.get(args.tagId);

    if (!tag) {
      throw new Error("Tag not found");
    }

    if (tag.isDefault) {
      throw new Error("Cannot delete default tags");
    }

    if (tag.createdBy !== userId) {
      throw new Error("Not authorized to delete this tag");
    }

    // Delete all pinTag associations first
    const pinTags = await ctx.db
      .query("pinTags")
      .withIndex("by_tag", (q) => q.eq("tagId", args.tagId))
      .collect();

    for (const pt of pinTags) {
      await ctx.db.delete(pt._id);
    }

    // Delete the tag itself
    await ctx.db.delete(args.tagId);
    return true;
  },
});
