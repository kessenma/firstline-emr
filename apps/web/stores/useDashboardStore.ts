// apps/web/stores/useDashboardStore.ts
import { create } from 'zustand';
import {
    type DashboardFilters,
    DEFAULT_DASHBOARD_FILTERS,
    reduceDashboardFilters,
    clearDashboardFilters,
} from '@fajr/shared/patient-dashboard';

/**
 * Dashboard filter state, shaped as the shared `DashboardFilters` so web and
 * mobile hold the same object and run the same predicate.
 *
 * This replaced a split shape (`filters: { priorityFilter, statusFilter, … }`
 * plus six top-level fields) that used the string `"all"` as its "no filter"
 * sentinel. `undefined` means "no filter" now; `careTeamScope: 'all'` and
 * `viewMode: 'all'` are still real domain values and are unaffected.
 *
 * Not persisted — an earlier `persist()` wrapper was removed, which is why the
 * `create<T>()(…)` double-parens remain.
 */
interface DashboardStore {
    filters: DashboardFilters;
    /** Applies mutual-exclusion rules via the shared reducer. */
    updateFilters: (partial: Partial<DashboardFilters>) => void;
    toggleMission: (missionId: string) => void;
    clearFilters: () => void;
}

const useDashboardStore = create<DashboardStore>()((set) => ({
    filters: { ...DEFAULT_DASHBOARD_FILTERS },

    updateFilters: (partial) =>
        set((state) => ({
            filters: reduceDashboardFilters(state.filters, partial),
        })),

    toggleMission: (missionId) =>
        set((state) => {
            const current = state.filters.missionIds;
            return {
                filters: reduceDashboardFilters(state.filters, {
                    missionIds: current.includes(missionId)
                        ? current.filter((id) => id !== missionId)
                        : [...current, missionId],
                }),
            };
        }),

    clearFilters: () => set({ filters: clearDashboardFilters() }),
}));

export default useDashboardStore;
