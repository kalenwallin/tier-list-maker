"use client";

import { useTierLists } from "@/lib/use-tier-lists";
import { Download, FilePlus2, Loader2, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChangeEvent, useRef, useState } from "react";

export function DashboardClient() {
  const { lists, createList, removeList, exportData, importData } =
    useTierLists();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
      <section className="toolbar">
        <div>
          <h1 style={{ margin: 0 }}>Your tier lists</h1>
          <p className="muted">Create, edit, back up, and restore boards stored in this browser.</p>
        </div>
        <div className="nav-actions">
          <button className="button primary" onClick={create} disabled={isCreating}>
            <FilePlus2 size={16} /> {isCreating ? "Creating" : "New list"}
          </button>
          <button className="button" onClick={() => void exportBackup()}>
            <Download size={16} /> Export data
          </button>
          <button
            className="button"
            disabled={isImporting}
            onClick={() => fileInputRef.current?.click()}
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

      {message ? <p className="backup-message">{message}</p> : null}

      {lists.length === 0 ? (
        <section className="panel panel-pad">
          <h2>No lists yet</h2>
          <p className="muted">Start with a blank board and save it locally.</p>
          <button className="button primary" onClick={create}>
            <FilePlus2 size={16} /> Create your first list
          </button>
        </section>
      ) : (
        <section className="grid">
          {lists.map((list) => {
            return (
              <article className="list-card" key={list.id}>
                <div>
                  <h2>{list.title}</h2>
                  <p className="muted">
                    Local draft · {list.items.length} items
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
                  <button className="button icon danger" onClick={() => void remove(list.id)}>
                    <Trash2 size={16} />
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
