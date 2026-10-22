import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { SharedTierListView } from "@/components/SharedTierListView";
import { getShareHead, getSharedTierList } from "@/lib/share-metadata";

export const Route = createFileRoute("/share/$shareId")({
  loader: ({ params }) => getSharedTierList(params.shareId),
  head: ({ loaderData, params }) =>
    getShareHead(loaderData ?? null, `/share/${encodeURIComponent(params.shareId)}`),
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
