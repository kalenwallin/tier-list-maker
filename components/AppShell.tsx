import { Trophy } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { AuthNav } from "./AuthNav";
import { ThemeToggle } from "./ThemeToggle";

export function AppShell({
  children,
  hideDashboard = false,
  hideSignOut = false,
  hideSignedOutActions = false,
  dashboardTransitionType = "nav-back",
  signedOutPrimaryHref,
  signedOutPrimaryLabel,
}: {
  children: ReactNode;
  hideDashboard?: boolean;
  hideSignOut?: boolean;
  hideSignedOutActions?: boolean;
  dashboardTransitionType?: "nav-forward" | "nav-back";
  signedOutPrimaryHref?: string;
  signedOutPrimaryLabel?: string;
}) {
  return (
    <main className="page-shell">
      <header className="topbar" style={{ viewTransitionName: "persistent-nav" }}>
        <Link className="brand" href="/" transitionTypes={["nav-back"]}>
          <span className="brand-mark" aria-hidden="true">
            <Trophy size={22} />
          </span>
          <span>Tier List Maker</span>
        </Link>
        <nav className="nav-actions">
          <ThemeToggle />
          <span className="topbar-action-slot" id="topbar-leading-action-slot" />
          {hideDashboard ? null : (
            <Link
              className="button"
              href="/dashboard"
              transitionTypes={[dashboardTransitionType]}
            >
              Dashboard
            </Link>
          )}
          <AuthNav
            hideSignedOutActions={hideSignedOutActions}
            hideSignOut={hideSignOut}
            signedOutPrimaryHref={signedOutPrimaryHref}
            signedOutPrimaryLabel={signedOutPrimaryLabel}
          />
          <span className="topbar-action-slot" id="topbar-action-slot" />
        </nav>
      </header>
      {children}
    </main>
  );
}
