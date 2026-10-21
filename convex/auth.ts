import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import {
  EmailCode,
  PasswordResetCode,
  PasswordVerificationCode,
} from "./authEmail";
import { normalizeEmail } from "./users";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    EmailCode,
    Password({
      profile: (params) => ({ email: normalizeEmail(String(params.email ?? "")) }),
      verify: PasswordVerificationCode,
      reset: PasswordResetCode,
    }),
  ],
  callbacks: {
    async afterUserCreatedOrUpdated(ctx, { userId, type }) {
      if (type === "verification") {
        await notifyOnFirstVerification(ctx as MutationCtx, userId as Id<"users">);
      }
    },
  },
});

// Requesting a code already creates a user, so a sign-up only counts once its
// email is verified for the first time. Convex Auth marks the account verified
// after this callback runs, so no verified account means this is the first.
async function notifyOnFirstVerification(ctx: MutationCtx, userId: Id<"users">) {
  const verifiedAccount = await ctx.db
    .query("authAccounts")
    .withIndex("userIdAndProvider", (q) => q.eq("userId", userId))
    .filter((q) => q.neq(q.field("emailVerified"), undefined))
    .first();
  if (verifiedAccount) return;

  const email = (await ctx.db.get(userId))?.email;
  if (!email) return;

  // People who signed up through WorkOS already own lists, so they aren't new.
  const existingList = await ctx.db
    .query("tierLists")
    .withIndex("by_owner_updatedAt", (q) => q.eq("ownerEmail", normalizeEmail(email)))
    .first();
  if (existingList) return;

  await ctx.scheduler.runAfter(0, internal.signupNotifications.notifyDiscord, {
    email,
  });
}
