"use client";

import { useSyncExternalStore } from "react";

const MOBILE_PERFORMANCE_QUERY =
  "(max-width: 700px), (pointer: coarse), (prefers-reduced-motion: reduce)";

function getSnapshot() {
  return window.matchMedia(MOBILE_PERFORMANCE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

function subscribe(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia(MOBILE_PERFORMANCE_QUERY);
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

/**
 * Mobile browsers pay a noticeable cost to snapshot large DOM trees for view
 * transitions. Keep those animations on larger pointer-precise devices and use
 * immediate updates on smaller or coarse-pointer devices.
 */
export function useMobilePerformanceMode() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
