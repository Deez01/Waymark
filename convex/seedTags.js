//Function for repopulating/updating tags table

import { mutation } from "./_generated/server";

const defaultTags = [
  // Celebration category
  { name: "promotion", category: "Celebration", color: "#22c55e" },
  { name: "engagement", category: "Celebration", color: "#f59e0b" },
  { name: "milestone", category: "Celebration", color: "#8b5cf6" },
  { name: "retirement", category: "Celebration", color: "#ef4444" },

  // Events category
  { name: "festival", category: "Events", color: "#f59e0b" },
  { name: "conference", category: "Events", color: "#3b82f6" },
  { name: "meetup", category: "Events", color: "#06b6d4" },
  { name: "sports event", category: "Events", color: "#ef4444" },
  { name: "convention", category: "Events", color: "#8b5cf6" },
  { name: "rally", category: "Events", color: "#f97316" },
  { name: "parade", category: "Events", color: "#eab308" },

  // Food category
  { name: "seafood", category: "Food", color: "#06b6d4" },
  { name: "vegetarian", category: "Food", color: "#22c55e" },
  { name: "baking", category: "Food", color: "#fbbf24" },

  // Lifestyle category
  { name: "home decor", category: "Lifestyle", color: "#f59e0b" },
  { name: "study", category: "Lifestyle", color: "#a16207" },
  { name: "meditation", category: "Lifestyle", color: "#8b5cf6" },
  { name: "spa", category: "Lifestyle", color: "#ec4899" },

  // My Relationships category
  { name: "partner", category: "My Relationships", color: "#ec4899" },
  { name: "colleague", category: "My Relationships", color: "#06b6d4" },
  { name: "mentor", category: "My Relationships", color: "#f59e0b" },
  { name: "love", category: "My Relationships", color: "#ef4444" },
  { name: "quality time", category: "Themes", color: "#8b5cf6" },
  { name: "family gathering", category: "My Relationships", color: "#22c55e" },
  { name: "friend group", category: "My Relationships", color: "#3b82f6" },

  // Themes category
  { name: "sunset", category: "Themes", color: "#f97316" },
  { name: "adventure", category: "Themes", color: "#ef4444" },
  { name: "nature", category: "Themes", color: "#22c55e" },
  { name: "urban", category: "Themes", color: "#6b7280" },
  { name: "retro", category: "Themes", color: "#f59e0b" },
  { name: "vintage", category: "Themes", color: "#a16207" },
  { name: "modern", category: "Themes", color: "#3b82f6" },
  { name: "seasonal", category: "Themes", color: "#eab308" },
  { name: "nostalgic", category: "Themes", color: "#a16207" },
  { name: "dreamy", category: "Themes", color: "#8b5cf6" },
];

export const seedDefaultTags = mutation({
  handler: async (ctx) => {
    let createdCount = 0;
    let skippedCount = 0;

    for (const tagData of defaultTags) {
      // Normalize name to lowercase for consistency
      const normalizedName = tagData.name.toLowerCase();
      
      // Check if tag already exists by name
      const existing = await ctx.db
        .query("tags")
        .withIndex("by_name", (q) => q.eq("name", normalizedName))
        .first();

      if (existing) {
        skippedCount++;
        continue;
      }

      // Create the tag with lowercase name
      await ctx.db.insert("tags", {
        name: normalizedName,
        category: tagData.category,
        color: tagData.color,
        isDefault: true,
      });
      createdCount++;
    }

    return {
      message: `Seeding complete: ${createdCount} tags created, ${skippedCount} skipped (already exist)`,
      created: createdCount,
      skipped: skippedCount,
    };
  },
});

// Update existing tags with colors if they don't have one
export const addColorsToTags = mutation({
  handler: async (ctx) => {
    const colorMap = {
      // Celebration
      "birthday": "#ec4899",
      "wedding": "#f97316",
      "anniversary": "#ec4899",
      "graduation": "#3b82f6",
      "promotion": "#22c55e",
      "engagement": "#f59e0b",
      "milestone": "#8b5cf6",
      "retirement": "#ef4444",
      // Events
      "concert": "#ec4899",
      "festival": "#f59e0b",
      "conference": "#3b82f6",
      "meetup": "#06b6d4",
      "sports event": "#ef4444",
      // Food
      "pizza": "#f97316",
      "sushi": "#ef4444",
      "burger": "#f59e0b",
      "pasta": "#eab308",
      "dessert": "#ec4899",
      "coffee": "#92400e",
      "barbecue": "#f97316",
      "breakfast": "#fbbf24",
      // Hobbies
      "hiking": "#22c55e",
      "photography": "#06b6d4",
      "swimming": "#06b6d4",
      "cycling": "#3b82f6",
      "gaming": "#8b5cf6",
      "reading": "#a16207",
      "painting": "#ec4899",
      "yoga": "#22c55e",
      "cooking": "#f97316",
      "gardening": "#22c55e",
      "music": "#8b5cf6",
      "sports": "#3b82f6",
      // Holiday
      "christmas": "#ef4444",
      "halloween": "#f97316",
      "easter": "#eab308",
      "thanksgiving": "#f59e0b",
      "new year": "#8b5cf6",
      "valentine's day": "#ec4899",
    };

    const tags = await ctx.db.query("tags").collect();
    let updatedCount = 0;

    for (const tag of tags) {
      // If tag has no color, assign one from colorMap or a default
      if (!tag.color) {
        const tagName = tag.name.toLowerCase();
        const color = colorMap[tagName] || "#3b82f6"; // Default blue
        await ctx.db.patch(tag._id, { color });
        updatedCount++;
      }
    }

    return {
      message: `Color update complete: ${updatedCount} tags updated with colors`,
      updated: updatedCount,
    };
  },
});
