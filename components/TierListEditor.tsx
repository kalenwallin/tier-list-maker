"use client";

import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  Copy,
  Download,
  Eye,
  ImageDown,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Share2,
  Trash2,
} from "lucide-react";
import {
  addTransitionType,
  ClipboardEvent,
  startTransition,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  ViewTransition,
} from "react";
import { createPortal, flushSync } from "react-dom";
import { promoteDashboardSnapshotList } from "@/lib/dashboard-snapshot";
import { StoredTierList } from "@/lib/db";
import { copyPngToClipboard, downloadPng, renderTierListPng } from "@/lib/image-export";
import { dataUrlToBlob, labelFromFileName } from "@/lib/item-image-upload";
import { isDataImageUrl, isWebImageUrl, ITEM_IMAGE_ACCEPT } from "@/lib/item-images";
import {
  createId,
  DEFAULT_ITEM_IMAGE_ASPECT_RATIO,
  ITEM_IMAGE_ASPECT_RATIO_OPTIONS,
  ItemImageAspectRatio,
  moveItem,
  Tier,
  TierItem,
} from "@/lib/tier-list";
import { useMobilePerformanceMode } from "@/lib/use-mobile-performance-mode";
import { type ItemImageStatus, useItemImages } from "@/lib/use-item-images";
import type { UseTierListResult } from "@/lib/use-tier-lists";
import { useViewTransitionsEnabled } from "@/lib/view-transitions";
import {
  type ItemDetailEditor,
  ItemDetailDialog,
  ItemImageStatusMessage,
} from "./ItemDetailDialog";
import { TierListPreview } from "./TierListPreview";

export function TierListEditor({
  compactDashboardTransition = false,
  id,
  initialList,
  morphOnMount = false,
  previewMode = false,
  tierList,
}: {
  compactDashboardTransition?: boolean;
  id: string;
  initialList?: StoredTierList;
  morphOnMount?: boolean;
  previewMode?: boolean;
  tierList: UseTierListResult;
}) {
  const {
    list: queriedList,
    syncMode,
    shareUrl,
    saveList,
    removeList,
    createShareLink,
  } = tierList;
  const list = queriedList === undefined ? initialList : queriedList;
  const viewTransitionsEnabled = useViewTransitionsEnabled();
  const skipViewTransitions = useMobilePerformanceMode() || !viewTransitionsEnabled;
  const navigate = useNavigate();
  const exportRef = useRef<HTMLDivElement>(null);
  const removeDialogRef = useRef<HTMLDialogElement>(null);
  const modeTransitionFrameRef = useRef<HTMLDivElement>(null);
  const draggedItemId = useRef<string | null>(null);
  const hydratedListId = useRef<string | null>(initialList?.id ?? null);
  const lastSavedSnapshot = useRef(initialList ? createSnapshot(initialList) : "");
  const skipAutosave = useRef(initialList === undefined);
  const didSaveChanges = useRef(false);
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
    !skipViewTransitions && !compactDashboardTransition && (previewMode || morphOnMount)
      ? `tier-list-${id}`
      : undefined,
  );
  const [saveStatus, setSaveStatus] = useState(
    initialList ? (syncMode === "cloud" ? "Saved to cloud" : "Saved locally") : "Saved",
  );
  const [shareStatus, setShareStatus] = useState("Copy link");
  const [copyImageStatus, setCopyImageStatus] = useState("Copy image");
  const [newTier, setNewTier] = useState("");
  const [openItemId, setOpenItemId] = useState<string | null>(null);
  const [topbarLeadingActionSlot, setTopbarLeadingActionSlot] =
    useState<HTMLElement | null>(null);
  const [topbarActionSlot, setTopbarActionSlot] = useState<HTMLElement | null>(null);
  const itemImages = useItemImages(setItems, syncMode);
  const canAddImages = itemImages.canAddImages;
  const newItemImagesInputRef = useRef<HTMLInputElement>(null);
  const copyableImageItems = items.filter(
    (item): item is TierItem & { imageUrl: string } =>
      itemImages.canCopy(item.imageUrl) &&
      itemImages.statuses[item.id]?.state !== "copying",
  );
  const isCopyingImages = Object.values(itemImages.statuses).some(
    (status) => status.state === "copying",
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTopbarLeadingActionSlot(document.getElementById("topbar-leading-action-slot"));
    setTopbarActionSlot(document.getElementById("topbar-action-slot"));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // The kept tray props the page open until the transition ends. Settle the scroll
  // before the new snapshot, so removing the tray can't snap the page afterwards.
  useLayoutEffect(() => {
    if (!isPreviewMode || !keepEmptyTrayDuringModeChange) return;

    const trayHeight = modeTransitionFrameRef.current
      ?.querySelector<HTMLElement>(".item-tray-pad")
      ?.getBoundingClientRect().height;
    if (!trayHeight) return;

    const { clientHeight, scrollHeight } = document.documentElement;
    const settledMaxScroll = Math.max(0, scrollHeight - trayHeight - clientHeight);
    if (window.scrollY > settledMaxScroll) window.scrollTo(0, settledMaxScroll);
  }, [isPreviewMode, keepEmptyTrayDuringModeChange]);

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
        didSaveChanges.current = true;
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
      if (!skipViewTransitions && !isPreviewMode) {
        flushSync(() => setIsNavigatingToDashboard(true));
      }
      void navigate({
        to: "/dashboard",
        viewTransition: skipViewTransitions
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
    if (skipViewTransitions) {
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
      didSaveChanges.current = true;
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

    if (didSaveChanges.current) {
      promoteDashboardSnapshotList(id, {
        title,
        description,
        itemImageAspectRatio,
        tiers,
        items,
      });
    }

    if (!skipViewTransitions) {
      flushSync(() => {
        setRouteMorphName(compactDashboardTransition ? undefined : `tier-list-${id}`);
        if (!isPreviewMode) setIsNavigatingToDashboard(true);
      });
    }

    void navigate({
      to: "/dashboard",
      viewTransition: skipViewTransitions
        ? false
        : {
            types: compactDashboardTransition
              ? ["compact-tier-list"]
              : isPreviewMode
                ? ["nav-back", "dashboard-tier-list-return"]
                : ["nav-back", "dashboard-edit-return", "dashboard-tier-list-return"],
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
    if (skipViewTransitions) {
      update();
      return;
    }

    startTransition(update);
  }

  // A new item opens straight into its dialog to be named, which covers the
  // tile's entrance, so it's added without a transition.
  function addItem() {
    const item: TierItem = { id: createId("item"), label: "" };
    setItems((current) => [...current, item]);
    setOpenItemId(item.id);
  }

  function updateItem(
    itemId: string,
    patch: Partial<Pick<TierItem, "label" | "description">>,
  ) {
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    );
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
    itemImages.clearStatus(itemId);
    updateWithOptionalTransition(() => {
      setItems((current) => current.filter((item) => item.id !== itemId));
    });
  }

  function addItemsFromImages(files: File[]) {
    if (files.length === 0) return;

    const newItems = files.map((file) => ({
      id: createId("item"),
      label: labelFromFileName(file.name),
    }));
    updateWithOptionalTransition(() => {
      setItems((current) => [...current, ...newItems]);
    });
    void itemImages.uploadImages(
      newItems.map((item, index) => ({ itemId: item.id, file: files[index] })),
    );
  }

  function updateItemImageUrl(itemId: string, imageUrl: string | undefined) {
    itemImages.clearStatus(itemId);
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, imageUrl } : item)),
    );
  }

  // Pasted images upload, and pasted links are copied right away so the item
  // keeps its image if the original site moves or blocks it.
  function pasteItemImage(event: ClipboardEvent<HTMLInputElement>, itemId: string) {
    if (!canAddImages) return;

    const file = Array.from(event.clipboardData.files).find((candidate) =>
      candidate.type.startsWith("image/"),
    );
    if (file) {
      event.preventDefault();
      void itemImages.uploadImage(itemId, file);
      return;
    }

    const text = event.clipboardData.getData("text").trim();
    if (isDataImageUrl(text)) {
      // Inline images can be megabytes long, so they never touch the list.
      event.preventDefault();
      void itemImages.uploadImage(itemId, dataUrlToBlob(text));
      return;
    }

    if (isWebImageUrl(text) && itemImages.canCopy(text)) {
      event.preventDefault();
      updateItemImageUrl(itemId, text);
      void itemImages.copyImage(itemId, text);
    }
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
          viewTransition={skipViewTransitions ? false : { types: ["nav-back"] }}
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
  const openItem = openItemId
    ? previewItems.find((item) => item.id === openItemId)
    : undefined;
  const openItemEditor: ItemDetailEditor | undefined =
    openItem && !isPreviewMode
      ? {
          canAddImages,
          imageStatus: itemImages.statuses[openItem.id],
          onChange: (patch) => updateItem(openItem.id, patch),
          onImageUrlChange: (imageUrl) => updateItemImageUrl(openItem.id, imageUrl),
          onImagePaste: (event) => pasteItemImage(event, openItem.id),
          onImageUpload: (file) => void itemImages.uploadImage(openItem.id, file),
          onRemove: () => removeItem(openItem.id),
        }
      : undefined;

  return (
    <>
      <ItemDetailDialog
        editor={openItemEditor}
        item={openItem}
        itemImageAspectRatio={previewItemImageAspectRatio}
        onClose={() => setOpenItemId(null)}
        tier={previewTiers.find((tier) => tier.id === openItem?.tierId)}
      />
      <dialog
        aria-describedby="remove-detail-dialog-description"
        aria-labelledby="remove-detail-dialog-title"
        className={skipViewTransitions ? "remove-dialog" : "remove-dialog is-animated"}
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
              <p className="muted item-editor-hint">
                Click an item to edit its name, description, and image.
              </p>
              <div className="item-actions">
                <button className="button" onClick={addItem} type="button">
                  <Plus size={16} /> Add item
                </button>
                {canAddImages ? (
                  <button
                    className="button"
                    onClick={() => newItemImagesInputRef.current?.click()}
                    title="Add an item for each image you choose"
                    type="button"
                  >
                    <ImagePlus size={16} /> Add images
                  </button>
                ) : null}
                {canAddImages && (copyableImageItems.length > 0 || isCopyingImages) ? (
                  <button
                    className="button"
                    disabled={isCopyingImages}
                    onClick={() => void itemImages.copyImages(copyableImageItems)}
                    title="Keep copies of linked images so they don't break and always export"
                    type="button"
                  >
                    <ImageDown size={16} />
                    {isCopyingImages
                      ? "Saving linked images"
                      : `Save ${copyableImageItems.length} linked ${
                          copyableImageItems.length === 1 ? "image" : "images"
                        }`}
                  </button>
                ) : null}
              </div>
              <ItemImageStatusSummary
                items={items}
                onOpenItem={setOpenItemId}
                statuses={itemImages.statuses}
              />
              {syncMode === "local" ? (
                <p className="muted item-images-hint">
                  Images you add are kept in this browser.{" "}
                  <Link to="/sign-in">Sign in</Link> to sync them and keep copies of
                  linked images.
                </p>
              ) : null}
              <input
                accept={ITEM_IMAGE_ACCEPT}
                hidden
                multiple
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? []);
                  event.target.value = "";
                  addItemsFromImages(files);
                }}
                ref={newItemImagesInputRef}
                type="file"
              />
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
                onOpenItem={setOpenItemId}
                description={previewDescription}
                tiers={previewTiers}
                title={previewTitle}
                viewTransitionName={routeMorphName}
              />
            </div>
          </ViewTransition>
          {isPreviewMode ? null : (
            <p className="muted">
              Drag items between rows and the item tray, or click one to edit it; every
              edit is saved automatically
              {syncMode === "cloud" ? " to cloud sync." : " in this browser."}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

// Images added from the sidebar upload in the background, so their progress
// and any failures show here; each item's dialog has the details.
function ItemImageStatusSummary({
  items,
  onOpenItem,
  statuses,
}: {
  items: TierItem[];
  onOpenItem: (itemId: string) => void;
  statuses: Record<string, ItemImageStatus>;
}) {
  const addingCount = Object.values(statuses).filter(
    (status) => status.state === "uploading" || status.state === "saving",
  ).length;
  const failedItems = items.flatMap((item) => {
    const status = statuses[item.id];
    return status?.state === "error" ? [{ item, status }] : [];
  });

  if (addingCount === 0 && failedItems.length === 0) return null;

  return (
    <div className="item-image-status-summary">
      {addingCount > 0 ? (
        <ItemImageStatusMessage
          status={{ state: "uploading" }}
          text={`Adding ${addingCount} ${addingCount === 1 ? "image" : "images"}`}
        />
      ) : null}
      {failedItems.map(({ item, status }) => (
        <p className="item-image-status is-error" key={item.id} role="status">
          <span>
            <button
              className="text-button"
              onClick={() => onOpenItem(item.id)}
              type="button"
            >
              {item.label.trim() || "Untitled item"}
            </button>
            : {status.message}
          </span>
        </p>
      ))}
    </div>
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
