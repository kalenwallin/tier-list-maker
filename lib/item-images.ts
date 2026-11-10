// Images people upload, or copy from a link, live in the ITEM_IMAGES R2 bucket
// and are served from this path by src/routes/images/$key.ts. Items store the
// path without an origin so the same list works on every host that serves the
// app, including local and preview builds.
export const ITEM_IMAGE_PATH_PREFIX = "/images/";

// Uploads are downscaled in the browser first, so this mostly bounds images
// copied from links.
export const MAX_ITEM_IMAGE_BYTES = 10 * 1024 * 1024;

export const ITEM_IMAGE_EXTENSIONS = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
} as const;

export type ItemImageContentType = keyof typeof ITEM_IMAGE_EXTENSIONS;

export const ITEM_IMAGE_ACCEPT = Object.keys(ITEM_IMAGE_EXTENSIONS).join(",");

// Keys are the SHA-256 of the image bytes, so an image is stored once however
// often it is added, and a key's contents never change.
export const ITEM_IMAGE_KEY_PATTERN = /^[0-9a-f]{64}\.(?:png|jpg|gif|webp|avif)$/;

export function isItemImageContentType(value: string): value is ItemImageContentType {
  return Object.hasOwn(ITEM_IMAGE_EXTENSIONS, value);
}

export function getHostedItemImageKey(pathname: string) {
  if (!pathname.startsWith(ITEM_IMAGE_PATH_PREFIX)) return null;
  const key = pathname.slice(ITEM_IMAGE_PATH_PREFIX.length);
  return ITEM_IMAGE_KEY_PATTERN.test(key) ? key : null;
}

export function isWebImageUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export function isDataImageUrl(value: string | undefined): value is string {
  return Boolean(value?.startsWith("data:image/"));
}

// Images that only exist on another site, or inline in the list, can be
// copied into storage so they keep working and export cleanly.
export function canCopyItemImage(value: string | undefined): value is string {
  return isWebImageUrl(value) || isDataImageUrl(value);
}
