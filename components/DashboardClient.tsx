"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Download,
  FilePlus2,
  LayoutGrid,
  List,
  Loader2,
  Minimize2,
  Pencil,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import {
  addTransitionType,
  ChangeEvent,
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  ViewTransition,
} from "react";
import type { StoredTierList } from "@/lib/db";
import {
  copyPngToClipboard,
  downloadPng,
  renderTierListPng,
  waitForNextFrame,
} from "@/lib/image-export";
import { useMobilePerformanceMode } from "@/lib/use-mobile-performance-mode";
import { useTierLists } from "@/lib/use-tier-lists";
import { TierListPreview } from "./TierListPreview";

const DASHBOARD_PREFERENCES_KEY = "tier-list-maker-dashboard-preferences-v1";
const MIN_TWO_CARD_LAYOUT_WIDTH = 260 * 2 + 16;

type DashboardLayout = "cards" | "list";

type DashboardSnapshot = {
  activeMorphListId: string;
  hasWrappedCardSummary: boolean;
  isCompact: boolean;
  layout: DashboardLayout;
  lists: StoredTierList[];
  ownerEmail: string | undefined;
  scrollY: number;
};

type DashboardSkeletonSnapshot = Pick<
  DashboardSnapshot,
  "hasWrappedCardSummary" | "isCompact" | "layout"
> & {
  cards: Array<{
    id: string;
    tierIds: string[];
  }>;
};

const DEFAULT_DASHBOARD_SKELETON_CARDS = [
  {
    id: "dashboard-loading-card",
    tierIds: ["s", "a", "b", "c", "d", "f"],
  },
];
const DASHBOARD_SKELETON_ACTIONS = ["edit", "delete", "share", "download", "copy"];

// This module lives for the lifetime of the client bundle, so route remounts can
// synchronously recreate the shared element before TanStack captures the new view.
let dashboardSnapshot: DashboardSnapshot | null = null;

function DashboardSkeleton({
  currentIsCompact,
  currentLayout,
  snapshot,
}: {
  currentIsCompact: boolean;
  currentLayout: DashboardLayout;
  snapshot: DashboardSkeletonSnapshot | null;
}) {
  const skeletonIsCompact = snapshot?.isCompact ?? currentIsCompact;
  const skeletonLayout = snapshot?.layout ?? currentLayout;
  const skeletonCards = snapshot?.cards ?? DEFAULT_DASHBOARD_SKELETON_CARDS;

  return (
    <div aria-busy="true" className="dashboard-skeleton" role="status">
      <span className="visually-hidden">Loading your tier lists</span>
      <div aria-hidden="true">
        <section className="toolbar">
          <div className="dashboard-skeleton-heading">
            <span className="dashboard-skeleton-block dashboard-skeleton-title" />
            <span className="dashboard-skeleton-block dashboard-skeleton-subtitle" />
          </div>
          <div className="nav-actions">
            <span className="button dashboard-skeleton-block dashboard-skeleton-button-wide" />
            <span className="button dashboard-skeleton-block dashboard-skeleton-button" />
            <span className="button dashboard-skeleton-block dashboard-skeleton-button" />
          </div>
        </section>

        <div className="dashboard-layout-controls">
          <span className="button dashboard-skeleton-block dashboard-skeleton-layout" />
          <span className="button dashboard-skeleton-block dashboard-skeleton-compact" />
        </div>

        <section
          className={[
            "grid",
            skeletonLayout === "list" ? "is-list-layout" : "is-card-layout",
            skeletonIsCompact ? "is-compact" : "",
            snapshot?.hasWrappedCardSummary ? "has-wrapped-card-summary" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          {skeletonCards.map((card) => (
            <article className="list-card dashboard-skeleton-card" key={card.id}>
              <span className="list-card-item-count dashboard-skeleton-block dashboard-skeleton-count" />
              <div className="list-card-details list-card-summary">
                <span className="dashboard-skeleton-block dashboard-skeleton-card-title" />
                <span className="dashboard-skeleton-block dashboard-skeleton-card-copy" />
              </div>
              <div className="dashboard-tier-preview list-card-summary">
                {card.tierIds.map((tierId) => (
                  <div className="dashboard-tier-preview-row" key={tierId}>
                    <span className="dashboard-skeleton-block dashboard-skeleton-tier-label" />
                    <div className="dashboard-tier-preview-items">
                      <span className="dashboard-skeleton-block dashboard-skeleton-tier-item" />
                      <span className="dashboard-skeleton-block dashboard-skeleton-tier-item" />
                    </div>
                  </div>
                ))}
                <div className="dashboard-tier-preview-tray">
                  <span className="dashboard-skeleton-block dashboard-skeleton-tier-item" />
                  <span className="dashboard-skeleton-block dashboard-skeleton-tier-item" />
                </div>
              </div>
              <div className="nav-actions" style={{ justifyContent: "flex-start" }}>
                {DASHBOARD_SKELETON_ACTIONS.map((action) => (
                  <span className="button icon dashboard-skeleton-block" key={action} />
                ))}
              </div>
            </article>
          ))}
          <div className="new-list-card dashboard-skeleton-new-list">
            <span className="new-list-card-icon dashboard-skeleton-block" />
            <span className="new-list-card-copy">
              <span className="dashboard-skeleton-block dashboard-skeleton-new-title" />
              <span className="dashboard-skeleton-block dashboard-skeleton-new-copy" />
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}

export function DashboardClient() {
  const {
    lists,
    ownerEmail,
    syncMode,
    isMigratingLocalData,
    canLoadMore,
    isLoadingMore,
    loadMore,
    createList,
    removeList,
    createShareLink,
    exportData,
    importData,
  } = useTierLists();
  const mobilePerformanceMode = useMobilePerformanceMode();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageExportRef = useRef<HTMLDivElement>(null);
  const listGridRef = useRef<HTMLElement>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement>(null);
  const removeDialogRef = useRef<HTMLDialogElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [pendingRemovalId, setPendingRemovalId] = useState<string | null>(null);
  const [initialSnapshot] = useState(() => {
    return dashboardSnapshot?.ownerEmail === ownerEmail
      ? dashboardSnapshot
      : null;
  });
  const [loadingSnapshot] = useState<DashboardSkeletonSnapshot | null>(() => {
    if (!dashboardSnapshot) return null;

    return {
      hasWrappedCardSummary: dashboardSnapshot.hasWrappedCardSummary,
      isCompact: dashboardSnapshot.isCompact,
      layout: dashboardSnapshot.layout,
      cards: dashboardSnapshot.lists.map((list) => ({
        id: list.id,
        tierIds: list.tiers.map((tier) => tier.id),
      })),
    };
  });
  const initialSnapshotRef = useRef(initialSnapshot);
  const [layout, setLayout] = useState<DashboardLayout>(
    initialSnapshot?.layout ?? "cards",
  );
  const [isSingleColumnLayout, setIsSingleColumnLayout] = useState(false);
  const [isCompact, setIsCompact] = useState(initialSnapshot?.isCompact ?? false);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [hasWrappedCardSummary, setHasWrappedCardSummary] = useState(
    initialSnapshot?.hasWrappedCardSummary ?? false,
  );
  const [exportingImageListId, setExportingImageListId] = useState<string | null>(null);
  const [exportingImageAction, setExportingImageAction] = useState<
    "download" | "copy" | null
  >(null);
  const [sharingListId, setSharingListId] = useState<string | null>(null);
  const [copiedListId, setCopiedListId] = useState<string | null>(null);
  const [copiedImageListId, setCopiedImageListId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const copyStatusTimeoutRef = useRef<number | null>(null);
  const copyImageStatusTimeoutRef = useRef<number | null>(null);
  const activityGenerationRef = useRef(0);
  const isRestoringPaginatedSnapshot = Boolean(
    initialSnapshot &&
      lists &&
      lists.length < initialSnapshot.lists.length &&
      (canLoadMore || isLoadingMore),
  );
  const dashboardLists =
    lists === undefined || isRestoringPaginatedSnapshot
      ? initialSnapshot?.lists
      : lists;
  const pendingRemovalList = dashboardLists?.find(
    (list) => list.id === pendingRemovalId,
  );
  const dashboardListCount = dashboardLists?.length ?? 0;
  const effectiveLayout = isSingleColumnLayout ? "list" : layout;

  useLayoutEffect(() => {
    const snapshot = initialSnapshotRef.current;
    if (!snapshot) return;

    window.scrollTo({ top: snapshot.scrollY });
    if (dashboardSnapshot === snapshot) dashboardSnapshot = null;
    initialSnapshotRef.current = null;
  }, []);

  useEffect(() => {
    if (
      !initialSnapshot ||
      !lists ||
      lists.length >= initialSnapshot.lists.length ||
      !canLoadMore
    ) {
      return;
    }

    loadMore();
  }, [canLoadMore, initialSnapshot, lists, loadMore]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !canLoadMore || typeof IntersectionObserver === "undefined") {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadMore();
      },
      { rootMargin: "360px 0px" },
    );
    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [canLoadMore, loadMore]);

  useEffect(() => {
    try {
      const storedPreferences = window.localStorage.getItem(DASHBOARD_PREFERENCES_KEY);

      if (storedPreferences) {
        const preferences = JSON.parse(storedPreferences) as {
          layout?: unknown;
          isCompact?: unknown;
        };

        if (preferences.layout === "cards" || preferences.layout === "list") {
          setLayout(preferences.layout);
        }
        if (typeof preferences.isCompact === "boolean") {
          setIsCompact(preferences.isCompact);
        }
      }
    } catch {
      // Keep the defaults when storage is unavailable or malformed.
    }

    setHasLoadedPreferences(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedPreferences) return;

    try {
      window.localStorage.setItem(
        DASHBOARD_PREFERENCES_KEY,
        JSON.stringify({ layout, isCompact }),
      );
    } catch {
      // The dashboard remains usable when storage is unavailable.
    }
  }, [hasLoadedPreferences, isCompact, layout]);

  useEffect(() => {
    const dialog = removeDialogRef.current;
    if (!dialog) return;

    if (pendingRemovalList && !dialog.open) {
      dialog.showModal();
      return;
    }

    if (!pendingRemovalList && dialog.open) {
      dialog.close();
    }
  }, [pendingRemovalList]);

  useLayoutEffect(() => {
    if (dashboardListCount === 0) {
      setIsSingleColumnLayout(false);
      return;
    }

    const grid = listGridRef.current;
    if (!grid) return;

    const measure = () => {
      setIsSingleColumnLayout(
        grid.getBoundingClientRect().width < MIN_TWO_CARD_LAYOUT_WIDTH,
      );
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(grid);

    return () => resizeObserver.disconnect();
  }, [dashboardListCount]);

  useLayoutEffect(() => {
    activityGenerationRef.current += 1;

    return () => {
      activityGenerationRef.current += 1;

      if (copyStatusTimeoutRef.current !== null) {
        window.clearTimeout(copyStatusTimeoutRef.current);
        copyStatusTimeoutRef.current = null;
      }
      if (copyImageStatusTimeoutRef.current !== null) {
        window.clearTimeout(copyImageStatusTimeoutRef.current);
        copyImageStatusTimeoutRef.current = null;
      }

      setIsCreating(false);
      setIsImporting(false);
      setIsRemoving(false);
      setPendingRemovalId(null);
      setExportingImageListId(null);
      setSharingListId(null);
      setCopiedListId(null);
      setCopiedImageListId(null);
      setMessage(null);
    };
  }, []);

  // biome-ignore lint/correctness/useExhaustiveDependencies: Re-measure after list content or layout changes.
  useEffect(() => {
    const grid = listGridRef.current;
    if (!grid || mobilePerformanceMode || isCompact || effectiveLayout === "list") {
      setHasWrappedCardSummary(false);
      return;
    }

    let isActive = true;
    const summaryTexts = Array.from(
      grid.querySelectorAll<HTMLElement>("[data-list-card-summary-text]"),
    );

    const getLineHeight = (element: HTMLElement) => {
      const styles = window.getComputedStyle(element);
      const lineHeight = Number.parseFloat(styles.lineHeight);

      if (Number.isFinite(lineHeight)) return lineHeight;

      return Number.parseFloat(styles.fontSize) * 1.2;
    };

    const measure = () => {
      const hasWrappedSummary = summaryTexts.some((element) => {
        const lineHeight = getLineHeight(element);
        return element.getBoundingClientRect().height > lineHeight * 1.45;
      });

      if (isActive) {
        setHasWrappedCardSummary(hasWrappedSummary);
      }
    };

    measure();

    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(grid);
    void document.fonts?.ready.then(measure);

    return () => {
      isActive = false;
      resizeObserver.disconnect();
    };
  }, [dashboardLists, effectiveLayout, isCompact, mobilePerformanceMode]);

  function rememberDashboardState(activeMorphListId: string) {
    if (!dashboardLists) return;

    dashboardSnapshot = {
      activeMorphListId,
      hasWrappedCardSummary,
      isCompact,
      layout,
      lists: dashboardLists,
      ownerEmail,
      scrollY: window.scrollY,
    };
  }

  function toggleCompact() {
    if (mobilePerformanceMode) {
      setIsCompact((current) => !current);
      return;
    }

    startTransition(() => {
      if (isCompact) addTransitionType("dashboard-preview-expand");
      setIsCompact((current) => !current);
    });
  }

  function changeLayout(nextLayout: DashboardLayout) {
    if (layout === nextLayout) return;

    if (mobilePerformanceMode) {
      setLayout(nextLayout);
      return;
    }

    startTransition(() => setLayout(nextLayout));
  }

  async function create() {
    const activityGeneration = activityGenerationRef.current;
    setIsCreating(true);
    try {
      const id = await createList("New tier list");
      if (activityGeneration !== activityGenerationRef.current) return;
      void navigate({
        to: "/lists/$id",
        params: { id },
        search: { mode: undefined },
        viewTransition: { types: ["nav-forward"] },
      });
    } finally {
      if (activityGeneration === activityGenerationRef.current) {
        setIsCreating(false);
      }
    }
  }

  async function remove() {
    if (!pendingRemovalId) return;

    const activityGeneration = activityGenerationRef.current;
    setIsRemoving(true);
    setMessage(null);
    try {
      await removeList(pendingRemovalId);
      if (activityGeneration === activityGenerationRef.current) {
        setPendingRemovalId(null);
      }
    } catch (error) {
      if (activityGeneration === activityGenerationRef.current) {
        setMessage(
          error instanceof Error ? error.message : "Could not remove that tier list.",
        );
        setPendingRemovalId(null);
      }
    } finally {
      if (activityGeneration === activityGenerationRef.current) {
        setIsRemoving(false);
      }
    }
  }

  async function share(id: string) {
    const activityGeneration = activityGenerationRef.current;
    setSharingListId(id);
    setCopiedListId(null);
    setMessage(null);
    if (copyStatusTimeoutRef.current !== null) {
      window.clearTimeout(copyStatusTimeoutRef.current);
      copyStatusTimeoutRef.current = null;
    }
    try {
      const url = await createShareLink(id);
      if (activityGeneration !== activityGenerationRef.current) return;
      await navigator.clipboard.writeText(url);
      if (activityGeneration !== activityGenerationRef.current) return;
      setCopiedListId(id);
      copyStatusTimeoutRef.current = window.setTimeout(() => {
        setCopiedListId(null);
        copyStatusTimeoutRef.current = null;
      }, 1800);
    } catch (error) {
      if (activityGeneration === activityGenerationRef.current) {
        setMessage(
          error instanceof Error ? error.message : "Could not share that tier list.",
        );
      }
    } finally {
      if (activityGeneration === activityGenerationRef.current) {
        setSharingListId(null);
      }
    }
  }

  async function exportBackup() {
    const activityGeneration = activityGenerationRef.current;
    const backup = await exportData();
    if (activityGeneration !== activityGenerationRef.current) return;
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tier-list-maker-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(
      `Exported ${backup.lists.length} tier list${backup.lists.length === 1 ? "" : "s"}.`,
    );
  }

  async function exportImage(listId: string, action: "download" | "copy") {
    const list = dashboardLists?.find((candidate) => candidate.id === listId);
    if (!list) return;

    const activityGeneration = activityGenerationRef.current;
    setExportingImageListId(listId);
    setExportingImageAction(action);
    setCopiedImageListId(null);
    setMessage(null);
    if (copyImageStatusTimeoutRef.current !== null) {
      window.clearTimeout(copyImageStatusTimeoutRef.current);
      copyImageStatusTimeoutRef.current = null;
    }

    try {
      await waitForNextFrame();
      if (activityGeneration !== activityGenerationRef.current) return;
      if (!imageExportRef.current) return;

      const dataUrl = await renderTierListPng(imageExportRef.current);
      if (activityGeneration !== activityGenerationRef.current) return;

      if (action === "download") {
        downloadPng(dataUrl, `${list.title || "tier-list"}.png`);
        return;
      }

      await copyPngToClipboard(dataUrl);
      if (activityGeneration !== activityGenerationRef.current) return;
      setCopiedImageListId(listId);
      copyImageStatusTimeoutRef.current = window.setTimeout(() => {
        setCopiedImageListId(null);
        copyImageStatusTimeoutRef.current = null;
      }, 1800);
    } catch (error) {
      if (activityGeneration === activityGenerationRef.current) {
        setMessage(
          action === "copy"
            ? error instanceof Error
              ? error.message
              : "Could not copy that tier list image."
            : "Could not export that tier list as an image.",
        );
      }
    } finally {
      if (activityGeneration === activityGenerationRef.current) {
        setExportingImageListId(null);
        setExportingImageAction(null);
      }
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const activityGeneration = activityGenerationRef.current;
    setIsImporting(true);
    setMessage(null);
    try {
      const importedCount = await importData(await file.text());
      if (activityGeneration === activityGenerationRef.current) {
        setMessage(
          `Imported ${importedCount} tier list${importedCount === 1 ? "" : "s"}.`,
        );
      }
    } catch (error) {
      if (activityGeneration === activityGenerationRef.current) {
        setMessage(error instanceof Error ? error.message : "Could not import that file.");
      }
    } finally {
      if (activityGeneration === activityGenerationRef.current) {
        setIsImporting(false);
      }
    }
  }

  if (dashboardLists === undefined) {
    return (
      <DashboardSkeleton
        currentIsCompact={isCompact}
        currentLayout={layout}
        snapshot={loadingSnapshot}
      />
    );
  }

  return (
    <>
      {exportingImageListId ? (
        <div className="dashboard-export-stage" aria-hidden="true">
          {dashboardLists
            .filter((list) => list.id === exportingImageListId)
            .map((list) => (
              <TierListPreview
                exportRef={imageExportRef}
                isExporting
                items={list.items}
                key={list.id}
                description={list.description}
                tiers={list.tiers}
                title={list.title}
              />
            ))}
        </div>
      ) : null}
      <dialog
        aria-labelledby="remove-dialog-title"
        aria-describedby="remove-dialog-description"
        className="remove-dialog"
        onCancel={(event) => {
          if (isRemoving) {
            event.preventDefault();
          }
        }}
        onClick={(event) => {
          if (event.target === event.currentTarget && !isRemoving) {
            removeDialogRef.current?.close();
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape" && !isRemoving) {
            removeDialogRef.current?.close();
          }
        }}
        onClose={() => setPendingRemovalId(null)}
        ref={removeDialogRef}
      >
        <div className="remove-dialog-card">
          <div className="remove-dialog-body">
            <span aria-hidden="true" className="remove-dialog-icon">
              <Trash2 size={22} />
            </span>
            <div>
              <h2 id="remove-dialog-title">Remove tier list?</h2>
              <p id="remove-dialog-description">
                <strong>{pendingRemovalList?.title}</strong>{" "}will be permanently removed.
                This can&apos;t be undone.
              </p>
            </div>
          </div>
          <div className="remove-dialog-actions">
            <button
              className="button"
              disabled={isRemoving}
              onClick={() => removeDialogRef.current?.close()}
              type="button"
            >
              Cancel
            </button>
            <button
              className="button danger"
              disabled={isRemoving}
              onClick={() => void remove()}
              type="button"
            >
              {isRemoving ? <Loader2 size={16} /> : <Trash2 size={16} />}
              {isRemoving ? "Removing" : "Remove list"}
            </button>
          </div>
        </div>
      </dialog>
      <section className="toolbar">
        <div>
          <h1 style={{ margin: 0 }}>Your tier lists</h1>
          <p className="muted">
            {syncMode === "cloud"
              ? `Cloud sync is on${ownerEmail ? ` for ${ownerEmail}` : ""}.`
              : "Local mode: lists are saved in this browser."}
          </p>
        </div>
        <div className="nav-actions">
          <button
            className="button primary"
            disabled={isCreating}
            onClick={create}
            type="button"
          >
            <FilePlus2 size={16} /> {isCreating ? "Creating" : "New list"}
          </button>
          <button className="button" onClick={() => void exportBackup()} type="button">
            <Download size={16} /> Export data
          </button>
          <button
            className="button"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
            type="button"
          >
            {isImporting ? <Loader2 size={16} /> : <Upload size={16} />}
            {isImporting ? "Importing" : "Import data"}
          </button>
          <input
            ref={fileInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(event) => void importBackup(event)}
          />
        </div>
      </section>

      {isMigratingLocalData ? (
        <p className="backup-message">Moving local tier lists into cloud sync.</p>
      ) : null}
      {message ? <p className="backup-message">{message}</p> : null}

      {dashboardLists.length === 0 ? (
        <section className="panel panel-pad">
          <h2>No lists yet</h2>
          <p className="muted">
            {syncMode === "cloud"
              ? "Start with a blank board and access it from any device."
              : "Start with a blank board now; sign in later to move it into cloud sync."}
          </p>
          <button className="button primary" onClick={create} type="button">
            <FilePlus2 size={16} /> Create your first list
          </button>
        </section>
      ) : (
        <>
          <div className="dashboard-layout-controls">
            {isSingleColumnLayout ? null : (
              <fieldset aria-label="Dashboard layout" className="layout-switcher">
                <button
                  aria-pressed={layout === "cards"}
                  className="button layout-button"
                  onClick={() => changeLayout("cards")}
                  type="button"
                >
                  <LayoutGrid size={16} /> Cards
                </button>
                <button
                  aria-pressed={layout === "list"}
                  className="button layout-button"
                  onClick={() => changeLayout("list")}
                  type="button"
                >
                  <List size={16} /> List
                </button>
              </fieldset>
            )}
            <button
              aria-pressed={isCompact}
              className="button compact-button"
              onClick={toggleCompact}
              type="button"
            >
              <Minimize2 size={16} /> Compact
            </button>
          </div>
          <section
            className={[
              "grid",
              effectiveLayout === "list" ? "is-list-layout" : "is-card-layout",
              isCompact ? "is-compact" : "",
              hasWrappedCardSummary ? "has-wrapped-card-summary" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            ref={listGridRef}
          >
            {dashboardLists.map((list) => {
              const description = list.description.trim();
              const unplacedItems = list.items.filter((item) => !item.tierId);

              return (
                <ViewTransition
                  default="none"
                  enter="scale-in"
                  exit="scale-out"
                  key={list.id}
                  update="auto"
                >
                  <article className="list-card">
                    <Link
                      aria-label={`Open preview for ${list.title}`}
                      className="list-card-preview-link"
                      params={{ id: list.id }}
                      search={{ mode: "preview" }}
                      state={(previous) => ({
                        ...previous,
                        dashboardCompactMode: isCompact,
                        dashboardMorphId: list.id,
                        dashboardMorphList: list,
                      })}
                      to="/lists/$id"
                      onClick={() => rememberDashboardState(list.id)}
                      viewTransition={
                        mobilePerformanceMode
                          ? false
                          : {
                              types: isCompact
                                ? ["compact-tier-list"]
                                : ["nav-forward", "dashboard-tier-list-exit"],
                            }
                      }
                    >
                      <span className="visually-hidden">Open preview</span>
                    </Link>
                    <p className="list-card-item-count">{list.items.length} items</p>
                    <div className="list-card-details list-card-summary">
                      <h2
                        className={[
                          "list-card-title",
                          list.title.trim().length > 20 ? "is-long" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        data-list-card-summary-text
                        title={list.title}
                      >
                        {list.title}
                      </h2>
                      {description ? (
                        <p
                          className="list-card-description"
                          data-list-card-summary-text
                          title={description}
                        >
                          {description}
                        </p>
                      ) : null}
                    </div>
                    <div
                      aria-hidden="true"
                      className="dashboard-tier-preview list-card-summary"
                      style={{
                        viewTransitionClass:
                          isCompact || mobilePerformanceMode
                            ? undefined
                            : [
                                "tier-list-morph",
                                "dashboard-preview-expand",
                                initialSnapshot?.activeMorphListId === list.id
                                  ? "tier-list-morph-return"
                                  : undefined,
                              ]
                                .filter(Boolean)
                                .join(" "),
                        viewTransitionName:
                          isCompact || mobilePerformanceMode
                            ? undefined
                            : `tier-list-${list.id}`,
                      }}
                    >
                      {list.tiers.map((tier) => (
                        <div className="dashboard-tier-preview-row" key={tier.id}>
                          <div
                            className="dashboard-tier-preview-label"
                            style={{ background: tier.color }}
                          >
                            {tier.name}
                          </div>
                          <div className="dashboard-tier-preview-items">
                            {list.items
                              .filter((item) => item.tierId === tier.id)
                              .map((item) => (
                                <div
                                  className="dashboard-tier-preview-item"
                                  key={item.id}
                                  title={item.label}
                                >
                                  {item.imageUrl ? (
                                    <img alt="" src={item.imageUrl} />
                                  ) : (
                                    item.label.slice(0, 1).toUpperCase()
                                  )}
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                      <div className="dashboard-tier-preview-tray">
                        {unplacedItems.map((item) => (
                          <div
                            className="dashboard-tier-preview-item"
                            key={item.id}
                            title={item.label}
                          >
                            {item.imageUrl ? (
                              <img alt="" src={item.imageUrl} />
                            ) : (
                              item.label.slice(0, 1).toUpperCase()
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="nav-actions" style={{ justifyContent: "flex-start" }}>
                      <Link
                        aria-label={`Edit ${list.title}`}
                        className="button icon"
                        params={{ id: list.id }}
                        search={{ mode: undefined }}
                        state={(previous) => ({
                          ...previous,
                          dashboardCompactMode: isCompact,
                          dashboardMorphId: list.id,
                          dashboardMorphList: list,
                        })}
                        title="Edit"
                        to="/lists/$id"
                        onClick={() => rememberDashboardState(list.id)}
                        viewTransition={
                          mobilePerformanceMode
                            ? false
                            : {
                                types: isCompact
                                  ? ["compact-tier-list"]
                                  : [
                                      "nav-forward",
                                      "dashboard-edit",
                                      "dashboard-tier-list-exit",
                                    ],
                              }
                        }
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        className="button icon danger"
                        aria-label={`Delete ${list.title}`}
                        onClick={() => setPendingRemovalId(list.id)}
                        title="Delete"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                      <button
                        className={`button icon share-button${copiedListId === list.id ? " is-copied" : ""}`}
                        aria-label={
                          copiedListId === list.id ? "Copied" : `Share ${list.title}`
                        }
                        data-tooltip="Copied"
                        disabled={sharingListId === list.id}
                        onClick={() => void share(list.id)}
                        title={copiedListId === list.id ? "Copied" : "Share"}
                        type="button"
                      >
                        {sharingListId === list.id ? (
                          <Loader2 size={16} />
                        ) : copiedListId === list.id ? (
                          <Check size={16} />
                        ) : (
                          <Share2 size={16} />
                        )}
                      </button>
                      <button
                        className="button icon"
                        aria-label={`Download ${list.title} as an image`}
                        disabled={exportingImageListId === list.id}
                        onClick={() => void exportImage(list.id, "download")}
                        title="Download image"
                        type="button"
                      >
                        {exportingImageListId === list.id &&
                        exportingImageAction === "download" ? (
                          <Loader2 size={16} />
                        ) : (
                          <Download size={16} />
                        )}
                      </button>
                      <button
                        className={`button icon share-button${copiedImageListId === list.id ? " is-copied" : ""}`}
                        aria-label={
                          copiedImageListId === list.id
                            ? "Copied image"
                            : `Copy ${list.title} image`
                        }
                        data-tooltip="Copied image"
                        disabled={exportingImageListId === list.id}
                        onClick={() => void exportImage(list.id, "copy")}
                        title={
                          copiedImageListId === list.id ? "Copied image" : "Copy image"
                        }
                        type="button"
                      >
                        {exportingImageListId === list.id &&
                        exportingImageAction === "copy" ? (
                          <Loader2 size={16} />
                        ) : copiedImageListId === list.id ? (
                          <Check size={16} />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </article>
                </ViewTransition>
              );
            })}
            <button
              className="new-list-card"
              disabled={isCreating}
              onClick={() => void create()}
              type="button"
            >
              <span className="new-list-card-icon" aria-hidden="true">
                {isCreating ? <Loader2 size={24} /> : <FilePlus2 size={24} />}
              </span>
              <span className="new-list-card-copy">
                <strong>{isCreating ? "Creating list" : "Create a new list"}</strong>
                <span>Start with a blank tier list</span>
              </span>
            </button>
          </section>
          {syncMode === "cloud" ? (
            <div
              aria-live="polite"
              className="dashboard-load-more"
              ref={loadMoreSentinelRef}
            >
              {isLoadingMore ? (
                <>
                  <Loader2 size={17} /> Loading more tier lists
                </>
              ) : canLoadMore ? (
                <button className="button ghost" onClick={loadMore} type="button">
                  Load more tier lists
                </button>
              ) : (
                "All tier lists loaded"
              )}
            </div>
          ) : null}
        </>
      )}
    </>
  );
}
