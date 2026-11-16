// packages/shared/src/2fa/constants.ts
// Shared 2FA constants used by both web and mobile

import { BRAND_NAME } from "../constants/brand";

/**
 * Label shown in the user's authenticator app. Derived from BRAND_NAME so it
 * cannot drift from the product name — it previously existed as a second,
 * hand-written copy in apps/web/lib/totp.ts, and two mobile screens bypassed
 * both and hardcoded the string a third time.
 *
 * Changing this does not invalidate existing TOTP secrets; already-enrolled
 * authenticators keep displaying whatever label they were enrolled with.
 */
export const TOTP_ISSUER = BRAND_NAME;
export const TOTP_DIGITS = 6;
export const TOTP_PERIOD = 30; // seconds
export const LOGIN_TOKEN_EXPIRY_SECONDS = 300; // 5 minutes
export const GRACE_PERIOD_DAYS = 14;

export const HIPAA_2FA_NOTICE =
  "Two-factor authentication is required to comply with HIPAA security standards for protecting electronic health information.";

// Step-by-step instructions for manually adding TOTP to an authenticator app
export const TOTP_MANUAL_SETUP_STEPS = [
  "Open your authenticator app",
  "Tap the + button",
  'Choose "Other" or "Enter code manually"',
  "Enter the account name and secret key below",
];

// Authenticator app download links
export interface AuthenticatorApp {
  name: string;
  ios: string;
  android: string;
  web: string;
}

export const AUTHENTICATOR_APPS: AuthenticatorApp[] = [
  {
    name: "Microsoft Authenticator",
    ios: "https://apps.apple.com/app/microsoft-authenticator/id983156458",
    android:
      "https://play.google.com/store/apps/details?id=com.azure.authenticator",
    web: "https://www.microsoft.com/en-us/security/mobile-authenticator-app",
  },
  {
    name: "Google Authenticator",
    ios: "https://apps.apple.com/app/google-authenticator/id388497605",
    android:
      "https://play.google.com/store/apps/details?id=com.google.android.apps.authenticator2",
    web: "https://support.google.com/accounts/answer/1066447",
  },
  {
    name: "Authy",
    ios: "https://apps.apple.com/app/twilio-authy/id494168017",
    android:
      "https://play.google.com/store/apps/details?id=com.authy.authy",
    web: "https://authy.com/download/",
  },
];
