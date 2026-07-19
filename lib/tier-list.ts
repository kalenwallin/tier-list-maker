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

export const ITEM_IMAGE_ASPECT_RATIO_OPTIONS = [
  { value: "landscape", label: "Landscape (3:2)" },
  { value: "square", label: "Square (1:1)" },
  { value: "portrait", label: "Portrait (2:3)" },
  { value: "wide", label: "Wide (16:9)" },
] as const;

export type ItemImageAspectRatio =
  (typeof ITEM_IMAGE_ASPECT_RATIO_OPTIONS)[number]["value"];

export const DEFAULT_ITEM_IMAGE_ASPECT_RATIO: ItemImageAspectRatio = "landscape";

export function isItemImageAspectRatio(
  value: unknown,
): value is ItemImageAspectRatio {
  return ITEM_IMAGE_ASPECT_RATIO_OPTIONS.some((option) => option.value === value);
}

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

export function sortItemsByTier(items: TierItem[], tiers: Tier[]) {
  const tierOrder = new Map(tiers.map((tier, index) => [tier.id, index]));

  return items
    .map((item, index) => ({ item, index }))
    .sort((left, right) => {
      const leftTier = left.item.tierId
        ? (tierOrder.get(left.item.tierId) ?? tiers.length)
        : tiers.length;
      const rightTier = right.item.tierId
        ? (tierOrder.get(right.item.tierId) ?? tiers.length)
        : tiers.length;

      return leftTier - rightTier || left.index - right.index;
    })
    .map(({ item }) => item);
}

export function moveItem(
  items: TierItem[],
  itemId: string,
  tierId?: string,
  targetItemId?: string,
  placement: "before" | "after" = "after",
) {
  const draggedItem = items.find((item) => item.id === itemId);
  if (!draggedItem) return items;

  const remainingItems = items.filter((item) => item.id !== itemId);
  const movedItem = { ...draggedItem, tierId };

  if (targetItemId && targetItemId !== itemId) {
    const targetIndex = remainingItems.findIndex((item) => item.id === targetItemId);
    if (targetIndex >= 0) {
      const insertionIndex = placement === "before" ? targetIndex : targetIndex + 1;
      remainingItems.splice(insertionIndex, 0, movedItem);
      return remainingItems;
    }
  }

  const lastTierItemIndex = remainingItems.findLastIndex(
    (item) => item.tierId === tierId,
  );
  remainingItems.splice(lastTierItemIndex + 1, 0, movedItem);
  return remainingItems;
}

export function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
