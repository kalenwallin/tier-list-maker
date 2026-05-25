export type Tier = {
  id: string;
  name: string;
  color: string;
};

export type TierItem = {
  id: string;
  label: string;
  imageUrl?: string;
  tierId?: string;
};

export const DEFAULT_TIERS: Tier[] = [
  { id: "s", name: "S", color: "#ff5470" },
  { id: "a", name: "A", color: "#ff9f43" },
  { id: "b", name: "B", color: "#ffd166" },
  { id: "c", name: "C", color: "#4ecdc4" },
  { id: "d", name: "D", color: "#7b61ff" },
  { id: "f", name: "F", color: "#8d99ae" },
];

export const STARTER_ITEMS: TierItem[] = [
  { id: "sample-1", label: "Add your first item" },
  { id: "sample-2", label: "Drag me into a tier" },
  { id: "sample-3", label: "Paste image URLs too" },
];

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
