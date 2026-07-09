"use client";

import { useAuth } from "@workos-inc/authkit-nextjs/components";
import { Cloud, Download, FilePlus2, HardDrive, Loader2, Share2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTierLists } from "@/lib/use-tier-lists";
import { DEFAULT_TIERS, STARTER_ITEMS, type TierItem } from "@/lib/tier-list";
import { TierListPreview } from "./TierListPreview";

const SAMPLE_ITEMS: TierItem[] = [
  { ...STARTER_ITEMS[0], tierId: "s" },
  { id: "sample-preview-2", label: "Share with friends", tierId: "s" },
  { id: "sample-preview-3", label: "Weekend picks", tierId: "a" },
  { ...STARTER_ITEMS[1], tierId: "b" },
  { ...STARTER_ITEMS[2], tierId: "b" },
  { id: "sample-preview-6", label: "Maybe later", tierId: "c" },
  { id: "sample-preview-7", label: "Bold opinions", tierId: "d" },
  { id: "sample-preview-8", label: "Skip pile", tierId: "f" },
];

export function HomeClient() {
  const { user, loading } = useAuth();
  const { createList } = useTierLists();
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);

  async function getStarted() {
    if (user) {
      router.push("/dashboard");
      return;
    }

    setIsCreating(true);
    try {
      const id = await createList("New tier list");
      router.push(`/lists/${id}`);
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="hero-grid">
      <div className="hero-copy">
        <h1>Build a tier list.</h1>
        <p>
          Rank anything and export locally, sign in when you want cloud sync and shareable
          view-only links.
        </p>
        <div className="nav-actions" style={{ justifyContent: "flex-start" }}>
          <button
            className="button primary"
            disabled={loading || isCreating}
            onClick={() => void getStarted()}
            type="button"
          >
            {isCreating ? <Loader2 size={16} /> : <FilePlus2 size={16} />}
            {isCreating ? "Creating" : "Get started"}
          </button>
          <span className="button ghost">
            <HardDrive size={16} /> Local save
          </span>
          <span className="button ghost">
            <Cloud size={16} /> Cloud save
          </span>
          <span className="button ghost">
            <Download size={16} /> PNG export
          </span>
          <span className="button ghost">
            <Share2 size={16} /> Link share
          </span>
        </div>
      </div>
      <TierListPreview
        className="hero-preview"
        items={SAMPLE_ITEMS}
        tiers={DEFAULT_TIERS}
        title="Sample tier list"
      />
    </section>
  );
}
