interface BuildEvent {
  type?: string;
  source?: { workerName?: string };
  payload?: {
    buildUuid?: string;
    buildTriggerMetadata?: { branch?: string; commitHash?: string };
  };
}

interface NotificationEnv {
  DISCORD_WEBHOOK_URL: string;
  ACCOUNT_ID: string;
  WORKER_NAME: string;
  BRANCH: string;
}

interface QueueMessage {
  body: BuildEvent;
  ack: () => void;
  retry: (options: { delaySeconds: number }) => void;
}

export function buildNotification(event: BuildEvent, env: NotificationEnv) {
  const succeeded = event.type === "cf.workersBuilds.worker.build.succeeded";
  const failed = event.type === "cf.workersBuilds.worker.build.failed";
  const metadata = event.payload?.buildTriggerMetadata;
  if (
    (!succeeded && !failed) ||
    event.source?.workerName !== env.WORKER_NAME ||
    metadata?.branch !== env.BRANCH ||
    !event.payload?.buildUuid
  ) {
    return null;
  }

  const buildUrl = `https://dash.cloudflare.com/${env.ACCOUNT_ID}/workers/services/view/${encodeURIComponent(env.WORKER_NAME)}/production/builds/${encodeURIComponent(event.payload.buildUuid)}`;
  return {
    username: "Tier List Maker Deployments",
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: succeeded
          ? "✅ Tier List Maker deployment succeeded"
          : "❌ Tier List Maker build or deployment failed",
        color: succeeded ? 0x22c55e : 0xef4444,
        url: buildUrl,
        description: succeeded
          ? "The production build and deploy completed successfully."
          : "Cloudflare could not complete the production build and deploy. Open the build logs for details.",
        fields: [
          { name: "Branch", value: env.BRANCH, inline: true },
          {
            name: "Commit",
            value: metadata.commitHash?.slice(0, 7) || "Unavailable",
            inline: true,
          },
          { name: "Build logs", value: `[Open in Cloudflare](${buildUrl})` },
        ],
      },
    ],
  };
}

export async function deliverNotification(
  event: BuildEvent,
  env: NotificationEnv,
  send: typeof fetch = fetch,
) {
  const notification = buildNotification(event, env);
  if (!notification) return;

  let url: URL;
  try {
    url = new URL(env.DISCORD_WEBHOOK_URL);
  } catch {
    throw new Error("Discord webhook is not configured correctly");
  }
  if (
    url.protocol !== "https:" ||
    url.hostname !== "discord.com" ||
    !/^\/api\/webhooks\/\d+\/[^/]+$/.test(url.pathname)
  ) {
    throw new Error("Discord webhook is not configured correctly");
  }
  url.searchParams.set("wait", "true");
  const response = await send(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(notification),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    // Never log the webhook URL, token, or response body.
    throw new Error(`Discord delivery failed (HTTP ${response.status})`);
  }
}

export default {
  async queue(batch: { messages: QueueMessage[] }, env: NotificationEnv) {
    for (const message of batch.messages) {
      try {
        await deliverNotification(message.body, env);
        message.ack();
      } catch (error) {
        const reason =
          error instanceof Error ? error.message : "Unknown delivery failure";
        console.error(`Deployment notification delivery failed: ${reason}`);
        message.retry({ delaySeconds: 60 });
      }
    }
  },
};
