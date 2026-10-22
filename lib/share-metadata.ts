import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { isLocalTierListId } from "./local-tier-lists";
import { getPublicEnv, getSiteUrl } from "./site-url";

export type SharedTierList = NonNullable<
  FunctionReturnType<typeof api.tierLists.getShared>
>;

const SITE_NAME = "Tier List Maker";
const DEFAULT_DESCRIPTION = "Create tier lists and share them with friends.";

export async function getSharedTierList(shareId: string) {
  if (!shareId.trim()) return null;

  return await queryConvex((client) =>
    client.query(api.tierLists.getShared, { shareId }),
  );
}

export async function getPublicTierList(id: string) {
  // Browser-only lists never reach Convex, so there is nothing to look up.
  if (!id.trim() || isLocalTierListId(id)) return null;

  return await queryConvex((client) =>
    client.query(api.tierLists.getPublic, { id }),
  );
}

async function queryConvex<T>(run: (client: ConvexHttpClient) => Promise<T>) {
  try {
    const convexUrl = getPublicEnv("NEXT_PUBLIC_CONVEX_URL");
    if (!convexUrl) return null;

    return await run(new ConvexHttpClient(convexUrl));
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

// Link-preview tags for a page that shows a shared list. Its OG image is
// served from `${path}/opengraph-image`.
export function getShareHead(list: SharedTierList | null, path: string) {
  const title = getShareTitle(list);
  const description = getShareDescription(list);
  const canonicalUrl = `${getSiteUrl()}${path}`;
  const imageUrl = `${canonicalUrl}/opengraph-image`;

  return {
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: canonicalUrl },
      { property: "og:site_name", content: SITE_NAME },
      { property: "og:type", content: "website" },
      { property: "og:image", content: imageUrl },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: title },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
      { name: "twitter:image", content: imageUrl },
    ],
    links: [{ rel: "canonical", href: canonicalUrl }],
  };
}

export function truncateText(text: string, maxLength: number) {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length <= maxLength) return trimmed;
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trim()}...`;
}
