import { cloudflare } from "@cloudflare/vite-plugin";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";

const workerOnlyDependencies = ["@cloudflare/pages-plugin-vercel-og/api"];

export default defineConfig({
  envPrefix: ["VITE_", "NEXT_PUBLIC_"],
  environments: {
    ssr: {
      optimizeDeps: {
        exclude: workerOnlyDependencies,
      },
    },
  },
  optimizeDeps: {
    // This worker-only renderer imports a bundled font binary. Let the SSR
    // environment handle it instead of Vite's browser dependency optimizer.
    exclude: workerOnlyDependencies,
  },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    react(),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
});
