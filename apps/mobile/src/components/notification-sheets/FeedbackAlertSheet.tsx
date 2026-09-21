// apps/mobile/src/components/notification-sheets/FeedbackAlertSheet.tsx
// Bottom sheet wrapping the existing UserFeedbackView for admin feedback notifications

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ExternalLink } from 'lucide-react-native';
import { BottomSheet } from '../BottomSheet';
import UserFeedbackView from '../admin/sections/userFeedback/UserFeedbackView';
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

interface FeedbackAlertSheetProps {
  visible: boolean;
  onClose: () => void;
  onOpenFull: () => void;
}

export function FeedbackAlertSheet({
  visible,
  onClose,
  onOpenFull,
}: FeedbackAlertSheetProps) {
  const colors = useThemeColors();

  const handleOpenFull = () => {
    onClose();
    onOpenFull();
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="User Feedback"
      snapPoint={90}
      showHandle
      showCloseButton
      rawContent
    >
      <View style={styles.buttonWrapper}>
        <TouchableOpacity
          style={[styles.openFullButton, { borderColor: colors.border }]}
          onPress={handleOpenFull}
        >
          <ExternalLink size={16} color={colors.primary} />
          <Text style={[styles.openFullText, { color: colors.primary }]}>
            Open Feedback Dashboard
          </Text>
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        <UserFeedbackView />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonWrapper: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  openFullButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderRadius: borderRadius.md,
  },
  openFullText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
});
