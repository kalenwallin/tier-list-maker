import { Trophy } from "lucide-react";
import Link from "next/link";
import { ReactNode } from "react";

export function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="page-shell">
      <header className="topbar">
        <Link className="brand" href="/">
          <span className="brand-mark" aria-hidden="true">
            <Trophy size={22} />
          </span>
          <span>Tier List Maker</span>
        </Link>
        <nav className="nav-actions">
          <Link className="button" href="/dashboard">
            Dashboard
          </Link>
          <span className="topbar-action-slot" id="topbar-action-slot" />
        </nav>
      </header>
      {children}
    </main>
  );
}
