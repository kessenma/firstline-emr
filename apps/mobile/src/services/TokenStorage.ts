/**
 * TokenStorage Service
 *
 * Enterprise-grade token management for mobile authentication.
 * Implements a two-token security pattern:
 * - Auth Token: Long-lived (30 days) for API authentication
 * - PowerSync Token: Short-lived (24 hours) for PowerSync connections
 *
 * Security Features:
 * - Separate storage for different token types
 * - Automatic token expiry validation
 * - Secure token rotation support
 * - Memory-safe token handling
 *
 * @module TokenStorage
 */

import { storage } from '../utils/mmkv';

/**
 * Storage keys for different token types
 * Kept separate for security and clarity
 */
const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token', // Long-lived token (30 days)
  POWERSYNC_TOKEN: 'powersync_token', // Short-lived token (24 hours)
  POWERSYNC_TOKEN_EXPIRY: 'powersync_token_expiry', // When to refresh PowerSync token
  USER_DATA: 'user', // User profile data
  DEVICE_TOKEN: 'device_token', // Push notification token
  LAST_REGISTERED_DEVICE_TOKEN: 'last_registered_device_token', // Last token sent to backend
} as const;

/**
 * Token expiry buffer time (4 hours before actual expiry)
 * PowerSync tokens are refreshed proactively before they expire
 */
const TOKEN_REFRESH_BUFFER_MS = 4 * 60 * 60 * 1000; // 4 hours in milliseconds

/**
 * Interface for decoded JWT payload
 */
interface DecodedToken {
  id?: string;
  sub?: string;
  email: string;
  accountType?: string;
  isAdmin?: boolean;
  iat: number; // Issued at (timestamp)
  exp: number; // Expiry (timestamp)
  [key: string]: any;
}

/**
 * TokenStorage class - manages authentication and PowerSync tokens
 */
export class TokenStorage {
  /**
   * Store the long-lived authentication token
   * Used for API calls and session management
   *
   * @param token - JWT authentication token (30-day lifetime)
   */
  static setAuthToken(token: string): void {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token: must be a non-empty string');
      }

      // Validate token format (JWT has 3 parts separated by dots)
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format: expected JWT structure');
      }

      storage.set(STORAGE_KEYS.AUTH_TOKEN, token);
      console.log('[TokenStorage] Auth token stored successfully');
      console.log('[TokenStorage] Auth token length:', token.length);

      // Log expiry time for debugging
      try {
        const decoded = this.decodeToken(token);
        const expiryDate = new Date(decoded.exp * 1000);
        console.log(
          '[TokenStorage] Auth token expires:',
          expiryDate.toISOString(),
        );
      } catch {
        console.warn('[TokenStorage] Could not decode token for expiry check');
      }
    } catch (error) {
      console.error('[TokenStorage] Error storing auth token:', error);
      throw error;
    }
  }

  /**
   * Get the authentication token
   *
   * @returns Auth token or null if not found/expired
   */
  static getAuthToken(): string | null {
    try {
      const token = storage.getString(STORAGE_KEYS.AUTH_TOKEN);

      if (!token) {
        console.log('[TokenStorage] No auth token found');
        return null;
      }

      // Validate token is not expired
      if (this.isTokenExpired(token)) {
        console.log('[TokenStorage] Auth token is expired, removing...');
        this.clearAuthToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('[TokenStorage] Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Store the short-lived PowerSync token
   * Used exclusively for PowerSync WebSocket connections
   *
   * @param token - JWT PowerSync token (24-hour lifetime)
   */
  static setPowerSyncToken(token: string): void {
    try {
      if (!token || typeof token !== 'string') {
        throw new Error('Invalid token: must be a non-empty string');
      }

      // Validate token format
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format: expected JWT structure');
      }

      storage.set(STORAGE_KEYS.POWERSYNC_TOKEN, token);

      // Calculate and store when to refresh this token (20 hours from now)
      // We refresh 4 hours before expiry to ensure continuous connectivity
      const refreshTime = Date.now() + 20 * 60 * 60 * 1000; // 20 hours
      storage.set(STORAGE_KEYS.POWERSYNC_TOKEN_EXPIRY, refreshTime.toString());

      console.log('[TokenStorage] PowerSync token stored successfully');
      console.log('[TokenStorage] PowerSync token length:', token.length);

      // Log expiry time for debugging
      try {
        const decoded = this.decodeToken(token);
        const expiryDate = new Date(decoded.exp * 1000);
        const refreshDate = new Date(refreshTime);
        console.log(
          '[TokenStorage] PowerSync token expires:',
          expiryDate.toISOString(),
        );
        console.log(
          '[TokenStorage] PowerSync token refresh scheduled:',
          refreshDate.toISOString(),
        );
      } catch {
        console.warn(
          '[TokenStorage] Could not decode PowerSync token for expiry check',
        );
      }
    } catch (error) {
      console.error('[TokenStorage] Error storing PowerSync token:', error);
      throw error;
    }
  }

  /**
   * Get the PowerSync token
   *
   * @returns PowerSync token or null if not found/expired
   */
  static getPowerSyncToken(): string | null {
    try {
      const token = storage.getString(STORAGE_KEYS.POWERSYNC_TOKEN);

      if (!token) {
        console.log('[TokenStorage] No PowerSync token found');
        return null;
      }

      // Validate token is not expired
      if (this.isTokenExpired(token)) {
        console.log('[TokenStorage] PowerSync token is expired, removing...');
        this.clearPowerSyncToken();
        return null;
      }

      return token;
    } catch (error) {
      console.error('[TokenStorage] Error getting PowerSync token:', error);
      return null;
    }
  }

  /**
   * Check if PowerSync token needs refresh
   * Returns true if token should be refreshed proactively
   *
   * @returns boolean indicating if refresh is needed
   */
  static needsPowerSyncRefresh(): boolean {
    try {
      const expiryString = storage.getString(
        STORAGE_KEYS.POWERSYNC_TOKEN_EXPIRY,
      );

      if (!expiryString) {
        // If no expiry time stored, check the token itself
        const token = this.getPowerSyncToken();
        if (!token) return true; // No token = needs refresh

        // Check if token expires in less than 4 hours
        try {
          const decoded = this.decodeToken(token);
          const expiryTime = decoded.exp * 1000;
          const timeUntilExpiry = expiryTime - Date.now();
          return timeUntilExpiry < TOKEN_REFRESH_BUFFER_MS;
        } catch {
          return true; // Can't decode = needs refresh
        }
      }

      const expiryTime = parseInt(expiryString, 10);
      const now = Date.now();
      const needsRefresh = now >= expiryTime;

      return needsRefresh;
    } catch (error) {
      console.error(
        '[TokenStorage] Error checking PowerSync refresh need:',
        error,
      );
      return true; // On error, assume refresh is needed
    }
  }

  /**
   * Get time until PowerSync token refresh is needed
   *
   * @returns Milliseconds until refresh, or 0 if refresh needed now
   */
  static getTimeUntilPowerSyncRefresh(): number {
    try {
      const expiryString = storage.getString(
        STORAGE_KEYS.POWERSYNC_TOKEN_EXPIRY,
      );

      if (!expiryString) {
        return 0; // No expiry = refresh now
      }

      const expiryTime = parseInt(expiryString, 10);
      const timeRemaining = expiryTime - Date.now();

      return Math.max(0, timeRemaining);
    } catch (error) {
      console.error('[TokenStorage] Error calculating refresh time:', error);
      return 0;
    }
  }

  /**
   * Store user data
   *
   * @param user - User profile data
   */
  static setUser(user: any): void {
    try {
      if (!user) {
        throw new Error('Invalid user data');
      }

      // Store user data without tokens (tokens stored separately for security)
      const userData = { ...user };
      delete userData.token; // Remove legacy token field
      delete userData.authToken; // Remove if present
      delete userData.powerSyncToken; // Remove if present

      storage.set(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
      console.log('[TokenStorage] User data stored successfully');
      console.log('[TokenStorage] User ID:', userData.id);
      console.log('[TokenStorage] User email:', userData.email);
    } catch (error) {
      console.error('[TokenStorage] Error storing user data:', error);
      throw error;
    }
  }

  /**
   * Get stored user data
   *
   * @returns User data or null if not found
   */
  static getUser(): any | null {
    try {
      const userJson = storage.getString(STORAGE_KEYS.USER_DATA);

      if (!userJson) {
        console.log('[TokenStorage] No user data found');
        return null;
      }

      const userData = JSON.parse(userJson);

      // Add tokens to user object for backward compatibility
      // Note: These are references, not copies, for memory efficiency
      userData.token = this.getAuthToken();
      userData.authToken = this.getAuthToken();
      userData.powerSyncToken = this.getPowerSyncToken();

      return userData;
    } catch (error) {
      console.error('[TokenStorage] Error getting user data:', error);
      return null;
    }
  }

  /**
   * Clear authentication token
   */
  static clearAuthToken(): void {
    try {
      storage.remove(STORAGE_KEYS.AUTH_TOKEN);
      console.log('[TokenStorage] Auth token cleared');
    } catch (error) {
      console.error('[TokenStorage] Error clearing auth token:', error);
    }
  }

  /**
   * Clear PowerSync token and its expiry time
   */
  static clearPowerSyncToken(): void {
    try {
      storage.remove(STORAGE_KEYS.POWERSYNC_TOKEN);
      storage.remove(STORAGE_KEYS.POWERSYNC_TOKEN_EXPIRY);
      console.log('[TokenStorage] PowerSync token cleared');
    } catch (error) {
      console.error('[TokenStorage] Error clearing PowerSync token:', error);
    }
  }

  /**
   * Clear user data
   */
  static clearUser(): void {
    try {
      storage.remove(STORAGE_KEYS.USER_DATA);
      console.log('[TokenStorage] User data cleared');
    } catch (error) {
      console.error('[TokenStorage] Error clearing user data:', error);
    }
  }

  /**
   * Store device token for push notifications
   *
   * @param token - Device push token
   */
  static setDeviceToken(token: string): void {
    try {
      if (!token) return;
      storage.set(STORAGE_KEYS.DEVICE_TOKEN, token);
      console.log('[TokenStorage] Device token stored');
    } catch (error) {
      console.error('[TokenStorage] Error storing device token:', error);
    }
  }

  /**
   * Get device token
   *
   * @returns Device token or null
   */
  static getDeviceToken(): string | null {
    try {
      return storage.getString(STORAGE_KEYS.DEVICE_TOKEN) || null;
    } catch (error) {
      console.error('[TokenStorage] Error getting device token:', error);
      return null;
    }
  }

  /**
   * Clear device token
   */
  static clearDeviceToken(): void {
    try {
      storage.remove(STORAGE_KEYS.DEVICE_TOKEN);
      console.log('[TokenStorage] Device token cleared');
    } catch (error) {
      console.error('[TokenStorage] Error clearing device token:', error);
    }
  }

  /**
   * Store last registered device token
   * Used to check if token needs to be sent to backend
   *
   * @param token - Device push token
   */
  static setLastRegisteredDeviceToken(token: string): void {
    try {
      if (!token) return;
      storage.set(STORAGE_KEYS.LAST_REGISTERED_DEVICE_TOKEN, token);
    } catch (error) {
      console.error('[TokenStorage] Error storing last registered device token:', error);
    }
  }

  /**
   * Get last registered device token
   *
   * @returns Last registered token or null
   */
  static getLastRegisteredDeviceToken(): string | null {
    try {
      return storage.getString(STORAGE_KEYS.LAST_REGISTERED_DEVICE_TOKEN) || null;
    } catch (error) {
      console.error('[TokenStorage] Error getting last registered device token:', error);
      return null;
    }
  }

  /**
   * Clear last registered device token
   */
  static clearLastRegisteredDeviceToken(): void {
    try {
      storage.remove(STORAGE_KEYS.LAST_REGISTERED_DEVICE_TOKEN);
    } catch (error) {
      console.error('[TokenStorage] Error clearing last registered device token:', error);
    }
  }

  /**
   * Clear all authentication data
   * Use this on logout
   */
  static clearAll(): void {
    try {
      console.log('[TokenStorage] Clearing all authentication data...');
      this.clearAuthToken();
      this.clearPowerSyncToken();
      this.clearUser();
      this.clearLastRegisteredDeviceToken();
      console.log(
        '[TokenStorage] All authentication data cleared successfully',
      );
    } catch (error) {
      console.error('[TokenStorage] Error clearing all data:', error);
      // Try to clear individual items even if bulk clear fails
      try {
        this.clearAuthToken();
      } catch {}
      try {
        this.clearPowerSyncToken();
      } catch {}
      try {
        this.clearUser();
      } catch {}
      try {
        this.clearLastRegisteredDeviceToken();
      } catch {}
    }
  }

  /**
   * Decode a JWT token without verification
   * WARNING: This does NOT verify the signature!
   * Used only for reading claims like expiry time
   *
   * @param token - JWT token string
   * @returns Decoded token payload
   */
  private static decodeToken(token: string): DecodedToken {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format');
      }

      // Decode the payload (second part)
      const payload = parts[1];
      const decoded = JSON.parse(atob(payload));

      return decoded;
    } catch (error) {
      console.error('[TokenStorage] Error decoding token:', error);
      throw new Error('Failed to decode JWT token');
    }
  }

  /**
   * Check if a token is expired
   *
   * @param token - JWT token string
   * @returns true if token is expired
   */
  private static isTokenExpired(token: string): boolean {
    try {
      const decoded = this.decodeToken(token);

      if (!decoded.exp) {
        console.warn('[TokenStorage] Token has no expiry time');
        return false; // If no expiry, assume not expired (though this shouldn't happen)
      }

      const expiryTime = decoded.exp * 1000; // Convert to milliseconds
      const currentTime = Date.now();
      const isExpired = currentTime >= expiryTime;

      if (isExpired) {
        const hoursAgo = Math.floor(
          (currentTime - expiryTime) / (60 * 60 * 1000),
        );
        console.log(`[TokenStorage] Token expired ${hoursAgo} hours ago`);
      }

      return isExpired;
    } catch (error) {
      console.error('[TokenStorage] Error checking token expiry:', error);
      return true; // If we can't decode it, treat it as expired
    }
  }

  /**
   * Get token expiry time in human-readable format
   * Useful for debugging
   *
   * @param tokenType - 'auth' or 'powersync'
   * @returns Expiry information or error message
   */
  static getTokenExpiryInfo(tokenType: 'auth' | 'powersync'): string {
    try {
      const token =
        tokenType === 'auth' ? this.getAuthToken() : this.getPowerSyncToken();

      if (!token) {
        return `No ${tokenType} token found`;
      }

      const decoded = this.decodeToken(token);
      const expiryTime = decoded.exp * 1000;
      const currentTime = Date.now();
      const timeRemaining = expiryTime - currentTime;

      if (timeRemaining <= 0) {
        const hoursAgo = Math.floor(-timeRemaining / (60 * 60 * 1000));
        return `Expired ${hoursAgo} hours ago`;
      }

      const days = Math.floor(timeRemaining / (24 * 60 * 60 * 1000));
      const hours = Math.floor(
        (timeRemaining % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000),
      );
      const minutes = Math.floor(
        (timeRemaining % (60 * 60 * 1000)) / (60 * 1000),
      );

      if (days > 0) {
        return `Expires in ${days}d ${hours}h`;
      } else if (hours > 0) {
        return `Expires in ${hours}h ${minutes}m`;
      } else {
        return `Expires in ${minutes}m`;
      }
    } catch (error) {
      return `Error: ${error instanceof Error ? error.message : 'Unknown'}`;
    }
  }

  /**
   * Debug function to log all token information
   * DO NOT use in production builds with sensitive data
   */
  static debugTokenInfo(): void {
    console.log('=== TOKEN STORAGE DEBUG INFO ===');
    console.log('Auth token present:', !!this.getAuthToken());
    console.log('Auth token expiry:', this.getTokenExpiryInfo('auth'));
    console.log('PowerSync token present:', !!this.getPowerSyncToken());
    console.log(
      'PowerSync token expiry:',
      this.getTokenExpiryInfo('powersync'),
    );
    console.log('PowerSync needs refresh:', this.needsPowerSyncRefresh());
    console.log('User data present:', !!this.getUser());
    console.log('================================');
  }
}

/**
 * Export a singleton instance for convenience
 * Can be used as: tokenStorage.setAuthToken(...)
 */
export const tokenStorage = TokenStorage;

/**
 * Export default for backward compatibility
 */
export default TokenStorage;
