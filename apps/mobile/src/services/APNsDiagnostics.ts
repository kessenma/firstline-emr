// apps/mobile/src/services/APNsDiagnostics.ts
// TypeScript wrapper for native APNsDiagnostics module

import { NativeModules, Platform } from 'react-native';

interface APNsEntitlements {
  apsEnvironment: string | null;
  apsEnvironmentExists: boolean;
  bundleId: string;
  bundleVersion: string;
  buildNumber: string;
  isSimulator: boolean;
  simulatorWarning?: string;
  deviceModel: string;
  systemVersion: string;
  systemName: string;
  isRegisteredForRemoteNotifications: boolean;
  entitlements?: Record<string, any>;
}

interface NotificationAuthorizationStatus {
  authorizationStatus: 'notDetermined' | 'denied' | 'authorized' | 'provisional' | 'ephemeral' | 'unknown';
  alertSetting: 'enabled' | 'disabled' | 'notSupported' | 'unknown';
  badgeSetting: 'enabled' | 'disabled' | 'notSupported' | 'unknown';
  soundSetting: 'enabled' | 'disabled' | 'notSupported' | 'unknown';
  lockScreenSetting: 'enabled' | 'disabled' | 'notSupported' | 'unknown';
  notificationCenterSetting: 'enabled' | 'disabled' | 'notSupported' | 'unknown';
  criticalAlertSetting?: 'enabled' | 'disabled' | 'notSupported' | 'unknown';
  showPreviewsSetting?: 'always' | 'whenAuthenticated' | 'never' | 'unknown';
}

interface APNsConnectivityResult {
  production: {
    reachable: boolean;
    latency: number;
    error: string | null;
  };
  development: {
    reachable: boolean;
    latency: number;
    error: string | null;
  };
}

interface ForceRegisterResult {
  success: boolean;
  isRegistered: boolean;
  message: string;
}

interface LastDeliveredTokenResult {
  token: string | null;
  hasToken: boolean;
  deliveredAt?: string;
  ageSeconds?: number;
}

const { APNsDiagnostics: NativeAPNsDiagnostics } = NativeModules;

class APNsDiagnosticsService {
  /**
   * Check if the native module is available (iOS only)
   */
  isAvailable(): boolean {
    return Platform.OS === 'ios' && !!NativeAPNsDiagnostics;
  }

  /**
   * Get APNs entitlements and app configuration
   */
  async getEntitlements(): Promise<APNsEntitlements | null> {
    if (!this.isAvailable()) {
      console.warn('APNsDiagnostics is only available on iOS');
      return null;
    }

    try {
      const result = await NativeAPNsDiagnostics.getEntitlements();
      return result as APNsEntitlements;
    } catch (error) {
      console.error('Failed to get entitlements:', error);
      return null;
    }
  }

  /**
   * Get detailed notification authorization status
   */
  async getNotificationAuthorizationStatus(): Promise<NotificationAuthorizationStatus | null> {
    if (!this.isAvailable()) {
      console.warn('APNsDiagnostics is only available on iOS');
      return null;
    }

    try {
      const result = await NativeAPNsDiagnostics.getNotificationAuthorizationStatus();
      return result as NotificationAuthorizationStatus;
    } catch (error) {
      console.error('Failed to get notification authorization status:', error);
      return null;
    }
  }

  /**
   * Force the app to re-register for remote notifications
   */
  async forceRegisterForRemoteNotifications(): Promise<ForceRegisterResult | null> {
    if (!this.isAvailable()) {
      console.warn('APNsDiagnostics is only available on iOS');
      return null;
    }

    try {
      const result = await NativeAPNsDiagnostics.forceRegisterForRemoteNotifications();
      return result as ForceRegisterResult;
    } catch (error) {
      console.error('Failed to force register for remote notifications:', error);
      return null;
    }
  }

  /**
   * Check connectivity to APNs servers
   */
  async checkAPNsConnectivity(): Promise<APNsConnectivityResult | null> {
    if (!this.isAvailable()) {
      console.warn('APNsDiagnostics is only available on iOS');
      return null;
    }

    try {
      const result = await NativeAPNsDiagnostics.checkAPNsConnectivity();
      return result as APNsConnectivityResult;
    } catch (error) {
      console.error('Failed to check APNs connectivity:', error);
      return null;
    }
  }

  /**
   * Get the last token delivered by iOS (useful if token arrived before JS was ready)
   * This helps handle the race condition where AppDelegate receives the token
   * before React Native JS has set up its event listeners.
   */
  async getLastDeliveredToken(): Promise<LastDeliveredTokenResult | null> {
    if (!this.isAvailable()) {
      console.warn('APNsDiagnostics is only available on iOS');
      return null;
    }

    try {
      const result = await NativeAPNsDiagnostics.getLastDeliveredToken();
      return result as LastDeliveredTokenResult;
    } catch (error) {
      console.error('Failed to get last delivered token:', error);
      return null;
    }
  }

  /**
   * Clear the stored token (call this after JS has successfully processed the token)
   */
  async clearStoredToken(): Promise<boolean> {
    if (!this.isAvailable()) {
      console.warn('APNsDiagnostics is only available on iOS');
      return false;
    }

    try {
      await NativeAPNsDiagnostics.clearStoredToken();
      return true;
    } catch (error) {
      console.error('Failed to clear stored token:', error);
      return false;
    }
  }

  /**
   * Get comprehensive diagnostics report
   */
  async getFullDiagnostics(): Promise<{
    entitlements: APNsEntitlements | null;
    authorizationStatus: NotificationAuthorizationStatus | null;
    connectivity: APNsConnectivityResult | null;
  }> {
    const [entitlements, authorizationStatus, connectivity] = await Promise.all([
      this.getEntitlements(),
      this.getNotificationAuthorizationStatus(),
      this.checkAPNsConnectivity(),
    ]);

    return {
      entitlements,
      authorizationStatus,
      connectivity,
    };
  }

  /**
   * Format diagnostics as a human-readable string
   */
  formatDiagnostics(diagnostics: {
    entitlements: APNsEntitlements | null;
    authorizationStatus: NotificationAuthorizationStatus | null;
    connectivity: APNsConnectivityResult | null;
  }): string {
    const lines: string[] = [];

    lines.push('=== Native APNs Diagnostics ===');
    lines.push('');

    if (diagnostics.entitlements) {
      lines.push('Entitlements & Configuration:');
      lines.push(`  APNs Environment: ${diagnostics.entitlements.apsEnvironment || 'NOT SET ❌'}`);
      lines.push(`  APNs Entitlement Exists: ${diagnostics.entitlements.apsEnvironmentExists ? 'YES ✅' : 'NO ❌'}`);
      lines.push(`  Bundle ID: ${diagnostics.entitlements.bundleId}`);
      lines.push(`  Version: ${diagnostics.entitlements.bundleVersion} (${diagnostics.entitlements.buildNumber})`);
      lines.push(`  Device: ${diagnostics.entitlements.deviceModel} (${diagnostics.entitlements.systemName} ${diagnostics.entitlements.systemVersion})`);
      lines.push(`  Is Simulator: ${diagnostics.entitlements.isSimulator ? 'YES ⚠️' : 'NO ✅'}`);
      lines.push(`  Registered for Remote Notifications: ${diagnostics.entitlements.isRegisteredForRemoteNotifications ? 'YES ✅' : 'NO ❌'}`);

      if (diagnostics.entitlements.simulatorWarning) {
        lines.push(`  ⚠️ ${diagnostics.entitlements.simulatorWarning}`);
      }
      lines.push('');
    }

    if (diagnostics.authorizationStatus) {
      lines.push('Notification Authorization:');
      lines.push(`  Status: ${diagnostics.authorizationStatus.authorizationStatus.toUpperCase()}`);
      lines.push(`  Alert: ${diagnostics.authorizationStatus.alertSetting}`);
      lines.push(`  Badge: ${diagnostics.authorizationStatus.badgeSetting}`);
      lines.push(`  Sound: ${diagnostics.authorizationStatus.soundSetting}`);
      lines.push(`  Lock Screen: ${diagnostics.authorizationStatus.lockScreenSetting}`);
      lines.push(`  Notification Center: ${diagnostics.authorizationStatus.notificationCenterSetting}`);

      if (diagnostics.authorizationStatus.authorizationStatus === 'denied') {
        lines.push('  ⚠️ Notifications are DENIED - user must enable in Settings');
      } else if (diagnostics.authorizationStatus.authorizationStatus === 'notDetermined') {
        lines.push('  ℹ️ Permissions not requested yet');
      }
      lines.push('');
    }

    if (diagnostics.connectivity) {
      lines.push('APNs Server Connectivity:');
      lines.push(`  Production (api.push.apple.com):`);
      lines.push(`    Reachable: ${diagnostics.connectivity.production.reachable ? 'YES ✅' : 'NO ❌'}`);
      lines.push(`    Latency: ${diagnostics.connectivity.production.latency.toFixed(0)}ms`);
      if (diagnostics.connectivity.production.error) {
        lines.push(`    Error: ${diagnostics.connectivity.production.error}`);
      }

      lines.push(`  Development (api.development.push.apple.com):`);
      lines.push(`    Reachable: ${diagnostics.connectivity.development.reachable ? 'YES ✅' : 'NO ❌'}`);
      lines.push(`    Latency: ${diagnostics.connectivity.development.latency.toFixed(0)}ms`);
      if (diagnostics.connectivity.development.error) {
        lines.push(`    Error: ${diagnostics.connectivity.development.error}`);
      }
      lines.push('');
    }

    lines.push('=== End Native Diagnostics ===');

    return lines.join('\n');
  }
}

export const apnsDiagnostics = new APNsDiagnosticsService();
export default apnsDiagnostics;
