import assert from "node:assert/strict";
import test from "node:test";
import { createBackup, parseBackupFile, type StoredTierList } from "../lib/db";

function listWithItems(items: StoredTierList["items"]): StoredTierList {
  return {
    id: "local-list-1",
    title: "Snacks",
    description: "",
    itemImageAspectRatio: "landscape",
    tiers: [{ id: "s", name: "S", color: "#ff5470" }],
    items,
    createdAt: 1,
    updatedAt: 1,
  };
}

// Signed-out lists are read back from localStorage through the same parser,
// so this also covers descriptions surviving a reload.
test("keeps item descriptions through a backup", () => {
  const backup = createBackup([
    listWithItems([
      { id: "item-1", label: "Pretzels", description: "Salty.\nGreat with mustard." },
      { id: "item-2", label: "Chips", tierId: "s" },
    ]),
  ]);

  const [list] = parseBackupFile(JSON.stringify(backup)).lists;

  assert.equal(list.items[0].description, "Salty.\nGreat with mustard.");
  assert.equal(list.items[1].description, undefined);
});

test("ignores item descriptions that aren't text", () => {
  const backup = createBackup([listWithItems([{ id: "item-1", label: "Pretzels" }])]);
  const contents = JSON.stringify(backup).replace(
    '"label":"Pretzels"',
    '"label":"Pretzels","description":42',
  );

  const [list] = parseBackupFile(contents).lists;

  assert.equal(list.items[0].description, undefined);
});
