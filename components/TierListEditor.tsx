"use client";

import { createId, Tier, TierItem } from "@/lib/tier-list";
import { useTierList } from "@/lib/use-tier-lists";
import { StoredTierList } from "@/lib/db";
import { toPng } from "html-to-image";
import { Check, Copy, Download, Loader2, Plus, Share2, Trash2 } from "lucide-react";
import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { TierListPreview } from "./TierListPreview";

export function TierListEditor({ id }: { id: string }) {
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
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [shareStatus, setShareStatus] = useState("Share");
  const [newTier, setNewTier] = useState("");
  const [topbarActionSlot, setTopbarActionSlot] = useState<HTMLElement | null>(
    null,
  );

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

  async function exportImage() {
    if (!exportRef.current) return;
    const dataUrl = await withSuppressedFetchWarnings(() =>
      toPng(exportRef.current!, {
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        imagePlaceholder: TRANSPARENT_IMAGE_PLACEHOLDER,
        onImageErrorHandler: () => undefined,
        filter: (node) =>
          !(node instanceof HTMLElement && node.dataset.exportExclude === "true"),
      }),
    );
    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `${title || "tier-list"}.png`;
    link.click();
  }

  async function shareList() {
    setShareStatus("Creating link");
    try {
      const url = shareUrl ?? (await createShareLink());
      await navigator.clipboard.writeText(url);
      setShareStatus("Copied");
      window.setTimeout(() => setShareStatus("Share"), 1800);
    } catch {
      setShareStatus("Could not copy");
      window.setTimeout(() => setShareStatus("Share"), 1800);
    }
  }

  function addItem() {
    setItems((current) => [
      ...current,
      {
        id: createId("item"),
        label: "",
      },
    ]);
  }

  function addTier() {
    const name = newTier.trim();
    if (!name) return;
    const colors = ["#61dafb", "#f78c6b", "#82d173", "#c792ea", "#ffcb6b"];
    setTiers((current) => [
      ...current,
      { id: createId("tier"), name, color: colors[current.length % colors.length] },
    ]);
    setNewTier("");
  }

  function dropItem(tierId?: string) {
    const itemId = draggedItemId.current;
    if (!itemId) return;
    setItems((current) =>
      current.map((item) => (item.id === itemId ? { ...item, tierId } : item)),
    );
    draggedItemId.current = null;
  }

  function updateTier(tierId: string, patch: Partial<Tier>) {
    setTiers((current) =>
      current.map((tier) => (tier.id === tierId ? { ...tier, ...patch } : tier)),
    );
  }

  function removeTier(tierId: string) {
    setTiers((current) => current.filter((tier) => tier.id !== tierId));
    setItems((current) =>
      current.map((item) =>
        item.tierId === tierId ? { ...item, tierId: undefined } : item,
      ),
    );
  }

  function removeItem(itemId: string) {
    setItems((current) => current.filter((item) => item.id !== itemId));
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
        <Link className="button" href="/dashboard">
          Back to dashboard
        </Link>
      </section>
    );
  }

  return (
    <>
      {topbarActionSlot
        ? createPortal(
            <>
              {syncMode === "cloud" ? (
                <button className="button" onClick={() => void shareList()}>
                  {shareUrl ? <Copy size={16} /> : <Share2 size={16} />}
                  {shareStatus}
                </button>
              ) : null}
              <button className="button dark" onClick={() => void exportImage()}>
                <Download size={16} /> Export PNG
              </button>
            </>,
            topbarActionSlot,
          )
        : null}
      <div className="split">
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
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
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
            {items.map((item) => (
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
                  <button className="button icon" onClick={() => removeItem(item.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="button" onClick={addItem}>
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
                  onChange={(event) => updateTier(tier.id, { name: event.target.value })}
                />
                <input
                  aria-label={`${tier.name} color`}
                  type="color"
                  value={tier.color}
                  onChange={(event) => updateTier(tier.id, { color: event.target.value })}
                />
                <button className="button icon" onClick={() => removeTier(tier.id)}>
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
            <button className="button icon" onClick={addTier}>
              <Plus size={16} />
            </button>
          </div>
        </div>

        </aside>

        <div className="preview-column">
          <TierListPreview
            draggable
            exportRef={exportRef}
            items={items}
            onDragStart={(itemId) => {
              draggedItemId.current = itemId;
            }}
            onDropItem={dropItem}
            description={description}
            tiers={tiers}
            title={title}
          />
          <p className="muted">
            Drag items into rows; every edit is saved automatically
            {syncMode === "cloud" ? " to cloud sync." : " in this browser."}
          </p>
        </div>
      </div>
    </>
  );
}

const TRANSPARENT_IMAGE_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

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

async function withSuppressedFetchWarnings<T>(callback: () => Promise<T>) {
  const originalWarn = console.warn;

  console.warn = (...args) => {
    const [message] = args;
    if (
      typeof message === "string" &&
      (message.startsWith("Failed to fetch resource:") ||
        message === "Failed to fetch")
    ) {
      return;
    }

    originalWarn(...args);
  };

  try {
    return await callback();
  } finally {
    console.warn = originalWarn;
  }
}
