"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode, useMemo } from "react";
import { getPublicEnv } from "@/lib/site-url";

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convexUrl = getPublicEnv("NEXT_PUBLIC_CONVEX_URL");
  const convex = useMemo(
    () => (convexUrl ? new ConvexReactClient(convexUrl) : null),
    [convexUrl],
  );

  if (!convex) {
    return (
      <main className="app-shell">
        <section className="panel panel-pad">
          <h1>Service unavailable</h1>
          <p className="muted">
            Tier lists are temporarily unavailable. Please try again later.
          </p>
        </section>
      </main>
    );
  }

  return <ConvexProvider client={convex}>{children}</ConvexProvider>;
}
