import { httpRouter } from "convex/server";
import { env, httpAction } from "./_generated/server";

const http = httpRouter();

// WorkOS signs every delivery. Older signatures are treated as replays.
const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

async function hmacHex(secret: string, payload: string) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let difference = 0;
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return difference === 0;
}

// The WorkOS-Signature header looks like "t=<milliseconds>, v1=<hex HMAC>",
// where the HMAC covers "<t>.<raw body>".
async function hasValidSignature(header: string | null, body: string, secret: string) {
  const parts = new Map(
    (header ?? "").split(",").map((part) => {
      const [key, ...value] = part.trim().split("=");
      return [key, value.join("=")] as const;
    }),
  );
  const timestamp = parts.get("t");
  const signature = parts.get("v1");
  if (
    !timestamp ||
    !signature ||
    !(Math.abs(Date.now() - Number(timestamp)) <= SIGNATURE_TOLERANCE_MS)
  ) {
    return false;
  }
  return timingSafeEqual(await hmacHex(secret, `${timestamp}.${body}`), signature);
}

// Names and emails come from strangers, so they must not render as Discord
// formatting or masked links.
function escapeMarkdown(value: string) {
  return value.slice(0, 200).replace(/[\\*_~`|[\]()<>#]/g, "\\$&");
}

function signupMessage(event: unknown) {
  if (typeof event !== "object" || event === null) return null;
  const { event: type, data } = event as Record<string, unknown>;
  if (type !== "user.created" || typeof data !== "object" || data === null) return null;
  const { email, first_name, last_name } = data as Record<string, unknown>;
  const name = [first_name, last_name]
    .filter((part): part is string => typeof part === "string" && part.trim() !== "")
    .join(" ");
  const who = name ? `**${escapeMarkdown(name)}**` : "Someone";
  const withEmail = typeof email === "string" ? ` with ${escapeMarkdown(email)}` : "";
  return `${who} signed up for Tier List Maker${withEmail}.`;
}

// WorkOS calls this for user.created events and posts each new sign-up to the
// owner's Discord channel. Deployments without the secrets reject deliveries.
http.route({
  path: "/workos/webhook",
  method: "POST",
  handler: httpAction(async (_ctx, request) => {
    const secret = env.WORKOS_WEBHOOK_SECRET?.trim();
    const webhookUrl = env.SIGNUP_DISCORD_WEBHOOK_URL?.trim();
    if (!secret || !webhookUrl) {
      return new Response("Sign-up notifications are not configured.", { status: 503 });
    }
    const body = await request.text();
    if (
      !(await hasValidSignature(request.headers.get("workos-signature"), body, secret))
    ) {
      return new Response("Invalid signature.", { status: 401 });
    }
    let event: unknown;
    try {
      event = JSON.parse(body);
    } catch {
      return new Response("Invalid JSON.", { status: 400 });
    }
    const content = signupMessage(event);
    if (!content) return new Response(null, { status: 200 });

    const target = new URL(webhookUrl);
    target.searchParams.set("wait", "true");
    const response = await fetch(target, {
      redirect: "error",
      signal: AbortSignal.timeout(10000),
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, allowed_mentions: { parse: [] } }),
    });
    // A failure response makes WorkOS retry the delivery later.
    if (!response.ok) {
      return new Response(`Discord returned ${response.status}.`, { status: 502 });
    }
    return new Response(null, { status: 200 });
  }),
});

export default http;
