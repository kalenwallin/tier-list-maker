# Tier List Maker

A Next.js App Router app for creating tier lists and exporting them as PNG
images. Lists are synced between devices with Convex.

## Stack

- Next.js 16 App Router
- Convex for synced tier list storage
- `html-to-image` for PNG exports

## Run Locally

```bash
pnpm install
pnpm convex dev
pnpm dev
```

Open `http://localhost:3000`. `pnpm convex dev` writes
`NEXT_PUBLIC_CONVEX_URL` to `.env.local` after you choose or create a Convex
deployment.
