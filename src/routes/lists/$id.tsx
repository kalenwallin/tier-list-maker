import { createFileRoute, useLocation } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { DirectionalTransition } from "@/components/DirectionalTransition";
import { NewTierListClient } from "@/components/NewTierListClient";
import { TierListEditor } from "@/components/TierListEditor";
import type { StoredTierList } from "@/lib/db";

export const Route = createFileRoute("/lists/$id")({
  validateSearch: (search: Record<string, unknown>) => ({
    mode: search.mode === "preview" ? ("preview" as const) : undefined,
  }),
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
    <DirectionalTransition>
      <AppShell hideDashboard hideSignedOutActions hideSignOut>
        <TierListEditor
          id={id}
          initialList={isDashboardMorph ? dashboardState.dashboardMorphList : undefined}
          key={id}
          compactDashboardTransition={isCompactDashboardTransition}
          morphOnMount={isDashboardMorph && !isCompactDashboardTransition}
          previewMode={mode === "preview"}
        />
      </AppShell>
    </DirectionalTransition>
  );
}
