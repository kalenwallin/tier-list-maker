import { createFileRoute } from "@tanstack/react-router";
import { env } from "cloudflare:workers";
import {
  getItemImageUploader,
  handleItemImagePost,
} from "@/lib/item-image-storage.server";

export const Route = createFileRoute("/api/images")({
  server: {
    handlers: {
      POST: ({ request }) =>
        handleItemImagePost(request, {
          bucket: env.ITEM_IMAGES,
          rateLimiter: env.ITEM_IMAGE_RATE_LIMITER,
          getUploader: getItemImageUploader,
        }),
    },
  },
});
