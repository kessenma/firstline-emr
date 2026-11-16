// packages/shared/src/backup/encryption.ts
// Shared types and constants for the .firstline-backup encrypted file format.

/** Magic bytes written at the start of every .firstline-backup file (ASCII "FLIN"). */
export const BACKUP_MAGIC = new Uint8Array([0x46, 0x4c, 0x49, 0x4e]); // "FLIN"

/**
 * Magic bytes this reader also accepts, for files written before the rebrand
 * (ASCII "FAJR"). Every backup exported up to that point starts with these, so
 * dropping them would make existing archives permanently unrestorable. Writers
 * must always emit BACKUP_MAGIC; this is a read-side allowance only.
 */
export const BACKUP_MAGIC_LEGACY = new Uint8Array([0x46, 0x41, 0x4a, 0x52]); // "FAJR"

/** All magic byte sequences a reader will accept. */
export const BACKUP_MAGIC_ACCEPTED = [BACKUP_MAGIC, BACKUP_MAGIC_LEGACY];

/** Current file format version. */
export const BACKUP_FORMAT_VERSION = 1;

/** Encryption algorithms. */
export const BACKUP_ENCRYPTION_ALGO = {
  AES_256_GCM: 1,
} as const;

/** PBKDF2 key derivation parameters. */
export const BACKUP_KDF = {
  iterations: 600_000,
  hash: 'sha256' as const,
  keyLength: 32, // 256 bits
  saltLength: 16,
};

/** AES-GCM parameters. */
export const BACKUP_AES = {
  ivLength: 12,
  authTagLength: 16,
};

/** File extension for encrypted backups. */
export const BACKUP_FILE_EXTENSION = '.firstline-backup';

/** Minimum passphrase length. */
export const BACKUP_MIN_PASSPHRASE_LENGTH = 12;

/** Header layout: magic(4) + version(1) + algo(1) + saltLen(4) + salt(16) + ivLen(4) + iv(12) + tagLen(4) + tag(16) = 62 bytes fixed header */
export const BACKUP_HEADER_SIZE =
  BACKUP_MAGIC.length + // 4
  1 + // version
  1 + // algo
  4 + BACKUP_KDF.saltLength + // salt length prefix + salt
  4 + BACKUP_AES.ivLength + // iv length prefix + iv
  4 + BACKUP_AES.authTagLength; // tag length prefix + tag

export type RestoreMode = 'additive' | 'destructive';
