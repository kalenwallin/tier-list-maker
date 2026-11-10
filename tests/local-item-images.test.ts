import Dexie from "dexie";
import { IDBKeyRange, indexedDB } from "fake-indexeddb";
import assert from "node:assert/strict";
import nodeTest from "node:test";
import { createBackup, parseBackupFile, type StoredTierList } from "../lib/db";
import { getLocalItemImageKey, LOCAL_ITEM_IMAGE_PREFIX } from "../lib/item-images";
import {
  exportLocalItemImages,
  importLocalItemImages,
  pruneLocalItemImages,
  saveLocalItemImage,
  uploadLocalItemImages,
} from "../lib/local-item-images";

const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const GIF_DATA_URL =
  "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// Bun has no IndexedDB. The app's database is made on first use, so this is
// in place in time.
Dexie.dependencies.indexedDB = indexedDB;
Dexie.dependencies.IDBKeyRange = IDBKeyRange;

// Bun has no FileReader, which turns images into data URLs for backups.
globalThis.FileReader ??= class {
  result: string | null = null;
  error: Error | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  readAsDataURL(blob: Blob) {
    void blob.arrayBuffer().then((buffer) => {
      this.result = `data:${blob.type};base64,${Buffer.from(buffer).toString("base64")}`;
      this.onload?.();
    });
  }
} as unknown as typeof FileReader;

const realFetch = globalThis.fetch;
let uploads: Blob[] = [];

// Stands in for POST /api/images, which names images by their SHA-256.
const fetchWithUploads = (async (input: RequestInfo | URL, init?: RequestInit) => {
  if (input !== "/api/images") return realFetch(input, init);

  const body = init?.body as Blob;
  uploads.push(body);
  const digest = await crypto.subtle.digest("SHA-256", await body.arrayBuffer());
  const hash = Buffer.from(digest).toString("hex");
  return Response.json({ url: `/images/${hash}.${body.type.split("/")[1]}` });
}) as typeof fetch;

// Every test starts with nothing kept in the browser.
function test(name: string, run: () => Promise<void> | void) {
  nodeTest(name, async () => {
    uploads = [];
    await pruneAll();
    globalThis.fetch = fetchWithUploads;
    try {
      await run();
    } finally {
      globalThis.fetch = realFetch;
    }
  });
}

async function dataUrlToBlob(dataUrl: string) {
  return await (await realFetch(dataUrl)).blob();
}

function listWith(...imageUrls: (string | undefined)[]) {
  return {
    items: imageUrls.map((imageUrl, index) => ({
      id: `item-${index}`,
      label: `Item ${index}`,
      imageUrl,
    })),
  };
}

test("keeps an image in the browser under its content hash", async () => {
  const imageUrl = await saveLocalItemImage(await dataUrlToBlob(PNG_DATA_URL));
  const key = getLocalItemImageKey(imageUrl);

  assert.ok(imageUrl.startsWith(LOCAL_ITEM_IMAGE_PREFIX));
  assert.match(key ?? "", /^[0-9a-f]{64}\.png$/);
  assert.equal(await saveLocalItemImage(await dataUrlToBlob(PNG_DATA_URL)), imageUrl);
});

test("refuses files that aren't a supported image", async () => {
  await assert.rejects(
    saveLocalItemImage(new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"])),
    /PNG, JPEG, GIF, WebP, or AVIF/,
  );
});

test("backups carry images and restore them", async () => {
  const imageUrl = await saveLocalItemImage(await dataUrlToBlob(GIF_DATA_URL));
  const list = listWith(imageUrl, "https://example.com/a.png");
  const images = await exportLocalItemImages([list]);
  const key = getLocalItemImageKey(imageUrl) as string;

  assert.deepEqual(Object.keys(images), [key]);
  assert.equal(images[key], GIF_DATA_URL);

  const storedList: StoredTierList = {
    id: "local-list-1",
    title: "Snacks",
    description: "",
    itemImageAspectRatio: "square",
    tiers: [],
    items: list.items,
    createdAt: 1,
    updatedAt: 1,
  };
  const backup = createBackup([storedList], images);
  const parsed = parseBackupFile(JSON.stringify(backup));
  assert.deepEqual(parsed.images, images);

  // Restoring into a browser that doesn't have the image yet.
  await pruneAll();
  const [restored] = await importLocalItemImages([list], parsed.images);
  assert.equal(restored.items[0].imageUrl, imageUrl);
  assert.equal(restored.items[1].imageUrl, "https://example.com/a.png");
  assert.deepEqual(Object.keys(await exportLocalItemImages([restored])), [key]);
});

test("backups without images still parse, and bad image entries are dropped", () => {
  const parsed = parseBackupFile(
    JSON.stringify({
      ...createBackup([]),
      images: { "not-a-key": PNG_DATA_URL, [`${"a".repeat(64)}.png`]: "https://x" },
    }),
  );
  assert.deepEqual(parsed.images, {});
  assert.deepEqual(parseBackupFile(JSON.stringify(createBackup([]))).images, {});
});

test("signing in uploads local images once and drops missing ones", async () => {
  const imageUrl = await saveLocalItemImage(await dataUrlToBlob(PNG_DATA_URL));
  const key = getLocalItemImageKey(imageUrl);
  const missing = `${LOCAL_ITEM_IMAGE_PREFIX}${"b".repeat(64)}.png`;
  const lists = [listWith(imageUrl, missing, "https://example.com/a.png", undefined)];

  const [uploaded] = await uploadLocalItemImages(lists, "token");
  assert.equal(uploaded.items[0].imageUrl, `/images/${key}`);
  assert.equal("imageUrl" in uploaded.items[1], false);
  assert.equal(uploaded.items[2].imageUrl, "https://example.com/a.png");
  assert.equal(uploaded.items[3].imageUrl, undefined);
  assert.equal(uploads.length, 1);

  // A retry after an interrupted move doesn't upload the image again.
  const [retried] = await uploadLocalItemImages(lists, "token");
  assert.equal(retried.items[0].imageUrl, `/images/${key}`);
  assert.equal(uploads.length, 1);
});

test("lists without local images don't touch storage or the network", async () => {
  const lists = [listWith("/images/x.png", undefined)];
  assert.equal(await uploadLocalItemImages(lists, null), lists);
  assert.equal(uploads.length, 0);
});

test("pruning only removes unused images that are old enough", async () => {
  const realNow = Date.now;
  Date.now = () => realNow() - 2 * 60 * 60 * 1000;
  let oldUsed: string;
  let oldUnused: string;
  try {
    oldUsed = await saveLocalItemImage(await dataUrlToBlob(PNG_DATA_URL));
    oldUnused = await saveLocalItemImage(await dataUrlToBlob(GIF_DATA_URL));
  } finally {
    Date.now = realNow;
  }
  const list = listWith(oldUsed, oldUnused);

  await pruneLocalItemImages([listWith(oldUsed)]);
  assert.deepEqual(Object.keys(await exportLocalItemImages([list])), [
    getLocalItemImageKey(oldUsed),
  ]);

  // Saving an image again counts as recent, so it survives a prune even
  // before an editor saves it into a list.
  const fresh = await saveLocalItemImage(await dataUrlToBlob(GIF_DATA_URL));
  await pruneLocalItemImages([]);
  assert.deepEqual(Object.keys(await exportLocalItemImages([listWith(fresh)])), [
    getLocalItemImageKey(fresh),
  ]);
});

async function pruneAll() {
  const realNow = Date.now;
  Date.now = () => realNow() + 2 * 60 * 60 * 1000;
  try {
    await pruneLocalItemImages([]);
  } finally {
    Date.now = realNow;
  }
}
