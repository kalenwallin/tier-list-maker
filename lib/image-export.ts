"use client";

import { toPng } from "html-to-image";

const TRANSPARENT_IMAGE_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

export async function renderTierListPng(element: HTMLElement) {
  await waitForNextFrame();

  return withSuppressedFetchWarnings(() =>
    toPng(element, {
      pixelRatio: 2,
      backgroundColor: "#ffffff",
      cacheBust: true,
      imagePlaceholder: TRANSPARENT_IMAGE_PLACEHOLDER,
      onImageErrorHandler: () => undefined,
      filter: (node) =>
        !(node instanceof HTMLElement && node.dataset.exportExclude === "true"),
    }),
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

async function withSuppressedFetchWarnings<T>(callback: () => Promise<T>) {
  const originalWarn = console.warn;

  console.warn = (...args) => {
    const [message] = args;
    if (
      typeof message === "string" &&
      (message.startsWith("Failed to fetch resource:") ||
        message === "Failed to fetch")
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
