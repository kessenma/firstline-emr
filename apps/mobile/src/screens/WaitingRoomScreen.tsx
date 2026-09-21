// apps/mobile/src/screens/WaitingRoomScreen.tsx
// Waiting room for users who have signed up but not yet been approved

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  AppState,
  AppStateStatus,
  Linking,
} from 'react-native';
import notifee, { EventType } from '@notifee/react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCircle, Clock, LogOut, AlertCircle, Settings } from 'lucide-react-native';
import { apnsDiagnostics } from '../services/APNsDiagnostics';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { pushNotificationService } from '../services/PushNotificationService';
import { authService } from '../services/AuthService';
import { SessionUser } from '../navigation/MainNavigator';
import { useThemeColors } from '../contexts/ThemeContext';

interface WaitingRoomScreenProps {
  user: SessionUser;
  onLogout: () => void;
  onApproved: () => void;
}

export default function WaitingRoomScreen({
  user,
  onLogout,
  onApproved,
}: WaitingRoomScreenProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [notificationsDenied, setNotificationsDenied] = useState(false);
  const isCheckingRef = useRef(false);
  const notificationsEnabledRef = useRef(false);

  const markNotificationsEnabled = useCallback(() => {
    notificationsEnabledRef.current = true;
    setNotificationsEnabled(true);
    setNotificationsDenied(false);
  }, []);

  // Check authorization when app comes to foreground or push received
  const checkAuthorization = useCallback(async () => {
    if (isCheckingRef.current) return;

    isCheckingRef.current = true;
    try {
      console.log('🔍 [WaitingRoom] Checking authorization status...');
      const result = await authService.checkAuthorization();

      if (result.authorized) {
        console.log('✅ [WaitingRoom] User is now authorized!');
        onApproved();
      } else {
        console.log('⏳ [WaitingRoom] User still pending approval');
      }
    } catch (error) {
      console.error('❌ [WaitingRoom] Error checking authorization:', error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [onApproved]);

  // Check authorization on mount and when app returns to foreground
  useEffect(() => {
    // Check immediately on mount
    checkAuthorization();

    // Set up app state listener for foreground detection
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('📱 [WaitingRoom] App returned to foreground, checking authorization...');
        checkAuthorization();

        // Re-check notification permissions (user may have enabled in Settings)
        try {
          const status = await apnsDiagnostics.getNotificationAuthorizationStatus();
          if (status?.authorizationStatus === 'authorized' && !notificationsEnabledRef.current) {
            console.log('🔔 [WaitingRoom] Notifications now authorized, registering...');
            const token = await pushNotificationService.registerDeviceToken({ force: true });
            if (token) {
              markNotificationsEnabled();
            }
          }
        } catch {
          // Non-critical — silent fail
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [checkAuthorization]);

  // Listen for account_approved push notification and re-check immediately
  useEffect(() => {
    return notifee.onForegroundEvent(({ type, detail }) => {
      if (
        type === EventType.DELIVERED &&
        detail.notification?.data?.type === 'account_approved'
      ) {
        console.log('🔔 [WaitingRoom] Received account_approved notification');
        checkAuthorization();
      }
    });
  }, [checkAuthorization]);

  // Register for push notifications on mount (force: true shows the iOS/Android permission dialog)
  useEffect(() => {
    const registerNotifications = async () => {
      try {
        console.log('🔔 [WaitingRoom] Requesting push notification permissions...');
        const token = await pushNotificationService.registerDeviceToken({ force: true });
        if (token) {
          markNotificationsEnabled();
          console.log('✅ [WaitingRoom] Push notifications enabled');
        } else {
          setNotificationsDenied(true);
          console.log('⚠️ [WaitingRoom] User denied or no token received');
        }
      } catch (error) {
        setNotificationsDenied(true);
        console.log('⚠️ [WaitingRoom] Push notification registration failed:', error);
      }
    };

    // Small delay to let the screen render first
    const timer = setTimeout(registerNotifications, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleOpenSettings = () => {
    Linking.openSettings();
  };

  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/fajr-triage-logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Welcome Message */}
        <Text style={[styles.title, { color: colors.text }]}>Welcome, {user.firstName}!</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Your account is pending approval</Text>

        {/* Status Card */}
        <Card style={[styles.statusCard, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}>
          <View style={styles.statusRow}>
            <Clock size={24} color={colors.warning} />
            <View style={styles.statusTextContainer}>
              <Text style={[styles.statusTitle, { color: colors.warningDark }]}>Pending Review</Text>
              <Text style={[styles.statusDescription, { color: colors.warningDark }]}>
                An administrator will review your account. This typically takes
                1-2 business days.
              </Text>
            </View>
          </View>
        </Card>

        {/* Notifications Card */}
        <Card style={[
          styles.notificationCard,
          notificationsEnabled && { backgroundColor: colors.success + '15', borderColor: colors.success, borderWidth: 1 },
          notificationsDenied && { backgroundColor: colors.warning + '15', borderColor: colors.warning, borderWidth: 1 },
        ]}>
          <View style={styles.notificationHeader}>
            {notificationsEnabled ? (
              <CheckCircle size={24} color={colors.success} />
            ) : notificationsDenied ? (
              <AlertCircle size={24} color={colors.warning} />
            ) : (
              <Bell size={24} color={colors.info} />
            )}
            <Text style={[styles.notificationTitle, { color: colors.text }]}>
              {notificationsEnabled
                ? 'Notifications Enabled'
                : notificationsDenied
                  ? 'Notifications Not Enabled'
                  : 'Setting Up Notifications...'}
            </Text>
          </View>

          {notificationsEnabled ? (
            <Text style={[styles.enabledText, { color: colors.successDark }]}>
              You'll receive a push notification when your account is approved.
            </Text>
          ) : notificationsDenied ? (
            <>
              <Text style={[styles.deniedText, { color: colors.warningDark }]}>
                Please check back later to see the status of your account, or
                contact the admin.
              </Text>
              <Button
                variant="default"
                onPress={handleOpenSettings}
                style={styles.settingsButton}
              >
                <View style={styles.settingsButtonContent}>
                  <Settings size={16} color={colors.textInverse} />
                  <Text style={[styles.settingsButtonText, { color: colors.textInverse }]}>Open Notification Settings</Text>
                </View>
              </Button>
            </>
          ) : (
            <Text style={[styles.notificationDescription, { color: colors.textSecondary }]}>
              Requesting notification permissions...
            </Text>
          )}
        </Card>

        {/* Info Card */}
        <Card style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.infoTitle, { color: colors.text }]}>What happens next?</Text>
          <View style={styles.infoItem}>
            <Text style={[styles.infoBullet, { color: colors.info }]}>1.</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Your credentials will be verified by our team
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoBullet, { color: colors.info }]}>2.</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              You'll receive a push notification when approved
            </Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={[styles.infoBullet, { color: colors.info }]}>3.</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Open the app to access your dashboard
            </Text>
          </View>
        </Card>

      </View>

      {/* Logout Button */}
      <View style={styles.footer}>
        <Button
          variant="ghost"
          onPress={onLogout}
          style={styles.logoutButton}
        >
          <View style={styles.logoutContent}>
            <LogOut size={18} color={colors.textSecondary} />
            <Text style={[styles.logoutText, { color: colors.textSecondary }]}>Sign Out</Text>
          </View>
        </Button>
        <Text style={[styles.footerText, { color: colors.textTertiary }]}>
          Signed in as {user.email}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoImage: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  statusCard: {
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  statusTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  notificationCard: {
    padding: 16,
    marginBottom: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  notificationDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  enabledText: {
    fontSize: 14,
    lineHeight: 20,
  },
  deniedText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  settingsButton: {
    width: '100%',
  },
  settingsButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  settingsButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoCard: {
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  infoItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  infoBullet: {
    fontSize: 14,
    fontWeight: '600',
    width: 24,
  },
  infoText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    alignItems: 'center',
  },
  logoutButton: {
    marginBottom: 12,
  },
  logoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
  },
});
