"use client";

import { Sparkles } from "lucide-react";
import {
  setViewTransitionsEnabled,
  useViewTransitionsEnabled,
} from "@/lib/view-transitions";

export function ViewTransitionsToggle() {
  const viewTransitionsEnabled = useViewTransitionsEnabled();

  return (
    <button
      aria-label="Animated transitions"
      aria-pressed={viewTransitionsEnabled}
      className="button icon"
      onClick={() => setViewTransitionsEnabled(!viewTransitionsEnabled)}
      title={
        viewTransitionsEnabled
          ? "Turn off animated transitions"
          : "Turn on animated transitions"
      }
      type="button"
    >
      <Sparkles aria-hidden="true" size={19}>
        {viewTransitionsEnabled ? null : <path d="m2 2 20 20" />}
      </Sparkles>
    </button>
  );
}
