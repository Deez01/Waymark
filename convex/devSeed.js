// Name: Bryan Estrada-Cordoba

// For demo purposes

import { mutation } from "./_generated/server";

export const seedDemoUsers = mutation({
  args: {},
  handler: async (ctx) => {
    const demoUsers = [
      { auth0Id: "demoUser1", email: "bryan@test.com", name: "Bryan" },
      { auth0Id: "demoUser2", email: "jacobo@test.com", name: "Jacobo" },
      { auth0Id: "demoUser3", email: "berit@test.com", name: "Berit" },
      { auth0Id: "demoUser4", email: "luke@test.com", name: "Luke" },
      { auth0Id: "demoUser4", email: "anthony@test.com", name: "Anthony" },

    ];

    for (const user of demoUsers) {
      await ctx.db.insert("users", user);
    }
  },
});
