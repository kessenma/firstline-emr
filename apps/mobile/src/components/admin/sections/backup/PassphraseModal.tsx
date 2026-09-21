// apps/mobile/src/components/admin/sections/backup/PassphraseModal.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Eye, EyeOff, Lock, X } from 'lucide-react-native';
import { useThemeColors } from '../../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../../utils/theme';
import { BACKUP_MIN_PASSPHRASE_LENGTH } from '@fajr/shared/backup';

interface PassphraseModalProps {
  visible: boolean;
  title: string;
  /** Show confirmation field (for export). Hide for import (single entry). */
  requireConfirmation?: boolean;
  isLoading?: boolean;
  onSubmit: (passphrase: string) => void;
  onCancel: () => void;
}

export default function PassphraseModal({
  visible,
  title,
  requireConfirmation = false,
  isLoading = false,
  onSubmit,
  onCancel,
}: PassphraseModalProps) {
  const colors = useThemeColors();
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [showPassphrase, setShowPassphrase] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = () => {
    setError('');

    if (passphrase.length < BACKUP_MIN_PASSPHRASE_LENGTH) {
      setError(`Passphrase must be at least ${BACKUP_MIN_PASSPHRASE_LENGTH} characters`);
      return;
    }

    if (requireConfirmation && passphrase !== confirmPassphrase) {
      setError('Passphrases do not match');
      return;
    }

    onSubmit(passphrase);
  };

  const handleCancel = () => {
    setPassphrase('');
    setConfirmPassphrase('');
    setShowPassphrase(false);
    setError('');
    onCancel();
  };

  const isValid =
    passphrase.length >= BACKUP_MIN_PASSPHRASE_LENGTH &&
    (!requireConfirmation || passphrase === confirmPassphrase);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View
          style={[
            styles.container,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitle}>
              <Lock size={20} color={colors.primary} />
              <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            </View>
            <TouchableOpacity onPress={handleCancel}>
              <X size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {requireConfirmation
              ? 'Enter a passphrase to encrypt this backup. You will need this same passphrase to decrypt and restore it.'
              : 'Enter the passphrase used to encrypt this backup file.'}
          </Text>

          {/* Passphrase Input */}
          <View
            style={[
              styles.inputContainer,
              { borderColor: error ? colors.error : colors.border },
            ]}
          >
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={passphrase}
              onChangeText={(text) => {
                setPassphrase(text);
                setError('');
              }}
              placeholder="Enter passphrase"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry={!showPassphrase}
              autoFocus
              editable={!isLoading}
            />
            <TouchableOpacity onPress={() => setShowPassphrase(!showPassphrase)}>
              {showPassphrase ? (
                <EyeOff size={20} color={colors.textSecondary} />
              ) : (
                <Eye size={20} color={colors.textSecondary} />
              )}
            </TouchableOpacity>
          </View>

          {/* Confirm Passphrase */}
          {requireConfirmation && (
            <View
              style={[
                styles.inputContainer,
                {
                  borderColor:
                    confirmPassphrase.length > 0 && passphrase !== confirmPassphrase
                      ? colors.error
                      : colors.border,
                },
              ]}
            >
              <TextInput
                style={[styles.input, { color: colors.text }]}
                value={confirmPassphrase}
                onChangeText={(text) => {
                  setConfirmPassphrase(text);
                  setError('');
                }}
                placeholder="Confirm passphrase"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={!showPassphrase}
                editable={!isLoading}
              />
            </View>
          )}

          {/* Character count hint */}
          <Text
            style={[
              styles.hint,
              {
                color:
                  passphrase.length >= BACKUP_MIN_PASSPHRASE_LENGTH
                    ? colors.success
                    : colors.textSecondary,
              },
            ]}
          >
            {passphrase.length}/{BACKUP_MIN_PASSPHRASE_LENGTH} characters minimum
          </Text>

          {/* Error */}
          {error ? (
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          ) : null}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={handleCancel}
              disabled={isLoading}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.primary },
                (!isValid || isLoading) && styles.disabledButton,
              ]}
              onPress={handleSubmit}
              disabled={!isValid || isLoading}
            >
              <Text style={[styles.submitButtonText, { color: colors.textInverse }]}>
                {isLoading
                  ? 'Processing...'
                  : requireConfirmation
                    ? 'Encrypt & Export'
                    : 'Decrypt'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: '700',
  },
  description: {
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: typography.fontSize.md,
  },
  hint: {
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.xs,
  },
  errorText: {
    fontSize: typography.fontSize.sm,
    marginBottom: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
});
