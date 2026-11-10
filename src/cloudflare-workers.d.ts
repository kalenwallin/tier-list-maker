// Bindings from wrangler.jsonc. Declared by hand because the generated
// Workers runtime types clash with the DOM types the app is checked against.
declare module "cloudflare:workers" {
  import type {
    ItemImageBucket,
    ItemImageRateLimiter,
  } from "@/lib/item-image-storage.server";

  export const env: {
    ITEM_IMAGES: ItemImageBucket;
    ITEM_IMAGE_RATE_LIMITER: ItemImageRateLimiter;
  };
}
