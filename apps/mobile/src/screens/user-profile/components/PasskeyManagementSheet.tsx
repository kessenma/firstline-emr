// apps/mobile/src/screens/user-profile/components/PasskeyManagementSheet.tsx
// Bottom sheet for managing passkeys

import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Key, Trash2, Plus, Fingerprint, ScanFace, Smartphone } from 'lucide-react-native';
import { BottomSheet } from '../../../components/BottomSheet';
import { useThemeColors } from '../../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../../utils/theme';
import { useProfilePasskeys } from '../hooks/useProfilePasskeys';
import type { PasskeyCredential } from '../types';

interface PasskeyManagementSheetProps {
  visible: boolean;
  onClose: () => void;
  userEmail: string;
}

export const PasskeyManagementSheet: React.FC<PasskeyManagementSheetProps> = ({
  visible,
  onClose,
  userEmail,
}) => {
  const colors = useThemeColors();
  const {
    passkeys,
    isLoading,
    isAdding,
    fetchPasskeys,
    handleAddPasskey,
    handleDeletePasskey,
  } = useProfilePasskeys();

  useEffect(() => {
    if (visible) {
      fetchPasskeys();
    }
  }, [visible, fetchPasskeys]);

  const handleAdd = async () => {
    await handleAddPasskey(userEmail);
  };

  const handleDelete = (passkey: PasskeyCredential) => {
    Alert.alert(
      'Delete Passkey',
      `Are you sure you want to delete "${passkey.deviceName}"? You will no longer be able to sign in with this passkey.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => handleDeletePasskey(passkey.id),
        },
      ]
    );
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getPasskeyIcon = (deviceName: string | null) => {
    const name = (deviceName || '').toLowerCase();

    // Face ID devices (iPhone X and later, iPad Pro with Face ID)
    if (name.includes('iphone') || name.includes('ipad') || name.includes('ios')) {
      return <ScanFace size={18} color={colors.primary} />;
    }
    // Touch ID / Fingerprint devices
    if (name.includes('mac') || name.includes('android')) {
      return <Fingerprint size={18} color={colors.primary} />;
    }
    // Default fallback
    return <Key size={18} color={colors.primary} />;
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title="Passkey Management"
      snapPoint={65}
      showHandle={true}
      showCloseButton={true}
    >
      <View style={styles.content}>
        {/* Description */}
        <View
          style={[styles.infoBox, { backgroundColor: colors.backgroundSecondary }]}
        >
          <Key size={20} color={colors.primary} />
          <Text style={[styles.infoText, { color: colors.textSecondary }]}>
            Passkeys let you sign in securely using Face ID, Touch ID, or your
            device PIN. They are more secure than passwords.
          </Text>
        </View>

        {/* Add Passkey Button */}
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: colors.primary,
              opacity: isAdding ? 0.7 : 1,
            },
          ]}
          onPress={handleAdd}
          disabled={isAdding}
        >
          {isAdding ? (
            <ActivityIndicator color={colors.surface} size="small" />
          ) : (
            <>
              <Plus size={20} color={colors.surface} />
              <Text style={[styles.addButtonText, { color: colors.surface }]}>
                Add New Passkey
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Passkeys List */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Registered Passkeys
        </Text>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading passkeys...
            </Text>
          </View>
        ) : passkeys.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Smartphone size={40} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No passkeys registered yet
            </Text>
            <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
              Add a passkey to sign in without a password
            </Text>
          </View>
        ) : (
          <View style={styles.passkeysContainer}>
            {passkeys.map(passkey => (
              <View
                key={passkey.id}
                style={[
                  styles.passkeyItem,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.passkeyInfo}>
                  <View
                    style={[
                      styles.passkeyIcon,
                      { backgroundColor: colors.primary + '20' },
                    ]}
                  >
                    {getPasskeyIcon(passkey.deviceName)}
                  </View>
                  <View style={styles.passkeyDetails}>
                    <Text style={[styles.passkeyName, { color: colors.text }]}>
                      {passkey.deviceName}
                    </Text>
                    <Text
                      style={[styles.passkeyDate, { color: colors.textSecondary }]}
                    >
                      Added {formatDate(passkey.createdAt)}
                    </Text>
                    {passkey.lastUsedAt && (
                      <Text
                        style={[styles.passkeyDate, { color: colors.textTertiary }]}
                      >
                        Last used {formatDate(passkey.lastUsedAt)}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.deleteButton, { backgroundColor: colors.error + '15' }]}
                  onPress={() => handleDelete(passkey)}
                >
                  <Trash2 size={18} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  addButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  sectionTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  emptyText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    marginTop: spacing.md,
  },
  emptySubtext: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  passkeysContainer: {
    gap: spacing.md,
  },
  passkeyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  passkeyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  passkeyIcon: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  passkeyDetails: {
    flex: 1,
  },
  passkeyName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
  passkeyDate: {
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  deleteButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginLeft: spacing.sm,
  },
});

export default PasskeyManagementSheet;
