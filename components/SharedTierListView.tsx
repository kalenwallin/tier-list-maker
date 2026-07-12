"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { useQuery } from "convex/react";
import { Check, Copy, Loader2, Pencil } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import type { StoredTierList } from "@/lib/db";
import { TierListPreview } from "./TierListPreview";

type SharedTierList = StoredTierList & {
  _id: Id<"tierLists">;
};

export function SharedTierListView({ shareId }: { shareId: string }) {
  const { user, loading: authLoading } = useAuth();
  const [topbarLeadingActionSlot, setTopbarLeadingActionSlot] =
    useState<HTMLElement | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const list = useQuery(api.tierLists.getShared, { shareId }) as
    | SharedTierList
    | null
    | undefined;
  const ownerEmail = list?.ownerEmail?.trim().toLowerCase();
  const viewerEmail = user?.email?.trim().toLowerCase();
  const canEdit = !authLoading && Boolean(ownerEmail && viewerEmail === ownerEmail);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTopbarLeadingActionSlot(document.getElementById("topbar-leading-action-slot"));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function copyShareLink() {
    try {
      const url = `${window.location.origin}/share/${encodeURIComponent(shareId)}`;
      await navigator.clipboard.writeText(url);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }

    window.setTimeout(() => setCopyStatus("idle"), 1800);
  }

  if (list === undefined) {
    return (
      <section className="panel panel-pad">
        <Loader2 size={18} /> Loading shared tier list
      </section>
    );
  }

  if (list === null) {
    return (
      <section className="panel panel-pad">
        <h1>Shared tier list not found</h1>
        <p className="muted">The link may have been removed or copied incorrectly.</p>
        <Link className="button" href="/" transitionTypes={["nav-back"]}>
          Make your own
        </Link>
      </section>
    );
  }

  return (
    <div className="shared-view">
      {topbarLeadingActionSlot
        ? createPortal(
            <>
              {canEdit ? (
                <Link
                  className="button"
                  href={`/lists/${list._id}`}
                  transitionTypes={["nav-back"]}
                >
                  <Pencil size={16} /> Edit
                </Link>
              ) : null}
              <button
                className="button"
                onClick={() => void copyShareLink()}
                type="button"
              >
                {copyStatus === "copied" ? <Check size={16} /> : <Copy size={16} />}
                {copyStatus === "copied"
                  ? "Copied"
                  : copyStatus === "error"
                    ? "Could not copy"
                    : "Copy link"}
              </button>
            </>,
            topbarLeadingActionSlot,
          )
        : null}
      <TierListPreview
        description={list.description}
        items={list.items}
        tiers={list.tiers}
        title={list.title}
        viewTransitionName={`tier-list-${list._id}`}
      />
      <div className="nav-actions shared-actions">
        <Link className="button primary" href="/dashboard" transitionTypes={["nav-back"]}>
          Make your own
        </Link>
      </div>
    </div>
  );
}
