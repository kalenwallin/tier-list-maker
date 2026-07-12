import { Trophy } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";
import { NavAuth } from "./NavAuth";
import { ThemeToggle } from "./ThemeToggle";

export function Shell({ children }: { children: ReactNode }) {
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
          <Link className="button" href="/dashboard" transitionTypes={["nav-back"]}>
            Dashboard
          </Link>
          <NavAuth />
          <span className="topbar-action-slot" id="topbar-action-slot" />
        </nav>
      </header>
      {children}
    </main>
  );
}
