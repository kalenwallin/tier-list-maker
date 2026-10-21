import { getAuthUserId } from "@convex-dev/auth/server";
import { query, type QueryCtx } from "./_generated/server";

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

// Tier lists are keyed by owner email (it predates Convex Auth), so only a
// verified address may own them.
export async function getViewerEmail(ctx: QueryCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) return null;

  const user = await ctx.db.get(userId);
  if (!user?.email || user.emailVerificationTime === undefined) return null;
  return normalizeEmail(user.email);
}

export async function requireViewerEmail(ctx: QueryCtx) {
  const email = await getViewerEmail(ctx);
  if (email === null) throw new Error("Sign in to sync tier lists.");
  return email;
}

export const viewer = query({
  args: {},
  handler: async (ctx) => {
    const email = await getViewerEmail(ctx);
    return email === null ? null : { email };
  },
});
