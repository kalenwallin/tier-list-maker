import { DEFAULT_TIERS, STARTER_ITEMS, Tier, TierItem } from "./tier-list";

export type StoredTierList = {
  id: string;
  ownerEmail?: string;
  localId?: string;
  shareId?: string;
  title: string;
  description: string;
  tiers: Tier[];
  items: TierItem[];
  createdAt: number;
  updatedAt: number;
};

export type LocalDataBackup = {
  app: "tier-list-maker";
  version: 1;
  exportedAt: string;
  lists: StoredTierList[];
};

export type NewTierList = Omit<StoredTierList, "id">;

export function createBlankTierList(title = "New tier list"): NewTierList {
  const now = Date.now();
  return {
    title,
    description: "",
    tiers: DEFAULT_TIERS.map((tier) => ({ ...tier })),
    items: STARTER_ITEMS.map((item) => ({ ...item })),
    createdAt: now,
    updatedAt: now,
  };
}

export function createBackup(lists: StoredTierList[]): LocalDataBackup {
  return {
    app: "tier-list-maker",
    version: 1,
    exportedAt: new Date().toISOString(),
    lists,
  };
}

export function parseBackupContents(contents: string) {
  const parsed = JSON.parse(contents) as unknown;
  return parseBackup(parsed);
}

function parseBackup(value: unknown): StoredTierList[] {
  if (!isRecord(value)) {
    throw new Error("Backup file is not valid JSON data.");
  }

  if (value.app !== "tier-list-maker" || value.version !== 1) {
    throw new Error("Backup file is not a Tier List Maker export.");
  }

  if (!Array.isArray(value.lists)) {
    throw new Error("Backup file does not contain tier lists.");
  }

  return value.lists.map(parseTierList);
}

function parseTierList(value: unknown): StoredTierList {
  if (!isRecord(value)) {
    throw new Error("Backup contains an invalid tier list.");
  }

  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    typeof value.description !== "string" ||
    typeof value.createdAt !== "number" ||
    typeof value.updatedAt !== "number" ||
    !Array.isArray(value.tiers) ||
    !Array.isArray(value.items)
  ) {
    throw new Error("Backup contains an incomplete tier list.");
  }

  return {
    id: value.id,
    ownerEmail:
      typeof value.ownerEmail === "string" ? value.ownerEmail : undefined,
    localId: typeof value.localId === "string" ? value.localId : undefined,
    shareId: typeof value.shareId === "string" ? value.shareId : undefined,
    title: value.title,
    description: value.description,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt,
    tiers: value.tiers.map(parseTier),
    items: value.items.map(parseItem),
  };
}

function parseTier(value: unknown): Tier {
  if (!isRecord(value)) {
    throw new Error("Backup contains an invalid tier.");
  }

  if (
    typeof value.id !== "string" ||
    typeof value.name !== "string" ||
    typeof value.color !== "string"
  ) {
    throw new Error("Backup contains an incomplete tier.");
  }

  return {
    id: value.id,
    name: value.name,
    color: value.color,
  };
}

function parseItem(value: unknown): TierItem {
  if (!isRecord(value)) {
    throw new Error("Backup contains an invalid item.");
  }

  if (typeof value.id !== "string" || typeof value.label !== "string") {
    throw new Error("Backup contains an incomplete item.");
  }

  return {
    id: value.id,
    label: value.label,
    imageUrl: typeof value.imageUrl === "string" ? value.imageUrl : undefined,
    tierId: typeof value.tierId === "string" ? value.tierId : undefined,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
