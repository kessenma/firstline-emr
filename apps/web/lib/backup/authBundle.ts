// apps/web/lib/backup/authBundle.ts
// The encrypted "Include authentication" bundle: app passkey/TOTP credential
// rows + a native Zitadel pg_dump, packed into one envelope that is then
// AES-256-GCM encrypted (via encryptionService) with the backup passphrase.
//
// Envelope layout (before encryption):
//   [4-byte big-endian headerLen] [header JSON utf8] [raw zitadel pg_dump bytes]
//
// The header carries the credential rows and the env-key fingerprints; the real
// ZITADEL_MASTERKEY is included ONLY when embedMasterkey is set, and even then
// lives only inside the encrypted ciphertext. The DB-facing AuthBundleMeta is a
// non-secret subset (fingerprints + counts) safe to store on the backups row.

import type { ConflictStrategy, RestoreTableResult } from "@fajr/shared/admin";
import { collectTablesData } from "./backupGenerator";
import { executeRestore } from "./restoreService";
import {
  dumpZitadelDatabase,
  restoreZitadelDatabase,
  masterkeyFingerprint,
  totpKeyFingerprint,
  getWebauthnRpId,
  getZitadelExternalDomain,
  getZitadelVersion,
} from "./zitadelDump";

/** Credential tables carried inside the encrypted bundle (never in plain backups). */
export const AUTH_CREDENTIAL_TABLES = [
  "passkey_credentials",
  "totp_credentials",
] as const;

type CredentialPayload = Record<
  string,
  { columns: string[]; records: Record<string, any>[] }
>;

/** Non-secret metadata persisted on the backups row (backups.authMeta). */
export interface AuthBundleMeta {
  zitadelVersion: string;
  externalDomain: string;
  masterkeyFingerprint: string | null;
  totpKeyFingerprint: string | null;
  webauthnRpId: string;
  masterkeyEmbedded: boolean;
  dumpSize: number;
  passkeyCount: number;
  totpCount: number;
}

/** Full header stored INSIDE the encrypted envelope. */
interface AuthBundleHeader {
  version: 1;
  zitadelVersion: string;
  externalDomain: string;
  masterkeyFingerprint: string | null;
  totpKeyFingerprint: string | null;
  webauthnRpId: string;
  masterkeyEmbedded: boolean;
  /** Present only when masterkeyEmbedded is true. */
  masterkey?: string;
  credentialPayload: CredentialPayload;
}

// ── Envelope framing ─────────────────────────────────────────────────────────

export function packAuthEnvelope(
  header: AuthBundleHeader,
  zitadelDump: Buffer,
): Buffer {
  const headerJson = Buffer.from(JSON.stringify(header), "utf-8");
  const lenPrefix = Buffer.alloc(4);
  lenPrefix.writeUInt32BE(headerJson.length, 0);
  return Buffer.concat([lenPrefix, headerJson, zitadelDump]);
}

export function unpackAuthEnvelope(envelope: Buffer): {
  header: AuthBundleHeader;
  zitadelDump: Buffer;
} {
  if (envelope.length < 4) throw new Error("Corrupt auth bundle: too short");
  const headerLen = envelope.readUInt32BE(0);
  const headerEnd = 4 + headerLen;
  if (headerEnd > envelope.length) {
    throw new Error("Corrupt auth bundle: header length out of range");
  }
  const header = JSON.parse(
    envelope.subarray(4, headerEnd).toString("utf-8"),
  ) as AuthBundleHeader;
  const zitadelDump = envelope.subarray(headerEnd);
  return { header, zitadelDump };
}

// ── Build (backup side) ──────────────────────────────────────────────────────

/**
 * Collect passkey/TOTP rows + dump the Zitadel DB, and pack them into an
 * (unencrypted) envelope. The caller encrypts it with encryptBackup(passphrase).
 */
export async function buildAuthBundle(opts: {
  embedMasterkey: boolean;
}): Promise<{ envelope: Buffer; meta: AuthBundleMeta }> {
  const { tablesData } = await collectTablesData([...AUTH_CREDENTIAL_TABLES]);
  const zitadelDump = await dumpZitadelDatabase();

  const header: AuthBundleHeader = {
    version: 1,
    zitadelVersion: getZitadelVersion(),
    externalDomain: getZitadelExternalDomain(),
    masterkeyFingerprint: masterkeyFingerprint(),
    totpKeyFingerprint: totpKeyFingerprint(),
    webauthnRpId: getWebauthnRpId(),
    masterkeyEmbedded: opts.embedMasterkey,
    credentialPayload: tablesData,
  };
  if (opts.embedMasterkey && process.env.ZITADEL_MASTERKEY) {
    header.masterkey = process.env.ZITADEL_MASTERKEY;
  }

  const meta: AuthBundleMeta = {
    zitadelVersion: header.zitadelVersion,
    externalDomain: header.externalDomain,
    masterkeyFingerprint: header.masterkeyFingerprint,
    totpKeyFingerprint: header.totpKeyFingerprint,
    webauthnRpId: header.webauthnRpId,
    masterkeyEmbedded: header.masterkeyEmbedded,
    dumpSize: zitadelDump.length,
    passkeyCount: tablesData["passkey_credentials"]?.records.length ?? 0,
    totpCount: tablesData["totp_credentials"]?.records.length ?? 0,
  };

  return { envelope: packAuthEnvelope(header, zitadelDump), meta };
}

// ── Apply (restore side) ─────────────────────────────────────────────────────

export interface AuthBundleRestoreResult {
  credentialResults: RestoreTableResult[];
  zitadelRestored: boolean;
}

/**
 * Restore the credential tables, then replace the Zitadel database. The envelope
 * must already be decrypted. Caller is responsible for the preflight checks
 * (fingerprint match, Zitadel not connected) before invoking this.
 */
export async function applyAuthBundle(
  envelope: Buffer,
  conflictStrategy: ConflictStrategy,
): Promise<AuthBundleRestoreResult> {
  const { header, zitadelDump } = unpackAuthEnvelope(envelope);

  const presentTables = [...AUTH_CREDENTIAL_TABLES].filter(
    (t) => header.credentialPayload?.[t],
  );

  const credentialResults = presentTables.length
    ? await executeRestore({
        backupData: { version: 1, tables: header.credentialPayload },
        selectedTables: presentTables,
        conflictStrategy,
      })
    : [];

  await restoreZitadelDatabase(zitadelDump);

  return { credentialResults, zitadelRestored: true };
}

// ── Preflight (readiness) ────────────────────────────────────────────────────

export interface AuthPreflight {
  masterkeyMatch: boolean;
  totpKeyMatch: boolean;
  webauthnRpMatch: boolean;
  domainMatch: boolean;
  masterkeyEmbedded: boolean;
  /** True when nothing blocks an in-place restore (Zitadel-connected is separate). */
  ready: boolean;
}

/**
 * Compare a backup's stored AuthBundleMeta against this server's live env keys
 * so the UI can show a green/red readiness panel before committing.
 */
export function computeAuthPreflight(meta: AuthBundleMeta): AuthPreflight {
  const localMaster = masterkeyFingerprint();
  const localTotp = totpKeyFingerprint();

  const masterkeyMatch =
    !!meta.masterkeyFingerprint && meta.masterkeyFingerprint === localMaster;
  const totpKeyMatch =
    !meta.totpKeyFingerprint || meta.totpKeyFingerprint === localTotp;
  const webauthnRpMatch = meta.webauthnRpId === getWebauthnRpId();
  const domainMatch = meta.externalDomain === getZitadelExternalDomain();

  // Masterkey must match (or be embedded for DR recovery); TOTP/domain/RP are
  // warnings, not hard blocks — passkeys/2FA degrade rather than corrupt data.
  const ready = masterkeyMatch || meta.masterkeyEmbedded;

  return {
    masterkeyMatch,
    totpKeyMatch,
    webauthnRpMatch,
    domainMatch,
    masterkeyEmbedded: meta.masterkeyEmbedded,
    ready,
  };
}
