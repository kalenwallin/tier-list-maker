"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Download,
  Eye,
  Loader2,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import {
  addTransitionType,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  ViewTransition,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { StoredTierList } from "@/lib/db";
import { copyPngToClipboard, downloadPng, renderTierListPng } from "@/lib/image-export";
import {
  createId,
  DEFAULT_ITEM_IMAGE_ASPECT_RATIO,
  ITEM_IMAGE_ASPECT_RATIO_OPTIONS,
  ItemImageAspectRatio,
  moveItem,
  sortItemsByTier,
  Tier,
  TierItem,
} from "@/lib/tier-list";
import { useMobilePerformanceMode } from "@/lib/use-mobile-performance-mode";
import { useTierList } from "@/lib/use-tier-lists";
import { TierListPreview } from "./TierListPreview";

export function TierListEditor({
  compactDashboardTransition = false,
  id,
  initialList,
  morphOnMount = false,
  previewMode = false,
}: {
  compactDashboardTransition?: boolean;
  id: string;
  initialList?: StoredTierList;
  morphOnMount?: boolean;
  previewMode?: boolean;
}) {
  const {
    list: queriedList,
    syncMode,
    shareUrl,
    saveList,
    removeList,
    createShareLink,
  } = useTierList(id);
  const list = queriedList === undefined ? initialList : queriedList;
  const mobilePerformanceMode = useMobilePerformanceMode();
  const navigate = useNavigate();
  const exportRef = useRef<HTMLDivElement>(null);
  const removeDialogRef = useRef<HTMLDialogElement>(null);
  const modeTransitionFrameRef = useRef<HTMLDivElement>(null);
  const draggedItemId = useRef<string | null>(null);
  const hydratedListId = useRef<string | null>(initialList?.id ?? null);
  const lastSavedSnapshot = useRef(initialList ? createSnapshot(initialList) : "");
  const skipAutosave = useRef(initialList === undefined);
  const isRemovingRef = useRef(false);

  const [title, setTitle] = useState(initialList?.title ?? "");
  const [description, setDescription] = useState(initialList?.description ?? "");
  const [itemImageAspectRatio, setItemImageAspectRatio] =
    useState<ItemImageAspectRatio>(
      initialList?.itemImageAspectRatio ?? DEFAULT_ITEM_IMAGE_ASPECT_RATIO,
    );
  const [tiers, setTiers] = useState<Tier[]>(initialList?.tiers ?? []);
  const [items, setItems] = useState<TierItem[]>(initialList?.items ?? []);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isNavigatingToDashboard, setIsNavigatingToDashboard] = useState(false);
  const [removeError, setRemoveError] = useState<string | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(previewMode);
  const [keepEmptyTrayDuringModeChange, setKeepEmptyTrayDuringModeChange] =
    useState(false);
  const [routeMorphName, setRouteMorphName] = useState<string | undefined>(
    !mobilePerformanceMode && !compactDashboardTransition && (previewMode || morphOnMount)
      ? `tier-list-${id}`
      : undefined,
  );
  const [saveStatus, setSaveStatus] = useState(
    initialList ? (syncMode === "cloud" ? "Saved to cloud" : "Saved locally") : "Saved",
  );
  const [shareStatus, setShareStatus] = useState("Copy link");
  const [copyImageStatus, setCopyImageStatus] = useState("Copy image");
  const [newTier, setNewTier] = useState("");
  const [topbarLeadingActionSlot, setTopbarLeadingActionSlot] =
    useState<HTMLElement | null>(null);
  const [topbarActionSlot, setTopbarActionSlot] = useState<HTMLElement | null>(null);
  const sortedItems = useMemo(() => sortItemsByTier(items, tiers), [items, tiers]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTopbarLeadingActionSlot(document.getElementById("topbar-leading-action-slot"));
    setTopbarActionSlot(document.getElementById("topbar-action-slot"));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!list) return;
    if (hydratedListId.current === list.id) return;

    // The stored document seeds an editable draft once; later edits autosave.
    hydratedListId.current = list.id;
    lastSavedSnapshot.current = createSnapshot({
      title: list.title,
      description: list.description ?? "",
      itemImageAspectRatio: list.itemImageAspectRatio,
      tiers: list.tiers,
      items: list.items,
    });
    skipAutosave.current = true;
    setTitle(list.title);
    setDescription(list.description ?? "");
    setItemImageAspectRatio(list.itemImageAspectRatio);
    setTiers(list.tiers);
    setItems(list.items);
    setSaveStatus(syncMode === "cloud" ? "Saved to cloud" : "Saved locally");
  }, [list, syncMode]);

  useEffect(() => {
    if (!list || isRemoving) return;

    const snapshot = createSnapshot({
      title,
      description,
      itemImageAspectRatio,
      tiers,
      items,
    });
    if (snapshot === lastSavedSnapshot.current) return;

    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }

    setSaveStatus("Unsaved changes");
    const timeoutId = window.setTimeout(async () => {
      if (isRemovingRef.current) return;
      setIsSaving(true);
      setSaveStatus("Saving");
      try {
        await saveList({ title, description, itemImageAspectRatio, tiers, items });
        lastSavedSnapshot.current = snapshot;
        setSaveStatus(syncMode === "cloud" ? "Saved to cloud" : "Saved locally");
      } finally {
        setIsSaving(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [
    description,
    isRemoving,
    itemImageAspectRatio,
    items,
    list,
    saveList,
    syncMode,
    tiers,
    title,
  ]);

  useEffect(() => {
    if (!routeMorphName) return;

    const timeoutId = window.setTimeout(() => setRouteMorphName(undefined), 450);
    return () => window.clearTimeout(timeoutId);
  }, [routeMorphName]);

  async function exportImage() {
    if (!exportRef.current) return;
    setIsExporting(true);

    try {
      const dataUrl = await renderTierListPng(exportRef.current);
      downloadPng(dataUrl, `${title || "tier-list"}.png`);
    } finally {
      setIsExporting(false);
    }
  }

  async function copyImage() {
    if (!exportRef.current) return;
    setIsExporting(true);
    setCopyImageStatus("Copying");

    try {
      const dataUrl = await renderTierListPng(exportRef.current);
      await copyPngToClipboard(dataUrl);
      setCopyImageStatus("Copied");
    } catch {
      setCopyImageStatus("Copy failed");
    } finally {
      setIsExporting(false);
      window.setTimeout(() => setCopyImageStatus("Copy image"), 1800);
    }
  }

  async function shareList() {
    setShareStatus("Creating link");
    try {
      const url = shareUrl ?? (await createShareLink());
      await navigator.clipboard.writeText(url);
      setShareStatus("Copied");
      window.setTimeout(() => setShareStatus("Copy link"), 1800);
    } catch {
      setShareStatus("Could not copy");
      window.setTimeout(() => setShareStatus("Copy link"), 1800);
    }
  }

  async function removeTierList() {
    isRemovingRef.current = true;
    setIsRemoving(true);
    setRemoveError(null);

    try {
      await removeList();
      removeDialogRef.current?.close();
      if (!mobilePerformanceMode && !isPreviewMode) {
        flushSync(() => setIsNavigatingToDashboard(true));
      }
      void navigate({
        to: "/dashboard",
        viewTransition: mobilePerformanceMode
          ? false
          : {
              types: compactDashboardTransition
                ? ["compact-tier-list"]
                : isPreviewMode
                  ? ["nav-back"]
                  : ["nav-back", "dashboard-edit-return"],
            },
      });
    } catch (error) {
      isRemovingRef.current = false;
      setRemoveError(
        error instanceof Error ? error.message : "Could not remove this tier list.",
      );
      setIsRemoving(false);
    }
  }

  function changeMode(nextPreviewMode: boolean) {
    if (mobilePerformanceMode) {
      setRouteMorphName(undefined);
      setKeepEmptyTrayDuringModeChange(false);
      setIsPreviewMode(nextPreviewMode);
      updateModeUrl(nextPreviewMode);
      return;
    }

    const applyMode = () => {
      const trayIsEmpty = items.every((item) => item.tierId);
      if (trayIsEmpty) {
        flushSync(() => setKeepEmptyTrayDuringModeChange(true));
      }

      const frameHeight = modeTransitionFrameRef.current?.getBoundingClientRect().height;
      if (frameHeight) {
        document.documentElement.style.setProperty(
          "--mode-frame-height",
          `${frameHeight}px`,
        );
      }

      const trayHeight = modeTransitionFrameRef.current
        ?.querySelector<HTMLElement>(".item-tray-pad")
        ?.getBoundingClientRect().height;
      if (trayIsEmpty && trayHeight) {
        document.documentElement.style.setProperty(
          "--mode-empty-tray-height",
          `${trayHeight}px`,
        );
      }

      startTransition(() => {
        addTransitionType("mode-change");
        if (trayIsEmpty) {
          addTransitionType(nextPreviewMode ? "mode-to-preview" : "mode-to-edit");
        }
        setIsPreviewMode(nextPreviewMode);
      });

      updateModeUrl(nextPreviewMode);
    };

    if (routeMorphName) {
      setRouteMorphName(undefined);
      window.requestAnimationFrame(applyMode);
      return;
    }

    applyMode();
  }

  async function saveDraftBeforeNavigation() {
    const snapshot = createSnapshot({
      title,
      description,
      itemImageAspectRatio,
      tiers,
      items,
    });
    if (snapshot === lastSavedSnapshot.current) return true;

    setIsSaving(true);
    setSaveStatus("Saving");
    try {
      await saveList({ title, description, itemImageAspectRatio, tiers, items });
      lastSavedSnapshot.current = snapshot;
      setSaveStatus(syncMode === "cloud" ? "Saved to cloud" : "Saved locally");
      return true;
    } catch {
      setSaveStatus("Could not save");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function navigateToDashboard() {
    if (!(await saveDraftBeforeNavigation())) return;

    if (!mobilePerformanceMode) {
      flushSync(() => {
        setRouteMorphName(compactDashboardTransition ? undefined : `tier-list-${id}`);
        if (!isPreviewMode) setIsNavigatingToDashboard(true);
      });
    }

    void navigate({
      to: "/dashboard",
      viewTransition: mobilePerformanceMode
        ? false
        : {
            types: compactDashboardTransition
              ? ["compact-tier-list"]
              : isPreviewMode
                ? ["nav-back"]
                : ["nav-back", "dashboard-edit-return"],
          },
    });
  }

  function updateModeUrl(nextPreviewMode: boolean) {
    window.history.replaceState(
      window.history.state,
      "",
      nextPreviewMode ? `/lists/${id}?mode=preview` : `/lists/${id}`,
    );
  }

  function updateWithOptionalTransition(update: () => void) {
    if (mobilePerformanceMode) {
      update();
      return;
    }

    startTransition(update);
  }

  function addItem() {
    updateWithOptionalTransition(() => {
      setItems((current) => [
        ...current,
        {
          id: createId("item"),
          label: "",
        },
      ]);
    });
  }

  function addTier() {
    const name = newTier.trim();
    if (!name) return;
    const colors = ["#61dafb", "#f78c6b", "#82d173", "#c792ea", "#ffcb6b"];
    updateWithOptionalTransition(() => {
      setTiers((current) => [
        ...current,
        {
          id: createId("tier"),
          name,
          color: colors[current.length % colors.length],
        },
      ]);
    });
    setNewTier("");
  }

  function dropItem(
    tierId?: string,
    targetItemId?: string,
    placement?: "before" | "after",
  ) {
    const itemId = draggedItemId.current;
    if (!itemId) return;
    updateWithOptionalTransition(() => {
      setItems((current) => moveItem(current, itemId, tierId, targetItemId, placement));
    });
    draggedItemId.current = null;
  }

  function updateTier(tierId: string, patch: Partial<Tier>) {
    setTiers((current) =>
      current.map((tier) => (tier.id === tierId ? { ...tier, ...patch } : tier)),
    );
  }

  function removeTier(tierId: string) {
    updateWithOptionalTransition(() => {
      setTiers((current) => current.filter((tier) => tier.id !== tierId));
      setItems((current) =>
        current.map((item) =>
          item.tierId === tierId ? { ...item, tierId: undefined } : item,
        ),
      );
    });
  }

  function removeItem(itemId: string) {
    updateWithOptionalTransition(() => {
      setItems((current) => current.filter((item) => item.id !== itemId));
    });
  }

  if (list === undefined) {
    return (
      <section className="panel panel-pad">
        <Loader2 size={18} /> Loading editor
      </section>
    );
  }

  if (list === null) {
    return (
      <section className="panel panel-pad">
        <h1>Tier list not found</h1>
        <Link
          className="button"
          to="/dashboard"
          viewTransition={mobilePerformanceMode ? false : { types: ["nav-back"] }}
        >
          Back to dashboard
        </Link>
      </section>
    );
  }

  const previewTitle = hydratedListId.current === list.id ? title : list.title;
  const previewDescription =
    hydratedListId.current === list.id ? description : (list.description ?? "");
  const previewItemImageAspectRatio =
    hydratedListId.current === list.id
      ? itemImageAspectRatio
      : list.itemImageAspectRatio;
  const previewTiers = hydratedListId.current === list.id ? tiers : list.tiers;
  const previewItems = hydratedListId.current === list.id ? items : list.items;

  return (
    <>
      <dialog
        aria-describedby="remove-detail-dialog-description"
        aria-labelledby="remove-detail-dialog-title"
        className="remove-dialog"
        onCancel={(event) => {
          if (isRemoving) event.preventDefault();
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
        onClose={() => setRemoveError(null)}
        ref={removeDialogRef}
      >
        <div className="remove-dialog-card">
          <div className="remove-dialog-body">
            <span aria-hidden="true" className="remove-dialog-icon">
              <Trash2 size={22} />
            </span>
            <div>
              <h2 id="remove-detail-dialog-title">Remove tier list?</h2>
              <p id="remove-detail-dialog-description">
                <strong>{title.trim() || list.title}</strong>{" "}will be permanently
                removed. This can&apos;t be undone.
              </p>
              {removeError ? (
                <p aria-live="polite" className="remove-dialog-error" role="status">
                  {removeError}
                </p>
              ) : null}
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
              disabled={isRemoving || isSaving}
              onClick={() => void removeTierList()}
              type="button"
            >
              {isRemoving ? <Loader2 size={16} /> : <Trash2 size={16} />}
              {isRemoving ? "Removing" : isSaving ? "Saving changes" : "Remove list"}
            </button>
          </div>
        </div>
      </dialog>
      {topbarLeadingActionSlot
        ? createPortal(
            <button className="button" onClick={navigateToDashboard} type="button">
              Dashboard
            </button>,
            topbarLeadingActionSlot,
          )
        : null}
      {topbarActionSlot
        ? createPortal(
            <>
              {isPreviewMode ? (
                <button
                  className="button mode-toggle-button"
                  onClick={() => changeMode(false)}
                  type="button"
                >
                  <Pencil size={16} /> Edit
                </button>
              ) : (
                <button
                  className="button mode-toggle-button"
                  onClick={() => changeMode(true)}
                  type="button"
                >
                  <Eye size={16} /> Preview
                </button>
              )}
              {syncMode === "cloud" ? (
                <button className="button" onClick={() => void shareList()} type="button">
                  {shareStatus === "Copied" ? (
                    <Check size={16} />
                  ) : shareUrl ? (
                    <Copy size={16} />
                  ) : (
                    <Share2 size={16} />
                  )}
                  {shareStatus}
                </button>
              ) : null}
              <button
                className="button dark"
                disabled={isExporting}
                onClick={() => void exportImage()}
                type="button"
              >
                <Download size={16} /> Export PNG
              </button>
              <button
                className="button"
                disabled={isExporting}
                onClick={() => void copyImage()}
                type="button"
              >
                {copyImageStatus === "Copying" ? (
                  <Loader2 size={16} />
                ) : copyImageStatus === "Copied" ? (
                  <Check size={16} />
                ) : (
                  <Copy size={16} />
                )}
                {copyImageStatus}
              </button>
              <button
                className="button danger"
                disabled={isRemoving}
                onClick={() => {
                  setRemoveError(null);
                  removeDialogRef.current?.showModal();
                }}
                type="button"
              >
                <Trash2 size={16} /> Remove
              </button>
            </>,
            topbarActionSlot,
          )
        : null}
      <div className={isPreviewMode ? "shared-view" : "split"}>
        {isPreviewMode ? null : (
          <aside
            className="panel panel-pad editor-controls"
            style={{
              viewTransitionName: isNavigatingToDashboard
                ? "edit-sidebar-return"
                : undefined,
            }}
          >
            <div className="toolbar">
              <h1 style={{ margin: 0 }}>Edit</h1>
              <span className="save-status">
                {isSaving ? <Loader2 size={16} /> : <Check size={16} />}
                {saveStatus}
              </span>
            </div>

            <label className="form-row">
              <span className="label">Title</span>
              <input
                className="input"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="form-row">
              <span className="label">Description</span>
              <textarea
                className="textarea"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label className="form-row">
              <span className="label">Item image ratio</span>
              <select
                className="input"
                value={itemImageAspectRatio}
                onChange={(event) =>
                  setItemImageAspectRatio(event.target.value as ItemImageAspectRatio)
                }
              >
                {ITEM_IMAGE_ASPECT_RATIO_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="form-row">
              <span className="label">Items</span>
              <div className="small-list">
                {sortedItems.map((item) => (
                  <div className="item-edit-row" key={item.id}>
                    <input
                      className="input"
                      aria-label={`${item.label} label`}
                      placeholder="Item label"
                      value={item.label}
                      onChange={(event) =>
                        setItems((current) =>
                          current.map((candidate) =>
                            candidate.id === item.id
                              ? { ...candidate, label: event.target.value }
                              : candidate,
                          ),
                        )
                      }
                    />
                    <div className="inline-row">
                      <input
                        className="input"
                        aria-label={`${item.label} image URL`}
                        placeholder="Image URL"
                        value={item.imageUrl ?? ""}
                        onChange={(event) =>
                          setItems((current) =>
                            current.map((candidate) =>
                              candidate.id === item.id
                                ? {
                                    ...candidate,
                                    imageUrl: event.target.value.trim() || undefined,
                                  }
                                : candidate,
                            ),
                          )
                        }
                      />
                      <button
                        className="button icon"
                        onClick={() => removeItem(item.id)}
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button className="button" onClick={addItem} type="button">
                <Plus size={16} /> Add item
              </button>
            </div>

            <div className="form-row">
              <span className="label">Tiers</span>
              <div className="small-list">
                {tiers.map((tier) => (
                  <div className="inline-row" key={tier.id}>
                    <input
                      className="input"
                      value={tier.name}
                      onChange={(event) =>
                        updateTier(tier.id, { name: event.target.value })
                      }
                    />
                    <input
                      aria-label={`${tier.name} color`}
                      type="color"
                      value={tier.color}
                      onChange={(event) =>
                        updateTier(tier.id, { color: event.target.value })
                      }
                    />
                    <button
                      className="button icon"
                      onClick={() => removeTier(tier.id)}
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
              <div className="inline-row">
                <input
                  className="input"
                  placeholder="New tier"
                  value={newTier}
                  onChange={(event) => setNewTier(event.target.value)}
                />
                <button className="button icon" onClick={addTier} type="button">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </aside>
        )}

        <div className="preview-column" key="tier-list-preview">
          <ViewTransition
            default="none"
            onUpdate={(_, types) => {
              if (!types.includes("mode-change")) return;
              return () => setKeepEmptyTrayDuringModeChange(false);
            }}
            update={{ "mode-change": "mode-frame-morph", default: "none" }}
          >
            <div className="tier-list-transition-frame" ref={modeTransitionFrameRef}>
              <TierListPreview
                draggable={!isPreviewMode}
                expandableHeader
                exportRef={exportRef}
                isExporting={isExporting}
                itemImageAspectRatio={previewItemImageAspectRatio}
                items={previewItems}
                keepEmptyTray={keepEmptyTrayDuringModeChange}
                onDragStart={(itemId) => {
                  draggedItemId.current = itemId;
                }}
                onDropItem={isPreviewMode ? undefined : dropItem}
                description={previewDescription}
                tiers={previewTiers}
                title={previewTitle}
                viewTransitionName={routeMorphName}
              />
            </div>
          </ViewTransition>
          {isPreviewMode ? null : (
            <p className="muted">
              Drag items between rows and the item tray; every edit is saved automatically
              {syncMode === "cloud" ? " to cloud sync." : " in this browser."}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function createSnapshot(
  value: Pick<
    StoredTierList,
    "title" | "description" | "itemImageAspectRatio" | "tiers" | "items"
  >,
) {
  return JSON.stringify({
    title: value.title.trim() || "Untitled tier list",
    description: value.description.trim(),
    itemImageAspectRatio: value.itemImageAspectRatio,
    tiers: value.tiers,
    items: value.items,
  });
}
