"use client";

import { Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { Check, Copy, Loader2, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api } from "@/convex/_generated/api";
import type { SharedTierList } from "@/lib/share-metadata";
import { getListUrl, getShareUrl } from "@/lib/site-url";
import { AppShell } from "./AppShell";
import { DirectionalTransition } from "./DirectionalTransition";
import { TierListPreview } from "./TierListPreview";

// A list is reachable from its share link or from its editor URL.
type SharedTierListSource =
  | { shareId: string; listId?: never }
  | { listId: string; shareId?: never };

type SharedTierListViewProps = SharedTierListSource & {
  initialList?: SharedTierList;
};

export function SharedTierListView({
  shareId,
  listId,
  initialList,
}: SharedTierListViewProps) {
  const [topbarLeadingActionSlot, setTopbarLeadingActionSlot] =
    useState<HTMLElement | null>(null);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const sharedList = useQuery(
    api.tierLists.getShared,
    shareId === undefined ? "skip" : { shareId },
  );
  const publicList = useQuery(
    api.tierLists.getPublic,
    listId === undefined ? "skip" : { id: listId },
  );
  const liveList = shareId === undefined ? publicList : sharedList;
  // Convex only answers over its WebSocket, which neither the server render nor
  // crawlers get, so fall back to the list the route loaded.
  const list = liveList === undefined ? initialList : liveList;
  const linkUrl = shareId === undefined ? getListUrl(listId) : getShareUrl(shareId);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setTopbarLeadingActionSlot(document.getElementById("topbar-leading-action-slot"));
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(linkUrl);
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
    return <SharedTierListNotFound />;
  }

  return (
    <div className="shared-view">
      {topbarLeadingActionSlot
        ? createPortal(
            <>
              {list.isOwner ? (
                <Link
                  className="button"
                  params={{ id: list._id }}
                  search={{ mode: undefined }}
                  to="/lists/$id"
                  viewTransition={{ types: ["nav-back"] }}
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
        itemImageAspectRatio={list.itemImageAspectRatio}
        items={list.items}
        tiers={list.tiers}
        title={list.title}
        viewTransitionName={`tier-list-${list._id}`}
      />
      <div className="nav-actions shared-actions">
        <Link
          className="button primary"
          to="/dashboard"
          viewTransition={{ types: ["nav-back"] }}
        >
          Make your own
        </Link>
      </div>
    </div>
  );
}

function SharedTierListNotFound() {
  return (
    <section className="panel panel-pad">
      <h1>Shared tier list not found</h1>
      <p className="muted">The link may have been removed or copied incorrectly.</p>
      <Link className="button" to="/">
        Make your own
      </Link>
    </section>
  );
}

export function SharedTierListNotFoundPage() {
  return (
    <DirectionalTransition>
      <AppShell hideSignOut>
        <SharedTierListNotFound />
      </AppShell>
    </DirectionalTransition>
  );
}
