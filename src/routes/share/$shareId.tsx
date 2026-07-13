import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { SharedTierListView } from "@/components/SharedTierListView";
import {
  getShareDescription,
  getShareTitle,
  getSharedTierList,
} from "@/lib/share-metadata";
import { getSiteUrl } from "@/lib/site-url";

export const Route = createFileRoute("/share/$shareId")({
  loader: ({ params }) => getSharedTierList(params.shareId),
  head: ({ loaderData, params }) => {
    const list = loaderData ?? null;
    const title = getShareTitle(list);
    const description = getShareDescription(list);
    const siteUrl = getSiteUrl();
    const sharePath = `/share/${encodeURIComponent(params.shareId)}`;
    const canonicalUrl = `${siteUrl}${sharePath}`;
    const imageUrl = `${canonicalUrl}/opengraph-image`;

    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: canonicalUrl },
        { property: "og:site_name", content: "Tier List Maker" },
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
  },
  component: SharedTierListPage,
});

function SharedTierListPage() {
  const { shareId } = Route.useParams();

  return (
    <DirectionalTransition>
      <AppShell hideSignOut>
        <SharedTierListView shareId={shareId} />
      </AppShell>
    </DirectionalTransition>
  );
}
