import * as Keychain from 'react-native-keychain';

const SERVICE_NAME = 'fajr-emr-sqlcipher';

/**
 * Manages the SQLCipher encryption key for the local PowerSync database.
 * Key is stored in iOS Keychain / Android Keystore (hardware-backed).
 */
export async function getOrCreateEncryptionKey(): Promise<string> {
  // Try to retrieve existing key
  const existing = await Keychain.getGenericPassword({ service: SERVICE_NAME });
  if (existing) {
    return existing.password;
  }

  // Generate a 32-byte random hex key
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hexKey = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Store in keychain (not backed up to iCloud, only available when device unlocked)
  await Keychain.setGenericPassword('sqlcipher', hexKey, {
    service: SERVICE_NAME,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });

  console.log('[EncryptionKeyManager] Generated and stored new encryption key');
  return hexKey;
}

export async function deleteEncryptionKey(): Promise<void> {
  await Keychain.resetGenericPassword({ service: SERVICE_NAME });
  console.log('[EncryptionKeyManager] Encryption key deleted');
}
