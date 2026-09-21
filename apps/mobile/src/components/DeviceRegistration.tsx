// apps/mobile/src/components/DeviceRegistration.tsx
// Comprehensive device registration component with debugging capabilities

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import {
  Smartphone,
  Copy,
  CheckCircle,
  AlertCircle,
  Settings,
} from 'lucide-react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import DeviceInfo from 'react-native-device-info';
import { useThemeColors } from '../contexts/ThemeContext';
import { pushNotificationService } from '../services/PushNotificationService';
import { apnsDiagnostics } from '../services/APNsDiagnostics';
import { spacing, borderRadius, typography, shadows } from '../utils/theme';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from './ui/Dialog';

interface RegistrationResult {
  success: boolean;
  token: string | null;
  error?: string;
  timestamp: string;
  deviceInfo: {
    platform: string;
    model: string;
    appVersion: string;
    buildNumber: string;
    deviceId: string;
    isSimulator: boolean;
    environment: string;
  };
  debugLog: string[];
}

export const DeviceRegistration: React.FC = () => {
  const colors = useThemeColors();
  const [isLoading, setIsLoading] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [lastResult, setLastResult] = useState<RegistrationResult | null>(null);
  const [copied, setCopied] = useState(false);

  const captureDeviceInfo = async () => {
    return {
      platform: Platform.OS,
      model: DeviceInfo.getModel(),
      appVersion: DeviceInfo.getVersion(),
      buildNumber: DeviceInfo.getBuildNumber(),
      deviceId: await DeviceInfo.getUniqueId(),
      isSimulator: await DeviceInfo.isEmulator(),
      environment: __DEV__ ? 'development' : 'production',
    };
  };

  const handleRegister = async () => {
    setIsLoading(true);
    const debugLog: string[] = [];
    const startTime = new Date().toISOString();

    try {
      debugLog.push(
        `[${new Date().toISOString()}] Starting device registration...`,
      );
      debugLog.push(`Platform: ${Platform.OS}`);
      debugLog.push(`Environment: ${__DEV__ ? 'DEV' : 'PROD'}`);
      debugLog.push(`__DEV__ flag: ${__DEV__}`);

      const deviceInfo = await captureDeviceInfo();
      debugLog.push(`Device: ${deviceInfo.model}`);
      debugLog.push(`Is Simulator: ${deviceInfo.isSimulator}`);
      debugLog.push(
        `App Version: ${deviceInfo.appVersion} (${deviceInfo.buildNumber})`,
      );

      // iOS-specific permission and registration checks
      if (Platform.OS === 'ios') {
        debugLog.push('');
        debugLog.push('=== iOS-Specific Diagnostics ===');

        // Use native diagnostics module if available
        if (apnsDiagnostics.isAvailable()) {
          debugLog.push('Using native APNsDiagnostics module...');
          try {
            const nativeDiagnostics = await apnsDiagnostics.getFullDiagnostics();
            const formattedDiagnostics = apnsDiagnostics.formatDiagnostics(nativeDiagnostics);
            debugLog.push(formattedDiagnostics);

            // Add critical warnings based on native diagnostics
            if (nativeDiagnostics.entitlements) {
              if (!nativeDiagnostics.entitlements.apsEnvironmentExists) {
                debugLog.push('❌ CRITICAL: aps-environment entitlement is MISSING!');
                debugLog.push('   This will prevent APNs from working!');
                debugLog.push('   Check Xcode: Signing & Capabilities > Push Notifications');
              } else if (nativeDiagnostics.entitlements.apsEnvironment === 'development' && !__DEV__) {
                debugLog.push('⚠️ WARNING: Using DEVELOPMENT APNs in PRODUCTION build!');
                debugLog.push('   This may cause issues with push notifications');
              }

              if (!nativeDiagnostics.entitlements.isRegisteredForRemoteNotifications) {
                debugLog.push('⚠️ App is NOT registered for remote notifications yet');
              }
            }

            if (nativeDiagnostics.authorizationStatus) {
              if (nativeDiagnostics.authorizationStatus.authorizationStatus === 'denied') {
                debugLog.push('❌ CRITICAL: User has DENIED notification permissions!');
                debugLog.push('   APNs will not issue a token until permissions are granted');
                debugLog.push('   User must go to Settings > FajrEMR > Notifications and enable');
              } else if (nativeDiagnostics.authorizationStatus.authorizationStatus === 'notDetermined') {
                debugLog.push('ℹ️ Permissions not yet requested - will request now');
              }
            }

            if (nativeDiagnostics.connectivity) {
              const canReachAPNs = nativeDiagnostics.connectivity.production.reachable ||
                                   nativeDiagnostics.connectivity.development.reachable;
              if (!canReachAPNs) {
                debugLog.push('❌ CRITICAL: Cannot reach APNs servers!');
                debugLog.push('   Network may be blocking APNs (ports 443, 2195, 2196, 5223)');
                debugLog.push('   Check WiFi/VPN/Firewall settings');
              }
            }
          } catch (nativeError) {
            debugLog.push(`⚠️ Native diagnostics failed: ${nativeError}`);
            debugLog.push('Falling back to React Native checks...');
          }
        } else {
          debugLog.push('⚠️ Native APNsDiagnostics module not available');
          debugLog.push('Using basic React Native checks only...');
        }

        debugLog.push('');
        debugLog.push('Notification Permission Checks:');

        // Check current notification settings via native APNsDiagnostics
        try {
          const authStatus = await apnsDiagnostics.getNotificationAuthorizationStatus();
          if (authStatus) {
            debugLog.push('Current iOS Notification Permissions:');
            debugLog.push(`  - Authorization: ${authStatus.authorizationStatus.toUpperCase()}`);
            debugLog.push(`  - Alert: ${authStatus.alertSetting === 'enabled' ? 'GRANTED ✅' : 'DENIED ❌'}`);
            debugLog.push(`  - Badge: ${authStatus.badgeSetting === 'enabled' ? 'GRANTED ✅' : 'DENIED ❌'}`);
            debugLog.push(`  - Sound: ${authStatus.soundSetting === 'enabled' ? 'GRANTED ✅' : 'DENIED ❌'}`);
            debugLog.push(`  - Lock Screen: ${authStatus.lockScreenSetting === 'enabled' ? 'GRANTED ✅' : 'DENIED ❌'}`);
            debugLog.push(`  - Notification Center: ${authStatus.notificationCenterSetting === 'enabled' ? 'GRANTED ✅' : 'DENIED ❌'}`);

            const hasAnyPermission = authStatus.alertSetting === 'enabled' ||
              authStatus.badgeSetting === 'enabled' ||
              authStatus.soundSetting === 'enabled';
            if (!hasAnyPermission) {
              debugLog.push('');
              debugLog.push('⚠️ WARNING: No notification permissions granted!');
              debugLog.push('   User may have denied permissions or not been prompted yet');
              debugLog.push('   This will prevent APNs from issuing a device token!');
            } else {
              debugLog.push('✅ At least one notification permission is granted');
            }
          } else {
            debugLog.push('⚠️ Could not retrieve notification authorization status');
          }
        } catch (permError) {
          debugLog.push(`⚠️ Could not check iOS permissions: ${permError}`);
        }

        // Check bundle ID and entitlements
        try {
          const bundleId = await DeviceInfo.getBundleId();
          debugLog.push(`Bundle ID: ${bundleId}`);

          // Verify it matches expected production bundle
          if (bundleId === 'com.fajr.emr') {
            debugLog.push('✅ Bundle ID matches production (com.fajr.emr)');
          } else {
            debugLog.push(`⚠️ Bundle ID is different: ${bundleId}`);
            debugLog.push('   Expected: com.fajr.emr');
          }
        } catch (bundleError) {
          debugLog.push(`⚠️ Could not verify bundle ID: ${bundleError}`);
        }

        // Check network connectivity to APNs
        debugLog.push('');
        debugLog.push('Checking network connectivity to APNs...');
        try {
          // Note: APNs endpoints don't support direct HTTP requests
          // These checks are just to verify DNS resolution and basic connectivity
          const apnsTestUrls = [
            { url: 'https://api.push.apple.com', name: 'APNs Production' },
            { url: 'https://api.development.push.apple.com', name: 'APNs Development' },
          ];

          for (const { url, name } of apnsTestUrls) {
            try {
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000);
              const fetchStart = Date.now();

              // Try GET request instead of HEAD, expecting 405 or similar
              const response = await fetch(url + '/3/device/test', {
                method: 'GET',
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              const fetchDuration = Date.now() - fetchStart;

              // APNs will return 4xx/5xx but that's expected - we just need to know we can reach it
              if (response.status >= 400 && response.status < 600) {
                debugLog.push(`✅ ${name}: Reachable (${fetchDuration}ms, Status: ${response.status} - expected)`);
              } else {
                debugLog.push(`⚠️ ${name}: Unexpected response (${fetchDuration}ms, Status: ${response.status})`);
              }
            } catch (fetchErr: any) {
              const errorMsg = fetchErr.name === 'AbortError' ? 'Timeout (>5s)' : fetchErr.message;
              debugLog.push(`⚠️ ${name}: DNS/Network issue (${errorMsg})`);
              debugLog.push(`   Note: This doesn't affect token registration`);
            }
          }
        } catch (netErr) {
          debugLog.push(`⚠️ Network check failed: ${netErr}`);
        }

        debugLog.push('=== End iOS Diagnostics ===');
        debugLog.push('');
      }

      // Critical check for production
      if (!__DEV__ && deviceInfo.isSimulator) {
        debugLog.push('⚠️ WARNING: Build says PROD but device is simulator!');
        debugLog.push('This should not happen - check build configuration');
      }

      // Check APNs/Gorush configuration status
      debugLog.push('Checking backend APNs configuration...');
      try {
        const configCheckResponse = await fetch(
          'https://fajrmission.org/api/admin/notifications/validate-apns',
        );
        if (configCheckResponse.ok) {
          const configData = await configCheckResponse.json();
          debugLog.push(`✅ Backend reachable: ${configData.status}`);

          if (configData.diagnostics?.apns_configuration) {
            const apns = configData.diagnostics.apns_configuration;
            debugLog.push(`  - APNs Enabled: ${apns.enabled}`);
            debugLog.push(`  - Key ID: ${apns.key_id || 'NOT SET'}`);
            debugLog.push(`  - Team ID: ${apns.team_id || 'NOT SET'}`);
            debugLog.push(`  - Production Mode: ${apns.production}`);
            debugLog.push(`  - Key Exists: ${apns.key_exists}`);
          }

          if (configData.diagnostics?.errors?.length > 0) {
            debugLog.push('⚠️ Backend APNs Configuration Errors:');
            configData.diagnostics.errors.forEach((err: string) => {
              debugLog.push(`  - ${err}`);
            });
          }

          if (configData.diagnostics?.warnings?.length > 0) {
            debugLog.push('ℹ️ Backend APNs Configuration Warnings:');
            configData.diagnostics.warnings.forEach((warn: string) => {
              debugLog.push(`  - ${warn}`);
            });
          }
        } else {
          debugLog.push(
            `⚠️ Could not check backend config: ${configCheckResponse.status}`,
          );
        }
      } catch (configError) {
        debugLog.push(
          `⚠️ Backend config check failed: ${
            configError instanceof Error ? configError.message : 'Unknown'
          }`,
        );
        debugLog.push('  This is not critical - continuing with registration');
      }

      debugLog.push('');
      debugLog.push('=== Starting APNs Token Request ===');
      debugLog.push('Clearing any cached tokens...');

      debugLog.push('Requesting NEW device token from APNs...');
      debugLog.push('NOTE: This calls Apple Push Notification service directly');
      debugLog.push('Waiting up to 10 seconds for APNs response...');
      debugLog.push('');

      const tokenRequestStart = Date.now();
      const token = await pushNotificationService.registerDeviceToken({
        force: true,
      });
      const tokenRequestDuration = Date.now() - tokenRequestStart;

      debugLog.push(`Token request completed in ${tokenRequestDuration}ms`);
      debugLog.push('');

      if (token) {
        debugLog.push(`✅ Token received: ${token.substring(0, 20)}...`);
        debugLog.push(`Token length: ${token.length} characters`);

        // Check if it's a simulator token
        const isSimulatorToken = token.startsWith('SIMULATOR_');
        if (isSimulatorToken) {
          debugLog.push('⚠️ WARNING: This is a simulator token!');
          debugLog.push('Simulator tokens will not receive real notifications');

          // Critical error if simulator token in production
          if (!__DEV__) {
            debugLog.push('');
            debugLog.push('❌ CRITICAL ERROR: Simulator token in PRODUCTION build!');
            debugLog.push('This means APNs did not respond within 10 seconds');
            debugLog.push('');
            debugLog.push('POSSIBLE CAUSES:');
            debugLog.push('  1. Network connectivity to APNs is blocked/unavailable');
            debugLog.push('  2. APNs servers are unreachable from your location');
            debugLog.push('  3. User denied notification permissions');
            debugLog.push('  4. Missing or invalid APNs entitlement in app');
            debugLog.push('  5. Provisioning profile does not include Push Notifications');
            debugLog.push('  6. Certificate mismatch (dev vs prod)');
            debugLog.push('  7. App was built with incorrect signing/entitlements');
            debugLog.push('  8. iOS system-level issue preventing APNs connection');
            debugLog.push('');
            debugLog.push('TROUBLESHOOTING STEPS:');
            debugLog.push('  1. Check device has internet connectivity');
            debugLog.push('  2. Try on different network (WiFi vs cellular)');
            debugLog.push('  3. Go to Settings > FajrEMR > Notifications - verify enabled');
            debugLog.push('  4. Check Xcode: Signing & Capabilities > Push Notifications');
            debugLog.push('  5. Verify provisioning profile in Apple Developer Portal');
            debugLog.push('  6. Check Console.app on Mac for iOS system logs');
            debugLog.push('  7. Delete app and reinstall from TestFlight');
            debugLog.push('  8. Check if VPN/Firewall is blocking APNs (ports 443, 2195, 2196, 5223)');
            debugLog.push('  9. Try: Settings > General > Reset > Reset Network Settings');
            debugLog.push(' 10. Check Apple System Status: https://www.apple.com/support/systemstatus/');
          }
        } else {
          debugLog.push('✅ This appears to be a valid APNs token');
          if (token.length === 64) {
            debugLog.push('✅ Token length is correct (64 characters)');
          } else {
            debugLog.push(
              `⚠️ Token length unusual: ${token.length} (expected 64)`,
            );
          }
        }

        debugLog.push('Registering token with backend...');
        // The service handles backend registration internally
        debugLog.push('✅ Registration complete!');

        setLastResult({
          success: true,
          token,
          timestamp: startTime,
          deviceInfo,
          debugLog,
        });
      } else {
        debugLog.push('');
        debugLog.push('=== FAILURE: No Token Received ===');
        debugLog.push('❌ No token received from APNs');
        debugLog.push('');
        debugLog.push('This typically means:');
        debugLog.push('  • User denied notification permissions');
        debugLog.push('  • APNs registration timed out (10 seconds)');
        debugLog.push('  • Network cannot reach APNs servers (ports 443, 5223)');
        debugLog.push('  • App entitlements are missing/incorrect');
        debugLog.push('  • iOS is blocking the connection');
        debugLog.push('');
        debugLog.push('DEBUGGING STEPS:');
        debugLog.push('  1. Check Settings > Notifications > FajrEMR (all enabled?)');
        debugLog.push('  2. Delete app and reinstall from TestFlight');
        debugLog.push('  3. Try on different network (WiFi vs Cellular)');
        debugLog.push('  4. Disable any VPN/Firewall/AdBlocker apps');
        debugLog.push('  5. Check if other apps receive notifications');
        debugLog.push('  6. Restart the device');
        debugLog.push('');
        debugLog.push('FOR DEVELOPERS:');
        debugLog.push('  • Connect device to Mac and check Console.app');
        debugLog.push('  • Filter for "apsd", "APNs", or "FajrEMR"');
        debugLog.push('  • Look for certificate/entitlement errors');
        debugLog.push('  • Check Xcode: Signing & Capabilities > Push Notifications');
        debugLog.push('');
        debugLog.push('TIP: You can open Settings using the button in the dialog');

        setLastResult({
          success: false,
          token: null,
          error: 'No token received from APNs',
          timestamp: startTime,
          deviceInfo,
          debugLog,
        });
      }
    } catch (error) {
      debugLog.push('');
      debugLog.push('=== EXCEPTION OCCURRED ===');
      debugLog.push(
        `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        debugLog.push('Stack trace:');
        debugLog.push(error.stack);
      }

      const deviceInfo = await captureDeviceInfo();
      setLastResult({
        success: false,
        token: null,
        error: error instanceof Error ? error.message : String(error),
        timestamp: startTime,
        deviceInfo,
        debugLog,
      });
    } finally {
      setIsLoading(false);
      setShowDialog(true);
    }
  };

  const handleCopyToken = () => {
    if (lastResult?.token) {
      Clipboard.setString(lastResult.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyDebugInfo = () => {
    if (lastResult) {
      const debugInfo = [
        '=== Device Registration Debug Info ===',
        '',
        `Timestamp: ${lastResult.timestamp}`,
        `Success: ${lastResult.success}`,
        `Token: ${lastResult.token || 'None'}`,
        '',
        '--- Device Info ---',
        `Platform: ${lastResult.deviceInfo.platform}`,
        `Model: ${lastResult.deviceInfo.model}`,
        `App Version: ${lastResult.deviceInfo.appVersion}`,
        `Build Number: ${lastResult.deviceInfo.buildNumber}`,
        `Device ID: ${lastResult.deviceInfo.deviceId}`,
        `Is Simulator: ${lastResult.deviceInfo.isSimulator}`,
        `Environment: ${lastResult.deviceInfo.environment}`,
        '',
        '--- Debug Log ---',
        ...lastResult.debugLog,
        '',
        '=== End Debug Info ===',
      ].join('\n');

      Clipboard.setString(debugInfo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleOpenSettings = async () => {
    try {
      if (Platform.OS === 'ios') {
        // Open app-specific settings
        await Linking.openSettings();
      }
    } catch (error) {
      console.error('Failed to open settings:', error);
      // Fallback: try to open general settings
      try {
        await Linking.openURL('app-settings:');
      } catch (fallbackError) {
        console.error('Failed to open settings with fallback:', fallbackError);
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Registration Button */}
      <TouchableOpacity
        style={[
          styles.registerButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
          isLoading && styles.registerButtonDisabled,
        ]}
        onPress={handleRegister}
        disabled={isLoading}
        activeOpacity={0.7}
      >
        <View style={styles.buttonContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: colors.primary + '15' },
            ]}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Smartphone size={20} color={colors.primary} strokeWidth={2} />
            )}
          </View>
          <View style={styles.buttonText}>
            <Text style={[styles.buttonLabel, { color: colors.text }]}>
              {isLoading ? 'Registering Device...' : 'Register Device'}
            </Text>
            <Text
              style={[
                styles.buttonDescription,
                { color: colors.textSecondary },
              ]}
            >
              {isLoading
                ? 'Requesting push notification token'
                : 'Force register device for push notifications'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Last Registration Info */}
      {lastResult && !showDialog && (
        <View
          style={[
            styles.infoCard,
            {
              backgroundColor: lastResult.success
                ? colors.success + '10'
                : colors.error + '10',
              borderColor: lastResult.success ? colors.success : colors.error,
            },
          ]}
        >
          <View style={styles.infoHeader}>
            {lastResult.success ? (
              <CheckCircle size={20} color={colors.success} />
            ) : (
              <AlertCircle size={20} color={colors.error} />
            )}
            <Text
              style={[
                styles.infoTitle,
                {
                  color: lastResult.success ? colors.success : colors.error,
                },
              ]}
            >
              {lastResult.success
                ? 'Registration Successful'
                : 'Registration Failed'}
            </Text>
          </View>

          <View style={styles.infoContent}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Platform:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {lastResult.deviceInfo.platform.toUpperCase()}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Device:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {lastResult.deviceInfo.model}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                Environment:
              </Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {lastResult.deviceInfo.environment.toUpperCase()}
              </Text>
            </View>

            {lastResult.token && (
              <View style={styles.tokenContainer}>
                <Text
                  style={[styles.infoLabel, { color: colors.textSecondary }]}
                >
                  Token:
                </Text>
                <View style={styles.tokenRow}>
                  <Text
                    style={[styles.tokenText, { color: colors.text }]}
                    numberOfLines={2}
                  >
                    {lastResult.token}
                  </Text>
                  <TouchableOpacity
                    onPress={handleCopyToken}
                    style={[
                      styles.copyButton,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Copy size={14} color={colors.textInverse} />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            <TouchableOpacity
              onPress={() => setShowDialog(true)}
              style={[styles.detailsButton, { borderColor: colors.border }]}
            >
              <Text
                style={[styles.detailsButtonText, { color: colors.primary }]}
              >
                View Full Details
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Debug Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent size="lg" scrollable>
          <DialogHeader>
            <DialogTitle>
              {lastResult?.success
                ? 'Registration Successful ✅'
                : 'Registration Failed ❌'}
            </DialogTitle>
            <DialogDescription>
              {lastResult?.success
                ? 'Device successfully registered for push notifications'
                : 'Failed to register device. See details below.'}
            </DialogDescription>
          </DialogHeader>

          {lastResult && (
            <View style={styles.dialogContent}>
              {/* Device Info Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Device Information
                </Text>
                <View
                  style={[
                    styles.codeBlock,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Text style={[styles.codeText, { color: colors.text }]}>
                    Platform: {lastResult.deviceInfo.platform}
                    {'\n'}
                    Model: {lastResult.deviceInfo.model}
                    {'\n'}
                    App Version: {lastResult.deviceInfo.appVersion}
                    {'\n'}
                    Build: {lastResult.deviceInfo.buildNumber}
                    {'\n'}
                    Device ID: {lastResult.deviceInfo.deviceId}
                    {'\n'}
                    Is Simulator:{' '}
                    {lastResult.deviceInfo.isSimulator ? 'Yes' : 'No'}
                    {'\n'}
                    Environment: {lastResult.deviceInfo.environment}
                  </Text>
                </View>
              </View>

              {/* Token Section */}
              {lastResult.token && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>
                      Push Token
                    </Text>
                    {lastResult.token.startsWith('SIMULATOR_') && (
                      <View
                        style={[
                          styles.warningBadge,
                          { backgroundColor: colors.warning + '20' },
                        ]}
                      >
                        <Text
                          style={[
                            styles.warningText,
                            { color: colors.warning },
                          ]}
                        >
                          ⚠️ SIMULATOR
                        </Text>
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      styles.codeBlock,
                      { backgroundColor: colors.background, borderColor: colors.border },
                    ]}
                  >
                    <Text
                      style={[styles.codeText, { color: colors.text }]}
                      selectable
                    >
                      {lastResult.token}
                    </Text>
                  </View>
                  <Text
                    style={[styles.helpText, { color: colors.textSecondary }]}
                  >
                    Token Length: {lastResult.token.length} characters
                  </Text>
                </View>
              )}

              {/* Debug Log Section */}
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Debug Log
                </Text>
                <View
                  style={[
                    styles.codeBlock,
                    { backgroundColor: colors.background, borderColor: colors.border },
                  ]}
                >
                  <Text
                    style={[styles.codeText, { color: colors.text }]}
                    selectable
                  >
                    {lastResult.debugLog.join('\n')}
                  </Text>
                </View>
              </View>

              {/* Error Section */}
              {lastResult.error && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.error }]}>
                    Error Details
                  </Text>
                  <View
                    style={[
                      styles.codeBlock,
                      {
                        backgroundColor: colors.error + '10',
                        borderColor: colors.error,
                      },
                    ]}
                  >
                    <Text style={[styles.codeText, { color: colors.error }]}>
                      {lastResult.error}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          <DialogFooter>
            {!lastResult?.success && Platform.OS === 'ios' && (
              <TouchableOpacity
                onPress={handleOpenSettings}
                style={[
                  styles.footerButton,
                  styles.settingsButton,
                  { backgroundColor: colors.warning },
                ]}
              >
                <Settings size={16} color={colors.textInverse} />
                <Text style={[styles.footerButtonText, { color: colors.textInverse }]}>
                  Open Settings
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={handleCopyDebugInfo}
              style={[
                styles.footerButton,
                styles.copyDebugButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <Copy size={16} color={colors.textInverse} />
              <Text style={[styles.footerButtonText, { color: colors.textInverse }]}>
                {copied ? '✓ Copied!' : 'Copy Debug Info'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setShowDialog(false)}
              style={[
                styles.footerButton,
                styles.closeButton,
                { backgroundColor: colors.border },
              ]}
            >
              <Text style={[styles.footerButtonText, { color: colors.text }]}>
                Close
              </Text>
            </TouchableOpacity>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  registerButton: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.sm,
  },
  registerButtonDisabled: {
    opacity: 0.6,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  buttonLabel: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    marginBottom: 2,
  },
  buttonDescription: {
    fontSize: typography.fontSize.xs,
  },
  infoCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.sm,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  infoTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  infoContent: {
    gap: spacing.xs,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
  },
  infoValue: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  tokenContainer: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  tokenText: {
    flex: 1,
    fontSize: typography.fontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  copyButton: {
    padding: spacing.sm,
    borderRadius: borderRadius.md,
  },
  detailsButton: {
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
  dialogContent: {
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
  },
  warningBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.sm,
  },
  warningText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  codeBlock: {
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  codeText: {
    fontSize: typography.fontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: typography.lineHeight.relaxed * typography.fontSize.xs,
  },
  helpText: {
    fontSize: typography.fontSize.xs,
    fontStyle: 'italic',
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  settingsButton: {
    flex: 1,
  },
  copyDebugButton: {
    flex: 1,
  },
  closeButton: {
    flex: 1,
  },
  footerButtonText: {
    // color set inline via colors.textInverse
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
  },
});
