import type { StoredTierList } from "./db";

export type DashboardLayout = "cards" | "list";

export type DashboardSnapshot = {
  activeMorphListId: string;
  hasWrappedCardSummary: boolean;
  isCompact: boolean;
  layout: DashboardLayout;
  lists: StoredTierList[];
  ownerEmail: string | undefined;
  scrollY: number;
};

type TierListContent = Pick<
  StoredTierList,
  "title" | "description" | "itemImageAspectRatio" | "tiers" | "items"
>;

// This module lives for the lifetime of the client bundle, so route remounts can
// synchronously recreate the shared element before TanStack captures the new view.
let dashboardSnapshot: DashboardSnapshot | null = null;

export function getDashboardSnapshot() {
  return dashboardSnapshot;
}

export function rememberDashboardSnapshot(snapshot: DashboardSnapshot) {
  dashboardSnapshot = snapshot;
}

export function clearDashboardSnapshot(snapshot: DashboardSnapshot) {
  if (dashboardSnapshot === snapshot) dashboardSnapshot = null;
}

export function promoteDashboardSnapshotList(listId: string, updates: TierListContent) {
  if (!dashboardSnapshot) return;

  const list = dashboardSnapshot.lists.find((candidate) => candidate.id === listId);
  if (!list) return;

  dashboardSnapshot = {
    ...dashboardSnapshot,
    activeMorphListId: listId,
    lists: [
      {
        ...list,
        ...updates,
        title: updates.title.trim() || "Untitled tier list",
        description: updates.description.trim(),
        updatedAt: Date.now(),
      },
      ...dashboardSnapshot.lists.filter((candidate) => candidate.id !== listId),
    ],
    scrollY: 0,
  };
}
