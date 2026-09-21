// apps/mobile/src/components/patient-chart/RequestChartAccessSheet.tsx
// Shown when a doctor taps into a chart they are not cleared for.
// Patients are never hidden from the dashboard; specialty is enforced here.
// Joining the care team is what grants access, and the resulting
// patient_care_team row is the record of who opened the record.

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { UserPlus, ShieldQuestion } from 'lucide-react-native';
import { BottomSheet } from '../BottomSheet';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, typography, borderRadius } from '../../utils/theme';
import { useCareTeam } from '../../hooks/useCareTeamActions';
import { useAuth } from '../../contexts/AuthContext';
import {
  getRolesForAccountType,
  isLeadRole,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  type CareTeamRole,
} from '@fajr/shared/care-team';

interface RequestChartAccessSheetProps {
  visible: boolean;
  onClose: () => void;
  patientId: string;
  /** Why access was refused — comes from `evaluateChartAccess`. */
  message?: string | null;
  /** Called once the user has joined and may proceed into the chart. */
  onGranted: () => void;
}

/**
 * Follows the sheet rules documented on VideoCallSheet and BottomSheet:
 * - stays mounted and toggles `visible` (never `if (!visible) return null`)
 * - content root is a plain View, not a Context.Provider or `flex: 1` — those
 *   measure 0 and the sheet then has no layout to present into
 * - every hook runs in this component body, not inside the children BottomSheet
 *   portals away (the Portal detaches the React context tree)
 * - a sibling of the other dashboard sheets, never nested inside one
 */
export const RequestChartAccessSheet: React.FC<RequestChartAccessSheetProps> = ({
  visible,
  onClose,
  patientId,
  message,
  onGranted,
}) => {
  const colors = useThemeColors();
  const { user } = useAuth();
  const { joinAsRole } = useCareTeam(patientId);
  const [joining, setJoining] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const availableRoles = getRolesForAccountType(user?.accountType || '');

  const handleJoin = async (role: CareTeamRole) => {
    setJoining(true);
    setError(null);
    try {
      // Local PowerSync write — works offline and syncs to
      // POST /api/patient/care-team when the device reconnects.
      await joinAsRole(role, isLeadRole(role));
      // Only `onGranted` — the parent owns both dismissing and navigating.
      // Calling onClose() first would null out the parent's state before it
      // reads the patient back out of it.
      onGranted();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not join the care team',
      );
    } finally {
      setJoining(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Join this patient's care team"
      snapPoint={60}
      showHandle
      showCloseButton
    >
      <View style={styles.content}>
        <View style={styles.messageRow}>
          <ShieldQuestion size={18} color={colors.primary} />
          <Text style={[styles.message, { color: colors.text }]}>
            {message || 'This patient is not assigned to your specialty.'}
          </Text>
        </View>

        <Text style={[styles.subtext, { color: colors.textSecondary }]}>
          Joining records you on the care team so there is a clear trail of who
          accessed this record.
        </Text>

        {availableRoles.length === 0 ? (
          <Text style={[styles.error, { color: colors.error }]}>
            Your account type cannot join care teams. Ask an administrator for
            access.
          </Text>
        ) : (
          <View style={styles.roleList}>
            {availableRoles.map((role) => (
              <TouchableOpacity
                key={role}
                style={[
                  styles.roleButton,
                  { borderColor: colors.borderLight, backgroundColor: colors.surface },
                ]}
                onPress={() => handleJoin(role)}
                disabled={joining}
                activeOpacity={0.7}
              >
                {joining ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <>
                    <UserPlus size={16} color={colors.primary} />
                    <View style={styles.roleTextBlock}>
                      <Text style={[styles.roleLabel, { color: colors.primary }]}>
                        {ROLE_LABELS[role]}
                      </Text>
                      <Text
                        style={[styles.roleDescription, { color: colors.textSecondary }]}
                      >
                        {ROLE_DESCRIPTIONS[role]}
                      </Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {error && <Text style={[styles.error, { color: colors.error }]}>{error}</Text>}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  message: {
    flex: 1,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  subtext: { fontSize: typography.fontSize.sm },
  roleList: { gap: spacing.sm },
  roleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  roleTextBlock: { flex: 1 },
  roleLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  roleDescription: { fontSize: typography.fontSize.xs },
  error: { fontSize: typography.fontSize.sm },
});
