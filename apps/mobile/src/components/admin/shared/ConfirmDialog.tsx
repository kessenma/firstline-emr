// apps/mobile/src/components/admin/shared/ConfirmDialog.tsx
// Confirmation dialog for destructive or important actions

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
} from 'react-native';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react-native';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, typography, borderRadius, shadows } from '../../../utils/theme';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  variant = 'warning',
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading = false,
}) => {
  const colors = useThemeColors();

  const getVariantConfig = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: AlertTriangle,
          color: colors.error,
          backgroundColor: colors.error + '15',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          color: colors.warning,
          backgroundColor: colors.warning + '15',
        };
      case 'success':
        return {
          icon: CheckCircle,
          color: colors.success,
          backgroundColor: colors.success + '15',
        };
      case 'info':
      default:
        return {
          icon: Info,
          color: colors.primary,
          backgroundColor: colors.primary + '15',
        };
    }
  };

  const config = getVariantConfig();
  const Icon = config.icon;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={[styles.overlay, { backgroundColor: colors.overlay }]}>
          <TouchableWithoutFeedback>
            <View style={[
              styles.dialog,
              { backgroundColor: colors.surface },
              shadows.xl,
            ]}>
              {/* Icon */}
              <View style={[
                styles.iconContainer,
                { backgroundColor: config.backgroundColor },
              ]}>
                <Icon size={32} color={config.color} strokeWidth={2} />
              </View>

              {/* Title */}
              <Text style={[styles.title, { color: colors.text }]}>
                {title}
              </Text>

              {/* Message */}
              <Text style={[styles.message, { color: colors.textSecondary }]}>
                {message}
              </Text>

              {/* Actions */}
              <View style={styles.actions}>
                <TouchableOpacity
                  onPress={onCancel}
                  disabled={loading}
                  style={[
                    styles.button,
                    styles.cancelButton,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      opacity: loading ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.buttonText, { color: colors.text }]}>
                    {cancelLabel}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onConfirm}
                  disabled={loading}
                  style={[
                    styles.button,
                    styles.confirmButton,
                    {
                      backgroundColor: variant === 'danger' ? colors.error : colors.primary,
                      opacity: loading ? 0.5 : 1,
                    },
                  ]}
                >
                  <Text style={[styles.buttonText, styles.confirmButtonText, { color: colors.textInverse }]}>
                    {loading ? 'Processing...' : confirmLabel}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    // backgroundColor set inline via colors.overlay
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  dialog: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  message: {
    fontSize: typography.fontSize.base,
    textAlign: 'center',
    lineHeight: typography.fontSize.base * typography.lineHeight.relaxed,
    marginBottom: spacing.xl,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  cancelButton: {
    // Styles applied inline
  },
  confirmButton: {
    // Styles applied inline
  },
  buttonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  confirmButtonText: {
    // color set inline via colors.textInverse
  },
});
