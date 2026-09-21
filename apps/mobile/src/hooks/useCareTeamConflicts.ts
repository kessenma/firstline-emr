// apps/mobile/src/hooks/useCareTeamConflicts.ts
// Conflict awareness hook — queries care_team_conflicts synced from server

import { useMemo } from 'react';
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '../db/powerSyncSchema';
import type { CareTeamConflict } from '../types/patient';

function mapRowToConflict(row: any): CareTeamConflict {
  let conflictingUserIds: string[] = [];
  try {
    if (row.conflicting_user_ids && typeof row.conflicting_user_ids === 'string') {
      // Stored as PostgreSQL text[] serialized — could be JSON array or {a,b,c} format
      const raw = row.conflicting_user_ids;
      if (raw.startsWith('[')) {
        conflictingUserIds = JSON.parse(raw);
      } else if (raw.startsWith('{')) {
        conflictingUserIds = raw.slice(1, -1).split(',').filter(Boolean);
      } else {
        conflictingUserIds = raw.split(',').filter(Boolean);
      }
    }
  } catch {
    conflictingUserIds = [];
  }

  return {
    id: row.id,
    patientId: row.patient_id,
    conflictingUserIds,
    status: row.status,
    resolvedBy: row.resolved_by,
    resolvedAt: row.resolved_at,
    resolutionNotes: row.resolution_notes,
    createdAt: row.created_at,
  };
}

export function useCareTeamConflicts(patientId?: string) {
  const query = usePowerSyncQuery<any>(
    patientId
      ? `SELECT * FROM ${TABLES.CARE_TEAM_CONFLICTS} WHERE patient_id = ? AND status = 'unresolved'`
      : `SELECT * FROM ${TABLES.CARE_TEAM_CONFLICTS} WHERE status = 'unresolved'`,
    patientId ? [patientId] : [],
    { enabled: true },
  );

  const conflicts = useMemo((): CareTeamConflict[] => {
    if (!query.data) return [];
    return query.data.map(mapRowToConflict);
  }, [query.data]);

  const hasConflict = conflicts.length > 0;

  return {
    conflicts,
    hasConflict,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}