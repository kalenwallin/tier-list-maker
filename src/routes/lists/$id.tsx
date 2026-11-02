import { createFileRoute, notFound, useLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { NewTierListClient } from "@/components/NewTierListClient";
import {
  SharedTierListNotFoundPage,
  SharedTierListView,
} from "@/components/SharedTierListView";
import { TierListEditor } from "@/components/TierListEditor";
import type { StoredTierList } from "@/lib/db";
import { isLocalTierListId } from "@/lib/local-tier-lists";
import {
  getPublicTierList,
  getShareHead,
  type SharedTierList,
} from "@/lib/share-metadata";
import { useTierList } from "@/lib/use-tier-lists";

export const Route = createFileRoute("/lists/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "preview" ? ("preview" as const) : undefined,
  }),
  // Crawlers and link previews only read the server render, so skip the lookup
  // on client navigations rather than hold up the editor transition for it.
  loader: async ({ params }) => {
    if (typeof window !== "undefined") return null;

    const list = await getPublicTierList(params.id);
    // Browser-only lists live in the visitor's storage, out of the server's sight.
    if (list === null && !isLocalTierListId(params.id)) throw notFound();
    return list;
  },
  head: ({ loaderData, params }) =>
    getShareHead(loaderData ?? null, `/lists/${encodeURIComponent(params.id)}`),
  component: ListEditorPage,
  notFoundComponent: SharedTierListNotFoundPage,
});

function ListEditorPage() {
  const { id } = Route.useParams();
  const { mode } = Route.useSearch();
  const serverList = Route.useLoaderData();
  const dashboardState = useLocation({
    select: (location) =>
      location.state as typeof location.state & {
        dashboardCompactMode?: boolean;
        dashboardMorphId?: string;
        dashboardMorphList?: StoredTierList;
      },
  });
  const isCompactDashboardTransition = dashboardState.dashboardCompactMode === true;
  const isDashboardMorph = dashboardState.dashboardMorphId === id;

  if (id === "new") {
    return (
      <DirectionalTransition>
        <AppShell hideSignOut>
          <NewTierListClient />
        </AppShell>
      </DirectionalTransition>
    );
  }

  return (
    <TierListPage
      id={id}
      initialList={isDashboardMorph ? dashboardState.dashboardMorphList : undefined}
      key={id}
      compactDashboardTransition={isCompactDashboardTransition}
      morphOnMount={isDashboardMorph && !isCompactDashboardTransition}
      previewMode={mode === "preview"}
      serverList={serverList ?? undefined}
    />
  );
}

function TierListPage({
  serverList,
  ...props
}: Omit<ComponentProps<typeof TierListEditor>, "tierList"> & {
  serverList?: SharedTierList;
}) {
  const tierList = useTierList(props.id);
  // The server can't tell who's viewing, so it renders the list read-only until
  // the client finds out. A morph from the dashboard already has the editable list.
  const isAwaitingViewer =
    tierList.list === undefined && serverList !== undefined && !props.initialList;

  // Lists the viewer can't edit open read-only, so the editor URL can be
  // pasted anywhere like a share link.
  if (tierList.list === null || isAwaitingViewer) {
    return (
      <DirectionalTransition>
        <AppShell hideSignOut>
          <SharedTierListView initialList={serverList} listId={props.id} />
        </AppShell>
      </DirectionalTransition>
    );
  }

  return (
    <DirectionalTransition>
      <AppShell hideDashboard hideSignedOutActions hideSignOut>
        <TierListEditor {...props} tierList={tierList} />
      </AppShell>
    </DirectionalTransition>
  );
}
