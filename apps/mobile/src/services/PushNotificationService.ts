// fajr-medflow-emr/apps/mobile/src/services/PushNotificationService.ts
// Pure APNs implementation - no Firebase, no PushNotificationIOS dependency
// Uses notifee for permissions + our native APNsDiagnostics module for APNs registration
import notifee, {
  AndroidImportance,
  AndroidStyle,
  AuthorizationStatus,
  EventType,
} from '@notifee/react-native';
import { Platform } from 'react-native';
import axios from 'axios';
import DeviceInfo from 'react-native-device-info';
import { TokenStorage } from './TokenStorage';
import { getApiUrl } from '../config';
import { apnsDiagnostics } from './APNsDiagnostics';

// Navigation ref for handling notification taps
let navigationRef: any = null;

/**
 * Navigate from outside the navigator tree.
 *
 * Same module-level ref the push handler uses. Exported so background work —
 * a transcription job finishing, a sheet rendered through a Portal — can route
 * without React Navigation context.
 */
export const navigateFromService = (
  routeName: string,
  params?: Record<string, unknown>,
): void => {
  if (!navigationRef?.current) {
    console.warn('[Navigation] ref not ready; ignoring navigate to', routeName);
    return;
  }
  navigationRef.current.navigate(routeName, params);
};

export const setNavigationRef = (ref: any) => {
  navigationRef = ref;
};

class PushNotificationService {
  private initialized = false;
  private lastRegisteredUserId: string | null = null;

  /**
   * Reset the service state (call on logout)
   */
  reset() {
    console.log('🔄 PushNotificationService reset');
    this.initialized = false;
    this.lastRegisteredUserId = null;
  }

  async initialize() {
    // Get current user ID to check if user changed
    const authToken = TokenStorage.getAuthToken();
    const currentUserId = authToken ? this.extractUserIdFromToken(authToken) : null;

    // Always re-initialize if user changed (even if already initialized)
    const userChanged = currentUserId && currentUserId !== this.lastRegisteredUserId;
    if (userChanged) {
      console.log('👤 User changed, forcing re-registration of device token');
      console.log(`  Previous user: ${this.lastRegisteredUserId}`);
      console.log(`  Current user: ${currentUserId}`);
      this.initialized = false;
    }

    if (this.initialized) return;

    try {
      // Request permission
      const settings = await notifee.requestPermission();

      if (settings.authorizationStatus < AuthorizationStatus.AUTHORIZED) {
        console.log('❌ Push notification permission denied');
        return;
      }

      if (Platform.OS === 'ios') {
        console.log('🔍 Initializing iOS push notifications...');
      }

      // Get and register device token
      await this.registerDeviceToken();

      // Set up notification handlers
      this.setupNotificationHandlers();

      // Track which user we registered for
      const authToken = TokenStorage.getAuthToken();
      this.lastRegisteredUserId = authToken ? this.extractUserIdFromToken(authToken) : null;
      console.log('👤 Registered for user:', this.lastRegisteredUserId);

      this.initialized = true;
      console.log('✅ Push notifications initialized');
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error);
    }
  }

  /**
   * Extract user ID from JWT token (simple decode, no verification)
   */
  private extractUserIdFromToken(token: string): string | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(atob(parts[1]));
      return payload.sub || payload.userId || payload.id || null;
    } catch {
      return null;
    }
  }

  async registerDeviceToken(options?: {
    force?: boolean;
  }): Promise<string | null> {
    try {
      console.log('🔄 registerDeviceToken called with options:', options);
      console.log('📱 Platform:', Platform.OS);
      console.log('🔧 Environment:', __DEV__ ? 'DEVELOPMENT' : 'PRODUCTION');

      if (Platform.OS !== 'ios') {
        console.log('ℹ️ Android push notifications require additional setup');
        return null;
      }

      // Check stored token first if not forcing new registration
      const storedToken = await TokenStorage.getDeviceToken();
      console.log('💾 Stored token exists:', !!storedToken);
      if (storedToken) {
        console.log('💾 Stored token preview:', storedToken.substring(0, 20) + '...');
        console.log('💾 Is simulator token:', storedToken.startsWith('SIMULATOR_'));
      }

      // In PRODUCTION, NEVER use cached simulator tokens
      if (storedToken && storedToken.startsWith('SIMULATOR_') && !__DEV__) {
        console.log('⚠️ Removing cached simulator token in production build');
        await TokenStorage.clearDeviceToken();
      } else if (storedToken && !options?.force) {
        console.log('ℹ️ Using stored device token (not forcing)');
        return storedToken;
      }

      if (options?.force) {
        console.log('⚡ Force registration requested - clearing cached token');
        await TokenStorage.clearDeviceToken();
      }

      // Check if iOS has already delivered a token (race condition recovery)
      // AppDelegate stores the token via APNsDiagnostics.storeDeliveredToken()
      if (apnsDiagnostics.isAvailable()) {
        console.log('🔍 Checking for previously delivered token from native storage...');
        try {
          const nativeTokenResult = await apnsDiagnostics.getLastDeliveredToken();
          if (nativeTokenResult?.hasToken && nativeTokenResult.token) {
            console.log('✅ Found previously delivered token in native storage!');
            console.log(`📱 Token age: ${nativeTokenResult.ageSeconds?.toFixed(1)}s`);
            console.log(`📱 Token preview: ${nativeTokenResult.token.substring(0, 20)}...`);

            await apnsDiagnostics.clearStoredToken();
            this.handleTokenRegistration(nativeTokenResult.token);
            return nativeTokenResult.token;
          } else {
            console.log('ℹ️ No previously delivered token in native storage');
          }
        } catch (nativeError) {
          console.log('⚠️ Could not check native storage:', nativeError);
        }
      }

      // Trigger APNs registration via our native module
      // This calls UIApplication.shared.registerForRemoteNotifications()
      console.log('🔔 Calling native registerForRemoteNotifications via APNsDiagnostics...');

      if (!apnsDiagnostics.isAvailable()) {
        console.error('❌ APNsDiagnostics not available - cannot register for remote notifications');
        return null;
      }

      const registerResult = await apnsDiagnostics.forceRegisterForRemoteNotifications();
      console.log('✅ Native registerForRemoteNotifications result:', registerResult);

      // Poll for the token — AppDelegate will store it via APNsDiagnostics.storeDeliveredToken()
      // when iOS delivers the token asynchronously
      console.log('⏳ Polling for APNs token delivery...');
      const token = await this.pollForToken(10000, 500);

      if (token) {
        console.log('✅ APNs token received:', token.substring(0, 20) + '...');
        console.log('📏 Token length:', token.length);
        await apnsDiagnostics.clearStoredToken();
        this.handleTokenRegistration(token);
        return token;
      }

      // Timeout — no token received
      console.log('⏱️ Token registration timed out after 10 seconds');

      if (options?.force && __DEV__) {
        const dummyToken = `SIMULATOR_TOKEN_${Date.now()}`;
        console.log('⚠️ GENERATING SIMULATOR TOKEN (DEV MODE ONLY)');
        this.handleTokenRegistration(dummyToken);
        return dummyToken;
      } else if (!__DEV__ && options?.force) {
        console.log('❌ Token registration timed out in PRODUCTION');
        const debugToken = `SIMULATOR_PROD_DEBUG_${Date.now()}`;
        console.log('⚠️ Generating DEBUG token for diagnostics:', debugToken);
        return debugToken;
      }

      console.log('ℹ️ Returning null');
      return null;
    } catch (error) {
      console.error('❌ Failed to get device token:', error);
      return null;
    }
  }

  /**
   * Poll APNsDiagnostics.getLastDeliveredToken() until a token appears or timeout.
   * AppDelegate stores the token when iOS delivers it asynchronously.
   */
  private async pollForToken(timeoutMs: number, intervalMs: number): Promise<string | null> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const result = await apnsDiagnostics.getLastDeliveredToken();
        if (result?.hasToken && result.token) {
          return result.token;
        }
      } catch {
        // ignore polling errors
      }
      await new Promise(r => setTimeout(r, intervalMs));
    }
    return null;
  }

  private async handleTokenRegistration(deviceToken: string) {
    try {
      console.log('📝 handleTokenRegistration called');
      console.log(
        '🎫 Token to register:',
        deviceToken.substring(0, 30) + '...',
      );
      console.log(
        '🔍 Is simulator token:',
        deviceToken.startsWith('SIMULATOR_'),
      );
      console.log('🔧 Environment:', __DEV__ ? 'DEV' : 'PROD');

      // CRITICAL: In production, NEVER register simulator tokens with backend
      if (!__DEV__ && deviceToken.startsWith('SIMULATOR_')) {
        console.log(
          '❌ BLOCKED: Refusing to register simulator token in PRODUCTION',
        );
        console.log(
          '❌ This should never happen! Check __DEV__ flag and build configuration.',
        );
        throw new Error('Cannot register simulator token in production build');
      }

      // Check if this token is different from the last registered one
      const lastToken = TokenStorage.getLastRegisteredDeviceToken();
      console.log('💾 Last registered token exists:', !!lastToken);

      // Get current user ID to check if user changed
      const authToken = TokenStorage.getAuthToken();
      const currentUserId = authToken ? this.extractUserIdFromToken(authToken) : null;
      const userChanged = currentUserId && currentUserId !== this.lastRegisteredUserId;

      if (!lastToken) {
        console.log('🆕 First time registration, sending to backend...');
        await this.sendTokenToBackend(deviceToken);
        console.log('✅ Token sent to backend successfully');
        TokenStorage.setLastRegisteredDeviceToken(deviceToken);
        console.log('💾 Saved as last registered token');
      } else if (lastToken !== deviceToken) {
        console.log('🆕 Device token changed, registering with backend...');
        await this.sendTokenToBackend(deviceToken);
        console.log('✅ Token sent to backend successfully');
        TokenStorage.setLastRegisteredDeviceToken(deviceToken);
        console.log('💾 Saved as last registered token');
      } else if (userChanged) {
        console.log('👤 User changed (same token), re-registering with backend...');
        console.log(`  Previous user: ${this.lastRegisteredUserId}`);
        console.log(`  Current user: ${currentUserId}`);
        await this.sendTokenToBackend(deviceToken);
        console.log('✅ Token re-registered for new user');
      } else {
        console.log('ℹ️ Device token unchanged, skipping backend registration');
      }

      // Always store current token locally for app use
      TokenStorage.setDeviceToken(deviceToken);
      console.log('💾 Token stored locally');
    } catch (error) {
      console.error('❌ Failed to handle token registration:', error);
      throw error;
    }
  }

  private setupNotificationHandlers() {
    // Handle foreground events
    notifee.onForegroundEvent(({ type, detail }) => {
      switch (type) {
        case EventType.PRESS:
          console.log('📱 Notification pressed:', detail.notification);
          this.handleNotificationTap(detail.notification);
          break;
        case EventType.DISMISSED:
          console.log('📱 Notification dismissed');
          break;
      }
    });

    // Background event handler
    notifee.onBackgroundEvent(async ({ type, detail }) => {
      if (type === EventType.PRESS) {
        console.log('📱 Background notification pressed:', detail.notification);
        this.handleNotificationTap(detail.notification);
      }
    });
  }

  /**
   * Display a local notification (used when receiving remote push while in foreground)
   */
  async displayNotification(notification: {
    title: string;
    body: string;
    data?: any;
  }) {
    try {
      // Create notification channel for Android
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'default',
          name: 'Default Channel',
          importance: AndroidImportance.HIGH,
          sound: 'default',
        });
      }

      await notifee.displayNotification({
        title: notification.title,
        body: notification.body,
        android: {
          channelId: 'default',
          importance: AndroidImportance.HIGH,
          style: {
            type: AndroidStyle.BIGTEXT,
            text: notification.body,
          },
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
        data: notification.data,
      });
    } catch (error) {
      console.error('❌ Failed to display notification:', error);
    }
  }

  private handleNotificationTap(notification: any) {
    console.log('[PushNotification] Handle tap:', notification);

    if (!navigationRef?.current) {
      console.warn('Navigation ref not available for notification tap');
      return;
    }

    try {
      const data = notification?.data || {};
      const nav = navigationRef.current;

      // Type-aware deep linking — push taps use navigation (not sheets)
      switch (data.type) {
        case 'message':
        // Tapping a missed-call push goes to Messages, matching
        // notificationRouting.getNotificationRoute — the call-summary card for
        // that call is there, so calling back is one tap away.
        case 'missed_call':
          nav.navigate('Messages');
          return;

        case 'new_user_signup':
          nav.navigate('Admin', {
            screen: 'AdminDashboard',
            params: { initialSection: 'newSignups' },
          });
          return;

        case 'profile_update_request':
          nav.navigate('Admin', {
            screen: 'AdminDashboard',
            params: { initialSection: 'profileUpdateRequests' },
          });
          return;

        case 'account_approved':
          // No navigation needed — WaitingRoomScreen's notifee listener
          // will detect this and re-check authorization automatically
          return;

        case 'profile_update_approved':
        case 'profile_update_denied':
          nav.navigate('Profile');
          return;

        // A finished (or failed) call transcript. Routes to the chart, where
        // the draft note now lives or where Retry is offered.
        case 'transcription_complete':
        case 'alert':
        case 'patient_update':
        case 'specialty_no_doctors':
          if (data.patientId) {
            nav.navigate('Dashboard', {
              screen: 'PatientChart',
              params: { patientId: data.patientId },
            });
            return;
          }
          break;
      }

      // Default: go to Notifications tab
      nav.navigate('Notifications');
    } catch (error) {
      console.error('Error handling notification tap:', error);
    }
  }

  async sendTokenToBackend(token: string) {
    try {
      const authToken = TokenStorage.getAuthToken();
      console.log('📤 Sending device token to backend...');
      console.log('  - Device token length:', token.length);
      console.log('  - Environment:', __DEV__ ? 'dev' : 'prod');

      const response = await axios.post(
        `${getApiUrl()}/user/device-token`,
        {
          token,
          platform: Platform.OS,
          environment: __DEV__ ? 'dev' : 'prod',
          deviceId: await DeviceInfo.getUniqueId(),
          deviceModel: DeviceInfo.getModel(),
          appVersion: DeviceInfo.getVersion(),
          buildNumber: DeviceInfo.getBuildNumber(),
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        },
      );
      console.log('✅ Device token registered with backend:', response.data);
    } catch (error) {
      console.error('❌ Failed to register device token:', error);
      if (axios.isAxiosError(error)) {
        console.error('  - Response status:', error.response?.status);
        console.error('  - Response data:', error.response?.data);
      }
    }
  }

  async unregisterDeviceToken() {
    try {
      // Get current token for precise deletion
      const token = await TokenStorage.getDeviceToken();

      // Unregister from backend
      await axios.delete(`${getApiUrl()}/user/device-token`, {
        data: {
          platform: Platform.OS,
          token: token || undefined,
        },
        headers: {
          Authorization: `Bearer ${TokenStorage.getAuthToken()}`,
        },
      });
      console.log('✅ Device token removed from backend');

      // Clear local storage
      TokenStorage.clearDeviceToken();
      console.log('🗑️ Device token unregistered locally');
    } catch (error) {
      console.error('❌ Failed to unregister device token:', error);
    }
  }

  /**
   * Get the current device token (useful for debugging)
   */
  async getDeviceToken(): Promise<string | null> {
    if (Platform.OS === 'ios') {
      return TokenStorage.getDeviceToken();
    }
    return null;
  }
}

export const pushNotificationService = new PushNotificationService();
