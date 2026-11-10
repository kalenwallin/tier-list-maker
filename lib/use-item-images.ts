"use client";

import { useAuthToken } from "@convex-dev/auth/react";
import { Dispatch, SetStateAction, useState } from "react";
import { copyItemImage, uploadItemImage } from "./item-image-upload";
import type { TierItem } from "./tier-list";

export type ItemImageStatus =
  | { state: "uploading" }
  | { state: "copying" }
  | { state: "error"; message: string };

const MAX_PARALLEL_REQUESTS = 3;

// Uploads and link copies for the editor's items. Each finished request
// writes its image into the item, which the editor then autosaves.
export function useItemImages(setItems: Dispatch<SetStateAction<TierItem[]>>) {
  const authToken = useAuthToken();
  const [statuses, setStatuses] = useState<Record<string, ItemImageStatus>>({});

  function setStatus(itemId: string, status?: ItemImageStatus) {
    setStatuses((current) => {
      if (!status && !(itemId in current)) return current;
      const { [itemId]: _previous, ...rest } = current;
      return status ? { ...rest, [itemId]: status } : rest;
    });
  }

  // `expectedImageUrl` skips the write when the item's image changed while
  // the request was running, so a slow copy can't undo a newer edit.
  function setItemImage(itemId: string, imageUrl: string, expectedImageUrl?: string) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId &&
        (expectedImageUrl === undefined || item.imageUrl === expectedImageUrl)
          ? { ...item, imageUrl }
          : item,
      ),
    );
  }

  async function uploadImage(itemId: string, file: Blob | Promise<Blob>) {
    setStatus(itemId, { state: "uploading" });
    try {
      setItemImage(itemId, await uploadItemImage(await file, authToken));
      setStatus(itemId);
    } catch (error) {
      setStatus(itemId, {
        state: "error",
        message: getErrorMessage(error, "Couldn't upload that image."),
      });
    }
  }

  async function copyImage(itemId: string, url: string) {
    setStatus(itemId, { state: "copying" });
    try {
      setItemImage(itemId, await copyItemImage(url, authToken), url);
      setStatus(itemId);
    } catch (error) {
      setStatus(itemId, {
        state: "error",
        message: `${getErrorMessage(error, "Couldn't save a copy.")} The item still uses the original link.`,
      });
    }
  }

  return {
    canAddImages: authToken !== null,
    statuses,
    clearStatus: (itemId: string) => setStatus(itemId),
    uploadImage,
    uploadImages: (uploads: { itemId: string; file: Blob }[]) =>
      runWithLimit(uploads, ({ itemId, file }) => uploadImage(itemId, file)),
    copyImage,
    copyImages: (items: { id: string; imageUrl: string }[]) =>
      runWithLimit(items, ({ id, imageUrl }) => copyImage(id, imageUrl)),
  };
}

async function runWithLimit<T>(entries: T[], run: (entry: T) => Promise<void>) {
  let nextIndex = 0;
  const workers = Array.from(
    { length: Math.min(MAX_PARALLEL_REQUESTS, entries.length) },
    async () => {
      while (nextIndex < entries.length) {
        const entry = entries[nextIndex];
        nextIndex += 1;
        await run(entry);
      }
    },
  );
  await Promise.all(workers);
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
