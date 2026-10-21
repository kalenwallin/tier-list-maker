import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    // Convex Auth signs session tokens with this key pair and builds sign-in
    // links from SITE_URL. Every deployment needs all of them to sign anyone in.
    JWT_PRIVATE_KEY: v.string(),
    JWKS: v.string(),
    SITE_URL: v.string(),
    // Sends sign-in, verification, and password reset codes.
    AUTH_RESEND_KEY: v.string(),
    // Set only on production, where new sign-ups post to Discord.
    SIGNUP_DISCORD_WEBHOOK_URL: v.optional(v.string()),
  },
});

export default app;
