"use client";

import { useTierLists } from "@/lib/use-tier-lists";
import {
  copyPngToClipboard,
  downloadPng,
  renderTierListPng,
  waitForNextFrame,
} from "@/lib/image-export";
import {
  Check,
  Copy,
  Download,
  FilePlus2,
  Loader2,
  Pencil,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
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
  const listGridRef = useRef<HTMLElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [hasWrappedCardSummary, setHasWrappedCardSummary] = useState(false);
  const [exportingImageListId, setExportingImageListId] = useState<string | null>(
    null,
  );
  const [sharingListId, setSharingListId] = useState<string | null>(null);
  const [copiedListId, setCopiedListId] = useState<string | null>(null);
  const [copiedImageListId, setCopiedImageListId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const copyStatusTimeoutRef = useRef<number | null>(null);
  const copyImageStatusTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyStatusTimeoutRef.current !== null) {
        window.clearTimeout(copyStatusTimeoutRef.current);
      }
      if (copyImageStatusTimeoutRef.current !== null) {
        window.clearTimeout(copyImageStatusTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const grid = listGridRef.current;
    if (!grid) {
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
    for (const element of summaryTexts) {
      resizeObserver.observe(element);
    }

    void document.fonts?.ready.then(measure);

    return () => {
      isActive = false;
      resizeObserver.disconnect();
    };
  }, [lists]);

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

  async function exportImage(listId: string, action: "download" | "copy") {
    const list = lists?.find((candidate) => candidate.id === listId);
    if (!list) return;

    setExportingImageListId(listId);
    setCopiedImageListId(null);
    setMessage(null);
    if (copyImageStatusTimeoutRef.current !== null) {
      window.clearTimeout(copyImageStatusTimeoutRef.current);
      copyImageStatusTimeoutRef.current = null;
    }

    try {
      await waitForNextFrame();
      if (!imageExportRef.current) return;

      const dataUrl = await renderTierListPng(imageExportRef.current);

      if (action === "download") {
        downloadPng(dataUrl, `${list.title || "tier-list"}.png`);
        return;
      }

      await copyPngToClipboard(dataUrl);
      setCopiedImageListId(listId);
      copyImageStatusTimeoutRef.current = window.setTimeout(() => {
        setCopiedImageListId(null);
        copyImageStatusTimeoutRef.current = null;
      }, 1800);
    } catch (error) {
      setMessage(
        action === "copy"
          ? error instanceof Error
            ? error.message
            : "Could not copy that tier list image."
          : "Could not export that tier list as an image.",
      );
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
        <section
          className={["grid", hasWrappedCardSummary ? "has-wrapped-card-summary" : ""]
            .filter(Boolean)
            .join(" ")}
          ref={listGridRef}
        >
          {lists.map((list) => {
            const description = list.description.trim();

            return (
              <article className="list-card" key={list.id}>
                <Link
                  aria-label={`Open preview for ${list.title}`}
                  className="list-card-preview-link"
                  href={`/lists/${list.id}?mode=preview`}
                >
                  <span className="visually-hidden">Open preview</span>
                </Link>
                <p className="list-card-item-count">{list.items.length} items</p>
                <div className="list-card-details list-card-summary">
                  <h2
                    className="list-card-title"
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
                <div className="mini-bars list-card-summary" aria-hidden="true">
                  {list.tiers.slice(0, 5).map((tier) => (
                    <div
                      className="mini-bar"
                      key={tier.id}
                      style={{ background: tier.color }}
                    />
                  ))}
                </div>
                <div className="nav-actions" style={{ justifyContent: "flex-start" }}>
                  <Link
                    aria-label={`Edit ${list.title}`}
                    className="button icon"
                    href={`/lists/${list.id}`}
                    title="Edit"
                  >
                    <Pencil size={16} />
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
                    onClick={() => void exportImage(list.id, "download")}
                    title="Download image"
                    type="button"
                  >
                    {exportingImageListId === list.id ? (
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
                    {exportingImageListId === list.id ? (
                      <Loader2 size={16} />
                    ) : copiedImageListId === list.id ? (
                      <Check size={16} />
                    ) : (
                      <Copy size={16} />
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
