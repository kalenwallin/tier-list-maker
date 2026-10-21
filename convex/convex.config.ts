import { defineApp } from "convex/server";
import { v } from "convex/values";

const app = defineApp({
  env: {
    // Both are set only on production, where WorkOS sends user.created events.
    WORKOS_WEBHOOK_SECRET: v.optional(v.string()),
    SIGNUP_DISCORD_WEBHOOK_URL: v.optional(v.string()),
  },
});

export default app;
