import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import { serveItemImage } from "@/lib/item-image-storage.server";

export const Route = createFileRoute("/images/$key")({
  server: {
    handlers: {
      GET: ({ params, request }) => serveItemImage(request, params.key, env.ITEM_IMAGES),
    },
  },
});
