# Tier List Maker

A TanStack Start app for creating tier lists and exporting them as PNG images.
Lists are synced between devices with Convex.

## Stack

- TanStack Start with TanStack Router and Vite
- React canary view transitions for route, shared-element, and editor animations
- Convex for synced tier list storage
- WorkOS AuthKit for authentication
- `html-to-image` for PNG exports

## Run Locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3001`. `pnpm convex dev` writes
`NEXT_PUBLIC_CONVEX_URL` to `.env.local` after you choose or create a Convex
deployment.

## Cloudflare deployment

TanStack Start runs on Cloudflare Workers through Cloudflare's official Vite
plugin. A separate Pages project is not required.

Before the first deploy, configure these runtime secrets in Cloudflare:

```bash
pnpm wrangler secret put WORKOS_API_KEY
pnpm wrangler secret put WORKOS_CLIENT_ID
pnpm wrangler secret put WORKOS_COOKIE_PASSWORD
pnpm wrangler secret put WORKOS_REDIRECT_URI
pnpm wrangler secret put NEXT_PUBLIC_CONVEX_URL
pnpm wrangler secret put NEXT_PUBLIC_APP_URL
pnpm wrangler secret put NEXT_PUBLIC_SITE_URL
```

Use `https://tierlistmaker.win` for both app URL values. Add
`https://tierlistmaker.win/callback` as a WorkOS redirect URI and
`https://tierlistmaker.win/sign-in` as the WorkOS sign-in endpoint.

For a local production-runtime check, copy `.dev.vars.example` to `.dev.vars`
and run `pnpm preview`. To build without starting a server, run
`pnpm build:cloudflare`. Deploy the Convex backend and Worker together with:

```bash
pnpm deploy
```

For Cloudflare Workers Builds, use `pnpm deploy` as the deploy command. Build
variables and runtime variables are separate in Workers Builds, so add
`CONVEX_DEPLOY_KEY` and every public variable needed by the Vite build under
Build Variables and secrets as well as configuring the runtime secrets above.

Runtime variables added in the Cloudflare dashboard are preserved on deploy by
`keep_vars` in `wrangler.jsonc`. Encrypted runtime secrets are preserved by
Wrangler independently and should continue to be managed with `wrangler secret`
or the dashboard.
