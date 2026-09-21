// apps/mobile/src/hooks/useCareTeamActions.ts
// Care team CRUD actions hook for offline-first care team management

import { useMemo, useCallback } from 'react';
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '../db/powerSyncSchema';
import { generateUUID } from '../utils/uuid';
import { TokenStorage } from '../services/TokenStorage';
import { PowerSyncService } from '../services/powersync/PowerSyncService';
import type { CareTeamRole, CareTeamMember } from '../types/patient';

function mapRowToCareTeamMember(row: any): CareTeamMember {
  return {
    id: row.id,
    patientId: row.patient_id,
    userId: row.user_id,
    role: row.role as CareTeamRole,
    isLead: row.is_lead === 1,
    assignedAt: row.assigned_at,
    assignedBy: row.assigned_by,
    removedAt: row.removed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userName: row.user_name,
    userEmail: row.user_email,
    userAccountType: row.user_account_type,
  };
}

export function useCareTeam(patientId: string) {
  const currentUserId = useMemo(
    () => String(TokenStorage.getUser()?.id || ''),
    [],
  );

  // Query active care team members with user info via JOIN
  const query = usePowerSyncQuery<any>(
    `SELECT pct.*, u.first_name || ' ' || u.last_name AS user_name, u.email AS user_email, u.account_type AS user_account_type
     FROM ${TABLES.PATIENT_CARE_TEAM} pct
     LEFT JOIN ${TABLES.USERS} u ON pct.user_id = u.id
     WHERE pct.patient_id = ? AND pct.removed_at IS NULL
     ORDER BY pct.is_lead DESC, pct.assigned_at ASC`,
    patientId ? [patientId] : [],
    { enabled: !!patientId },
  );

  const careTeam = useMemo((): CareTeamMember[] => {
    if (!query.data) return [];
    return query.data.map(mapRowToCareTeamMember);
  }, [query.data]);

  const isCurrentUserOnTeam = useMemo(
    () => careTeam.some((m) => m.userId === currentUserId),
    [careTeam, currentUserId],
  );

  const isCurrentUserLead = useMemo(
    () => careTeam.some((m) => m.userId === currentUserId && m.isLead),
    [careTeam, currentUserId],
  );

  const currentUserMember = useMemo(
    () => careTeam.find((m) => m.userId === currentUserId) ?? null,
    [careTeam, currentUserId],
  );

  const joinAsRole = useCallback(
    async (role: CareTeamRole, isLead: boolean = false) => {
      const service = PowerSyncService.getInstance();
      const now = new Date().toISOString();
      await service.insert(TABLES.PATIENT_CARE_TEAM, {
        id: generateUUID(),
        patient_id: patientId,
        user_id: currentUserId,
        role,
        is_lead: isLead ? 1 : 0,
        assigned_at: now,
        assigned_by: currentUserId,
        removed_at: null,
        created_at: now,
        updated_at: now,
      });
    },
    [patientId, currentUserId],
  );

  const yieldLead = useCallback(async () => {
    if (!currentUserMember) return;
    const service = PowerSyncService.getInstance();
    await service.update(TABLES.PATIENT_CARE_TEAM, currentUserMember.id, {
      is_lead: 0,
      updated_at: new Date().toISOString(),
    });
  }, [currentUserMember]);

  const leaveTeam = useCallback(async () => {
    if (!currentUserMember) return;
    const service = PowerSyncService.getInstance();
    await service.update(TABLES.PATIENT_CARE_TEAM, currentUserMember.id, {
      removed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }, [currentUserMember]);

  return {
    careTeam,
    loading: query.isLoading,
    error: query.error,
    isCurrentUserOnTeam,
    isCurrentUserLead,
    currentUserMember,
    joinAsRole,
    yieldLead,
    leaveTeam,
    refresh: query.refetch,
  };
}