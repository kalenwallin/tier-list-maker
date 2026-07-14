import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: "intent",
    scrollRestoration: true,
    defaultViewTransition: {
      types: ({ fromLocation, toLocation }) => {
        if (!fromLocation) return false;
        if (fromLocation.pathname === toLocation.pathname) return false;
        if (fromLocation.pathname === "/" || toLocation.pathname === "/") {
          return ["fade-only"];
        }

        const fromIndex = fromLocation.state.__TSR_index;
        const toIndex = toLocation.state.__TSR_index;
        return [toIndex < fromIndex ? "nav-back" : "nav-forward"];
      },
    },
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
