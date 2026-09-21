// apps/mobile/src/components/AccountSwitcher.tsx
// Account type switcher for admin users in mobile app

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Check, Wifi, WifiOff } from 'lucide-react-native';
import { getRoleTheme, getRoleColor } from '@fajr/shared/theme';
import { useThemeColors } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { TokenStorage } from '../services/TokenStorage';
import { spacing, typography, borderRadius } from '../utils/theme';
import { RoleIcon } from './ui/RoleIcon';
import { offlineAccountSwitcher } from '../services/powersync/OfflineAccountSwitcherService';
import { PowerSyncService } from '../services/powersync/PowerSyncService';

type AccountType = 'Doctor' | 'Triage';

interface AccountSwitcherProps {
  onClose?: () => void;
  onAccountTypeChanged?: (newType: AccountType, oldType: AccountType) => void;
}

export const AccountSwitcher: React.FC<AccountSwitcherProps> = ({
  onClose,
  onAccountTypeChanged,
}) => {
  const colors = useThemeColors();
  const { user, updateUser, logout } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  const currentAccountType = user?.accountType as AccountType;

  // Check online status and pending queue
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const powerSync = PowerSyncService.getInstance();
        const status = powerSync.getSyncStatus();
        setIsOffline(!status.connected);

        const count = await offlineAccountSwitcher.getPendingCount();
        setPendingCount(count);
      } catch (error) {
        console.warn('[AccountSwitcher] Failed to check status:', error);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Check token expiry on mount
  useEffect(() => {
    const checkToken = () => {
      const token = TokenStorage.getAuthToken();
      if (!token) {
        console.log('[AccountSwitcher] No auth token found');
        setTokenExpired(true);
        return;
      }

      // Check if token is expired
      const expiryInfo = TokenStorage.getTokenExpiryInfo('auth');
      if (expiryInfo.includes('Expired')) {
        console.log('[AccountSwitcher] Auth token is expired:', expiryInfo);
        setTokenExpired(true);
      } else {
        console.log('[AccountSwitcher] Auth token is valid:', expiryInfo);
        setTokenExpired(false);
      }
    };

    checkToken();
  }, []);

  // Show token expired warning if needed
  useEffect(() => {
    if (tokenExpired) {
      Alert.alert(
        'Session Expired',
        'Your login session has expired. Please log out and log back in to continue.',
        [
          {
            text: 'Log Out',
            onPress: async () => {
              try {
                await logout();
              } catch (error) {
                console.error('[AccountSwitcher] Logout error:', error);
              }
              if (onClose) {
                onClose();
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => {
              if (onClose) {
                onClose();
              }
            },
          },
        ],
      );
    }
  }, [tokenExpired, logout, onClose]);

  const handleTypeChange = async (newType: AccountType) => {
    if (!user?.id || newType === currentAccountType) {
      return;
    }

    // Check token before making API call
    const token = TokenStorage.getAuthToken();
    if (!token || tokenExpired) {
      Alert.alert(
        'Session Expired',
        'Your login session has expired. Please log out and log back in to continue.',
        [
          {
            text: 'Log Out',
            onPress: async () => {
              try {
                await logout();
              } catch (error) {
                console.error('[AccountSwitcher] Logout error:', error);
              }
              if (onClose) {
                onClose();
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ],
      );
      return;
    }

    const oldType = currentAccountType;
    setIsLoading(true);

    try {
      console.log('[AccountSwitcher] Switching account type...');
      console.log('[AccountSwitcher] User ID:', user.id);
      console.log('[AccountSwitcher] Old type:', oldType);
      console.log('[AccountSwitcher] New type:', newType);

      // Use offline-first account switcher
      const result = await offlineAccountSwitcher.switchAccountType(
        user.id,
        oldType,
        newType,
        user,
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to switch account type');
      }

      console.log('[AccountSwitcher] Switch result:', result);

      // Update user in context and storage
      await updateUser(result.updatedUser);

      console.log('[AccountSwitcher] ✅ Account type switched successfully');

      // Show appropriate message
      if (result.isOffline) {
        Alert.alert(
          'Offline Mode',
          `Account type changed to ${newType}. Changes will sync when you're back online.`,
          [{ text: 'OK' }],
        );
      } else {
        // Optional: Show success toast or nothing
        console.log('[AccountSwitcher] ✅ Online switch complete');
      }

      // Update pending count
      const count = await offlineAccountSwitcher.getPendingCount();
      setPendingCount(count);

      // Notify parent component
      if (onAccountTypeChanged) {
        onAccountTypeChanged(newType, oldType);
      }

      // Close the switcher (like web version)
      if (onClose) {
        onClose();
      }
    } catch (error) {
      console.error(
        '[AccountSwitcher] ❌ Error switching account type:',
        error,
      );

      // Handle authentication errors specifically
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to switch account type. Please try again.';

      if (
        errorMessage === 'Unauthorized' ||
        errorMessage.includes('jwt expired') ||
        errorMessage.includes('Authentication required') ||
        errorMessage.includes('Unauthorized access')
      ) {
        Alert.alert(
          'Session Expired',
          'Your session has expired. Please log out and log back in to continue.',
          [
            {
              text: 'OK',
              onPress: () => {
                if (onClose) {
                  onClose();
                }
              },
            },
          ],
        );
      } else {
        Alert.alert('Error', errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Switch Account Type
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Current: {getRoleTheme(currentAccountType).label}
        </Text>

        {/* Online/Offline Status */}
        <View style={styles.statusRow}>
          <View style={[styles.statusBadge, { backgroundColor: colors.backgroundTertiary }]}>
            {isOffline ? (
              <>
                <WifiOff size={14} color={colors.error} />
                <Text style={[styles.statusText, { color: colors.error }]}>
                  Offline
                </Text>
              </>
            ) : (
              <>
                <Wifi size={14} color={colors.success} />
                <Text style={[styles.statusText, { color: colors.success }]}>
                  Online
                </Text>
              </>
            )}
          </View>

          {pendingCount > 0 && (
            <View
              style={[
                styles.pendingBadge,
                { backgroundColor: colors.primary + '20' },
              ]}
            >
              <Text style={[styles.pendingText, { color: colors.primary }]}>
                {pendingCount} pending
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Loading overlay */}
      {isLoading && (
        <View
          style={[
            styles.loadingOverlay,
            { backgroundColor: colors.background + 'E6' },
          ]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <Text
            style={[
              styles.loadingText,
              { color: colors.text, marginTop: spacing.md },
            ]}
          >
            Switching account type...
          </Text>
        </View>
      )}

      {/* Role Selection - Click to switch immediately like web version */}
      <View style={styles.rolesContainer}>
        {(['Doctor', 'Triage'] as AccountType[]).map(type => {
          const role = getRoleTheme(type);
          const roleColor = getRoleColor(type);
          const isSelected = currentAccountType === type;

          return (
            <TouchableOpacity
              key={type}
              style={[
                styles.roleCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? roleColor : colors.border,
                  borderWidth: isSelected ? 2 : 1,
                } as any,
              ]}
              onPress={() => handleTypeChange(type)}
              disabled={isLoading}
              activeOpacity={0.7}
            >
              <View style={styles.roleContent}>
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: roleColor + '15',
                    },
                  ]}
                >
                  <RoleIcon accountType={type} size={24} strokeWidth={2} />
                </View>
                <View style={styles.textContainer}>
                  <Text
                    style={[
                      styles.roleLabel,
                      {
                        color: colors.text,
                        fontWeight: isSelected
                          ? typography.fontWeight.bold
                          : typography.fontWeight.semibold,
                      },
                    ]}
                  >
                    {role.label}
                  </Text>
                  <Text
                    style={[
                      styles.roleDescription,
                      {
                        color: colors.textSecondary,
                      },
                    ]}
                  >
                    {role.description}
                  </Text>
                </View>
                {isSelected && (
                  <Check size={20} color={roleColor} strokeWidth={2} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
    // backgroundColor set inline via colors.backgroundTertiary
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  pendingBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.md,
  },
  pendingText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  rolesContainer: {
    flex: 1,
    marginBottom: spacing.lg,
  },
  roleCard: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
  },
  roleContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  textContainer: {
    flex: 1,
  },
  roleLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  roleDescription: {
    fontSize: typography.fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  disabledOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    borderRadius: borderRadius.lg,
  },
  loadingText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
  },
});
