import {
  HeadContent,
  Outlet,
  ScriptOnce,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import { AuthKitProvider } from "@workos/authkit-tanstack-react-start/client";
import { Suspense, type ReactNode } from "react";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
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
    <AuthKitProvider>
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
    </AuthKitProvider>
  );
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ScriptOnce>{themeScript}</ScriptOnce>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
