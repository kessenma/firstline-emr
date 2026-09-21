// apps/web/lib/featureFlags.ts
// Server-side feature flags loaded from environment variables

export const FeatureFlags = {
  /** Require 2FA for all logins (when false, only new signups get 2FA) */
  REQUIRE_2FA_LOGIN: process.env.REQUIRE_2FA_LOGIN === "true",

  /** Number of days existing users have to set up 2FA after first prompt */
  TWO_FA_GRACE_PERIOD_DAYS: parseInt(
    process.env.TWO_FA_GRACE_PERIOD_DAYS || "14",
  ),

  /** Skip 2FA enforcement in development (default true in dev) */
  SKIP_2FA_IN_DEV:
    process.env.SKIP_2FA_IN_DEV === "true" ||
    (process.env.NODE_ENV === "development" &&
      process.env.SKIP_2FA_IN_DEV !== "false"),

  /** Enable cross-device passkey authentication (future feature) */
  CROSS_DEVICE_PASSKEY_AUTH:
    process.env.CROSS_DEVICE_PASSKEY_AUTH === "true",
} as const;
