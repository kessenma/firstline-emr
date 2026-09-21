// apps/web/lib/jwt-config.ts
/**
 * JWT Configuration for PowerSync Authentication
 *
 * The `kid` (Key ID) is used by PowerSync to identify which key to use
 * for JWT verification. This must match the `kid` in PowerSync's config.yaml
 *
 * The `aud` (Audience) claim specifies the intended recipients of the JWT.
 * PowerSync validates that the JWT's audience matches its configured audience.
 */

export const JWT_CONFIG = {
  /**
   * Key ID for JWT tokens
   * This MUST match the `kid` in apps/powersync-server/config/powersync.yaml
   */
  KID: "fajr-emr-key",

  /**
   * Algorithm for JWT signing
   */
  ALG: "HS256" as const,

  /**
   * Token expiration time for mobile app authentication
   * This is the long-lived session token that keeps users logged in
   * Users will need to re-login when this expires
   */
  AUTH_TOKEN_EXPIRY: "30d",

  /**
   * Token expiration time for mobile app authentication (legacy)
   * Same as AUTH_TOKEN_EXPIRY for backwards compatibility
   */
  MOBILE_TOKEN_EXPIRY: "30d",

  /**
   * Token expiration time for PowerSync connections
   * PowerSync requires tokens to expire in 24 hours or less (86400 seconds max)
   * This token is automatically refreshed in the background
   */
  POWERSYNC_TOKEN_EXPIRY: "24h",

  /**
   * Audience claim for JWT tokens
   * This MUST match the `audience` in apps/powersync-server/config/powersync.yaml
   * PowerSync validates that the JWT's aud claim matches this value
   */
  AUDIENCE: ["powersync", "powersync-dev"] as const,

  /**
   * Issuer claim for PowerSync JWT tokens
   * This MUST match the `issuer` in apps/powersync-server/config/powersync.yaml
   * PowerSync validates that the JWT's iss claim matches this value
   */
  ISSUER: "https://fajrmission.org",
} as const;
