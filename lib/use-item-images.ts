"use client";

import { useAuthToken } from "@convex-dev/auth/react";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
  copyItemImage,
  dataUrlToBlob,
  runWithLimit,
  uploadItemImage,
} from "./item-image-upload";
import { canCopyItemImage, isDataImageUrl } from "./item-images";
import { preloadLocalItemImages, saveLocalItemImage } from "./local-item-images";
import type { TierItem } from "./tier-list";
import type { SyncMode } from "./use-tier-lists";

export type ItemImageStatus =
  | { state: "uploading" }
  | { state: "copying" }
  // Keeping an uploaded image in this browser, for signed-out lists.
  | { state: "saving" }
  | { state: "error"; message: string };

// Uploads and link copies for the editor's items. Each finished request
// writes its image into the item, which the editor then autosaves. Signed-out
// lists keep their images in this browser instead, which works offline.
export function useItemImages(
  setItems: Dispatch<SetStateAction<TierItem[]>>,
  syncMode: SyncMode,
) {
  const authToken = useAuthToken();
  const [statuses, setStatuses] = useState<Record<string, ItemImageStatus>>({});
  const isLocal = syncMode === "local";

  useEffect(() => {
    if (isLocal) preloadLocalItemImages();
  }, [isLocal]);

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
    setStatus(itemId, { state: isLocal ? "saving" : "uploading" });
    try {
      const imageUrl = isLocal
        ? await saveLocalItemImage(await file)
        : await uploadItemImage(await file, authToken);
      setItemImage(itemId, imageUrl);
      setStatus(itemId);
    } catch (error) {
      setStatus(itemId, {
        state: "error",
        message: getErrorMessage(
          error,
          isLocal
            ? "Couldn't save that image in this browser."
            : "Couldn't upload that image.",
        ),
      });
    }
  }

  async function copyImage(itemId: string, url: string) {
    setStatus(itemId, { state: "copying" });
    try {
      // Signed-out lists can only copy inline images; see `canCopy`.
      const imageUrl = isLocal
        ? await saveLocalItemImage(await dataUrlToBlob(url))
        : await copyItemImage(url, authToken);
      setItemImage(itemId, imageUrl, url);
      setStatus(itemId);
    } catch (error) {
      setStatus(itemId, {
        state: "error",
        message: `${getErrorMessage(error, "Couldn't save a copy.")} The item still uses the original link.`,
      });
    }
  }

  return {
    canAddImages: isLocal || authToken !== null,
    // Copying an image from another site needs the server to download it, so
    // signed-out lists can only keep copies of inline (data URL) images.
    canCopy: (value: string | undefined): value is string =>
      isLocal ? isDataImageUrl(value) : canCopyItemImage(value),
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
