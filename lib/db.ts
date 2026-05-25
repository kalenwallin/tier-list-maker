"use client";

import Dexie, { Table } from "dexie";
import { DEFAULT_TIERS, STARTER_ITEMS, Tier, TierItem } from "./tier-list";

export type StoredTierList = {
  id: string;
  title: string;
  description: string;
  tiers: Tier[];
  items: TierItem[];
  createdAt: number;
  updatedAt: number;
};

class TierListDatabase extends Dexie {
  tierLists!: Table<StoredTierList, string>;

  constructor() {
    super("tier-list-maker");
    this.version(1).stores({
      tierLists: "id, updatedAt, createdAt",
    });
  }
}

export const db = new TierListDatabase();

export function createBlankTierList(title = "New tier list"): StoredTierList {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    title,
    description: "",
    tiers: DEFAULT_TIERS.map((tier) => ({ ...tier })),
    items: STARTER_ITEMS.map((item) => ({ ...item })),
    createdAt: now,
    updatedAt: now,
  };
}
