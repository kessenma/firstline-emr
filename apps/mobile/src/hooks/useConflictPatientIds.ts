// apps/mobile/src/hooks/useConflictPatientIds.ts
// Returns a Set of patient IDs with unresolved care team conflicts (for "Conflicts Only" filter)

import { useMemo } from 'react';
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '@/db';

export function useConflictPatientIds(): {
  conflictPatientIds: Set<string>;
  conflictCount: number;
  loading: boolean;
} {
  const query = usePowerSyncQuery<{ patient_id: string }>(
    `SELECT DISTINCT patient_id
     FROM ${TABLES.CARE_TEAM_CONFLICTS}
     WHERE status = 'unresolved'`,
    [],
    { refetchInterval: 30000 },
  );

  const conflictPatientIds = useMemo(() => {
    if (!query.data) return new Set<string>();
    return new Set(query.data.map(row => row.patient_id));
  }, [query.data]);

  return {
    conflictPatientIds,
    conflictCount: conflictPatientIds.size,
    loading: query.isLoading,
  };
}
