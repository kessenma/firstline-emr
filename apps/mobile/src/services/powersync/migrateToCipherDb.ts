import { storage } from '../../utils/mmkv';
import { LEGACY_DB_NAME, deleteDbFiles } from './dbFiles';

const MIGRATION_FLAG = 'sqlcipher_migrated';

/**
 * One-time migration: delete the old unencrypted database so PowerSync
 * creates a fresh encrypted one. Data re-syncs from the server automatically.
 *
 * Paths come from dbFiles so this searches where op-sqlite actually writes.
 * The previous implementation only looked under DocumentDirectoryPath and so
 * never deleted anything — meaning an unencrypted patient database could still
 * be sitting on disk on any device that had one.
 */
export async function migrateToCipherDb(): Promise<void> {
  if (storage.getBoolean(MIGRATION_FLAG)) {
    return;
  }

  const deleted = await deleteDbFiles(LEGACY_DB_NAME);

  storage.set(MIGRATION_FLAG, true);

  if (deleted.length > 0) {
    console.log(
      `[migrateToCipherDb] Migration complete — removed ${deleted.length} legacy unencrypted DB file(s)`,
    );
  } else {
    console.log('[migrateToCipherDb] Migration complete — no legacy unencrypted DB found');
  }
}
