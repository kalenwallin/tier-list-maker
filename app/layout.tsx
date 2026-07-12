import { AuthKitProvider } from "@workos-inc/authkit-nextjs/components";
import type { Metadata } from "next";
import { Suspense } from "react";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

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

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: "Tier List Maker",
  description: "Create tier lists and export them as images.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <AuthKitProvider>
          <Suspense
            fallback={
              <main className="page-shell">
                <section className="panel panel-pad">Loading tier lists</section>
              </main>
            }
          >
            <ConvexClientProvider>{children}</ConvexClientProvider>
          </Suspense>
        </AuthKitProvider>
      </body>
    </html>
  );
}
