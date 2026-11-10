import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import {
  createItemImageKey,
  detectItemImageType,
  getHostedItemImageKey,
  ITEM_IMAGE_KEY_PATTERN,
  ITEM_IMAGE_PATH_PREFIX,
  MAX_ITEM_IMAGE_BYTES,
  UNSUPPORTED_ITEM_IMAGE_MESSAGE,
} from "./item-images";
import { getPublicEnv } from "./site-url";

// The parts of the R2 bucket and rate limiter bindings this module uses. The
// full Workers runtime types would clash with the DOM types the app uses.
export type ItemImageObject = {
  httpEtag: string;
  writeHttpMetadata(headers: Headers): void;
};

export type ItemImageObjectBody = ItemImageObject & {
  body: ReadableStream;
};

export type ItemImageBucket = {
  head(key: string): Promise<ItemImageObject | null>;
  get(
    key: string,
    options?: { onlyIf?: Headers },
  ): Promise<ItemImageObject | ItemImageObjectBody | null>;
  put(
    key: string,
    value: Uint8Array<ArrayBuffer>,
    options?: {
      httpMetadata?: { contentType?: string; cacheControl?: string };
      customMetadata?: Record<string, string>;
    },
  ): Promise<unknown>;
};

export type ItemImageRateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export type ItemImageRequestContext = {
  bucket: ItemImageBucket;
  rateLimiter: ItemImageRateLimiter;
  // Resolves to the signed-in uploader's email, or null when signed out.
  getUploader: (request: Request) => Promise<string | null>;
};

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable";
const MAX_JSON_BODY_BYTES = 16 * 1024;
const MAX_LINK_REDIRECTS = 5;
const LINK_DOWNLOAD_TIMEOUT_MS = 15_000;
const MAX_SOURCE_URL_METADATA_LENGTH = 1024;
const TOO_LARGE_MESSAGE = `Images can be up to ${MAX_ITEM_IMAGE_BYTES / 1024 / 1024} MB.`;

// Either an image this app already stores, or new bytes to store.
type ImageSource =
  | { key: string }
  | { bytes: Uint8Array<ArrayBuffer>; sourceUrl?: string };

class ItemImageError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// POST /api/images. An image body is an upload; a JSON body of `{ url }` asks
// the server to download that image and keep a copy.
export async function handleItemImagePost(
  request: Request,
  { bucket, rateLimiter, getUploader }: ItemImageRequestContext,
) {
  try {
    const uploader = await getUploader(request);
    if (!uploader) throw new ItemImageError(401, "Sign in to add images.");

    const { success } = await rateLimiter.limit({ key: uploader });
    if (!success) {
      return Response.json(
        { error: "You're adding images quickly. Wait a moment and try again." },
        { status: 429, headers: { "Retry-After": "10" } },
      );
    }

    const isLink = Boolean(
      request.headers.get("Content-Type")?.startsWith("application/json"),
    );
    const image: ImageSource = isLink
      ? await readLinkedImage(request, bucket)
      : { bytes: await readUploadedImage(request) };
    if ("key" in image) return itemImageResponse(image.key);

    const contentType = detectItemImageType(image.bytes);
    if (!contentType) {
      throw new ItemImageError(
        415,
        isLink
          ? "That link isn't a PNG, JPEG, GIF, WebP, or AVIF image."
          : UNSUPPORTED_ITEM_IMAGE_MESSAGE,
      );
    }

    const key = await createItemImageKey(image.bytes, contentType);
    // Skipping a write for an image that is already stored saves an R2 write
    // and keeps the first uploader on record.
    if (!(await bucket.head(key))) {
      await bucket.put(key, image.bytes, {
        httpMetadata: { contentType, cacheControl: IMMUTABLE_CACHE_CONTROL },
        customMetadata: {
          uploadedBy: uploader,
          ...(image.sourceUrl
            ? { sourceUrl: image.sourceUrl.slice(0, MAX_SOURCE_URL_METADATA_LENGTH) }
            : {}),
        },
      });
    }

    return itemImageResponse(key);
  } catch (error) {
    if (error instanceof ItemImageError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Could not store item image", error);
    return Response.json(
      { error: "Couldn't save the image. Try again." },
      { status: 500 },
    );
  }
}

// GET /images/:key
export async function serveItemImage(
  request: Request,
  key: string,
  bucket: ItemImageBucket,
) {
  if (!ITEM_IMAGE_KEY_PATTERN.test(key)) return notFound();

  const object = await bucket.get(key, { onlyIf: request.headers });
  if (!object) return notFound();

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", IMMUTABLE_CACHE_CONTROL);
  headers.set("ETag", object.httpEtag);
  // Exports and other sites may load these images, but never as active
  // content on this origin.
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  headers.set("X-Content-Type-Options", "nosniff");

  // R2 leaves out the body when the browser's cached copy is still current.
  if (!("body" in object)) return new Response(null, { status: 304, headers });
  return new Response(object.body, { headers });
}

// Convex checks the session token the browser sends, the same way it does for
// queries the browser makes itself.
export async function getItemImageUploader(request: Request) {
  const token = request.headers.get("Authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) return null;

  const convexUrl = getPublicEnv("NEXT_PUBLIC_CONVEX_URL");
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");

  const client = new ConvexHttpClient(convexUrl);
  client.setAuth(token);
  try {
    const viewer = await client.query(api.users.viewer, {});
    return viewer?.email ?? null;
  } catch {
    // Expired and invalid tokens fail the query, so treat them as signed out.
    return null;
  }
}

// Rejects links that point at the machine running the Worker or its network.
// Deployed Workers can't reach private networks anyway, but `vite dev` runs
// on a developer's machine.
export function parseLinkedImageUrl(value: unknown) {
  const invalid = new ItemImageError(
    400,
    "Paste a full image link that starts with https://.",
  );
  if (typeof value !== "string") throw invalid;

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw invalid;
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") throw invalid;
  if (url.username || url.password) throw invalid;

  const hostname = url.hostname.toLowerCase();
  const isIpAddress = /^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.startsWith("[");
  const isLocalName =
    !hostname.includes(".") ||
    /\.(?:localhost|local|internal|home\.arpa)$/.test(hostname);
  if (isIpAddress || isLocalName) {
    throw new ItemImageError(400, "Links to private network addresses can't be copied.");
  }

  return url;
}

async function readUploadedImage(request: Request) {
  const declaredLength = Number(request.headers.get("Content-Length"));
  if (declaredLength > MAX_ITEM_IMAGE_BYTES) {
    throw new ItemImageError(413, TOO_LARGE_MESSAGE);
  }

  const bytes = await readBytes(request.body, MAX_ITEM_IMAGE_BYTES, TOO_LARGE_MESSAGE);
  if (bytes.length === 0) throw new ItemImageError(400, "Choose an image to upload.");
  return bytes;
}

async function readLinkedImage(
  request: Request,
  bucket: ItemImageBucket,
): Promise<ImageSource> {
  const body = await readBytes(
    request.body,
    MAX_JSON_BODY_BYTES,
    "That link is too long.",
  );

  let url: unknown;
  try {
    url = (JSON.parse(new TextDecoder().decode(body)) as { url?: unknown }).url;
  } catch {
    throw new ItemImageError(400, "Send the image link as JSON.");
  }

  const imageUrl = parseLinkedImageUrl(url);

  // A link to an image this app already stores needs no download.
  const hostedKey = getHostedItemImageKey(imageUrl.pathname);
  if (hostedKey && (await bucket.head(hostedKey))) return { key: hostedKey };

  const signal = AbortSignal.timeout(LINK_DOWNLOAD_TIMEOUT_MS);
  const response = await fetchLinkedImage(imageUrl, signal);
  const declaredLength = Number(response.headers.get("Content-Length"));
  if (declaredLength > MAX_ITEM_IMAGE_BYTES) {
    await response.body?.cancel();
    throw new ItemImageError(413, TOO_LARGE_MESSAGE);
  }

  try {
    const bytes = await readBytes(response.body, MAX_ITEM_IMAGE_BYTES, TOO_LARGE_MESSAGE);
    return { bytes, sourceUrl: imageUrl.href };
  } catch (error) {
    if (error instanceof ItemImageError) throw error;
    throw new ItemImageError(504, "Couldn't finish downloading that link.");
  }
}

// Follows redirects by hand so every hop gets the same address checks.
async function fetchLinkedImage(initialUrl: URL, signal: AbortSignal) {
  let url = initialUrl;

  for (let redirects = 0; redirects <= MAX_LINK_REDIRECTS; redirects += 1) {
    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          Accept: "image/avif,image/webp,image/png,image/jpeg,image/gif,image/*;q=0.8",
          // Some image hosts refuse requests that don't name their client.
          "User-Agent": "TierListMaker-ImageCopy/1.0",
        },
        redirect: "manual",
        signal,
      });
    } catch {
      throw new ItemImageError(502, "Couldn't download that link.");
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("Location");
      await response.body?.cancel();
      if (!location) throw new ItemImageError(502, "Couldn't download that link.");
      url = parseLinkedImageUrl(new URL(location, url).href);
      continue;
    }

    if (!response.ok) {
      await response.body?.cancel();
      throw new ItemImageError(
        502,
        `Couldn't download that link (HTTP ${response.status}).`,
      );
    }

    return response;
  }

  throw new ItemImageError(502, "That link redirects too many times.");
}

async function readBytes(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
  tooLargeMessage: string,
) {
  if (!body) return new Uint8Array(0);

  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new ItemImageError(413, tooLargeMessage);
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

function itemImageResponse(key: string) {
  return Response.json({ url: `${ITEM_IMAGE_PATH_PREFIX}${key}` });
}

function notFound() {
  return new Response("Not found", { status: 404 });
}
