# Tier List Maker

A TanStack Start app for creating tier lists and exporting them as PNG images.
Lists are synced between devices with Convex.

## Stack

- TanStack Start with TanStack Router and Vite
- React canary view transitions for route, shared-element, and editor animations
  (opt-in on desktop, off on mobile)
- Convex for synced tier list storage
- Cloudflare R2 for item images people upload or copy from links
- Convex Auth for authentication, with email codes and passwords sent through
  Resend
- `html-to-image` for PNG exports

## Run Locally

```bash
bun install
bun run dev
```

Open `http://localhost:3001`. `bunx convex dev` writes
`NEXT_PUBLIC_CONVEX_URL` to `.env.local` after you choose or create a Convex
deployment.

To test from another device on the same Tailscale network, put the dev server
behind Tailscale Serve, which terminates HTTPS with a trusted certificate so HMR
works over `wss://`:

```bash
tailscale serve --bg --https=8441 http://127.0.0.1:3001
```

Then open `https://macbook-pro.tail22344d.ts.net:8441`.

## Cloudflare deployment

TanStack Start runs on Cloudflare Workers through Cloudflare's official Vite
plugin. A separate Pages project is not required.

Before the first deploy, configure these runtime secrets in Cloudflare:

```bash
bunx wrangler secret put NEXT_PUBLIC_CONVEX_URL
bunx wrangler secret put NEXT_PUBLIC_APP_URL
bunx wrangler secret put NEXT_PUBLIC_SITE_URL
```

Use `https://tierlistmaker.win` for both app URL values.

For a local production-runtime check, copy `.dev.vars.example` to `.dev.vars`
and run `bun run preview`. To build without starting a server, run
`bun run build:cloudflare`. Deploy the Convex backend and Worker together with:

```bash
bun run deploy
```

The deploy command sets `NEXT_PUBLIC_CONVEX_URL` to the selected production
deployment before building and typechecking, overriding the development URL in
`.env.local`. It also sets both public app URLs to `https://tierlistmaker.win` so
shared links use the production domain.

`src/server.ts` redirects `www` and plain HTTP to `https://tierlistmaker.win`. The
`www` Workers route in `wrangler.jsonc` needs a proxied `www` DNS record, so keep
that record even though its origin is never reached.

For Cloudflare Workers Builds, leave **Build command** empty and set **Deploy
command** to `bun run deploy`. This script builds and typechecks the app before
deploying Convex and the Worker. Use Bun commands in the dashboard to match the
repository's package manager; old `pnpm exec` commands reject `bun@1.3.8`.

Build variables and runtime variables are separate in Workers Builds, so add
`CONVEX_DEPLOY_KEY` and every public variable needed by the Vite build under
Build Variables and secrets as well as configuring the runtime secrets above.

Runtime variables added in the Cloudflare dashboard are preserved on deploy by
`keep_vars` in `wrangler.jsonc`. Encrypted runtime secrets are preserved by
Wrangler independently and should continue to be managed with `wrangler secret`
or the dashboard.

## Item images

Signed-in people can upload item images, paste an image into an item's image
field, or add a batch of images that each become an item. A pasted image link
is copied right away, and **Save linked images** copies the links already in a
list. Copies keep working after the original site moves or blocks the image,
and they appear in PNG exports, which leave out images from sites that block
cross-origin loading.

Images live in the `tier-list-maker-item-images` R2 bucket. The Worker stores
them through `POST /api/images` and serves them from `/images/<sha256>.<ext>`
with a one-year immutable cache. Items store that path without an origin, so a
list works on every host that serves the app. R2 is included in the Workers
plan up to 10 GB-month of storage, 1 million writes, and 10 million reads a
month, with no egress fees.

Create the bucket once before deploying:

```bash
bunx wrangler r2 bucket create tier-list-maker-item-images
```

`bun run dev` keeps images in a local R2 simulation under `.wrangler/state`.

Uploads are limited to signed-in accounts with a verified email, which Convex
checks from the session token the browser sends. Each account may add about 60
images a minute through the `ITEM_IMAGE_RATE_LIMITER` binding, and the browser
waits and retries when a large batch reaches that limit. Images can be PNG,
JPEG, GIF, WebP, or AVIF up to 10 MB, checked by their contents rather than
their file name. The browser shrinks uploads to 1024 px on the long edge and
re-encodes JPEGs, which also drops camera metadata such as location.

Stored images are never deleted, because the same image may be used in several
lists. Each object records the uploader's email, and the source link for
copies, in its R2 custom metadata.

## Authentication

Sign-in runs entirely in Convex through [Convex Auth](https://labs.convex.dev/auth).
People can sign in with an 8-digit email code or with a password, which they
confirm with an emailed code. Tier lists stay keyed by the verified email
address, so accounts created before Convex Auth keep their lists.

Codes are sent from `noreply@mail.tierlistmaker.win`, a Resend domain. Every
Convex deployment needs these variables, and deploys fail without them:

- `JWT_PRIVATE_KEY` and `JWKS`: the key pair that signs session tokens.
  `bunx @convex-dev/auth` generates and sets them; pass `--prod` for production.
- `SITE_URL`: `http://localhost:3001` in development, `https://tierlistmaker.win`
  in production.
- `AUTH_RESEND_KEY`: a Resend API key with sending access to
  `mail.tierlistmaker.win`.

```bash
bunx convex env set SITE_URL https://tierlistmaker.win --prod
bunx convex env set AUTH_RESEND_KEY --prod
```

## Sign-up notifications

When someone verifies their email for the first time, Convex posts their sign-up
to a private Discord channel. Set the webhook URL on the production Convex
deployment; deployments without it skip the notification:

```bash
bunx convex env set SIGNUP_DISCORD_WEBHOOK_URL --prod
```
