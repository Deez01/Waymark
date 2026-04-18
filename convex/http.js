// convex/http.js
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { auth } from "./auth.js"; // <--- THIS LINE WAS MISSING

const http = httpRouter();

// This wires up all the /api/auth routes for the frontend
auth.addHttpRoutes(http);

// Your custom image route
http.route({
  path: "/getImage",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const storageId = url.searchParams.get("storageId");

    if (!storageId) {
      return new Response("Missing storageId", { status: 400 });
    }

    const blob = await ctx.storage.get(storageId);
    if (!blob) {
      return new Response("Image not found", { status: 404 });
    }

    return new Response(blob, {
      headers: {
        "Content-Type": blob.type || "image/jpeg",
        "Cache-Control": "public, max-age=31536000"
      },
    });
  }),
});

export default http;
