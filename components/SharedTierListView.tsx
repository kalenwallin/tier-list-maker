"use client";

import { api } from "@/convex/_generated/api";
import { StoredTierList } from "@/lib/db";
import { useQuery } from "convex/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { TierListPreview } from "./TierListPreview";

export function SharedTierListView({ shareId }: { shareId: string }) {
  const list = useQuery(api.tierLists.getShared, { shareId }) as
    | StoredTierList
    | null
    | undefined;

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
