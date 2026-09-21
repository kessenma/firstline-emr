import type { DashboardFilters, DashboardUserSession, MissionStatusGroup } from './types';
import { PATIENT_STATUS_VALUES, PATIENT_PRIORITY_VALUES } from '../patient/enums';

// ── Filter counting ──

export function getActiveFilterCount(filters: DashboardFilters): number {
  let count = 0;
  if (filters.status) count++;
  if (filters.priority) count++;
  if (filters.specialty) count++;
  if (filters.hospital) count++;
  if (filters.missionIds.length > 0) count++;
  if (filters.careTeamScope !== 'all') count++;
  if (filters.showFollowUps) count++;
  if (filters.showUnassignedSpecialty) count++;
  if (filters.showConflictsOnly) count++;
  if (filters.showTelegramOnly) count++;
  return count;
}

// ── Mission grouping ──

export function classifyMissionStatus(status: string): MissionStatusGroup {
  const lower = status.toLowerCase();
  if (lower === 'completed' || lower === 'archived') return 'completed';
  if (lower === 'planned' || lower === 'upcoming' || lower === 'draft') return 'planned';
  return 'active';
}

// ── Business rules ──

export function canEditSpecialty(
  session: DashboardUserSession | null,
  status?: string,
  priority?: string,
): boolean {
  const isTriage = session?.user?.accountType === 'Triage';
  const hasValidStatus = Boolean(status && status !== 'Pre-Op / Not Cleared');
  const hasValidPriority = Boolean(priority && priority !== 'Not Selected');
  return Boolean(isTriage && hasValidStatus && hasValidPriority);
}

export function getSpecialtyTooltipMessage(
  session: DashboardUserSession | null,
  status?: string,
  priority?: string,
): string | null {
  if (session?.user?.accountType !== 'Triage') {
    return 'Only triage account types can select doctor specialties.';
  }
  if (!status || status === 'Pre-Op / Not Cleared' || !priority || priority === 'Not Selected') {
    return 'Select both Status and Priority before choosing a specialty.';
  }
  return null;
}

export function getFilteredStatusOptions(session: DashboardUserSession | null): readonly string[] {
  if (session?.user?.accountType === 'Doctor') {
    return PATIENT_STATUS_VALUES.filter((s) => s !== 'Pre-Op / Not Cleared');
  }
  return PATIENT_STATUS_VALUES;
}

export function getFilteredPriorityOptions(session: DashboardUserSession | null): readonly string[] {
  if (session?.user?.accountType === 'Doctor') {
    return PATIENT_PRIORITY_VALUES.filter((p) => p !== 'Not Selected');
  }
  return PATIENT_PRIORITY_VALUES;
}

export function isTriageUser(session: DashboardUserSession | null): boolean {
  return session?.user?.accountType === 'Triage';
}

export function isDoctorUser(session: DashboardUserSession | null): boolean {
  return session?.user?.accountType === 'Doctor';
}

export function shouldShowCareTeamScope(accountType?: string): boolean {
  return Boolean(accountType && ['Doctor', 'Triage'].includes(accountType));
}
