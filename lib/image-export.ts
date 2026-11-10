"use client";

import { toPng } from "html-to-image";

// Long enough for a slow IndexedDB read, short enough that a stuck image
// doesn't hold up the export.
const LOCAL_IMAGE_WAIT_MS = 2000;

const TRANSPARENT_IMAGE_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

export async function renderTierListPng(element: HTMLElement) {
  await waitForNextFrame();
  await waitForLocalItemImages(element);
  const exportCard = element.closest<HTMLElement>(".tier-export-card") ?? element;
  const backgroundColor = getComputedStyle(exportCard).backgroundColor;

  return withSuppressedFetchWarnings(() =>
    withBlobUrlsUnbusted(() =>
      toPng(element, {
        pixelRatio: 2,
        backgroundColor,
        cacheBust: true,
        imagePlaceholder: TRANSPARENT_IMAGE_PLACEHOLDER,
        onImageErrorHandler: () => undefined,
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset.exportExclude === "true"),
      }),
    ),
  );
}

export function downloadPng(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

export async function copyPngToClipboard(dataUrl: string) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("This browser does not support copying images.");
  }

  const blob = await dataUrlToBlob(dataUrl);
  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

export function waitForNextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function dataUrlToBlob(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();

  if (blob.type !== "image/png") {
    return new Blob([blob], { type: "image/png" });
  }

  return blob;
}

// Tiles showing an image kept in this browser read it after they mount, which
// a freshly rendered export can beat.
async function waitForLocalItemImages(element: HTMLElement) {
  const deadline = performance.now() + LOCAL_IMAGE_WAIT_MS;
  while (
    element.querySelector("[data-item-image-loading]") &&
    performance.now() < deadline
  ) {
    await waitForNextFrame();
  }
}

// `cacheBust` makes html-to-image add `?<timestamp>` to every image address
// it fetches. Images kept in this browser show from `blob:` URLs, which only
// resolve without a query, so this strips it from them while exporting.
async function withBlobUrlsUnbusted<T>(callback: () => Promise<T>) {
  const originalFetch = window.fetch;

  window.fetch = (input, init) => {
    if (typeof input === "string" && input.startsWith("blob:")) {
      return originalFetch.call(window, input.replace(/\?\d+$/, ""), init);
    }

    return originalFetch.call(window, input, init);
  };

  try {
    return await callback();
  } finally {
    window.fetch = originalFetch;
  }
}

async function withSuppressedFetchWarnings<T>(callback: () => Promise<T>) {
  const originalWarn = console.warn;

  console.warn = (...args) => {
    const [message] = args;
    if (
      typeof message === "string" &&
      (message.startsWith("Failed to fetch resource:") || message === "Failed to fetch")
    ) {
      return;
    }

    originalWarn(...args);
  };

  try {
    return await callback();
  } finally {
    console.warn = originalWarn;
  }
}
