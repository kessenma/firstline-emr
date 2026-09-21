import type { DashboardFilters } from './types';
import { DEFAULT_DASHBOARD_FILTERS } from './constants';
import { isCareTeamMember } from '../care-team/chart-access';

/**
 * The one patient-dashboard filter predicate, shared by web and mobile.
 *
 * Both platforms used to hand-roll this and had drifted: web matched care-team
 * membership on email while mobile matched on userId, and "conflicts only" with
 * an empty conflict list showed everything on web but nothing on mobile.
 */

export type DashboardFilterKey =
  | 'viewMode'
  | 'search'
  | 'status'
  | 'priority'
  | 'specialty'
  | 'hospital'
  | 'missionIds'
  | 'careTeamScope'
  | 'showFollowUps'
  | 'showUnassignedSpecialty'
  | 'showConflictsOnly'
  | 'showTelegramOnly';

const DISCHARGED = 'Post-Op / Discharged';

export interface FilterablePatient {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  chiefComplaint?: string | null;
  status?: string | null;
  priority?: string | null;
  specialties?: string[] | null;
  hospital?: string | null;
  missionId?: string | null;
  telegramChatId?: string | null;
  careTeam?: Array<{
    userId?: string | null;
    email?: string | null;
    userEmail?: string | null;
    isLead?: boolean | null;
  }> | null;
}

export interface DashboardFilterContext {
  currentUserId?: string | null;
  currentUserEmail?: string | null;
  followUpPatientIds?: ReadonlySet<string>;
  conflictPatientIds?: ReadonlySet<string>;
  /**
   * Predicates the caller's data layer already applied, so they are skipped here.
   *
   * Web resolves three of these at the *endpoint* layer rather than in a
   * predicate: `viewMode` and `showUnassignedSpecialty` choose which API route
   * to call, and `showFollowUps` swaps in an entirely different view. Re-running
   * them client-side would wrongly empty the list.
   */
  prefiltered?: DashboardFilterKey[];
}

function matchesSearch(patient: FilterablePatient, search: string): boolean {
  const q = search.toLowerCase().trim();
  if (!q) return true;
  return (
    (patient.firstName || '').toLowerCase().includes(q) ||
    (patient.lastName || '').toLowerCase().includes(q) ||
    (patient.chiefComplaint || '').toLowerCase().includes(q) ||
    (patient.id || '').toLowerCase().includes(q)
  );
}

export function applyDashboardFilters<T extends FilterablePatient>(
  patients: T[],
  filters: DashboardFilters,
  ctx: DashboardFilterContext = {},
): T[] {
  const skip = new Set(ctx.prefiltered ?? []);
  let result = patients;

  // viewMode. 'active' hides discharged patients, but only when no explicit
  // status filter is set — an explicit status always wins.
  if (!skip.has('viewMode')) {
    if (filters.viewMode === 'active' && !filters.status) {
      result = result.filter((p) => p.status !== DISCHARGED);
    } else if (filters.viewMode === 'discharged') {
      result = result.filter((p) => p.status === DISCHARGED);
    }
  }

  if (!skip.has('search') && filters.search?.trim()) {
    result = result.filter((p) => matchesSearch(p, filters.search));
  }

  if (!skip.has('status') && filters.status) {
    result = result.filter((p) => p.status === filters.status);
  }

  if (!skip.has('priority') && filters.priority) {
    result = result.filter((p) => p.priority === filters.priority);
  }

  if (!skip.has('specialty') && filters.specialty) {
    result = result.filter(
      (p) => Array.isArray(p.specialties) && p.specialties.includes(filters.specialty!),
    );
  }

  if (!skip.has('hospital') && filters.hospital) {
    result = result.filter((p) => p.hospital === filters.hospital);
  }

  // A patient with no missionId is excluded once any mission is selected.
  if (!skip.has('missionIds') && filters.missionIds.length > 0) {
    result = result.filter(
      (p) => !!p.missionId && filters.missionIds.includes(p.missionId),
    );
  }

  if (!skip.has('careTeamScope') && filters.careTeamScope !== 'all') {
    const wantsLead = filters.careTeamScope === 'im-lead';
    result = result.filter((p) => {
      if (!isCareTeamMember(p.careTeam, ctx.currentUserId, ctx.currentUserEmail)) {
        return false;
      }
      if (!wantsLead) return true;
      return (p.careTeam || []).some(
        (m) =>
          !!m?.isLead &&
          isCareTeamMember([m], ctx.currentUserId, ctx.currentUserEmail),
      );
    });
  }

  if (!skip.has('showFollowUps') && filters.showFollowUps) {
    const ids = ctx.followUpPatientIds;
    result = ids ? result.filter((p) => ids.has(p.id)) : [];
  }

  if (!skip.has('showUnassignedSpecialty') && filters.showUnassignedSpecialty) {
    result = result.filter((p) => !p.specialties || p.specialties.length === 0);
  }

  // "Only conflicts" with no conflicts means none — not everything. Web
  // previously no-opped on an empty list and showed the full dashboard.
  if (!skip.has('showConflictsOnly') && filters.showConflictsOnly) {
    const ids = ctx.conflictPatientIds;
    result = ids ? result.filter((p) => ids.has(p.id)) : [];
  }

  if (!skip.has('showTelegramOnly') && filters.showTelegramOnly) {
    result = result.filter((p) => Boolean(p.telegramChatId?.trim()));
  }

  return result;
}

/**
 * Apply a partial filter update, preserving the mutual exclusions both
 * platforms rely on. Previously duplicated in web's zustand setters and mobile's
 * `updateFilters`, which is how they drifted.
 */
export function reduceDashboardFilters(
  prev: DashboardFilters,
  partial: Partial<DashboardFilters>,
): DashboardFilters {
  const next: DashboardFilters = { ...prev, ...partial };

  if (partial.showFollowUps) {
    next.showUnassignedSpecialty = false;
    next.viewMode = 'active';
  }
  if (partial.showUnassignedSpecialty) {
    next.showFollowUps = false;
    next.viewMode = 'active';
  }
  // Switching view mode drops the two alternative views.
  if (partial.viewMode !== undefined) {
    next.showFollowUps = false;
    next.showUnassignedSpecialty = false;
  }

  return next;
}

/** Reset to defaults. Web previously kept `viewMode` on "Clear all", which left
 *  users stranded on Discharged with no visible filters to explain it. */
export function clearDashboardFilters(): DashboardFilters {
  return { ...DEFAULT_DASHBOARD_FILTERS };
}
