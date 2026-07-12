"use client";

import { useTierLists } from "@/lib/use-tier-lists";
import { FilePlus2, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function NewTierListClient() {
  const { lists, createList } = useTierLists();
  const router = useRouter();
  const hasStartedCreate = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error || lists === undefined || hasStartedCreate.current) return;

    hasStartedCreate.current = true;
    async function createAndOpenList() {
      try {
        const id = await createList("New tier list");
        router.replace(`/lists/${id}`, { transitionTypes: ["nav-forward"] });
      } catch {
        setError("Could not create a new tier list.");
        hasStartedCreate.current = false;
      }
    }

    void createAndOpenList();
  }, [createList, error, lists, router]);

  return (
    <section className="panel panel-pad">
      <h1 style={{ marginTop: 0 }}>New tier list</h1>
      <p className="muted">{error ?? "Creating a fresh board and opening the editor."}</p>
      {error ? (
        <button
          className="button primary"
          onClick={() => {
            setError(null);
            hasStartedCreate.current = false;
          }}
          type="button"
        >
          <FilePlus2 size={16} /> Try again
        </button>
      ) : (
        <span className="button ghost">
          <Loader2 size={16} /> Creating
        </span>
      )}
    </section>
  );
}
