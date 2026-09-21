// packages/shared/src/2fa/types.ts
// Shared 2FA types used by both web and mobile

export type TwoFactorMethod = "passkey" | "totp";

export type TwoFactorStatus = null | "setup_pending" | "active";

export interface TwoFactorStatusResponse {
  hasPasskey: boolean;
  hasTotp: boolean;
  twoFactorStatus: TwoFactorStatus;
  graceDeadline?: string; // ISO date string
}

export interface TwoFactorLoginChallenge {
  requires2FA: true;
  loginToken: string;
  methods: TwoFactorMethod[];
}

export interface TwoFactorVerifyRequest {
  loginToken: string;
  totpCode?: string;
  passkeyToken?: string;
}

export interface TwoFactorVerifyResponse {
  verified: boolean;
  token?: string; // Short-lived JWT for completing login
  error?: string;
}

export interface TotpSetupResponse {
  qrCodeDataUrl: string;
  manualEntryKey: string;
  setupToken: string; // JWT containing encrypted secret for stateless signup flow
}

export interface TotpVerifySetupRequest {
  code: string;
  setupToken?: string; // For signup flow
  userId?: string; // For authenticated user flow
}

export interface TotpVerifySetupResponse {
  verified: boolean;
  totpCredentialData?: {
    encryptedSecret: string;
    encryptionIv: string;
    encryptionTag: string;
  };
  error?: string;
}
