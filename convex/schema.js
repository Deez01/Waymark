// Name: Bryan Estrada-Cordoba
// convex/schema.js

import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  users: defineTable({
    auth0Id: "string",
    email: "string",
    name: "string",
  }).index("by_auth0Id", ["auth0Id"]),
});
