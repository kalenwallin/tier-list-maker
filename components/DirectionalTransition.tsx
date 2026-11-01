import type { ReactNode } from "react";

export function DirectionalTransition({
  children,
  name = "route-content",
}: {
  children: ReactNode;
  name?: "route-content" | "dashboard-content";
}) {
  return <div style={{ viewTransitionName: name }}>{children}</div>;
}
