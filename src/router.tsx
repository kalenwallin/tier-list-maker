import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  const visitedHistoryKeys = new Set<string>();

  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultViewTransition: {
      types: ({ fromLocation, toLocation }) => {
        if (!fromLocation) return false;
        if (fromLocation.pathname === toLocation.pathname) return false;

        const fromIndex = fromLocation.state.__TSR_index;
        const toIndex = toLocation.state.__TSR_index;
        const fromKey = fromLocation.state.__TSR_key ?? fromLocation.state.key;
        const toKey = toLocation.state.__TSR_key ?? toLocation.state.key;

        if (fromKey) visitedHistoryKeys.add(fromKey);
        const isForwardHistoryNavigation =
          toIndex > fromIndex && !!toKey && visitedHistoryKeys.has(toKey);
        if (toKey) visitedHistoryKeys.add(toKey);

        if (toIndex < fromIndex || isForwardHistoryNavigation) return false;

        if (fromLocation.pathname === "/" || toLocation.pathname === "/") {
          return ["fade-only"];
        }

        return ["nav-forward"];
      },
    },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
