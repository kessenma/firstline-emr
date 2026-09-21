// apps/mobile/src/components/calls/useStaffDirectory.ts
//
// The staff list behind the Contacts tab.
//
// PowerSync first: the `staff_directory` bucket syncs every authorized user to
// the device, so searching colleagues works with no connectivity — which is the
// whole point on a mission. The API is a fallback for the window before that
// bucket has synced (or if sync rules are older than the app).
//
// Search runs locally against the synced rows rather than round-tripping to
// /api/users/directory, so typing stays instant offline.

import { useEffect, useMemo, useState } from 'react';
import type { DirectoryUser } from '@fajr/shared/calls';
import { usePowerSyncQuery } from '../../hooks/powersync';
import { useCallDirectoryStore } from '../../stores/useCallDirectoryStore';
import { useAuth } from '../../contexts/AuthContext';
import { getApiUrl } from '../../config';
import { getStoredToken } from '../../utils/storage';

interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  account_type: string | null;
  doctor_specialty: string | null;
  image: string | null;
  google_image: string | null;
}

export interface StaffDirectoryResult {
  users: DirectoryUser[];
  loading: boolean;
  /** Which store answered — drives the "Available offline" hint. */
  source: 'powersync' | 'api' | 'none';
}

/** doctor_specialty arrives as a JSON array in a text column. */
function parseSpecialty(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(s => typeof s === 'string') : null;
  } catch {
    return null;
  }
}

function mapRow(row: UserRow): DirectoryUser {
  return {
    id: row.id,
    email: row.email ?? '',
    firstName: row.first_name ?? '',
    lastName: row.last_name ?? '',
    accountType: row.account_type ?? '',
    image: row.image || row.google_image || null,
    doctorSpecialty: parseSpecialty(row.doctor_specialty),
  };
}

function matches(user: DirectoryUser, needle: string): boolean {
  if (!needle) return true;
  const q = needle.toLowerCase();
  return (
    user.firstName.toLowerCase().includes(q) ||
    user.lastName.toLowerCase().includes(q) ||
    user.email.toLowerCase().includes(q) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(q)
  );
}

export function useStaffDirectory(query: string): StaffDirectoryResult {
  const { user } = useAuth();
  const currentUserId = user?.id ?? '';

  // `authorized = 1` rather than `!= 0`: the column is nullable and NULL rows
  // exist for users who have never been reviewed.
  const { data: rows, loading: psLoading } = usePowerSyncQuery<UserRow>(
    `SELECT id, first_name, last_name, email, account_type,
            doctor_specialty, image, google_image
       FROM users
      WHERE authorized = 1 AND id != ?
      ORDER BY last_name COLLATE NOCASE, first_name COLLATE NOCASE`,
    [currentUserId],
    { enabled: !!currentUserId },
  );

  const synced = useMemo(() => (rows ?? []).map(mapRow), [rows]);

  // The query already excludes the current user, so zero rows means the
  // staff_directory bucket has not synced yet and we need the network.
  const needsFallback = !psLoading && synced.length === 0;

  // Survives closing the sheet, so reopening while the bucket is still
  // unsynced doesn't re-run the request behind a spinner.
  const apiUsers = useCallDirectoryStore(s => s.contactsFallback);
  const setApiUsers = useCallDirectoryStore(s => s.setContactsFallback);
  const isFallbackStale = useCallDirectoryStore(s => s.isContactsStale);
  const [apiLoading, setApiLoading] = useState(false);

  useEffect(() => {
    if (!needsFallback) return;
    if (apiUsers.length > 0 && !isFallbackStale()) return;
    let cancelled = false;

    (async () => {
      setApiLoading(true);
      try {
        const token = await getStoredToken();
        const res = await fetch(getApiUrl('/users/directory?limit=100'), {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error('directory fetch failed');
        const data = await res.json();
        if (!cancelled) setApiUsers(data.users ?? []);
      } catch (err) {
        // Leave any previously cached list in place — a failed refresh should
        // not empty a working directory.
        console.warn('[Calls] directory fallback failed:', err);
      } finally {
        if (!cancelled) setApiLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Store selectors are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needsFallback]);

  const source: StaffDirectoryResult['source'] = synced.length
    ? 'powersync'
    : apiUsers.length
      ? 'api'
      : 'none';

  const pool = synced.length ? synced : apiUsers;
  const users = useMemo(
    () => pool.filter(u => matches(u, query.trim())),
    [pool, query],
  );

  return { users, loading: psLoading || apiLoading, source };
}
