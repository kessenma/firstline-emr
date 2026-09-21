// Central definition of where the PowerSync SQLite files actually live, and the
// only supported way to delete them.
//
// This exists because every "wipe the local database" path in this service used
// to build its paths from DocumentDirectoryPath, while op-sqlite actually
// creates the database under the app's Library directory. The result was that
// none of them deleted anything: the recovery path in PowerSyncService threw
// away the encryption key and then retried the same undeleted database with a
// new key, migrateToCipherDb never removed the legacy unencrypted database, and
// the user-facing "Reset Local Data" button left all data in place.
//
// We sweep BOTH directories deliberately. Library is where op-sqlite puts the
// file today, Documents is where older builds of this app expected it, and the
// default is op-sqlite's to change across the major-version upgrades this app
// goes through. Deleting a path that does not exist is free; missing one is not.

import {
  DocumentDirectoryPath,
  LibraryDirectoryPath,
  exists,
  unlink,
} from '@dr.pogodin/react-native-fs';

/** The encrypted (SQLCipher) database PowerSync uses. */
export const DB_NAME = 'fajr-emr-enc.db';

/** The pre-SQLCipher database, removed once by migrateToCipherDb(). */
export const LEGACY_DB_NAME = 'fajr-emr.db';

// SQLite keeps its write-ahead log and shared-memory index beside the database.
// Deleting the main file alone leaves a -wal that SQLite will happily replay.
const SQLITE_SUFFIXES = ['', '-wal', '-shm'] as const;

const SEARCH_DIRS = [LibraryDirectoryPath, DocumentDirectoryPath];

/** Every path a given database could occupy, across both directories. */
export function dbFilePaths(dbName: string): string[] {
  return SEARCH_DIRS.flatMap(dir =>
    SQLITE_SUFFIXES.map(suffix => `${dir}/${dbName}${suffix}`),
  );
}

/**
 * Delete a database and its sidecar files wherever they exist.
 *
 * Never throws — callers are all in recovery paths where failing to delete one
 * file should not abort the rest of the reset. Returns the paths actually
 * removed so callers can log something truthful.
 */
export async function deleteDbFiles(dbName: string): Promise<string[]> {
  const deleted: string[] = [];

  for (const path of dbFilePaths(dbName)) {
    try {
      if (await exists(path)) {
        await unlink(path);
        deleted.push(path);
      }
    } catch (error) {
      console.warn(`[powersync/dbFiles] Failed to delete ${path}:`, error);
    }
  }

  return deleted;
}
