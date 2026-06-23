"use client";

import { createBlankTierList, parseBackupContents, StoredTierList } from "./db";
import { createId } from "./tier-list";

const STORAGE_KEY = "tier-list-maker:lists:v1";

export function readLocalTierLists(): StoredTierList[] {
  if (typeof window === "undefined") return [];

  const contents = window.localStorage.getItem(STORAGE_KEY);
  if (!contents) return [];

  try {
    const parsed = JSON.parse(contents) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(parseStoredTierList);
  } catch {
    return [];
  }
}

export function createLocalTierList(title?: string, id = createId("local-list")) {
  const list: StoredTierList = {
    id,
    ...createBlankTierList(title),
  };
  const lists = [list, ...readLocalTierLists().filter((stored) => stored.id !== id)];
  writeLocalTierLists(lists);
  return list;
}

export function updateLocalTierList(
  id: string,
  updates: Pick<StoredTierList, "title" | "description" | "tiers" | "items">,
) {
  const lists = readLocalTierLists();
  const updatedAt = Date.now();
  writeLocalTierLists(
    lists.map((list) =>
      list.id === id
        ? {
            ...list,
            title: updates.title.trim() || "Untitled tier list",
            description: updates.description.trim(),
            tiers: updates.tiers,
            items: updates.items,
            updatedAt,
          }
        : list,
    ),
  );
}

export function removeLocalTierList(id: string) {
  writeLocalTierLists(readLocalTierLists().filter((list) => list.id !== id));
}

export function importLocalTierLists(contents: string) {
  const parsedLists = parseBackupContents(contents);
  const importedLists = parsedLists.map(
    ({
      ownerEmail: _ownerEmail,
      localId: _localId,
      shareId: _shareId,
      ...list
    }) => ({
      ...list,
      id: createId("local-list"),
      updatedAt: Date.now(),
    }),
  );

  writeLocalTierLists([...importedLists, ...readLocalTierLists()]);
  return importedLists.length;
}

export function clearLocalTierLists() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function writeLocalTierLists(lists: StoredTierList[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(lists));
  window.dispatchEvent(new Event("tier-list-maker:local-lists-changed"));
}

export function isLocalTierListId(id: string) {
  return id.startsWith("local-list-");
}

function parseStoredTierList(value: unknown): StoredTierList {
  const backup = {
    app: "tier-list-maker",
    version: 1,
    exportedAt: new Date().toISOString(),
    lists: [value],
  };
  return parseBackupContents(JSON.stringify(backup))[0];
}
