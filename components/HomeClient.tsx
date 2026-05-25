"use client";

import { Database, Download, FilePlus2 } from "lucide-react";
import Link from "next/link";
import { DEFAULT_TIERS, STARTER_ITEMS } from "@/lib/tier-list";
import { TierListPreview } from "./TierListPreview";

export function HomeClient() {
  return (
    <section className="hero-grid">
      <div className="hero-copy">
        <h1>Build a tier list.</h1>
        <p>
          Rank anything and export as an image to share with friends.
        </p>
        <div className="nav-actions" style={{ justifyContent: "flex-start" }}>
          <Link className="button primary" href="/dashboard">
            <FilePlus2 size={16} /> Open dashboard
          </Link>
          <span className="button ghost">
            <Database size={16} /> Local storage
          </span>
          <span className="button ghost">
            <Download size={16} /> PNG export
          </span>
        </div>
      </div>
      <TierListPreview
        items={STARTER_ITEMS.map((item, index) => ({
          ...item,
          tierId: index === 0 ? "s" : index === 1 ? "b" : undefined,
        }))}
        tiers={DEFAULT_TIERS}
        title="Sample tier list"
      />
    </section>
  );
}
