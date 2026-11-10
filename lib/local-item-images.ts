"use client";

import type { Dexie, EntityTable } from "dexie";
import { useEffect, useState } from "react";
import {
  dataUrlToBlob,
  prepareImageForUpload,
  runWithLimit,
  uploadPreparedItemImage,
} from "./item-image-upload";
import {
  createItemImageKey,
  detectItemImageType,
  getLocalItemImageKey,
  isDataImageUrl,
  ITEM_IMAGE_KEY_PATTERN,
  LOCAL_ITEM_IMAGE_PREFIX,
  MAX_ITEM_IMAGE_BYTES,
  UNSUPPORTED_ITEM_IMAGE_MESSAGE,
} from "./item-images";
import type { TierItem } from "./tier-list";

// Signed-out lists live in localStorage, which only holds a few megabytes of
// text, so the images their items use are kept here in IndexedDB as blobs.
// The images load without a network connection, and items refer to them as
// `local-image:<key>` (see LOCAL_ITEM_IMAGE_PREFIX).

type LocalItemImage = {
  key: string;
  blob: Blob;
  // When the image was last saved. Unused images are only removed once they
  // are older than UNUSED_IMAGE_GRACE_MS, so an image an editor hasn't
  // autosaved into its list yet is never removed.
  savedAt: number;
  // Set once the image is uploaded after signing in, so a move into cloud
  // sync that stops partway doesn't upload it again.
  uploadedUrl?: string;
};

type LocalItemImageDatabase = Dexie & {
  images: EntityTable<LocalItemImage, "key">;
};

// The first version of the app kept lists in a Dexie database named
// "tier-list-maker", which some browsers may still have, so this one has its
// own name.
const DATABASE_NAME = "tier-list-maker-images";
const UNUSED_IMAGE_GRACE_MS = 60 * 60 * 1000;
// Object URLs outlive the last tile showing them for a moment, so a tile that
// remounts, such as on a route change, can show its image right away.
const OBJECT_URL_RELEASE_DELAY_MS = 30_000;
const TOO_LARGE_MESSAGE = `Images can be up to ${MAX_ITEM_IMAGE_BYTES / 1024 / 1024} MB.`;

type ListWithItems = { items: TierItem[] };

let databasePromise: Promise<LocalItemImageDatabase> | undefined;

// Dexie loads on first use, so pages that never show a signed-out list's
// images, such as shared lists, don't download it.
function getDatabase() {
  databasePromise ??= import("dexie").then(
    ({ default: Dexie }) => {
      const database = new Dexie(DATABASE_NAME) as LocalItemImageDatabase;
      database.version(1).stores({ images: "key, savedAt" });
      return database;
    },
    (error: unknown) => {
      // Try again next time, such as once the connection is back.
      databasePromise = undefined;
      throw error;
    },
  );
  return databasePromise;
}

// Loads the image store ahead of time, so adding images to a signed-out list
// keeps working if the connection drops later.
export function preloadLocalItemImages() {
  getDatabase().catch(() => undefined);
}

// Shrinks the image the same way uploads are, keeps it in this browser, and
// resolves to the value to use as an item's imageUrl.
export async function saveLocalItemImage(file: Blob) {
  const image = await prepareImageForUpload(file);
  return `${LOCAL_ITEM_IMAGE_PREFIX}${await storeImage(image)}`;
}

// Gives the lists' images a place in a backup file, as data URLs by key.
export async function exportLocalItemImages(lists: ListWithItems[]) {
  const images: Record<string, string> = {};
  const keys = getUsedKeys(lists);
  if (keys.size === 0) return images;

  const database = await getDatabase();
  for (const key of keys) {
    const image = await database.images.get(key);
    if (image) images[key] = await blobToDataUrl(image.blob);
  }
  return images;
}

// Keeps a backup file's images in this browser and points the lists' items at
// them. Images that can't be read are skipped, and their tiles show the item's
// initial instead.
export async function importLocalItemImages<List extends ListWithItems>(
  lists: List[],
  images: Record<string, string>,
) {
  const importedKeys = new Map<string, string>();

  for (const [key, dataUrl] of Object.entries(images)) {
    if (!ITEM_IMAGE_KEY_PATTERN.test(key) || !isDataImageUrl(dataUrl)) continue;
    try {
      importedKeys.set(key, await storeImage(await dataUrlToBlob(dataUrl)));
    } catch {
      // The rest of the backup is still worth importing.
    }
  }

  return replaceLocalItemImages(
    lists,
    (key) => `${LOCAL_ITEM_IMAGE_PREFIX}${importedKeys.get(key) ?? key}`,
  );
}

// Uploads the images the lists keep in this browser, for lists moving into
// cloud sync, and points the items at the uploaded copies. Items whose image
// is missing from this browser lose it, since nothing else can restore it.
export async function uploadLocalItemImages<List extends ListWithItems>(
  lists: List[],
  authToken: string | null,
) {
  const keys = getUsedKeys(lists);
  if (keys.size === 0) return lists;

  const database = await getDatabase();
  const uploadedUrls = new Map<string, string>();
  await runWithLimit([...keys], async (key) => {
    const image = await database.images.get(key);
    if (!image) return;

    const uploadedUrl =
      image.uploadedUrl ?? (await uploadPreparedItemImage(image.blob, authToken));
    uploadedUrls.set(key, uploadedUrl);
    if (!image.uploadedUrl) await database.images.update(key, { uploadedUrl });
  });

  return replaceLocalItemImages(lists, (key) => uploadedUrls.get(key));
}

// Removes images no list uses anymore, once they're old enough that no open
// editor can be about to save one into its list.
export async function pruneLocalItemImages(lists: ListWithItems[]) {
  try {
    const usedKeys = getUsedKeys(lists);
    const database = await getDatabase();
    const oldKeys = await database.images
      .where("savedAt")
      .below(Date.now() - UNUSED_IMAGE_GRACE_MS)
      .primaryKeys();
    const unusedKeys = oldKeys.filter((key) => !usedKeys.has(key));
    if (unusedKeys.length > 0) await database.images.bulkDelete(unusedKeys);
  } catch (error) {
    console.warn("Couldn't remove unused images from this browser", error);
  }
}

// The address to show an item's image from. Images kept in this browser
// resolve to an object URL once they're read, so this is undefined while one
// loads and null when it's missing. Other values pass through unchanged.
export function useItemImageSrc(imageUrl: string | undefined) {
  const key = getLocalItemImageKey(imageUrl);
  const [loaded, setLoaded] = useState<{ key: string; src: string | null }>();

  useEffect(() => {
    if (!key) return;

    const entry = retainObjectUrl(key);
    let active = true;
    void entry.src.then((src) => {
      if (active) setLoaded({ key, src });
    });

    return () => {
      active = false;
      releaseObjectUrl(key, entry);
    };
  }, [key]);

  if (!key) return imageUrl;
  if (loaded?.key === key) return loaded.src;
  // Reading the cache during render lets a remounted tile show its image in
  // its first frame, which view transitions capture.
  return objectUrls.get(key)?.loadedSrc;
}

type ObjectUrlEntry = {
  src: Promise<string | null>;
  loadedSrc?: string | null;
  users: number;
  releaseTimeout?: number;
};

const objectUrls = new Map<string, ObjectUrlEntry>();

function retainObjectUrl(key: string) {
  let entry = objectUrls.get(key);
  if (!entry) {
    const created: ObjectUrlEntry = {
      users: 0,
      src: getDatabase()
        .then((database) => database.images.get(key))
        .then(
          (image) => (image ? URL.createObjectURL(image.blob) : null),
          () => null,
        )
        .then((src) => {
          created.loadedSrc = src;
          return src;
        }),
    };
    objectUrls.set(key, created);
    entry = created;
  }

  window.clearTimeout(entry.releaseTimeout);
  entry.users += 1;
  return entry;
}

function releaseObjectUrl(key: string, entry: ObjectUrlEntry) {
  entry.users -= 1;
  if (entry.users > 0) return;

  entry.releaseTimeout = window.setTimeout(() => {
    if (entry.users > 0 || objectUrls.get(key) !== entry) return;
    objectUrls.delete(key);
    void entry.src.then((src) => {
      if (src) URL.revokeObjectURL(src);
    });
  }, OBJECT_URL_RELEASE_DELAY_MS);
}

// Checks the bytes the same way the upload endpoint does, so every image kept
// here can be uploaded later, and resolves to the image's key.
async function storeImage(image: Blob) {
  if (image.size > MAX_ITEM_IMAGE_BYTES) throw new Error(TOO_LARGE_MESSAGE);

  const bytes = new Uint8Array(await image.arrayBuffer());
  const contentType = detectItemImageType(bytes);
  if (!contentType) throw new Error(UNSUPPORTED_ITEM_IMAGE_MESSAGE);

  const key = await createItemImageKey(bytes, contentType);
  const database = await getDatabase();
  const existing = await database.images.get(key);
  await database.images.put({
    key,
    blob: new Blob([bytes], { type: contentType }),
    savedAt: Date.now(),
    uploadedUrl: existing?.uploadedUrl,
  });
  return key;
}

function getUsedKeys(lists: ListWithItems[]) {
  const keys = new Set<string>();
  for (const list of lists) {
    for (const item of list.items) {
      const key = getLocalItemImageKey(item.imageUrl);
      if (key) keys.add(key);
    }
  }
  return keys;
}

// `replace` maps an image key to the item's new imageUrl, or to undefined to
// remove the item's image.
function replaceLocalItemImages<List extends ListWithItems>(
  lists: List[],
  replace: (key: string) => string | undefined,
) {
  return lists.map((list) => ({
    ...list,
    items: list.items.map((item) => {
      const key = getLocalItemImageKey(item.imageUrl);
      if (!key) return item;

      const { imageUrl: _imageUrl, ...rest } = item;
      const imageUrl = replace(key);
      return imageUrl ? { ...rest, imageUrl } : rest;
    }),
  }));
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
