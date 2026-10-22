import {
  createRootRoute,
  HeadContent,
  Outlet,
  ScriptOnce,
  Scripts,
} from "@tanstack/react-router";
import { type ReactNode, Suspense, useLayoutEffect } from "react";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { viewTransitionsScript } from "@/lib/view-transitions";
import "@/app/globals.css";

const themeScript = `
  try {
    const savedTheme = localStorage.getItem("tier-list-maker-theme");
    const theme = savedTheme === "light" || savedTheme === "dark"
      ? savedTheme
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  } catch {}
`;

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "Tier List Maker" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        name: "description",
        content: "Create tier lists and export them as images.",
      },
    ],
    links: [{ rel: "icon", href: "/icon.svg", type: "image/svg+xml" }],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
});

function RootComponent() {
  return (
    <Suspense
      fallback={
        <main className="page-shell">
          <section className="panel panel-pad">Loading tier lists</section>
        </main>
      }
    >
      <ConvexClientProvider>
        <Outlet />
      </ConvexClientProvider>
    </Suspense>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    // Strict Mode remounts <html> in development, clearing the startup script's
    // attributes. Restore the saved theme after React reacquires the document.
    try {
      const savedTheme = localStorage.getItem("tier-list-maker-theme");
      const theme =
        savedTheme === "light" || savedTheme === "dark"
          ? savedTheme
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch {}
  }, []);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ScriptOnce>{themeScript}</ScriptOnce>
        <ScriptOnce>{viewTransitionsScript}</ScriptOnce>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
