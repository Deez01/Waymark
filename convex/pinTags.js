import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all tags (default + user-created)
export const getAllTags = query({
  handler: async (ctx) => {
    return await ctx.db.query("tags").collect();
  },
});

// Get all pinTags with associated pin title and tag name
export const getAllPinTagsWithDetails = query({
  handler: async (ctx) => {
    const pinTags = await ctx.db.query("pinTags").collect();
    
    const result = await Promise.all(
      pinTags.map(async (pt) => {
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
        .filter((pt) => pinIds.has(pt.pinId))
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
    const pin = await ctx.db.get(args.pinId);
    
    if (!pin) {
      throw new Error("Pin not found");
    }
    
    const pinTags = await ctx.db
      .query("pinTags")
      .withIndex("by_pin", (q) => q.eq("pinId", args.pinId))
      .collect();
    
    const result = await Promise.all(
      pinTags.map(async (pt) => {
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
    const allTags = await ctx.db.query("tags").collect();
    const categories = [...new Set(allTags.map((tag) => tag.category).filter(Boolean))];
    return categories.sort();
  },
});

// Get tags by category
export const getTagsByCategory = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tags")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();
  },
});

// Get all tags for a specific pin
export const getTagsForPin = query({
  args: { pinId: v.id("pins") },
  handler: async (ctx, args) => {
    const pinTags = await ctx.db
      .query("pinTags")
      .withIndex("by_pin", (q) => q.eq("pinId", args.pinId))
      .collect();

    // Fetch the actual tag documents
    const tags = await Promise.all(
      pinTags.map((pt) => ctx.db.get(pt.tagId))
    );

    return tags.filter((t) => t !== null);
  },
});

// Add a tag to a pin
export const addTagToPin = mutation({
  args: {
    pinId: v.id("pins"),
    tagId: v.id("tags"),
  },
  handler: async (ctx, args) => {
    // Get pin and tag details
    const pin = await ctx.db.get(args.pinId);
    const tag = await ctx.db.get(args.tagId);

    if (!pin) {
      throw new Error("Pin not found");
    }

    if (!tag) {
      throw new Error("Tag not found");
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
    createdBy: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    // Check if tag already exists
    const existing = await ctx.db
      .query("tags")
      .withIndex("by_name", (q) => q.eq("name", args.name.toLowerCase()))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new tag
    const tagId = await ctx.db.insert("tags", {
      name: args.name,
      color: args.color,
      isDefault: false,
      createdBy: args.createdBy,
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
    const tag = await ctx.db.get(args.tagId);

    if (!tag) {
      throw new Error("Tag not found");
    }

    if (tag.isDefault) {
      throw new Error("Cannot delete default tags");
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
