import { api } from "@/convex/_generated/api";
import type { Doc } from "@/convex/_generated/dataModel";
import { ConvexHttpClient } from "convex/browser";
import { getPublicEnv } from "./site-url";

export type SharedTierList = Doc<"tierLists">;

const SITE_NAME = "Tier List Maker";
const DEFAULT_DESCRIPTION = "Create tier lists and share them with friends.";

export async function getSharedTierList(shareId: string) {
  if (!shareId.trim()) return null;

  try {
    const convexUrl = getPublicEnv("NEXT_PUBLIC_CONVEX_URL");
    if (!convexUrl) return null;

    return await new ConvexHttpClient(convexUrl).query(api.tierLists.getShared, {
      shareId,
    });
  } catch {
    return null;
  }
}

export function getShareTitle(list: SharedTierList | null) {
  const title = list?.title.trim();
  return title ? `${title} | ${SITE_NAME}` : SITE_NAME;
}

export function getShareDescription(list: SharedTierList | null) {
  const description = list?.description.trim();
  if (description) return description;

  if (!list) return DEFAULT_DESCRIPTION;

  const rankedCount = list.items.filter((item) => item.tierId).length;
  const totalCount = list.items.length;
  return `A tier list with ${rankedCount} of ${totalCount} items ranked across ${list.tiers.length} tiers.`;
}

export function truncateText(text: string, maxLength: number) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}
