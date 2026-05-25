"use client";

import { useTierLists } from "@/lib/use-tier-lists";
import { FilePlus2, Loader2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DashboardClient() {
  const { lists, createList, removeList } = useTierLists();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

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
          <p className="muted">Create, edit, and export boards stored in this browser.</p>
        </div>
        <button className="button primary" onClick={create} disabled={isCreating}>
          <FilePlus2 size={16} /> {isCreating ? "Creating" : "New list"}
        </button>
      </section>

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
