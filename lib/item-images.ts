// Images people upload, or copy from a link, live in the ITEM_IMAGES R2 bucket
// and are served from this path by src/routes/images/$key.ts. Items store the
// path without an origin so the same list works on every host that serves the
// app, including local and preview builds.
export const ITEM_IMAGE_PATH_PREFIX = "/images/";

// Signed-out lists keep uploaded images in this browser's IndexedDB (see
// lib/local-item-images.ts) instead, and their items store this prefix and
// the image's key. Keys are made the same way as stored images' keys, so an
// image keeps its key when it's uploaded after signing in.
export const LOCAL_ITEM_IMAGE_PREFIX = "local-image:";

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

export const UNSUPPORTED_ITEM_IMAGE_MESSAGE =
  "Use a PNG, JPEG, GIF, WebP, or AVIF image.";

// Keys are the SHA-256 of the image bytes, so an image is stored once however
// often it is added, and a key's contents never change.
export const ITEM_IMAGE_KEY_PATTERN = /^[0-9a-f]{64}\.(?:png|jpg|gif|webp|avif)$/;

export function isItemImageContentType(value: string): value is ItemImageContentType {
  return Object.hasOwn(ITEM_IMAGE_EXTENSIONS, value);
}

export async function createItemImageKey(
  bytes: Uint8Array<ArrayBuffer>,
  contentType: ItemImageContentType,
) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hash = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hash}.${ITEM_IMAGE_EXTENSIONS[contentType]}`;
}

export function getHostedItemImageKey(pathname: string) {
  if (!pathname.startsWith(ITEM_IMAGE_PATH_PREFIX)) return null;
  const key = pathname.slice(ITEM_IMAGE_PATH_PREFIX.length);
  return ITEM_IMAGE_KEY_PATTERN.test(key) ? key : null;
}

export function getLocalItemImageKey(value: string | undefined) {
  if (!value?.startsWith(LOCAL_ITEM_IMAGE_PREFIX)) return null;
  const key = value.slice(LOCAL_ITEM_IMAGE_PREFIX.length);
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

export function detectItemImageType(bytes: Uint8Array): ItemImageContentType | null {
  if (bytes.length < 12) return null;

  if (hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }
  if (hasBytes(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";

  const header = readAscii(bytes, 0, 12);
  if (header.startsWith("GIF87a") || header.startsWith("GIF89a")) return "image/gif";
  if (header.startsWith("RIFF") && header.slice(8, 12) === "WEBP") return "image/webp";
  if (header.slice(4, 8) === "ftyp" && hasAvifBrand(bytes)) return "image/avif";
  return null;
}

function hasBytes(bytes: Uint8Array, signature: number[]) {
  return signature.every((byte, index) => bytes[index] === byte);
}

function readAscii(bytes: Uint8Array, start: number, end: number) {
  return String.fromCharCode(...bytes.subarray(start, end));
}

// AVIF files are ISO media files whose `ftyp` box names `avif` (still) or
// `avis` (animated) as the major brand or a compatible brand.
function hasAvifBrand(bytes: Uint8Array) {
  const boxSize = new DataView(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength,
  ).getUint32(0);
  const end = Math.min(boxSize, bytes.length, 64);

  for (let offset = 8; offset + 4 <= end; offset += 4) {
    // Bytes 12-16 hold the minor version, not a brand.
    if (offset === 12) continue;
    const brand = readAscii(bytes, offset, offset + 4);
    if (brand === "avif" || brand === "avis") return true;
  }
  return false;
}
