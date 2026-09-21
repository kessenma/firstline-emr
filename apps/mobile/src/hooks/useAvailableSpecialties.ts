// apps/mobile/src/hooks/useAvailableSpecialties.ts
// Queries PowerSync users table for authorized doctors' specialties (works offline)

import { useMemo } from 'react';
import { usePowerSyncQuery } from './powersync';
import { DoctorSpecialties, DoctorSpecialtyList } from '../data';

interface DoctorRow {
  doctor_specialty: string | null;
}

/**
 * Hook to get available doctor specialties from the local PowerSync database.
 * Queries the users table for authorized doctors and extracts their specialties.
 * Works fully offline since the users table is synced via PowerSync.
 */
export function useAvailableSpecialties() {
  const { data, isLoading, error } = usePowerSyncQuery<DoctorRow>(
    `SELECT doctor_specialty FROM users WHERE account_type = 'Doctor' AND authorized = 1`,
    [],
    { staleTime: 1000 * 60 * 10 }, // 10 min stale time
  );

  const availableSpecialties = useMemo(() => {
    if (!data) return [];

    const specialtySet = new Set<string>();

    for (const row of data) {
      if (!row.doctor_specialty) continue;
      try {
        const parsed = JSON.parse(row.doctor_specialty);
        if (Array.isArray(parsed)) {
          for (const s of parsed) {
            if (typeof s === 'string') specialtySet.add(s);
          }
        } else if (typeof parsed === 'string') {
          specialtySet.add(parsed);
        }
      } catch {
        // If it's not JSON, treat it as a plain string
        if (typeof row.doctor_specialty === 'string' && row.doctor_specialty.trim()) {
          specialtySet.add(row.doctor_specialty.trim());
        }
      }
    }

    // Only return specialties that are in the known DoctorSpecialties list
    return DoctorSpecialties.filter(s => specialtySet.has(s));
  }, [data]);

  const availabilitySet = useMemo(
    () => new Set(availableSpecialties),
    [availableSpecialties],
  );

  return {
    availableSpecialties,
    hasSpecialty: (specialty: string) => availabilitySet.has(specialty as DoctorSpecialtyList),
    isLoading,
    error,
  };
}
