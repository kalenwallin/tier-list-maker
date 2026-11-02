"use client";

import { useSyncExternalStore } from "react";
import { MOBILE_DEVICE_QUERY } from "./use-mobile-performance-mode";

const viewTransitionsStorageKey = "tier-list-maker-view-transitions";
const viewTransitionsChangeEvent = "tier-list-maker-view-transitions-change";

/**
 * Hiding `document.startViewTransition` sends React and TanStack Router down
 * the same instant-update path they use in browsers without View Transitions,
 * which turns off every route, morph, and list animation at once. Mobile
 * devices stay on that path whatever the saved preference says. This runs
 * before hydration so the first navigation is already correct, then stays
 * subscribed so preference and viewport changes apply without a reload.
 */
export const viewTransitionsScript = `
  (() => {
    const mobileDevice = window.matchMedia("${MOBILE_DEVICE_QUERY}");
    const sync = () => {
      let enabled = false;
      try {
        enabled = localStorage.getItem("${viewTransitionsStorageKey}") === "on";
      } catch {}
      if (enabled && !mobileDevice.matches) {
        Reflect.deleteProperty(document, "startViewTransition");
      } else {
        Object.defineProperty(document, "startViewTransition", {
          configurable: true,
          value: undefined,
        });
      }
    };
    sync();
    mobileDevice.addEventListener("change", sync);
    window.addEventListener("${viewTransitionsChangeEvent}", sync);
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
  try {
    window.localStorage.setItem(viewTransitionsStorageKey, enabled ? "on" : "off");
  } catch {}
  window.dispatchEvent(new Event(viewTransitionsChangeEvent));
}

export function useViewTransitionsEnabled() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
