# Deployment notifications

Cloudflare Workers Builds sends Tier List Maker production build events to `#deployments` in kalen's server: `build.started`, `build.succeeded`, and `build.failed`. Only the `main` branch is delivered. Each message includes the branch, commit, and a link to the Cloudflare build logs, with mentions disabled.

It mirrors Cost Splitter's setup but runs on its own Worker and queue:

- Worker: `tier-list-maker-deployment-notifications` (source in `workers/deployment-notifications/`, tests in `tests/deployment-notifications.test.ts`)
- Queue: `tier-list-maker-deployments`
- Failed-delivery queue: `tier-list-maker-deployments-failed`
- Subscription: `tier-list-maker-deployment-results` (ID `8c233d46da42403e8a818eedbccb7e0f`)
- Source: `workersBuilds.worker`, worker name `tier-list-maker`

The Discord webhook URL is stored only as the Worker secret `DISCORD_WEBHOOK_URL`. Never commit it.

The event subscription is managed outside `wrangler.jsonc`. To change it, deploy the consumer first, then update the existing subscription:

```sh
bunx wrangler deploy -c workers/deployment-notifications/wrangler.jsonc
bunx wrangler secret put DISCORD_WEBHOOK_URL -c workers/deployment-notifications/wrangler.jsonc
bunx wrangler queues subscription list tier-list-maker-deployments -c workers/deployment-notifications/wrangler.jsonc
bunx wrangler queues subscription update tier-list-maker-deployments --id 8c233d46da42403e8a818eedbccb7e0f --events build.started,build.succeeded,build.failed -c workers/deployment-notifications/wrangler.jsonc
```

Local tests (`bun test tests/deployment-notifications.test.ts`) do not verify live delivery. Confirm that the next real production build posts both the start and result messages in Discord.

Cloudflare documentation: https://developers.cloudflare.com/workers/ci-cd/builds/event-subscriptions/
