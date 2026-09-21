// apps/web/lib/backup/encryptionService.ts
// Server-side AES-256-GCM encryption/decryption for .fajr-backup files.

import crypto from 'crypto';
import {
  BACKUP_MAGIC,
  BACKUP_FORMAT_VERSION,
  BACKUP_ENCRYPTION_ALGO,
  BACKUP_KDF,
  BACKUP_AES,
} from '@fajr/shared/backup';

/**
 * Derive a 256-bit key from a passphrase using PBKDF2.
 */
function deriveKey(passphrase: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(
    passphrase,
    salt,
    BACKUP_KDF.iterations,
    BACKUP_KDF.keyLength,
    BACKUP_KDF.hash,
  );
}

/** Write a 4-byte big-endian uint32 length prefix. */
function writeUint32(value: number): Buffer {
  const buf = Buffer.alloc(4);
  buf.writeUInt32BE(value, 0);
  return buf;
}

/** Read a 4-byte big-endian uint32 from a buffer at the given offset. */
function readUint32(buf: Buffer, offset: number): number {
  return buf.readUInt32BE(offset);
}

/**
 * Encrypt a JSON backup payload into the .fajr-backup binary format.
 *
 * Layout:
 *   magic(4) | version(1) | algo(1)
 *   saltLen(4) | salt(16)
 *   ivLen(4) | iv(12)
 *   tagLen(4) | tag(16)
 *   ciphertext(remaining)
 */
export function encryptBackup(jsonPayload: Buffer, passphrase: string): Buffer {
  const salt = crypto.randomBytes(BACKUP_KDF.saltLength);
  const iv = crypto.randomBytes(BACKUP_AES.ivLength);
  const key = deriveKey(passphrase, salt);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(jsonPayload), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return Buffer.concat([
    Buffer.from(BACKUP_MAGIC),
    Buffer.from([BACKUP_FORMAT_VERSION]),
    Buffer.from([BACKUP_ENCRYPTION_ALGO.AES_256_GCM]),
    writeUint32(salt.length),
    salt,
    writeUint32(iv.length),
    iv,
    writeUint32(authTag.length),
    authTag,
    encrypted,
  ]);
}

/**
 * Decrypt a .fajr-backup binary file back to the JSON payload.
 * Throws on wrong passphrase, corrupt file, or unsupported format.
 */
export function decryptBackup(encryptedData: Buffer, passphrase: string): Buffer {
  let offset = 0;

  // Validate magic bytes
  const magic = encryptedData.subarray(offset, offset + BACKUP_MAGIC.length);
  offset += BACKUP_MAGIC.length;
  if (!magic.every((b, i) => b === BACKUP_MAGIC[i])) {
    throw new Error('Invalid file: not a .fajr-backup file');
  }

  // Version
  const version = encryptedData[offset++];
  if (version !== BACKUP_FORMAT_VERSION) {
    throw new Error(`Unsupported format version: ${version}`);
  }

  // Algorithm
  const algo = encryptedData[offset++];
  if (algo !== BACKUP_ENCRYPTION_ALGO.AES_256_GCM) {
    throw new Error(`Unsupported encryption algorithm: ${algo}`);
  }

  // Salt
  const saltLen = readUint32(encryptedData, offset);
  offset += 4;
  const salt = encryptedData.subarray(offset, offset + saltLen);
  offset += saltLen;

  // IV
  const ivLen = readUint32(encryptedData, offset);
  offset += 4;
  const iv = encryptedData.subarray(offset, offset + ivLen);
  offset += ivLen;

  // Auth tag
  const tagLen = readUint32(encryptedData, offset);
  offset += 4;
  const authTag = encryptedData.subarray(offset, offset + tagLen);
  offset += tagLen;

  // Ciphertext
  const ciphertext = encryptedData.subarray(offset);

  // Decrypt
  const key = deriveKey(passphrase, Buffer.from(salt));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv));
  decipher.setAuthTag(Buffer.from(authTag));

  try {
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  } catch {
    throw new Error('Decryption failed: incorrect passphrase or corrupted file');
  }
}
