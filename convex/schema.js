// Name: Bryan Estrada-Cordoba
// convex/schema.js
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values"; // 1. Import 'v'

export default defineSchema({
  users: defineTable({
    // 2. Use v.string() instead of "string"
    auth0Id: v.string(),
    email: v.string(),
    name: v.string(),
  }).index("by_auth0Id", ["auth0Id"]),

  // --- Core Waymark content (bare-bones, extend as needed) ---
  pins: defineTable({
    ownerId: v.string(), // Auth0 user.sub in production
    title: v.string(),
    description: v.string(),
    lat: v.number(),
    lng: v.number(),
    category: v.string(), // "general" | "beach" | "landmark" | ...
    createdAt: v.number(),
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
