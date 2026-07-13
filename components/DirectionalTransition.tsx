import type { ReactNode } from "react";

export function DirectionalTransition({
  animateBackEntry = true,
  children,
}: {
  animateBackEntry?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        viewTransitionName: animateBackEntry
          ? "route-content"
          : "route-content-no-back-entry",
      }}
    >
      {children}
    </div>
  );
}
