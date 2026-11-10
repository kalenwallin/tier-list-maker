"use client";

import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { ReactNode, useEffect, useMemo } from "react";
import { setAuthCookie } from "@/lib/auth-cookie";
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

  return (
    <ConvexAuthProvider client={convex}>
      <AuthCookieSync />
      {children}
    </ConvexAuthProvider>
  );
}

// Mirrors the client-side session into a cookie the server can read.
function AuthCookieSync() {
  const { isAuthenticated, isLoading } = useConvexAuth();

  useEffect(() => {
    if (!isLoading) setAuthCookie(isAuthenticated);
  }, [isAuthenticated, isLoading]);

  return null;
}
