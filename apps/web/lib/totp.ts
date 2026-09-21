// apps/web/lib/totp.ts
// TOTP (Time-based One-Time Password) utilities for 2FA
// Uses otpauth for TOTP generation/verification and Node crypto for encryption

import { TOTP } from "otpauth";
import crypto from "crypto";

const TOTP_ENCRYPTION_KEY = process.env.TOTP_ENCRYPTION_KEY || "";
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const TAG_LENGTH = 16; // 128 bits

// TOTP configuration (standard for Google Authenticator / Authy / Microsoft Authenticator)
const TOTP_ISSUER = "Fajr Mission EMR";
const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30; // seconds
const TOTP_ALGORITHM = "SHA1";
const TOTP_WINDOW = 1; // Allow ±1 step (±30 seconds drift)

function getEncryptionKey(): Buffer {
  if (!TOTP_ENCRYPTION_KEY || TOTP_ENCRYPTION_KEY.length < 64) {
    throw new Error(
      "TOTP_ENCRYPTION_KEY must be set (64-char hex string = 32 bytes)",
    );
  }
  return Buffer.from(TOTP_ENCRYPTION_KEY, "hex");
}

/**
 * Encrypt a TOTP secret using AES-256-GCM
 */
export function encryptSecret(secret: string): {
  encrypted: string;
  iv: string;
  tag: string;
} {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(secret, "utf8", "base64");
  encrypted += cipher.final("base64");
  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

/**
 * Decrypt a TOTP secret from AES-256-GCM encrypted data
 */
export function decryptSecret(
  encrypted: string,
  iv: string,
  tag: string,
): string {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tag, "base64"));

  let decrypted = decipher.update(encrypted, "base64", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Generate a new TOTP secret for a user
 * Returns the raw secret, otpauth URI (for QR codes), and encrypted data (for DB storage)
 */
export function generateTotpSecret(email: string): {
  secret: string;
  otpauthUri: string;
  encrypted: { encrypted: string; iv: string; tag: string };
} {
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    label: email,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
  });

  const secret = totp.secret.base32;
  const otpauthUri = totp.toString();
  const encrypted = encryptSecret(secret);

  return { secret, otpauthUri, encrypted };
}

/**
 * Verify a TOTP code against an encrypted secret
 */
export function verifyTotpCode(
  encryptedSecret: string,
  iv: string,
  tag: string,
  code: string,
): boolean {
  const secret = decryptSecret(encryptedSecret, iv, tag);

  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret,
  });

  // validate returns the time step difference, or null if invalid
  const delta = totp.validate({ token: code, window: TOTP_WINDOW });
  return delta !== null;
}

/**
 * Verify a TOTP code against a raw (unencrypted) secret
 * Used during setup verification before the secret is stored in DB
 */
export function verifyTotpCodeWithRawSecret(
  secret: string,
  code: string,
): boolean {
  const totp = new TOTP({
    issuer: TOTP_ISSUER,
    algorithm: TOTP_ALGORITHM,
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret,
  });

  const delta = totp.validate({ token: code, window: TOTP_WINDOW });
  return delta !== null;
}
