import { createFileRoute, useLocation } from "@tanstack/react-router";
import type { ComponentProps } from "react";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { NewTierListClient } from "@/components/NewTierListClient";
import { SharedTierListView } from "@/components/SharedTierListView";
import { TierListEditor } from "@/components/TierListEditor";
import type { StoredTierList } from "@/lib/db";
import { getPublicTierList, getShareHead } from "@/lib/share-metadata";
import { useTierList } from "@/lib/use-tier-lists";

export const Route = createFileRoute("/lists/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "preview" ? ("preview" as const) : undefined,
  }),
  // Link previews only read the server render, so skip the lookup on client
  // navigations rather than hold up the editor transition for it.
  loader: ({ params }) =>
    typeof window === "undefined" ? getPublicTierList(params.id) : null,
  head: ({ loaderData, params }) =>
    getShareHead(loaderData ?? null, `/lists/${encodeURIComponent(params.id)}`),
  component: ListEditorPage,
});

function ListEditorPage() {
  const { id } = Route.useParams();
  const { mode } = Route.useSearch();
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
    />
  );
}

function TierListPage(
  props: Omit<ComponentProps<typeof TierListEditor>, "tierList">,
) {
  const tierList = useTierList(props.id);

  // Lists the viewer can't edit open read-only, so the editor URL can be
  // pasted anywhere like a share link.
  if (tierList.list === null) {
    return (
      <DirectionalTransition>
        <AppShell hideSignOut>
          <SharedTierListView listId={props.id} />
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
