import type { ReactNode } from "react";
import { ViewTransition } from "react";

export function DirectionalTransition({
  animateBackEntry = true,
  children,
}: {
  animateBackEntry?: boolean;
  children: ReactNode;
}) {
  return (
    <ViewTransition
      default="none"
      enter={{
        "nav-forward": "nav-forward",
        "nav-back": animateBackEntry ? "nav-back" : "none",
        default: "none",
      }}
      exit={{
        "nav-forward": "nav-forward",
        "nav-back": "nav-back",
        default: "none",
      }}
    >
      {children}
    </ViewTransition>
  );
}
