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
});
