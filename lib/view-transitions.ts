"use client";

import { useSyncExternalStore } from "react";

const viewTransitionsStorageKey = "tier-list-maker-view-transitions";
const viewTransitionsChangeEvent = "tier-list-maker-view-transitions-change";

/**
 * Hiding `document.startViewTransition` sends React and TanStack Router down
 * the same instant-update path they use in browsers without View Transitions,
 * which turns off every route, morph, and list animation at once. This runs
 * before hydration so the first navigation already respects the preference.
 */
export const viewTransitionsScript = `
  (() => {
    let enabled = false;
    try {
      enabled = localStorage.getItem("${viewTransitionsStorageKey}") === "on";
    } catch {}
    if (!enabled) {
      Object.defineProperty(document, "startViewTransition", {
        configurable: true,
        value: undefined,
      });
    }
  })();
`;

function getSnapshot() {
  try {
    return window.localStorage.getItem(viewTransitionsStorageKey) === "on";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return false;
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener(viewTransitionsChangeEvent, onStoreChange);

  return () => window.removeEventListener(viewTransitionsChangeEvent, onStoreChange);
}

export function setViewTransitionsEnabled(enabled: boolean) {
  if (enabled) {
    Reflect.deleteProperty(document, "startViewTransition");
  } else {
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: undefined,
    });
  }

  try {
    window.localStorage.setItem(viewTransitionsStorageKey, enabled ? "on" : "off");
  } catch {}
  window.dispatchEvent(new Event(viewTransitionsChangeEvent));
}

export function useViewTransitionsEnabled() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
