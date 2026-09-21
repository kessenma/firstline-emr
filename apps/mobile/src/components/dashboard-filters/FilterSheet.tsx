// apps/mobile/src/components/dashboard-filters/FilterSheet.tsx
// Main filter bottom sheet for the mobile patient dashboard.
// Matches the web FilterSheet sections: View Mode, Care Team Scope,
// Missions, Clinical Filters (Priority, Status, Specialty, Hospital),
// and Advanced toggles.

import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, Switch, StyleSheet } from 'react-native';
import { Trash2, ChevronDown, ChevronUp } from 'lucide-react-native';
import { BottomSheet } from '../BottomSheet';
import { ToggleCard } from './ToggleCard';
import { FilterPillGrid } from './FilterPillGrid';
import { MissionFilterSection } from './MissionFilterSection';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, typography } from '../../utils/theme';
import { PATIENT_STATUS_VALUES, PATIENT_PRIORITY_VALUES } from '../../types/enums';
import { DoctorSpecialties } from '../../data/doctorSpecialty';
import {
  VIEW_MODES,
  CARE_TEAM_SCOPES,
  DASHBOARD_PRIORITY_OPTIONS,
  shouldShowCareTeamScope,
} from '@fajr/shared/patient-dashboard';
import type { DashboardFilters } from '@fajr/shared/patient-dashboard';
import type { MissionOption } from '../../hooks/useMissions';
import type { PatientWithMessages } from '../../types/patient';

interface FilterSheetProps {
  visible: boolean;
  onClose: () => void;
  filters: DashboardFilters;
  onUpdateFilters: (partial: Partial<DashboardFilters>) => void;
  onClearFilters: () => void;
  activeFilterCount: number;
  accountType?: string;
  missions: MissionOption[];
  availableHospitals: string[];
  allPatients: PatientWithMessages[];
  conflictCount: number;
}


export function FilterSheet({
  visible,
  onClose,
  filters,
  onUpdateFilters,
  onClearFilters,
  activeFilterCount,
  accountType,
  missions,
  availableHospitals,
  allPatients,
  conflictCount,
}: FilterSheetProps) {
  const colors = useThemeColors();
  const [advancedExpanded, setAdvancedExpanded] = useState(false);

  const showCareTeamSection = shouldShowCareTeamScope(accountType);

  const visibleScopes = CARE_TEAM_SCOPES.filter(
    s => !s.doctorOnly || accountType === 'Doctor',
  );

  // Patient count by mission for the mission filter section
  const patientCountByMission = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allPatients) {
      if (p.missionId) {
        counts[p.missionId] = (counts[p.missionId] || 0) + 1;
      }
    }
    return counts;
  }, [allPatients]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Filters"
      snapPoint={85}
      showHandle={true}
      showCloseButton={true}
    >
      <View style={styles.content}>
        {/* Header with badge and clear */}
        {activeFilterCount > 0 && (
          <View style={styles.headerActions}>
            <View style={[styles.countBadge, { backgroundColor: colors.primary }]}>
              <Text style={[styles.countBadgeText, { color: colors.textInverse }]}>{activeFilterCount}</Text>
            </View>
            <TouchableOpacity
              onPress={onClearFilters}
              style={styles.clearButton}
              activeOpacity={0.7}
            >
              <Trash2 size={14} color={colors.error} />
              <Text style={[styles.clearButtonText, { color: colors.error }]}>
                Clear all
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* View Mode */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            View
          </Text>
          <View style={styles.toggleRow}>
            {VIEW_MODES.map(mode => (
              <View key={mode.value} style={styles.toggleItem}>
                <ToggleCard
                  label={mode.label}
                  isActive={
                    filters.viewMode === mode.value &&
                    !filters.showFollowUps &&
                    !filters.showUnassignedSpecialty
                  }
                  onPress={() =>
                    onUpdateFilters({
                      viewMode:
                        filters.viewMode === mode.value ? 'active' : mode.value,
                    })
                  }
                />
              </View>
            ))}
          </View>
        </View>

        {/* Care Team Scope */}
        {showCareTeamSection && (
          <View style={styles.section}>
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
              Care Team
            </Text>
            <View style={styles.toggleRow}>
              {visibleScopes.map(scope => (
                <View key={scope.value} style={styles.toggleItem}>
                  <ToggleCard
                    label={scope.label}
                    isActive={filters.careTeamScope === scope.value}
                    onPress={() =>
                      onUpdateFilters({
                        careTeamScope:
                          filters.careTeamScope === scope.value
                            ? 'all'
                            : scope.value,
                      })
                    }
                  />
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Divider */}
        <View style={[styles.divider, { borderColor: colors.divider }]} />

        {/* Mission Filter */}
        {missions.length > 0 && (
          <>
            <MissionFilterSection
              missions={missions}
              selectedMissionIds={filters.missionIds}
              onToggleMission={(missionId: string) => {
                const current = filters.missionIds;
                const updated = current.includes(missionId)
                  ? current.filter(id => id !== missionId)
                  : [...current, missionId];
                onUpdateFilters({ missionIds: updated });
              }}
              onClearMissions={() => onUpdateFilters({ missionIds: [] })}
              patientCountByMission={patientCountByMission}
            />
            <View style={[styles.divider, { borderColor: colors.divider }]} />
          </>
        )}

        {/* Clinical Filters */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            CLINICAL FILTERS
          </Text>

          <FilterPillGrid
            label="Priority"
            options={DASHBOARD_PRIORITY_OPTIONS}
            value={filters.priority}
            onChange={v => onUpdateFilters({ priority: v })}
          />

          <FilterPillGrid
            label="Status"
            options={PATIENT_STATUS_VALUES}
            value={filters.status}
            onChange={v => onUpdateFilters({ status: v })}
          />

          <FilterPillGrid
            label="Specialty"
            options={DoctorSpecialties}
            value={filters.specialty}
            onChange={v => onUpdateFilters({ specialty: v })}
          />

          {availableHospitals.length > 0 && (
            <FilterPillGrid
              label="Hospital"
              options={availableHospitals}
              value={filters.hospital}
              onChange={v => onUpdateFilters({ hospital: v })}
            />
          )}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { borderColor: colors.divider }]} />

        {/* Advanced */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.advancedHeader}
            onPress={() => setAdvancedExpanded(!advancedExpanded)}
            activeOpacity={0.7}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              ADVANCED
            </Text>
            {advancedExpanded ? (
              <ChevronUp size={16} color={colors.textSecondary} />
            ) : (
              <ChevronDown size={16} color={colors.textSecondary} />
            )}
          </TouchableOpacity>

          {advancedExpanded && (
            <View style={styles.advancedContent}>
              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Follow-Ups Only
                </Text>
                <Switch
                  value={filters.showFollowUps}
                  onValueChange={v =>
                    onUpdateFilters({ showFollowUps: v })
                  }
                  trackColor={{
                    false: colors.border,
                    true: colors.primary,
                  }}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Unassigned Specialty Only
                </Text>
                <Switch
                  value={filters.showUnassignedSpecialty}
                  onValueChange={v =>
                    onUpdateFilters({ showUnassignedSpecialty: v })
                  }
                  trackColor={{
                    false: colors.border,
                    true: colors.primary,
                  }}
                />
              </View>

              <View style={styles.switchRow}>
                <Text style={[styles.switchLabel, { color: colors.text }]}>
                  Telegram Patients Only
                </Text>
                <Switch
                  value={filters.showTelegramOnly}
                  onValueChange={v =>
                    onUpdateFilters({ showTelegramOnly: v })
                  }
                  trackColor={{
                    false: colors.border,
                    true: colors.primary,
                  }}
                />
              </View>

              {accountType === 'Triage' && (
                <View style={styles.switchRow}>
                  <View style={styles.switchLabelRow}>
                    <Text style={[styles.switchLabel, { color: colors.text }]}>
                      Conflicts Only
                    </Text>
                    {conflictCount > 0 && (
                      <View
                        style={[
                          styles.conflictBadge,
                          { backgroundColor: colors.error },
                        ]}
                      >
                        <Text style={[styles.conflictBadgeText, { color: colors.textInverse }]}>
                          {conflictCount}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Switch
                    value={filters.showConflictsOnly}
                    onValueChange={v =>
                      onUpdateFilters({ showConflictsOnly: v })
                    }
                    trackColor={{
                      false: colors.border,
                      true: colors.primary,
                    }}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  countBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    // color set inline via colors.textInverse
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  clearButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  section: {
    gap: spacing.md,
  },
  sectionLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  toggleItem: {
    flex: 1,
  },
  divider: {
    borderTopWidth: 1,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  advancedContent: {
    gap: spacing.md,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontSize: typography.fontSize.base,
  },
  switchLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  conflictBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  conflictBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    // color set inline via colors.textInverse
  },
});
