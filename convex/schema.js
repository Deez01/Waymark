// convex/schema.js
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table
  users: defineTable({
    auth0Id: v.string(),
    email: v.string(),
    name: v.string(),
    username: v.optional(v.string()),
    bio: v.optional(v.string()),
    profilePicture: v.optional(v.string()),
  })
    .index("by_auth0Id", ["auth0Id"])
    .index("by_email", ["email"])
    .index("by_username", ["username"]),


    //Pins table
  pins: defineTable({
    address: v.optional(v.string()),
    caption: v.optional(v.string()),
    category: v.optional(v.string()),
    createdAt: v.float64(),
    description: v.optional(v.string()),
    lat: v.float64(),
    lng: v.float64(),
    ownerId: v.string(),
    pictures: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
    thumbnail: v.optional(v.string()),
    title: v.string(),
  })
    .index("by_category", ["category"])
    .index("by_ownerId", ["ownerId"]),

  // Tags table - reusable labels for pins
  tags: defineTable({
    name: v.string(),
    color: v.optional(v.string()),
    category: v.optional(v.string()), // e.g., "Holiday", "Activity", "Food", or null for user-created
    isDefault: v.boolean(), // true for system tags, false for user-created
    createdBy: v.optional(v.id("users")), // null for default tags, user ID for custom tags
  })
    .index("by_name", ["name"])
    .index("by_is_default", ["isDefault"])
    .index("by_category", ["category"])
    .index("by_creator", ["createdBy"]),

  // PinTags table - many-to-many relationship between pins and tags
  pinTags: defineTable({
    pinId: v.id("pins"),
    pinTitle: v.string(), // Denormalized: title of the pin
    tagId: v.id("tags"),
    tagName: v.string(), // Denormalized: name of the tag
    tagColor: v.optional(v.string()), // Denormalized: color of the tag
  })
    .index("by_pin", ["pinId"])
    .index("by_tag", ["tagId"])
    .index("by_pin_and_tag", ["pinId", "tagId"]),

  // SharedPins table - pins shared with specific users
  sharedPins: defineTable({
    pinId: v.id("pins"),
    sharedBy: v.id("users"),
    sharedWith: v.id("users"),
    canEdit: v.boolean(),
  })
    .index("by_pin", ["pinId"])
    .index("by_shared_with", ["sharedWith"])
    .index("by_shared_by", ["sharedBy"]),

  // Friendships table - user connections
  friendships: defineTable({
    userId1: v.id("users"),
    userId2: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("rejected")
    ),
    requestedBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_user1", ["userId1"])
    .index("by_user2", ["userId2"])
    .index("by_status", ["status"]),

  // Comments table - comments on pins
  comments: defineTable({
    pinId: v.id("pins"),
    userId: v.id("users"),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index("by_pin", ["pinId"])
    .index("by_user", ["userId"]),

  // Achievements table - gamification achievements
  achievements: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.optional(v.string()),
    points: v.number(),
    criteria: v.string(), // JSON string or text description of unlock criteria
  })
    .index("by_name", ["name"]),

  // UserAchievements table - tracks which users have which achievements
  userAchievements: defineTable({
    userId: v.id("users"),
    achievementId: v.id("achievements"),
    unlockedAt: v.number(),
    progress: v.optional(v.number()), // For achievements with progress tracking
  })
    .index("by_user", ["userId"])
    .index("by_achievement", ["achievementId"])
    .index("by_user_and_achievement", ["userId", "achievementId"]),

  // Reports table - user reports for content moderation
  reports: defineTable({
    reportedBy: v.id("users"),
    reportType: v.union(
      v.literal("pin"),
      v.literal("comment"),
      v.literal("user")
    ),
    reportedItemId: v.string(), // ID of pin, comment, or user
    reason: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("reviewed"),
      v.literal("resolved"),
      v.literal("dismissed")
    ),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
  })
    .index("by_reporter", ["reportedBy"])
    .index("by_status", ["status"])
    .index("by_type", ["reportType"]),
});
