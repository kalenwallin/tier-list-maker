import { v } from "convex/values";
import { env, internalAction } from "./_generated/server";

// Emails come from strangers, so they must not render as Discord formatting or
// masked links.
function escapeMarkdown(value: string) {
  return value.slice(0, 200).replace(/[\\*_~`|[\]()<>#]/g, "\\$&");
}

// Posts each new sign-up to the owner's Discord channel. Deployments without
// the webhook URL skip the notification.
export const notifyDiscord = internalAction({
  args: { email: v.string() },
  handler: async (_ctx, { email }) => {
    const webhookUrl = env.SIGNUP_DISCORD_WEBHOOK_URL?.trim();
    if (!webhookUrl) return null;

    const target = new URL(webhookUrl);
    target.searchParams.set("wait", "true");
    const response = await fetch(target, {
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: `Someone signed up for Tier List Maker with ${escapeMarkdown(email)}.`,
        allowed_mentions: { parse: [] },
      }),
    });
    if (!response.ok) {
      throw new Error(`Discord returned ${response.status}.`);
    }
    return null;
  },
});
