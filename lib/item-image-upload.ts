"use client";

import { isItemImageContentType } from "./item-images";

// Item tiles are small, so a 1024px long edge keeps exports sharp while
// shrinking phone photos to a fraction of their size.
const MAX_UPLOAD_DIMENSION = 1024;
const ENCODE_QUALITY = 0.86;
// Waits before retrying when the server's rate limit pushes back, which a
// large batch of images can hit.
const RATE_LIMIT_RETRY_DELAYS_MS = [5_000, 15_000, 30_000];

// Resolves to the stored image's path, ready to use as an item's imageUrl.
export async function uploadItemImage(file: Blob, authToken: string | null) {
  const image = await prepareImageForUpload(file);
  return await postItemImage(authToken, {
    body: image,
    contentType: image.type || "application/octet-stream",
  });
}

// Downloads a linked image on the server, or uploads an inline data URL, so
// the item stops depending on where the image came from.
export async function copyItemImage(url: string, authToken: string | null) {
  if (url.startsWith("data:")) {
    return await uploadItemImage(await dataUrlToBlob(url), authToken);
  }

  return await postItemImage(authToken, {
    body: JSON.stringify({ url }),
    contentType: "application/json",
  });
}

export async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  return await response.blob();
}

export function labelFromFileName(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function postItemImage(
  authToken: string | null,
  { body, contentType }: { body: BodyInit; contentType: string },
) {
  if (!authToken) throw new Error("Sign in to add images.");

  for (let attempt = 0; ; attempt += 1) {
    const response = await fetch("/api/images", {
      method: "POST",
      body,
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": contentType,
      },
    });

    const retryDelay = RATE_LIMIT_RETRY_DELAYS_MS[attempt];
    if (response.status === 429 && retryDelay !== undefined) {
      await new Promise((resolve) => window.setTimeout(resolve, retryDelay));
      continue;
    }

    const result = (await response.json().catch(() => null)) as {
      url?: unknown;
      error?: unknown;
    } | null;
    if (response.ok && typeof result?.url === "string") return result.url;

    throw new Error(
      typeof result?.error === "string"
        ? result.error
        : "Couldn't save the image. Try again.",
    );
  }
}

// Shrinks large images and re-encodes JPEGs, which also drops camera metadata
// such as location. Anything the browser can't redraw goes up unchanged for
// the server to accept or reject.
async function prepareImageForUpload(file: Blob): Promise<Blob> {
  // Redrawing keeps only the first frame of an animated GIF.
  if (file.type === "image/gif") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return file;
  }

  try {
    const scale = Math.min(
      1,
      MAX_UPLOAD_DIMENSION / Math.max(bitmap.width, bitmap.height),
    );
    const isJpeg = file.type === "image/jpeg";
    if (scale === 1 && !isJpeg) return file;

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

    // WebP keeps transparency. Browsers that can't encode it fall back to PNG.
    const encoded = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, isJpeg ? "image/jpeg" : "image/webp", ENCODE_QUALITY),
    );
    if (!encoded || !isItemImageContentType(encoded.type)) return file;
    return encoded;
  } finally {
    bitmap.close();
  }
}
