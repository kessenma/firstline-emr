import { storageUtils } from '../utils/storage';
import { TokenStorage } from './TokenStorage';
import { pushNotificationService } from './PushNotificationService';

interface LoginCredentials {
  email: string;
  password: string;
}

interface SessionUser {
  id: string; // UUID v4 (PostgreSQL primary key)
  email: string;
  accountType: 'Doctor' | 'Triage';
  firstName: string;
  lastName: string;
  city: string;
  countries: string[];
  languages: string[];
  doctorSpecialty?: string[];
  image?: string;
  isAdmin: boolean;
  dob?: string | Date;
  gender?: 'Male' | 'Female';
  token?: string;
  userSettings?: string;
  userNotifications?: string;
  userMessages?: string;
  // Authorization status (for WaitingRoom logic)
  authorized?: boolean;
  approvalDate?: string | null; // ISO timestamp of admin approval
  // PowerSync metadata fields
  powersync_id?: string;
  powersync_updated_at?: string;
}

interface LoginResponse {
  success: boolean;
  user?: SessionUser;
  error?: string;
  // 2FA fields
  requires2FA?: boolean;
  requires2FASetup?: boolean;
  loginToken?: string;
  methods?: string[];
}

export class AuthService {
  private baseUrl: string;
  private currentUser: SessionUser | null = null;
  private sessionCookie: string | null = null;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  getCurrentUser(): SessionUser | null {
    return this.currentUser;
  }

  /**
   * Login with email and password via mobile auth API
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    try {
      console.log('📱 Mobile login attempt for:', credentials.email);
      console.log('Base URL:', this.baseUrl);

      const loginUrl = `${this.baseUrl}/api/auth/mobile-login`;
      console.log('Mobile auth URL:', loginUrl);

      // Add timeout to detect network issues
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      let loginResponse;
      try {
        loginResponse = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: credentials.email.toLowerCase().trim(),
            password: credentials.password,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('❌ Network fetch error:', fetchError);
        console.error(
          '❌ Error name:',
          fetchError instanceof Error ? fetchError.name : 'Unknown',
        );
        console.error(
          '❌ Error message:',
          fetchError instanceof Error ? fetchError.message : 'Unknown',
        );

        // Provide more specific error messages
        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            throw new Error(
              'Connection timeout - please check your internet connection',
            );
          } else if (fetchError.message === 'Network request failed') {
            throw new Error(
              'Network error - cannot reach server. Please check:\n1. Internet connection\n2. VPN settings\n3. Server is accessible',
            );
          }
        }
        throw fetchError;
      }

      console.log('Mobile auth response status:', loginResponse.status);

      if (!loginResponse.ok) {
        const errorData = await loginResponse
          .json()
          .catch(() => ({ error: 'Login failed' }));
        console.log('Mobile auth error response:', errorData);
        throw new Error(errorData.error || 'Login failed');
      }

      const responseData = await loginResponse.json();
      console.log('Mobile auth response data:', JSON.stringify(responseData));

      if (!responseData.success) {
        // Check for 2FA requirement (not an error, just needs additional step)
        if (responseData.requires2FA) {
          return {
            success: false,
            requires2FA: true,
            loginToken: responseData.loginToken,
            methods: responseData.methods,
          };
        }
        if (responseData.requires2FASetup) {
          return {
            success: false,
            requires2FASetup: true,
            error: responseData.error || 'Two-factor authentication setup is required.',
          };
        }
        throw new Error(responseData.error || 'Login failed');
      }

      // Extract both tokens from response
      const authToken = responseData.authToken || responseData.token; // Fallback for backward compatibility
      const powerSyncToken = responseData.powerSyncToken;

      if (!authToken) {
        throw new Error('No authentication token received from server');
      }

      // Store user data (without tokens for security)
      const user: SessionUser = {
        ...responseData.user,
        // Don't store tokens in user object - use TokenStorage instead
      };

      // Store tokens separately using new TokenStorage
      try {
        console.log('📦 Storing authentication tokens...');

        // Store long-lived auth token (30 days) for API calls
        TokenStorage.setAuthToken(authToken);
        console.log('✅ Auth token stored (30-day expiry)');

        // Store short-lived PowerSync token (24 hours) if available
        // IMPORTANT: Only store the powerSyncToken if it was explicitly provided.
        // The authToken cannot be used as a fallback because it lacks the 'kid' header
        // and 'aud' claim that PowerSync requires for JWT validation.
        if (powerSyncToken) {
          TokenStorage.setPowerSyncToken(powerSyncToken);
          console.log('✅ PowerSync token stored (24-hour expiry)');
        } else {
          console.log(
            'ℹ️ No PowerSync token received (user may not be authorized yet)',
          );
          // Clear any stale PowerSync token that might exist
          TokenStorage.clearPowerSyncToken();
        }

        TokenStorage.setUser(user);
        this.currentUser = user;

        console.log('✅ User data saved to secure storage');
        console.log('👤 User:', user.email);
        console.log('🔐 Auth token length:', authToken.length);
        if (powerSyncToken) {
          console.log('🔐 PowerSync token length:', powerSyncToken.length);
        }

        // Also update legacy storage for backward compatibility
        storageUtils.setUser({ ...user, token: authToken });
      } catch (storageError) {
        console.error('❌ Failed to save tokens to storage:', storageError);
        throw new Error('Failed to save authentication data');
      }

      console.log('✅ Mobile login successful for:', user.email);

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('❌ Mobile login error:', error);
      console.error(
        '❌ Error type:',
        error instanceof Error ? error.constructor.name : typeof error,
      );
      console.error(
        '❌ Error details:',
        JSON.stringify(error, Object.getOwnPropertyNames(error)),
      );

      // TODO: Implement offline login with PowerSync when ready
      // For now, only online authentication is supported

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * Login with passkey token (from WebAuthn authentication)
   */
  async loginWithPasskeyToken(
    passkeyToken: string,
    email: string,
  ): Promise<LoginResponse> {
    try {
      console.log('📱 Mobile passkey login attempt for:', email);
      console.log('Base URL:', this.baseUrl);

      const loginUrl = `${this.baseUrl}/api/auth/mobile-login`;
      console.log('Mobile auth URL:', loginUrl);

      // Add timeout to detect network issues
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      let loginResponse;
      try {
        loginResponse = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            passkeyToken,
          }),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('❌ Network fetch error:', fetchError);

        if (fetchError instanceof Error) {
          if (fetchError.name === 'AbortError') {
            throw new Error(
              'Connection timeout - please check your internet connection',
            );
          } else if (fetchError.message === 'Network request failed') {
            throw new Error(
              'Network error - cannot reach server. Please check your connection.',
            );
          }
        }
        throw fetchError;
      }

      console.log('Mobile auth response status:', loginResponse.status);

      if (!loginResponse.ok) {
        const errorData = await loginResponse
          .json()
          .catch(() => ({ error: 'Passkey login failed' }));
        console.log('Mobile auth error response:', errorData);
        throw new Error(errorData.error || 'Passkey login failed');
      }

      const responseData = await loginResponse.json();
      console.log('Mobile auth response data:', JSON.stringify(responseData));

      if (!responseData.success) {
        throw new Error(responseData.error || 'Passkey login failed');
      }

      // Extract both tokens from response
      const authToken = responseData.authToken || responseData.token;
      const powerSyncToken = responseData.powerSyncToken;

      if (!authToken) {
        throw new Error('No authentication token received from server');
      }

      // Store user data (without tokens for security)
      const user: SessionUser = {
        ...responseData.user,
      };

      // Store tokens using TokenStorage
      try {
        console.log('📦 Storing authentication tokens...');

        TokenStorage.setAuthToken(authToken);
        console.log('✅ Auth token stored (30-day expiry)');

        // IMPORTANT: Only store the powerSyncToken if it was explicitly provided.
        // The authToken cannot be used as a fallback because it lacks the 'kid' header
        // and 'aud' claim that PowerSync requires for JWT validation.
        if (powerSyncToken) {
          TokenStorage.setPowerSyncToken(powerSyncToken);
          console.log('✅ PowerSync token stored (24-hour expiry)');
        } else {
          console.log(
            'ℹ️ No PowerSync token received (user may not be authorized yet)',
          );
          // Clear any stale PowerSync token that might exist
          TokenStorage.clearPowerSyncToken();
        }

        TokenStorage.setUser(user);
        this.currentUser = user;

        console.log('✅ User data saved to secure storage');
        console.log('👤 User:', user.email);

        // Also update legacy storage for backward compatibility
        storageUtils.setUser({ ...user, token: authToken });
      } catch (storageError) {
        console.error('❌ Failed to save tokens to storage:', storageError);
        throw new Error('Failed to save authentication data');
      }

      console.log('✅ Mobile passkey login successful for:', user.email);

      return {
        success: true,
        user,
      };
    } catch (error) {
      console.error('❌ Mobile passkey login error:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Passkey login failed',
      };
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      // Clear local session
      this.currentUser = null;

      // Reset push notification service so it re-registers for the next user
      pushNotificationService.reset();
      console.log('✅ Push notification service reset');

      // Clear all authentication data from secure storage
      try {
        TokenStorage.clearAll();
        console.log('✅ All authentication data cleared from secure storage');
      } catch (storageError) {
        console.error('❌ Failed to clear secure storage:', storageError);
      }

      // Also clear legacy storage for backward compatibility
      try {
        storageUtils.clearAuth();
        console.log('✅ Legacy storage cleared');
      } catch (storageError) {
        console.error('❌ Failed to clear legacy storage:', storageError);
      }

      console.log('Logged out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local session even if something fails
      this.currentUser = null;

      try {
        storageUtils.clearAuth();
      } catch (storageError) {
        console.error('Failed to clear MMKV:', storageError);
      }
    }
  }

  /**
   * Check if user has valid stored session
   */
  async checkStoredSession(): Promise<SessionUser | null> {
    try {
      console.log('🔍 Checking stored session...');

      // Get auth token from secure storage
      const authToken = TokenStorage.getAuthToken();

      if (!authToken) {
        console.log('❌ No valid auth token found');
        return null;
      }

      // Get user data
      const storedUser = TokenStorage.getUser();

      if (!storedUser) {
        console.log('❌ No user data found');
        TokenStorage.clearAll(); // Clean up orphaned token
        return null;
      }

      console.log('✅ Valid session found for:', storedUser.email);
      console.log('📅 Auth token:', TokenStorage.getTokenExpiryInfo('auth'));
      console.log(
        '📅 PowerSync token:',
        TokenStorage.getTokenExpiryInfo('powersync'),
      );

      this.currentUser = storedUser;
      return storedUser;
    } catch (error) {
      console.error('❌ Error checking stored session:', error);
      return null;
    }
  }

  /**
   * Restore session from MMKV storage
   * Checks if stored user data is valid and not expired
   */
  async restoreSession(): Promise<LoginResponse> {
    try {
      console.log('🔄 Attempting to restore session from storage...');

      // Get auth token from secure storage
      const authToken = TokenStorage.getAuthToken();

      if (!authToken) {
        console.log('❌ No valid auth token found');
        return { success: false, error: 'No stored session' };
      }

      // Get user data
      const storedUser = TokenStorage.getUser();

      if (!storedUser) {
        console.log('❌ No stored user data found');
        TokenStorage.clearAll();
        return { success: false, error: 'No user data in stored session' };
      }

      console.log('✅ Found stored user:', storedUser.email);
      console.log('📅 Auth token:', TokenStorage.getTokenExpiryInfo('auth'));
      console.log(
        '📅 PowerSync token:',
        TokenStorage.getTokenExpiryInfo('powersync'),
      );

      // Check if PowerSync token needs refresh
      if (TokenStorage.needsPowerSyncRefresh()) {
        console.log('⚠️ PowerSync token needs refresh');
        // TODO: Implement token refresh service
        // For now, continue with existing token
      }

      // Session is valid
      console.log('✅ Session restored successfully');
      this.currentUser = storedUser;
      return { success: true, user: storedUser };
    } catch (error) {
      console.error('❌ Error restoring session:', error);
      TokenStorage.clearAll();
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Failed to restore session',
      };
    }
  }

  /**
   * Check if the current user has been authorized/approved
   * Called by WaitingRoom when app returns to foreground
   */
  async checkAuthorization(): Promise<{
    authorized: boolean;
    error?: string;
  }> {
    try {
      const authToken = TokenStorage.getAuthToken();
      if (!authToken) {
        return { authorized: false, error: 'No auth token' };
      }

      console.log('🔍 Checking authorization status...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${this.baseUrl}/api/user/check-authorization`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          authorized: false,
          error: errorData.error || 'Failed to check authorization',
        };
      }

      const data = await response.json();
      console.log('✅ Authorization check result:', data.authorized);

      // If now authorized, update stored user data
      if (data.authorized && this.currentUser) {
        this.currentUser.authorized = true;
        TokenStorage.setUser(this.currentUser);
      }

      return { authorized: !!data.authorized };
    } catch (error) {
      console.error('❌ Error checking authorization:', error);
      return {
        authorized: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Sign up a new user account
   */
  async signup(data: {
    email: string;
    password: string;
    accountType: string;
    firstName: string;
    lastName: string;
    dob?: string;
    doctorSpecialty?: string[];
    languages?: string[];
    countries?: string[];
    gender?: string;
    totpCredentialData?: {
      encryptedSecret: string;
      encryptionIv: string;
      encryptionTag: string;
    };
    missionIds?: string[];
  }): Promise<{ success: boolean; userId?: string; error?: string }> {
    try {
      console.log('📱 Mobile signup attempt for:', data.email);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(`${this.baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: data.email.toLowerCase().trim(),
          password: data.password,
          accountType: data.accountType,
          firstName: data.firstName,
          lastName: data.lastName,
          dob: data.dob,
          ...(data.accountType === 'Doctor' && {
            doctorSpecialty: data.doctorSpecialty || [],
            languages: data.languages,
            countries: data.countries,
            gender: data.gender,
          }),
          ...(data.accountType === 'Triage' && {
            languages: data.languages,
            countries: data.countries,
          }),
          ...(data.totpCredentialData && {
            totpCredentialData: data.totpCredentialData,
          }),
          ...(data.missionIds && data.missionIds.length > 0 && {
            missionIds: data.missionIds,
          }),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const result = await response.json();

      if (response.ok) {
        console.log('✅ Signup successful, userId:', result.userId);
        return { success: true, userId: result.userId };
      }

      return { success: false, error: result.message || 'Signup failed' };
    } catch (error) {
      console.error('❌ Signup error:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Connection timeout - please check your internet connection' };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Signup failed',
      };
    }
  }

  /**
   * Upload a medical license file for a user
   */
  async uploadLicense(
    file: { uri: string; name: string; type: string },
    firstName: string,
    lastName: string,
    specialty: string,
    userId: string,
  ): Promise<boolean> {
    try {
      console.log('📄 Uploading medical license for specialty:', specialty);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.type,
      } as any);
      formData.append('firstName', firstName);
      formData.append('lastName', lastName);
      formData.append('specialty', specialty);
      formData.append('userId', userId);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(`${this.baseUrl}/api/upload-license`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        console.log('✅ License uploaded for:', specialty);
        return true;
      }

      console.error('❌ License upload failed:', response.status);
      return false;
    } catch (error) {
      console.error('❌ License upload error:', error);
      return false;
    }
  }

  /**
   * Check if an email already exists
   */
  async checkEmailExists(email: string): Promise<{ exists: boolean; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(
        `${this.baseUrl}/api/auth/signup/email-check?email=${encodeURIComponent(email.toLowerCase().trim())}`,
        { method: 'GET', signal: controller.signal },
      );

      clearTimeout(timeoutId);
      const data = await response.json();

      if (response.status === 409 || data.exists) {
        return { exists: true };
      }

      return { exists: false };
    } catch (error) {
      console.error('❌ Email check error:', error);
      return { exists: false, error: error instanceof Error ? error.message : 'Failed to check email' };
    }
  }

  /**
   * Send a password reset verification code to the given email
   */
  async sendVerificationCode(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `${this.baseUrl}/api/auth/forgot-password/send-verification-code`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim() }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to send verification code' };
      }

      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Connection timeout' };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Verify a password reset code
   */
  async verifyResetCode(email: string, code: string): Promise<{ success: boolean; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `${this.baseUrl}/api/auth/forgot-password/verify-code`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim(), tempCode: code }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        return { success: false, error: data.error || 'Invalid verification code' };
      }

      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Connection timeout' };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Reset password after verification
   */
  async resetPassword(email: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(
        `${this.baseUrl}/api/auth/forgot-password/reset-password`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.toLowerCase().trim(), newPassword }),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return { success: false, error: data.message || 'Failed to reset password' };
      }

      return { success: true };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return { success: false, error: 'Connection timeout' };
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Update API base URL (for switching between dev/prod)
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Get current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

// Export singleton instance
export const authService = new AuthService();
