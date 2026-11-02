import { createFileRoute, notFound } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import {
  SharedTierListNotFoundPage,
  SharedTierListView,
} from "@/components/SharedTierListView";
import { getShareHead, getSharedTierList } from "@/lib/share-metadata";

export const Route = createFileRoute("/share/$shareId")({
  loader: async ({ params }) => {
    const list = await getSharedTierList(params.shareId);
    if (list === null) throw notFound();
    return list;
  },
  head: ({ loaderData, params }) =>
    getShareHead(loaderData ?? null, `/share/${encodeURIComponent(params.shareId)}`),
  component: SharedTierListPage,
  notFoundComponent: SharedTierListNotFoundPage,
});

function SharedTierListPage() {
  const { shareId } = Route.useParams();
  const list = Route.useLoaderData();

  return (
    <DirectionalTransition>
      <AppShell hideSignOut>
        <SharedTierListView initialList={list} shareId={shareId} />
      </AppShell>
    </DirectionalTransition>
  );
}
