"use client";

import { createId, moveItem, sortItemsByTier, Tier, TierItem } from "@/lib/tier-list";
import { useTierList } from "@/lib/use-tier-lists";
import { StoredTierList } from "@/lib/db";
import { copyPngToClipboard, downloadPng, renderTierListPng } from "@/lib/image-export";
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
import Link from "next/link";
import { createPortal } from "react-dom";
import {
  addTransitionType,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  ViewTransition,
} from "react";
import { TierListPreview } from "./TierListPreview";

export function TierListEditor({
  id,
  previewMode = false,
}: {
  id: string;
  previewMode?: boolean;
}) {
  const { list, syncMode, shareUrl, saveList, createShareLink } = useTierList(id);
  const exportRef = useRef<HTMLDivElement>(null);
  const draggedItemId = useRef<string | null>(null);
  const hydratedListId = useRef<string | null>(null);
  const lastSavedSnapshot = useRef("");
  const skipAutosave = useRef(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [items, setItems] = useState<TierItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(previewMode);
  const [routeMorphName, setRouteMorphName] = useState<string | undefined>(
    previewMode ? `tier-list-${id}` : undefined,
  );
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [shareStatus, setShareStatus] = useState("Copy link");
  const [copyImageStatus, setCopyImageStatus] = useState("Copy image");
  const [newTier, setNewTier] = useState("");
  const [topbarActionSlot, setTopbarActionSlot] = useState<HTMLElement | null>(null);
  const sortedItems = useMemo(() => sortItemsByTier(items, tiers), [items, tiers]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
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
      tiers: list.tiers,
      items: list.items,
    });
    skipAutosave.current = true;
    setTitle(list.title);
    setDescription(list.description ?? "");
    setTiers(list.tiers);
    setItems(list.items);
    setSaveStatus(syncMode === "cloud" ? "Saved to cloud" : "Saved locally");
  }, [list, syncMode]);

  useEffect(() => {
    if (!list) return;

    const snapshot = createSnapshot({ title, description, tiers, items });
    if (snapshot === lastSavedSnapshot.current) return;

    if (skipAutosave.current) {
      skipAutosave.current = false;
      return;
    }

    setSaveStatus("Unsaved changes");
    const timeoutId = window.setTimeout(async () => {
      setIsSaving(true);
      setSaveStatus("Saving");
      try {
        await saveList({ title, description, tiers, items });
        lastSavedSnapshot.current = snapshot;
        setSaveStatus(syncMode === "cloud" ? "Saved to cloud" : "Saved locally");
      } finally {
        setIsSaving(false);
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [description, items, list, saveList, syncMode, tiers, title]);

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

  function changeMode(nextPreviewMode: boolean) {
    const applyMode = () => {
      startTransition(() => {
        addTransitionType("mode-change");
        setIsPreviewMode(nextPreviewMode);
      });

      window.history.replaceState(
        window.history.state,
        "",
        nextPreviewMode ? `/lists/${id}?mode=preview` : `/lists/${id}`,
      );
    };

    if (routeMorphName) {
      setRouteMorphName(undefined);
      window.requestAnimationFrame(applyMode);
      return;
    }

    applyMode();
  }

  function addItem() {
    startTransition(() => {
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
    startTransition(() => {
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
    startTransition(() => {
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
    startTransition(() => {
      setTiers((current) => current.filter((tier) => tier.id !== tierId));
      setItems((current) =>
        current.map((item) =>
          item.tierId === tierId ? { ...item, tierId: undefined } : item,
        ),
      );
    });
  }

  function removeItem(itemId: string) {
    startTransition(() => {
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
        <Link className="button" href="/dashboard" transitionTypes={["nav-back"]}>
          Back to dashboard
        </Link>
      </section>
    );
  }

  const previewTitle = hydratedListId.current === list.id ? title : list.title;
  const previewDescription =
    hydratedListId.current === list.id ? description : (list.description ?? "");
  const previewTiers = hydratedListId.current === list.id ? tiers : list.tiers;
  const previewItems = hydratedListId.current === list.id ? items : list.items;

  return (
    <>
      {topbarActionSlot
        ? createPortal(
            <>
              {isPreviewMode ? (
                <button
                  className="button"
                  onClick={() => changeMode(false)}
                  type="button"
                >
                  <Pencil size={16} /> Edit
                </button>
              ) : (
                <button className="button" onClick={() => changeMode(true)} type="button">
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
            </>,
            topbarActionSlot,
          )
        : null}
      <div className={isPreviewMode ? "shared-view" : "split"}>
        {isPreviewMode ? null : (
          <aside className="panel panel-pad editor-controls">
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
            update={{ "mode-change": "mode-morph", default: "none" }}
          >
            <div className="tier-list-transition-frame">
              <TierListPreview
                draggable={!isPreviewMode}
                expandableHeader
                exportRef={exportRef}
                isExporting={isExporting}
                items={previewItems}
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
              Drag items into rows; every edit is saved automatically
              {syncMode === "cloud" ? " to cloud sync." : " in this browser."}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function createSnapshot(
  value: Pick<StoredTierList, "title" | "description" | "tiers" | "items">,
) {
  return JSON.stringify({
    title: value.title.trim() || "Untitled tier list",
    description: value.description.trim(),
    tiers: value.tiers,
    items: value.items,
  });
}
