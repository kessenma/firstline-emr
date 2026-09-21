"use client";

import { useState, useCallback, useEffect } from "react";
import useDashboardStore from "@/stores/useDashboardStore";
import {
  type DashboardFilters,
  DEFAULT_DASHBOARD_FILTERS,
} from "@fajr/shared/patient-dashboard";

/** Presets now store the shared `DashboardFilters` verbatim. `search` is
 *  deliberately excluded — a saved view shouldn't pin a search term. */
export type FilterPresetState = Omit<DashboardFilters, "search">;

export interface FilterPreset {
  id: string;
  name: string;
  isBuiltIn: boolean;
  filters: FilterPresetState;
}

/** Bumped from "dashboard-filter-presets": the old shape used `priorityFilter`
 *  style keys with the string "all" as its "no filter" sentinel. Reading those
 *  as-is would leave a literal "all" in `status`, silently filtering everything
 *  out. Migrated on read, then written back under the new key. */
const STORAGE_KEY = "dashboard-filter-presets-v2";
const LEGACY_STORAGE_KEY = "dashboard-filter-presets";
const MAX_USER_PRESETS = 5;

const BASE: FilterPresetState = (() => {
  const { search: _search, ...rest } = DEFAULT_DASHBOARD_FILTERS;
  return rest;
})();

const BUILT_IN_PRESETS: FilterPreset[] = [
  {
    id: "builtin-my-urgent",
    name: "My urgent cases",
    isBuiltIn: true,
    filters: { ...BASE, careTeamScope: "my-cases", priority: "Urgent" },
  },
  {
    id: "builtin-unassigned-leads",
    name: "Unassigned leads",
    isBuiltIn: true,
    filters: { ...BASE, showUnassignedSpecialty: true },
  },
];

/** `"all"`/`""` were the old "no filter" sentinels; both become undefined. */
function fromSentinel(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return !trimmed || trimmed === "all" ? undefined : trimmed;
}

function migratePreset(raw: any): FilterPreset | null {
  if (!raw || typeof raw !== "object" || !raw.filters) return null;
  const f = raw.filters;

  // Legacy 'archived' viewMode predates the rename to 'discharged'.
  const viewMode = f.viewMode === "archived" ? "discharged" : f.viewMode;

  return {
    id: String(raw.id ?? `user-${raw.name ?? "preset"}`),
    name: String(raw.name ?? "Untitled"),
    isBuiltIn: false,
    filters: {
      ...BASE,
      viewMode: viewMode ?? BASE.viewMode,
      careTeamScope: f.careTeamScope ?? BASE.careTeamScope,
      // Accept both the new keys and the legacy *Filter ones.
      status: fromSentinel(f.status ?? f.statusFilter),
      priority: fromSentinel(f.priority ?? f.priorityFilter),
      specialty: fromSentinel(f.specialty ?? f.specialtyFilter),
      hospital: fromSentinel(f.hospital ?? f.hospitalFilter),
      missionIds: Array.isArray(f.missionIds)
        ? f.missionIds
        : Array.isArray(f.missionFilter)
          ? f.missionFilter
          : [],
      showFollowUps: !!f.showFollowUps,
      showUnassignedSpecialty: !!f.showUnassignedSpecialty,
      showConflictsOnly: !!f.showConflictsOnly,
      showTelegramOnly: !!f.showTelegramOnly,
    },
  };
}

function loadUserPresets(): FilterPreset[] {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) {
      return (JSON.parse(current) as any[])
        .map(migratePreset)
        .filter((p): p is FilterPreset => p !== null);
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return [];

    const migrated = (JSON.parse(legacy) as any[])
      .map(migratePreset)
      .filter((p): p is FilterPreset => p !== null);
    // Write back once so the migration doesn't re-run on every load.
    saveUserPresets(migrated);
    return migrated;
  } catch {
    return [];
  }
}

function saveUserPresets(presets: FilterPreset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // localStorage full or unavailable
  }
}

function toPresetState(filters: DashboardFilters): FilterPresetState {
  const { search: _search, ...rest } = filters;
  return { ...rest, missionIds: [...rest.missionIds] };
}

function filtersMatch(a: FilterPresetState, b: FilterPresetState): boolean {
  // Copy before sorting — this used to sort in place and mutate BUILT_IN_PRESETS.
  const aMissions = [...a.missionIds].sort();
  const bMissions = [...b.missionIds].sort();
  return (
    a.viewMode === b.viewMode &&
    a.careTeamScope === b.careTeamScope &&
    a.status === b.status &&
    a.priority === b.priority &&
    a.specialty === b.specialty &&
    a.hospital === b.hospital &&
    a.showFollowUps === b.showFollowUps &&
    a.showUnassignedSpecialty === b.showUnassignedSpecialty &&
    a.showConflictsOnly === b.showConflictsOnly &&
    a.showTelegramOnly === b.showTelegramOnly &&
    JSON.stringify(aMissions) === JSON.stringify(bMissions)
  );
}

export function useFilterPresets() {
  const [userPresets, setUserPresets] = useState<FilterPreset[]>([]);
  // Subscribed, not read via getState(): the active-preset highlight used to be
  // computed outside any subscription and stayed stale until an unrelated render.
  const filters = useDashboardStore((s) => s.filters);
  const updateFilters = useDashboardStore((s) => s.updateFilters);

  useEffect(() => {
    setUserPresets(loadUserPresets());
  }, []);

  const presets = [...BUILT_IN_PRESETS, ...userPresets];

  const savePreset = useCallback(
    (name: string): { success: boolean; error?: string } => {
      if (userPresets.length >= MAX_USER_PRESETS) {
        return { success: false, error: `Maximum ${MAX_USER_PRESETS} saved presets` };
      }
      if (!name.trim()) {
        return { success: false, error: "Name is required" };
      }

      const newPreset: FilterPreset = {
        id: `user-${Date.now()}`,
        name: name.trim(),
        isBuiltIn: false,
        filters: toPresetState(filters),
      };

      const updated = [...userPresets, newPreset];
      setUserPresets(updated);
      saveUserPresets(updated);
      return { success: true };
    },
    [userPresets, filters],
  );

  const deletePreset = useCallback(
    (id: string) => {
      const updated = userPresets.filter((p) => p.id !== id);
      setUserPresets(updated);
      saveUserPresets(updated);
    },
    [userPresets],
  );

  // One atomic update. Previously ten sequential setters whose coupling meant
  // order decided the result — a preset with viewMode 'discharged' AND
  // showFollowUps could not round-trip.
  const applyPreset = useCallback(
    (preset: FilterPreset) => {
      updateFilters(preset.filters);
    },
    [updateFilters],
  );

  const currentState = toPresetState(filters);
  const activePresetId =
    presets.find((p) => filtersMatch(p.filters, currentState))?.id ?? null;

  return {
    presets,
    activePresetId,
    savePreset,
    deletePreset,
    applyPreset,
    canSaveMore: userPresets.length < MAX_USER_PRESETS,
  };
}
