"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { useQuery } from "convex/react";
import { Loader2, Pencil } from "lucide-react";
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
        <Link className="button" href="/">
          Make your own
        </Link>
      </section>
    );
  }

  return (
    <div className="shared-view">
      {canEdit && topbarLeadingActionSlot
        ? createPortal(
            <Link className="button" href={`/lists/${list._id}`}>
              <Pencil size={16} /> Edit
            </Link>,
            topbarLeadingActionSlot,
          )
        : null}
      <TierListPreview
        description={list.description}
        items={list.items}
        tiers={list.tiers}
        title={list.title}
      />
      <div className="nav-actions shared-actions">
        <Link className="button primary" href="/dashboard">
          Make your own
        </Link>
      </div>
    </div>
  );
}
