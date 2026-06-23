"use client";

import { useTierLists } from "@/lib/use-tier-lists";
import {
  Check,
  Download,
  FilePlus2,
  Loader2,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import { toPng } from "html-to-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { TierListPreview } from "./TierListPreview";

export function DashboardClient() {
  const {
    lists,
    ownerEmail,
    syncMode,
    isMigratingLocalData,
    createList,
    removeList,
    createShareLink,
    exportData,
    importData,
  } = useTierLists();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageExportRef = useRef<HTMLDivElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportingImageListId, setExportingImageListId] = useState<string | null>(
    null,
  );
  const [sharingListId, setSharingListId] = useState<string | null>(null);
  const [copiedListId, setCopiedListId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const copyStatusTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyStatusTimeoutRef.current !== null) {
        window.clearTimeout(copyStatusTimeoutRef.current);
      }
    };
  }, []);

  async function create() {
    setIsCreating(true);
    try {
      const id = await createList("New tier list");
      router.push(`/lists/${id}`);
    } finally {
      setIsCreating(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this tier list?")) return;
    await removeList(id);
  }

  async function share(id: string) {
    setSharingListId(id);
    setCopiedListId(null);
    setMessage(null);
    if (copyStatusTimeoutRef.current !== null) {
      window.clearTimeout(copyStatusTimeoutRef.current);
      copyStatusTimeoutRef.current = null;
    }
    try {
      const url = await createShareLink(id);
      await navigator.clipboard.writeText(url);
      setCopiedListId(id);
      copyStatusTimeoutRef.current = window.setTimeout(() => {
        setCopiedListId(null);
        copyStatusTimeoutRef.current = null;
      }, 1800);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not share that tier list.",
      );
    } finally {
      setSharingListId(null);
    }
  }

  async function exportBackup() {
    const backup = await exportData();
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tier-list-maker-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage(`Exported ${backup.lists.length} tier list${backup.lists.length === 1 ? "" : "s"}.`);
  }

  async function exportImage(listId: string) {
    const list = lists?.find((candidate) => candidate.id === listId);
    if (!list) return;

    setExportingImageListId(listId);
    setMessage(null);

    try {
      await nextFrame();
      if (!imageExportRef.current) return;

      const dataUrl = await withSuppressedFetchWarnings(() =>
        toPng(imageExportRef.current!, {
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
      link.download = `${list.title || "tier-list"}.png`;
      link.click();
    } catch {
      setMessage("Could not export that tier list as an image.");
    } finally {
      setExportingImageListId(null);
    }
  }

  async function importBackup(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsImporting(true);
    setMessage(null);
    try {
      const importedCount = await importData(await file.text());
      setMessage(
        `Imported ${importedCount} tier list${importedCount === 1 ? "" : "s"}.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not import that file.",
      );
    } finally {
      setIsImporting(false);
    }
  }

  if (lists === undefined) {
    return (
      <div className="panel panel-pad">
        <Loader2 size={18} /> Loading tier lists
      </div>
    );
  }

  return (
    <>
      {exportingImageListId ? (
        <div className="dashboard-export-stage" aria-hidden="true">
          {lists
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
          <button
            className="button"
            onClick={() => void exportBackup()}
            type="button"
          >
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

      {lists.length === 0 ? (
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
        <section className="grid">
          {lists.map((list) => {
            return (
              <article className="list-card" key={list.id}>
                <div>
                  <h2 className="list-card-title" title={list.title}>
                    {list.title}
                  </h2>
                  <p className="muted">
                    Saved draft · {list.items.length} items
                  </p>
                </div>
                <div className="mini-bars">
                  {list.tiers.slice(0, 5).map((tier) => (
                    <div
                      className="mini-bar"
                      key={tier.id}
                      style={{ background: tier.color }}
                    />
                  ))}
                </div>
                <div className="nav-actions" style={{ justifyContent: "flex-start" }}>
                  <Link className="button" href={`/lists/${list.id}`}>
                    Edit
                  </Link>
                  <button
                    className="button icon danger"
                    aria-label={`Delete ${list.title}`}
                    onClick={() => void remove(list.id)}
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
                    onClick={() => void exportImage(list.id)}
                    title="Download image"
                    type="button"
                  >
                    {exportingImageListId === list.id ? (
                      <Loader2 size={16} />
                    ) : (
                      <Download size={16} />
                    )}
                  </button>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </>
  );
}

const TRANSPARENT_IMAGE_PLACEHOLDER =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

function nextFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
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
