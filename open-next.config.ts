import { defineCloudflareConfig } from "@opennextjs/cloudflare";

const config = defineCloudflareConfig();

// Avoid package-manager bootstrapping during Cloudflare Builds. OpenNext only
// needs the framework build here; Convex is deployed explicitly by `pnpm deploy`.
config.buildCommand = "node node_modules/next/dist/bin/next build";

export default config;
