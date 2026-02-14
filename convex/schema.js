// Name: Bryan Estrada-Cordoba
// convex/schema.js
import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values"; // 1. Import 'v'

export default defineSchema({
  ...authTables,
  users: defineTable({
    email: v.string(),
    username: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    age: v.optional(v.number()),
    ethnicity: v.optional(v.string()),
    profileComplete: v.optional(v.boolean()),
  })
    .index("by_email", ["email"])
    .index("by_username", ["username"]),

  // --- Core Waymark content (bare-bones, extend as needed) ---
  pins: defineTable({
    ownerId: v.string(), // Authenticated user id in production
    title: v.string(),
    description: v.optional(v.string()),
    lat: v.number(),
    lng: v.number(),
    category: v.optional(v.string()), // "general" | "beach" | "landmark" | ...
    createdAt: v.number(),

    address: v.optional(v.string()),
    caption: v.optional(v.string()),
    thumbnail: v.optional(v.string()),
    pictures: v.optional(v.array(v.string())),
    tags: v.optional(v.array(v.string())),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_category", ["category"]),

  pinShares: defineTable({
    pinId: v.string(), // bare-bones string id
    fromOwnerId: v.string(),
    toOwnerId: v.string(),
    createdAt: v.number(),
  })
    .index("by_fromOwnerId", ["fromOwnerId"])
    .index("by_toOwnerId", ["toOwnerId"]),

  userBadges: defineTable({
    ownerId: v.string(),
    badgeKey: v.string(),
    earnedAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_badgeKey", ["ownerId", "badgeKey"]),
});
