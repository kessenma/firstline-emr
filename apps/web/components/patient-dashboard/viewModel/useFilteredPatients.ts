// apps/web/components/patient-dashboard/viewModel/useFilteredPatients.ts
import { useMemo } from "react";
import { applyDashboardFilters } from "@fajr/shared/patient-dashboard";
import type { PatientWithMessages } from "./types";
import useDashboardStore from "@/stores/useDashboardStore";

/**
 * Client-side dashboard filtering, via the predicate shared with mobile.
 *
 * NOTE: doctors intentionally see every patient here. Specialty is enforced
 * when opening a chart, not by hiding rows — hiding them made patients a
 * doctor had just created invisible to them (they have no `triagedBy` yet).
 *
 * `viewMode`, `showFollowUps` and `showUnassignedSpecialty` are marked
 * prefiltered because web resolves them above this layer: they select the API
 * route (`/api/patient` vs `/archived` vs `/unassigned-specialty`) or swap in a
 * different component tree. Re-applying them here would wrongly empty the list.
 */
export function useFilteredPatients(
  allPatients: PatientWithMessages[],
  session: { user?: { id?: string; email?: string } } | null,
  conflictPatientIds?: string[],
) {
  const { filters } = useDashboardStore();

  const sortedAndFilteredRows = useMemo(() => {
    if (!session?.user) return [];
    if (allPatients.length === 0) return [];

    const filtered = applyDashboardFilters(allPatients, filters, {
      currentUserId: session.user.id,
      currentUserEmail: session.user.email,
      conflictPatientIds: conflictPatientIds
        ? new Set(conflictPatientIds)
        : undefined,
      prefiltered: ["viewMode", "showFollowUps", "showUnassignedSpecialty"],
    });

    // Newest first, matching the API's own `ORDER BY created_at DESC`. This
    // previously sorted by UUID string, which is effectively random order.
    return [...filtered].sort((a, b) => {
      const at = new Date((a as any).createdAt ?? 0).getTime();
      const bt = new Date((b as any).createdAt ?? 0).getTime();
      return bt - at;
    });
  }, [allPatients, filters, session, conflictPatientIds]);

  return { sortedAndFilteredRows };
}
