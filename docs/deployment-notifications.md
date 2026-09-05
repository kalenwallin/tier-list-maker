# Deployment notifications

Cloudflare Workers Builds sends Tier List Maker build success and failure events to `#deployments` in kalen's server. Only the `main` branch is delivered. Messages include the project name, commit, and Cloudflare build logs, with mentions disabled.

This shares Cost Splitter's existing Discord notifier and secret:

- Worker: `cost-splitter-deployment-notifications`
- Queue: `cost-splitter-deployments`
- Failed-delivery queue: `cost-splitter-deployments-failed`
- Subscription: `tier-list-maker-deployment-results`
- Subscription ID: `8c233d46da42403e8a818eedbccb7e0f`
- Events: `build.succeeded`, `build.failed`
- Source: `workersBuilds.worker`, worker name `tier-list-maker`

The shared Worker source and tests live in the Cost Splitter repository at `workers/deployment-notifications/` and `tests/deployment-notifications.test.ts`. Its `PROJECTS` binding explicitly allows Cost Splitter and Tier List Maker. Preserve that mapping when deploying the notifier. Discord webhook credentials remain stored as a Cloudflare Worker secret.

The notifier and enabled subscription were verified through the Cloudflare API on September 5, 2026. Delivery for Tier List Maker still needs confirmation after its next build. No application deployment was triggered during setup.

Cloudflare documentation: https://developers.cloudflare.com/workers/ci-cd/builds/event-subscriptions/
