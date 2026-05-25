# Tier List Maker

A local-first Next.js App Router app for creating tier lists and exporting them
as PNG images. Lists are stored in the browser with IndexedDB via Dexie.

## Stack

- Next.js 16 App Router
- Dexie + IndexedDB for local browser storage
- `html-to-image` for PNG exports

## Run Locally

```bash
pnpm install
pnpm dev
```

Open `http://localhost:3000`. Data stays on the same browser profile and is not
synced to a backend.
