// apps/mobile/src/hooks/useFollowUpPatientIds.ts
// Returns a Set of patient IDs that have follow-up records (for "Follow-Ups Only" filter)

import { useMemo } from 'react';
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '@/db';

export function useFollowUpPatientIds(): {
  followUpPatientIds: Set<string>;
  loading: boolean;
} {
  const query = usePowerSyncQuery<{ patient_id: string }>(
    `SELECT DISTINCT tt.patient_id
     FROM ${TABLES.PATIENT_FOLLOW_UPS} pfu
     JOIN ${TABLES.TELEGRAM_THREADS} tt ON pfu.telegram_thread_id = tt.id
     WHERE tt.patient_id IS NOT NULL`,
    [],
    { refetchInterval: 30000 },
  );

  const followUpPatientIds = useMemo(() => {
    if (!query.data) return new Set<string>();
    return new Set(query.data.map(row => row.patient_id));
  }, [query.data]);

  return { followUpPatientIds, loading: query.isLoading };
}
