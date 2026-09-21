// apps/mobile/src/screens/patient-dashboard/DashboardHelpSheet.tsx
// The "how does this work" explainer. Content comes from
// @fajr/shared/patient-dashboard so it cannot drift from the web version.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BottomSheet } from '../../components/BottomSheet';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, typography } from '../../utils/theme';
import {
  getDashboardHelpSections,
  getDashboardHelpTitle,
  type DashboardHelpView,
} from '@fajr/shared/patient-dashboard';

interface DashboardHelpSheetProps {
  visible: boolean;
  onClose: () => void;
  accountType?: string;
  view?: DashboardHelpView;
}

/**
 * Follows the sheet rules documented on VideoCallSheet and BottomSheet: stays
 * mounted toggling `visible`, plain View content root (a `flex: 1` or Provider
 * root measures 0 and the sheet never presents), hooks in the body rather than
 * inside the portaled children, and a sibling of the other dashboard sheets.
 * Not `rawContent` — it has no list of its own, so it wants the default
 * BottomSheetScrollView wrapper.
 */
export const DashboardHelpSheet: React.FC<DashboardHelpSheetProps> = ({
  visible,
  onClose,
  accountType,
  view = 'dashboard',
}) => {
  const colors = useThemeColors();
  const sections = getDashboardHelpSections(accountType, view);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={getDashboardHelpTitle(view)}
      snapPoint={85}
      showHandle
      showCloseButton
    >
      <View style={styles.content}>
        {sections.map((section) => (
          <View key={section.id} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {section.title}
            </Text>
            {section.bullets.map((bullet, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
                <Text style={[styles.bulletText, { color: colors.textSecondary }]}>
                  {bullet}
                </Text>
              </View>
            ))}
          </View>
        ))}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: { gap: spacing.lg, paddingBottom: spacing.xl },
  section: { gap: spacing.xs },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  bulletRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  bulletDot: {
    fontSize: typography.fontSize.base,
    lineHeight: typography.fontSize.base * 1.4,
  },
  bulletText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: typography.fontSize.sm * 1.45,
  },
});
