# 2FA Architecture

## Overview

Two-factor authentication using TOTP (Time-based One-Time Password) authenticator apps as the primary method, with WebAuthn passkeys as an optional faster alternative.

## TOTP Encryption

TOTP secrets are encrypted at rest using AES-256-GCM:
- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key**: `TOTP_ENCRYPTION_KEY` env var (32-byte hex string)
- **IV**: Random 12 bytes per secret (stored in `encryption_iv`)
- **Auth tag**: 16 bytes (stored in `encryption_tag`)
- **Library**: Node.js `crypto` module (no external deps)

The `otpauth` npm package handles TOTP generation and verification with standard parameters:
- Issuer: "Fajr Mission EMR"
- Algorithm: SHA-1 (standard for authenticator app compatibility)
- Digits: 6
- Period: 30 seconds
- Window: ±1 step (allows 30s clock drift)

## Why Passkey Login = 2FA

WebAuthn passkeys inherently provide two factors:
1. **Possession**: The device holding the private key
2. **Biometric/PIN**: User verification (Face ID, Touch ID, fingerprint, device PIN)

When `requireUserVerification: true` is set during registration (which we do), the authenticator guarantees the user was verified. Therefore, passkey logins do not need an additional TOTP step.

## Login Flow

```
User enters email + password
        |
        v
  Password valid? ──No──> Error
        |
       Yes
        |
        v
  Dev bypass active? ──Yes──> Issue tokens (skip 2FA)
        |
       No
        |
        v
  User has 2FA? ──No──> Check REQUIRE_2FA_LOGIN flag
        |                     |
       Yes              Flag off: allow login
        |              Flag on: grace period logic
        v
  Return 2FA_REQUIRED error with loginToken + methods
        |
        v
  Client shows TOTP input (+ passkey button if available)
        |
        v
  User enters TOTP code ──or──> User taps passkey
        |                              |
        v                              v
  POST /api/auth/totp/verify    Passkey authenticate
        |                              |
        v                              v
  Returns short-lived JWT      Returns short-lived JWT
        |                              |
        └──────────┬───────────────────┘
                   v
  Client calls signIn(credentials, { passkeyToken: jwt })
                   |
                   v
             Session created
```

## Signup Flow

```
Step 0: Choose account type
Step 1: Email, password, terms
Step 2: 2FA Setup (TOTP required, passkey optional)  <-- was Security Questions
Step 3: Profile info
Step 4: Medical license upload (Doctor only)
```

The 2FA setup during signup:
1. Client calls POST `/api/auth/totp/setup` with email
2. Server generates secret, encrypts it, returns QR code + manual key + setupToken (JWT)
3. User scans QR/enters key in authenticator app
4. User enters 6-digit code
5. Client calls POST `/api/auth/totp/verify-setup` with code + setupToken
6. Server verifies code, returns encrypted credential data
7. Client stores credential data in signup context
8. On account creation, credential data is sent with signup payload and stored in DB

## Database Schema

### `totp_credentials` table
- `encrypted_secret`: AES-256-GCM encrypted TOTP secret
- `encryption_iv`: Initialization vector
- `encryption_tag`: GCM authentication tag
- `is_verified`: Set true after first successful code verification
- `is_active`: Can be deactivated without deletion

### `users` table additions
- `two_factor_status`: `null` | `'setup_pending'` | `'active'`
- `two_factor_grace_deadline`: Timestamp for migration grace period

## Key Files

| File | Purpose |
|------|---------|
| `apps/web/lib/totp.ts` | TOTP generation, encryption, verification |
| `apps/web/lib/featureFlags.ts` | Server-side feature flags |
| `apps/web/db/schema/totpCredentials.ts` | DB schema |
| `apps/web/app/api/auth/totp/` | TOTP API routes |
| `apps/web/app/api/auth/2fa/status/` | 2FA status endpoint |
| `apps/web/lib/auth.ts` | NextAuth authorize with 2FA check |
| `apps/web/app/api/auth/mobile-login/` | Mobile login + verify-2fa |
| `packages/shared/src/2fa/` | Shared types and constants |
