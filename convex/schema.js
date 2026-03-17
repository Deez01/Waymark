// convex/schema.js
import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  users: defineTable({
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    age: v.optional(v.number()),
    ethnicity: v.optional(v.string()),
    profileComplete: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  //Pins table
  pins: defineTable({
    ownerId: v.string(), // still string; we store viewer._id.toString()
    title: v.string(),
    description: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    category: v.optional(v.string()),
    createdAt: v.number(),
    address: v.optional(v.string()),
    caption: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    pictures: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_category", ["category"])
    .index("by_ownerId", ["ownerId"]),

  tags: defineTable({
    name: v.string(),
    color: v.optional(v.string()),
    category: v.optional(v.string()),
    isDefault: v.boolean(),
    createdBy: v.optional(v.id("users")),
  })
    .index("by_name", ["name"])
    .index("by_is_default", ["isDefault"])
    .index("by_category", ["category"])
    .index("by_creator", ["createdBy"]),

  pinTags: defineTable({
    pinId: v.id("pins"),
    pinTitle: v.string(),
    tagId: v.id("tags"),
    tagName: v.string(),
    tagColor: v.optional(v.string()),
  })
    .index("by_pin", ["pinId"])
    .index("by_tag", ["tagId"])
    .index("by_pin_and_tag", ["pinId", "tagId"]),

  sharedPins: defineTable({
    pinId: v.id("pins"),
    sharedBy: v.id("users"),
    sharedWith: v.id("users"),
    canEdit: v.boolean(),
  })
    .index("by_pin", ["pinId"])
    .index("by_shared_with", ["sharedWith"])
    .index("by_shared_by", ["sharedBy"]),

  friendships: defineTable({
    userId1: v.id("users"),
    userId2: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("rejected")),
    requestedBy: v.id("users"),
    updatedAt: v.number(),
  })
    .index("by_user1", ["userId1"])
    .index("by_user2", ["userId2"])
    .index("by_status", ["status"]),

  comments: defineTable({
    pinId: v.id("pins"),
    userId: v.id("users"),
    text: v.string(),
    updatedAt: v.number(),
  })
    .index("by_pin", ["pinId"])
    .index("by_user", ["userId"]),

  achievements: defineTable({
    name: v.string(),
    description: v.string(),
    icon: v.optional(v.string()),
    points: v.number(),
    criteria: v.string(),
  }).index("by_name", ["name"]),

  userAchievements: defineTable({
    userId: v.id("users"),
    achievementId: v.id("achievements"),
    unlockedAt: v.number(),
    progress: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_achievement", ["achievementId"])
    .index("by_user_and_achievement", ["userId", "achievementId"]),

  reports: defineTable({
    reportedBy: v.id("users"),
    reportType: v.union(v.literal("pin"), v.literal("comment"), v.literal("user")),
    reportedItemId: v.string(),
    reason: v.string(),
    description: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("reviewed"), v.literal("resolved"), v.literal("dismissed")),
    resolvedAt: v.optional(v.number()),
    resolvedBy: v.optional(v.id("users")),
  })
    .index("by_reporter", ["reportedBy"])
    .index("by_status", ["status"])
    .index("by_type", ["reportType"]),

  friendRequests: defineTable({
    senderId: v.id("users"),
    receiverId: v.id("users"),
    status: v.string(),
    createdAt: v.optional(v.number()),
  })
    .index("by_senderId", ["senderId"])
    .index("by_receiverId", ["receiverId"])
    .index("by_status", ["status"]),

  pinShares: defineTable({
    pinId: v.id("pins"),
    fromOwnerId: v.id("users"),
    toOwnerId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_fromOwnerId", ["fromOwnerId"])
    .index("by_toOwnerId", ["toOwnerId"])
    .index("by_pinId", ["pinId"]),

  userBadges: defineTable({
    userId: v.id("users"),
    badgeKey: v.string(),
    earnedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_badgeKey", ["userId", "badgeKey"]),
  
  memories: defineTable({
    title: v.string(),
    description: v.string(),
    imageUrl: v.optional(v.string()),
    visibility: v.union(
      v.literal("Public"),
      v.literal("Private")
    ),
    userId: v.string(), // Owner of the memory
    createdAt: v.number(),
  })
    .index("by_user", ["userId"]),
});
