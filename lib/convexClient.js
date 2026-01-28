import { ConvexReactClient } from "convex/react";

const url = process.env.EXPO_PUBLIC_CONVEX_URL;
if (!url) {
  throw new Error("Missing EXPO_PUBLIC_CONVEX_URL. Check your .env in the project root.");
}

export const convex = new ConvexReactClient(url);
