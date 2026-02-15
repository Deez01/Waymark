// Name: Bryan Estrada-Cordoba
// convex/schema.js

import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    auth0Id: v.string(),
    email: v.string(),
    name: v.string(),
  }).index("by_auth0Id", ["auth0Id"]),

  // --- Core Waymark content (bare-bones, extend as needed) ---
pins: defineTable({
  ownerId: v.string(), // Auth0 user.sub in production

  // Core fields
  title: v.string(),
  category: v.string(), // "general" | "beach" | "landmark" | ...

  // Your existing data uses "caption" instead of "description"
  caption: v.optional(v.string()),
  description: v.optional(v.string()),

  // Location
  lat: v.number(),
  lng: v.number(),

  // Extra fields seen in your existing documents
  address: v.optional(v.string()),
  thumbnail: v.optional(v.string()),
  pictures: v.optional(v.array(v.string())),
  tags: v.optional(v.array(v.string())),

  // Time
  createdAt: v.number(),
})
  .index("by_ownerId", ["ownerId"])
  .index("by_category", ["category"]),

  userBadges: defineTable({
    ownerId: v.string(),
    badgeKey: v.string(),
    earnedAt: v.number(),
  })
    .index("by_ownerId", ["ownerId"])
    .index("by_ownerId_badgeKey", ["ownerId", "badgeKey"]),
});
