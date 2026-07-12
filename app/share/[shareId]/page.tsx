import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { SharedTierListView } from "@/components/SharedTierListView";
import {
  getShareDescription,
  getShareTitle,
  getSharedTierList,
} from "@/lib/share-metadata";
import { getSiteUrl } from "@/lib/site-url";
import type { Metadata } from "next";

type SharedTierListPageProps = {
  params: Promise<{ shareId: string }>;
};

export async function generateMetadata({
  params,
}: SharedTierListPageProps): Promise<Metadata> {
  const { shareId } = await params;
  const list = await getSharedTierList(shareId);
  const title = getShareTitle(list);
  const description = getShareDescription(list);
  const siteUrl = getSiteUrl();
  const sharePath = `/share/${encodeURIComponent(shareId)}`;
  const imagePath = `${sharePath}/opengraph-image`;

  return {
    metadataBase: new URL(siteUrl),
    title,
    description,
    alternates: {
      canonical: sharePath,
    },
    openGraph: {
      title,
      description,
      url: sharePath,
      siteName: "Tier List Maker",
      type: "website",
      images: [
        {
          url: imagePath,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imagePath],
    },
  };
}

export default async function SharedTierListPage({ params }: SharedTierListPageProps) {
  const { shareId } = await params;
  return (
    <DirectionalTransition>
      <AppShell hideSignOut>
        <SharedTierListView shareId={shareId} />
      </AppShell>
    </DirectionalTransition>
  );
}
