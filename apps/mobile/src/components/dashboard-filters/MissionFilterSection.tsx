// apps/mobile/src/components/dashboard-filters/MissionFilterSection.tsx
// Multi-select mission filter with grouped sections (active, planned, completed)
// and patient count badges per mission.

import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';
import { palette } from '../../utils/colors';
import {
  type MissionStatusGroup,
  MISSION_GROUP_ORDER,
  MISSION_GROUP_LABELS,
  classifyMissionStatus,
} from '@fajr/shared/patient-dashboard';
import type { MissionOption } from '../../hooks/useMissions';

interface MissionFilterSectionProps {
  missions: MissionOption[];
  selectedMissionIds: string[];
  onToggleMission: (missionId: string) => void;
  onClearMissions: () => void;
  patientCountByMission: Record<string, number>;
}

export function MissionFilterSection({
  missions,
  selectedMissionIds,
  onToggleMission,
  onClearMissions,
  patientCountByMission,
}: MissionFilterSectionProps) {
  const colors = useThemeColors();
  const hasSelection = selectedMissionIds.length > 0;

  const grouped = useMemo(() => {
    const groups: Record<MissionStatusGroup, MissionOption[]> = {
      active: [],
      planned: [],
      completed: [],
    };

    for (const mission of missions) {
      const group = classifyMissionStatus(mission.status);
      groups[group].push(mission);
    }

    return groups;
  }, [missions]);

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          MISSIONS
        </Text>
        {hasSelection && (
          <TouchableOpacity onPress={onClearMissions} activeOpacity={0.7}>
            <Text style={[styles.clearButton, { color: colors.primary }]}>
              Clear
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Grouped mission lists */}
      {MISSION_GROUP_ORDER.map((group) => {
        const groupMissions = grouped[group];
        if (groupMissions.length === 0) return null;

        const isCompleted = group === 'completed';

        return (
          <View
            key={group}
            style={[styles.groupContainer, isCompleted && styles.completedGroup]}
          >
            <Text style={[styles.groupHeader, { color: colors.textTertiary }]}>
              {MISSION_GROUP_LABELS[group]}
            </Text>

            {groupMissions.map((mission) => {
              const isSelected = selectedMissionIds.includes(mission.id);
              const count = patientCountByMission[mission.id] ?? 0;
              const subtitle = [mission.country, mission.city]
                .filter(Boolean)
                .join(' / ');

              return (
                <TouchableOpacity
                  key={mission.id}
                  onPress={() => onToggleMission(mission.id)}
                  activeOpacity={0.7}
                  style={[
                    styles.missionRow,
                    {
                      backgroundColor: isSelected
                        ? colors.backgroundSecondary
                        : 'transparent',
                      borderColor: colors.divider,
                    },
                  ]}
                >
                  {/* Checkbox */}
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: isSelected
                          ? colors.primary
                          : colors.border,
                        backgroundColor: isSelected
                          ? colors.primary
                          : 'transparent',
                      },
                    ]}
                  >
                    {isSelected && (
                      <Check size={14} color="#FFFFFF" strokeWidth={3} />
                    )}
                  </View>

                  {/* Mission info */}
                  <View style={styles.missionInfo}>
                    <View style={styles.missionNameRow}>
                      <Text
                        numberOfLines={1}
                        style={[styles.missionName, { color: colors.text }]}
                      >
                        {mission.name}
                      </Text>
                      {mission.isActiveIntake && (
                        <View
                          style={[
                            styles.intakeBadge,
                            { backgroundColor: palette.green[50] },
                          ]}
                        >
                          <Text
                            style={[
                              styles.intakeBadgeText,
                              { color: palette.green[700] },
                            ]}
                          >
                            Intake Open
                          </Text>
                        </View>
                      )}
                    </View>

                    {subtitle.length > 0 && (
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.missionSubtitle,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {subtitle}
                      </Text>
                    )}
                  </View>

                  {/* Patient count badge */}
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: colors.backgroundSecondary },
                    ]}
                  >
                    <Text
                      style={[
                        styles.countBadgeText,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {count}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        );
      })}

      {/* Empty state */}
      {missions.length === 0 && (
        <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
          No missions available
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  clearButton: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  groupContainer: {
    gap: spacing.xs,
  },
  completedGroup: {
    opacity: 0.5,
  },
  groupHeader: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.xs,
    marginBottom: spacing.xxs,
  },
  missionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    gap: spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: borderRadius.sm,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  missionInfo: {
    flex: 1,
    gap: spacing.xxs,
  },
  missionNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  missionName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    flexShrink: 1,
  },
  intakeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderRadius: borderRadius.pill,
    flexShrink: 0,
  },
  intakeBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  missionSubtitle: {
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  countBadge: {
    minWidth: 28,
    height: 24,
    borderRadius: borderRadius.pill,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    flexShrink: 0,
  },
  countBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  emptyText: {
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
    paddingVertical: spacing.lg,
  },
});
