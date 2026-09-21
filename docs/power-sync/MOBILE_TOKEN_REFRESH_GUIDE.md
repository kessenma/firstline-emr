# Mobile App Token Refresh System - Implementation Guide

**Date:** January 1, 2026  
**Status:** Implementation Guide  
**Related:** PowerSync JWT Authentication Fixes

## Overview

This guide explains how to implement a two-token authentication system in your mobile app to provide excellent UX while meeting PowerSync's 24-hour token expiry requirement.

## The Problem

PowerSync requires JWT tokens to expire within 24 hours (86400 seconds) for security. However, requiring users to log in every 24 hours is terrible UX. Major apps like Instagram, X, and Slack don't do this.

## The Solution: Two-Token System

Use **two separate tokens** with different purposes and lifetimes:

### 1. Auth Token (Long-Lived)
- **Purpose:** General API authentication
- **Lifetime:** 30 days
- **Used for:** API calls, user session management
- **When it expires:** User must re-login (once per month)

### 2. PowerSync Token (Short-Lived)
- **Purpose:** PowerSync connection only
- **Lifetime:** 24 hours
- **Used for:** PowerSync WebSocket authentication
- **When it expires:** Auto-refreshed in background (user doesn't notice)

## User Experience

✅ **User logs in once** → Stays logged in for 30 days  
✅ **PowerSync token expires every 24h** → Auto-refreshed silently  
✅ **No password re-entry needed** → Seamless experience  
✅ **Secure** → PowerSync tokens are short-lived  

## Backend API Changes (Already Implemented)

### 1. Mobile Login Returns Both Tokens

**Endpoint:** `POST /api/auth/mobile-login`

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "authToken": "eyJhbGc...long-lived-token",      // 30 days
  "powerSyncToken": "eyJhbGc...short-lived-token", // 24 hours
  "token": "eyJhbGc...long-lived-token",           // Backward compat
  "user": {
    "id": "user-uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "accountType": "Doctor",
    "isAdmin": true
  }
}
```

### 2. PowerSync Token Refresh Endpoint (NEW)

**Endpoint:** `POST /api/auth/refresh-powersync`

**Request Headers:**
```
Authorization: Bearer <authToken>
```

**Response:**
```json
{
  "success": true,
  "powerSyncToken": "eyJhbGc...new-24h-token"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Invalid or expired authentication token"
}
```

## Mobile App Implementation

### Step 1: Update Storage Keys

Store both tokens separately:

```typescript
// apps/mobile/src/services/storage/TokenStorage.ts

export const TOKEN_KEYS = {
  AUTH_TOKEN: 'auth_token',           // Long-lived (30 days)
  POWERSYNC_TOKEN: 'powersync_token', // Short-lived (24 hours)
  TOKEN_EXPIRY: 'token_expiry',       // Timestamp of when to refresh
};

export const TokenStorage = {
  // Store auth token (30 days)
  async setAuthToken(token: string): Promise<void> {
    await storage.set(TOKEN_KEYS.AUTH_TOKEN, token);
  },

  async getAuthToken(): Promise<string | null> {
    return await storage.get(TOKEN_KEYS.AUTH_TOKEN);
  },

  // Store PowerSync token (24 hours)
  async setPowerSyncToken(token: string): Promise<void> {
    await storage.set(TOKEN_KEYS.POWERSYNC_TOKEN, token);
    
    // Set refresh time to 20 hours from now (before 24h expiry)
    const refreshTime = Date.now() + (20 * 60 * 60 * 1000);
    await storage.set(TOKEN_KEYS.TOKEN_EXPIRY, refreshTime.toString());
  },

  async getPowerSyncToken(): Promise<string | null> {
    return await storage.get(TOKEN_KEYS.POWERSYNC_TOKEN);
  },

  async getTokenExpiryTime(): Promise<number | null> {
    const expiry = await storage.get(TOKEN_KEYS.TOKEN_EXPIRY);
    return expiry ? parseInt(expiry, 10) : null;
  },

  async clearAll(): Promise<void> {
    await storage.delete(TOKEN_KEYS.AUTH_TOKEN);
    await storage.delete(TOKEN_KEYS.POWERSYNC_TOKEN);
    await storage.delete(TOKEN_KEYS.TOKEN_EXPIRY);
  },
};
```

### Step 2: Update Login Flow

```typescript
// apps/mobile/src/services/AuthService.ts

export class AuthService {
  static async login(email: string, password: string): Promise<LoginResponse> {
    console.log('📱 Mobile login attempt for:', email);
    
    const response = await fetch(`${API_URL}/api/auth/mobile-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();

    if (data.success) {
      console.log('✅ Login successful');
      
      // Store BOTH tokens separately
      await TokenStorage.setAuthToken(data.authToken);
      await TokenStorage.setPowerSyncToken(data.powerSyncToken);
      await storage.set('user', JSON.stringify(data.user));

      console.log('✅ Both tokens stored successfully');
      console.log('📅 Auth token expires in: 30 days');
      console.log('📅 PowerSync token expires in: 24 hours');
      console.log('🔄 PowerSync token will auto-refresh in: 20 hours');

      return data;
    }

    throw new Error(data.error || 'Login failed');
  }

  static async logout(): Promise<void> {
    console.log('🔓 Logging out...');
    
    // Clear both tokens
    await TokenStorage.clearAll();
    await storage.delete('user');
    
    console.log('✅ Logged out successfully');
  }
}
```

### Step 3: Create Token Refresh Service

```typescript
// apps/mobile/src/services/TokenRefreshService.ts

import { TokenStorage } from './storage/TokenStorage';
import { PowerSyncService } from './powersync/PowerSyncService';

export class TokenRefreshService {
  private static refreshTimer: NodeJS.Timeout | null = null;
  private static isRefreshing = false;

  /**
   * Start automatic PowerSync token refresh
   * Checks every hour if refresh is needed
   */
  static startAutoRefresh(): void {
    console.log('🔄 Starting PowerSync token auto-refresh service');

    // Check immediately
    this.checkAndRefreshToken();

    // Then check every hour
    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshToken();
    }, 60 * 60 * 1000); // Every hour
  }

  /**
   * Stop automatic token refresh
   */
  static stopAutoRefresh(): void {
    if (this.refreshTimer) {
      console.log('⏹️ Stopping PowerSync token auto-refresh service');
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check if token needs refresh and refresh if needed
   */
  private static async checkAndRefreshToken(): Promise<void> {
    try {
      const expiryTime = await TokenStorage.getTokenExpiryTime();
      
      if (!expiryTime) {
        console.log('⚠️ No token expiry time found, skipping refresh');
        return;
      }

      const now = Date.now();
      const timeUntilExpiry = expiryTime - now;
      const hoursUntilExpiry = timeUntilExpiry / (60 * 60 * 1000);

      console.log(`⏰ PowerSync token expires in ${hoursUntilExpiry.toFixed(1)} hours`);

      // Refresh if less than 4 hours until expiry (or already expired)
      if (timeUntilExpiry < (4 * 60 * 60 * 1000)) {
        console.log('🔄 Time to refresh PowerSync token');
        await this.refreshPowerSyncToken();
      } else {
        console.log('✅ PowerSync token still fresh, no refresh needed');
      }
    } catch (error) {
      console.error('❌ Error checking token expiry:', error);
    }
  }

  /**
   * Manually refresh PowerSync token
   */
  static async refreshPowerSyncToken(): Promise<boolean> {
    if (this.isRefreshing) {
      console.log('⚠️ Token refresh already in progress');
      return false;
    }

    this.isRefreshing = true;

    try {
      console.log('🔄 Refreshing PowerSync token...');

      // Get the long-lived auth token
      const authToken = await TokenStorage.getAuthToken();

      if (!authToken) {
        console.error('❌ No auth token found, cannot refresh');
        return false;
      }

      // Call refresh endpoint
      const response = await fetch(
        `${process.env.API_URL}/api/auth/refresh-powersync`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        console.error('❌ Token refresh failed:', error);
        
        // If auth token is invalid, user needs to log back in
        if (response.status === 401) {
          console.error('❌ Auth token expired, user must re-login');
          // Trigger logout or re-login flow
          // EventEmitter.emit('auth:expired');
        }
        
        return false;
      }

      const data = await response.json();

      if (data.success && data.powerSyncToken) {
        // Store new PowerSync token
        await TokenStorage.setPowerSyncToken(data.powerSyncToken);
        
        console.log('✅ PowerSync token refreshed successfully');
        console.log('📅 New token expires in: 24 hours');
        console.log('🔄 Next refresh in: 20 hours');

        // Reconnect PowerSync with new token
        await this.reconnectPowerSync();

        return true;
      }

      console.error('❌ Unexpected refresh response:', data);
      return false;
    } catch (error) {
      console.error('❌ Error refreshing PowerSync token:', error);
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Reconnect PowerSync with new token
   */
  private static async reconnectPowerSync(): Promise<void> {
    try {
      console.log('🔌 Reconnecting PowerSync with new token...');
      
      // Disconnect and reconnect to use new token
      await PowerSyncService.disconnect();
      await PowerSyncService.connect();
      
      console.log('✅ PowerSync reconnected successfully');
    } catch (error) {
      console.error('❌ Error reconnecting PowerSync:', error);
    }
  }
}
```

### Step 4: Update PowerSync Service

Update `fetchCredentials` to use the PowerSync-specific token:

```typescript
// apps/mobile/src/services/powersync/PowerSyncService.ts

export const PowerSyncService = {
  // ... existing code ...

  async fetchCredentials() {
    console.log('🔐 PowerSync fetchCredentials called');
    console.log('📡 Endpoint:', POWERSYNC_URL);

    // Use PowerSync-specific token (NOT the auth token)
    const powerSyncToken = await TokenStorage.getPowerSyncToken();

    if (!powerSyncToken) {
      console.error('❌ No PowerSync token found');
      throw new Error('No PowerSync token available');
    }

    console.log('🎫 PowerSync token available: true');
    console.log('🎫 PowerSync token length:', powerSyncToken.length);

    return {
      endpoint: POWERSYNC_URL,
      token: powerSyncToken, // Use PowerSync-specific token
    };
  },

  // ... rest of the code ...
};
```

### Step 5: Update API Service

Update API calls to use the auth token (not PowerSync token):

```typescript
// apps/mobile/src/services/ApiService.ts

export class ApiService {
  static async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    // Use AUTH token for API calls (NOT PowerSync token)
    const authToken = await TokenStorage.getAuthToken();

    const headers = {
      'Content-Type': 'application/json',
      ...(authToken && { Authorization: `Bearer ${authToken}` }),
      ...options.headers,
    };

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Auth token expired, trigger re-login
      console.error('❌ Auth token expired');
      // EventEmitter.emit('auth:expired');
      throw new Error('Authentication expired');
    }

    return response.json();
  }
}
```

### Step 6: Initialize on App Start

```typescript
// apps/mobile/App.tsx or AuthContext

useEffect(() => {
  // Check if user is logged in
  const checkAuth = async () => {
    const authToken = await TokenStorage.getAuthToken();
    
    if (authToken) {
      console.log('✅ User has valid auth token');
      
      // Start PowerSync token auto-refresh
      TokenRefreshService.startAutoRefresh();
      
      // Initialize PowerSync
      await PowerSyncService.connect();
    }
  };

  checkAuth();

  // Cleanup on unmount
  return () => {
    TokenRefreshService.stopAutoRefresh();
  };
}, []);
```

### Step 7: Handle Logout

```typescript
// When user logs out
const handleLogout = async () => {
  // Stop token refresh service
  TokenRefreshService.stopAutoRefresh();
  
  // Disconnect PowerSync
  await PowerSyncService.disconnect();
  
  // Clear all tokens
  await AuthService.logout();
  
  // Navigate to login screen
  navigation.navigate('Login');
};
```

## Testing the Implementation

### 1. Test Initial Login

```typescript
// User logs in
const result = await AuthService.login('user@example.com', 'password');

// Should receive both tokens
expect(result.authToken).toBeDefined();
expect(result.powerSyncToken).toBeDefined();

// Both should be stored
const authToken = await TokenStorage.getAuthToken();
const powerSyncToken = await TokenStorage.getPowerSyncToken();

expect(authToken).toBeTruthy();
expect(powerSyncToken).toBeTruthy();
```

### 2. Test Token Refresh

```typescript
// Manually trigger refresh
const success = await TokenRefreshService.refreshPowerSyncToken();
expect(success).toBe(true);

// PowerSync token should be updated
const newToken = await TokenStorage.getPowerSyncToken();
expect(newToken).not.toBe(oldToken);

// Auth token should remain the same
const authToken = await TokenStorage.getAuthToken();
expect(authToken).toBe(originalAuthToken);
```

### 3. Test Auto-Refresh

```typescript
// Start auto-refresh
TokenRefreshService.startAutoRefresh();

// Wait 21 hours (simulated)
await simulateTimeElapsed(21 * 60 * 60 * 1000);

// Check that token was refreshed
const newToken = await TokenStorage.getPowerSyncToken();
expect(newToken).not.toBe(originalToken);
```

### 4. Test PowerSync Connection

```typescript
// Login
await AuthService.login('user@example.com', 'password');

// Connect PowerSync
await PowerSyncService.connect();

// Should use PowerSync token (not auth token)
const credentials = await PowerSyncService.fetchCredentials();
expect(credentials.token).toBe(await TokenStorage.getPowerSyncToken());

// Should NOT be the auth token
expect(credentials.token).not.toBe(await TokenStorage.getAuthToken());
```

## Migration from Old System

### Backward Compatibility

The login response includes `token` for backward compatibility:

```json
{
  "authToken": "new-30-day-token",
  "powerSyncToken": "new-24h-token",
  "token": "new-30-day-token"  // Same as authToken for old code
}
```

### Migration Steps

1. Deploy backend changes first
2. Update mobile app to handle both tokens
3. Old app versions will still work (using `token` as before)
4. New app versions get better UX with auto-refresh

## Token Lifetimes Summary

| Token | Lifetime | Purpose | Refresh Pattern |
|-------|----------|---------|-----------------|
| Auth Token | 30 days | API authentication, session management | Manual login only |
| PowerSync Token | 24 hours | PowerSync WebSocket connection | Auto-refresh every 20 hours |

## Security Considerations

### Why 30 Days for Auth Token?

- **Standard Practice:** Most apps use 30-90 days
- **Good Balance:** Secure yet convenient
- **User Expectation:** Users expect to stay logged in for weeks

### Why 24 Hours for PowerSync Token?

- **PowerSync Requirement:** Hard limit of 86400 seconds
- **Security:** Short-lived tokens for real-time sync
- **No User Impact:** Auto-refreshed in background

### Token Storage Security

```typescript
// Use secure storage for tokens
import * as SecureStore from 'expo-secure-store';

// Store tokens securely
await SecureStore.setItemAsync('auth_token', authToken);
await SecureStore.setItemAsync('powersync_token', powerSyncToken);
```

## Troubleshooting

### PowerSync Not Connecting

**Check:**
1. Is PowerSync using the correct token?
   ```typescript
   const token = await TokenStorage.getPowerSyncToken();
   console.log('PowerSync token:', token);
   ```

2. Is the token expired?
   ```typescript
   const expiry = await TokenStorage.getTokenExpiryTime();
   console.log('Token expires at:', new Date(expiry));
   ```

3. Is auto-refresh running?
   ```typescript
   console.log('Auto-refresh active:', TokenRefreshService.isActive());
   ```

### Token Refresh Failing

**Check:**
1. Is auth token valid?
   ```typescript
   const authToken = await TokenStorage.getAuthToken();
   // Try making API call with it
   ```

2. Check refresh endpoint response:
   ```typescript
   const response = await fetch('/api/auth/refresh-powersync', {
     headers: { Authorization: `Bearer ${authToken}` }
   });
   console.log('Refresh response:', await response.json());
   ```

### User Still Logged Out After 24 Hours

**Issue:** Using PowerSync token for API calls instead of auth token

**Fix:**
```typescript
// WRONG - Using PowerSync token for API
const token = await TokenStorage.getPowerSyncToken();

// CORRECT - Using auth token for API
const token = await TokenStorage.getAuthToken();
```

## Related Documentation

- `docs/power-sync/01_01_2026_jwt_kid_fix.md` - JWT authentication fixes
- `docs/power-sync/01_01_2026_jwt_sub_claim_fix.md` - JWT claims documentation
- `apps/web/app/api/auth/mobile-login/route.ts` - Login endpoint
- `apps/web/app/api/auth/refresh-powersync/route.ts` - Refresh endpoint

## Summary

✅ **User Experience:** Login once per month, not daily  
✅ **Security:** PowerSync tokens expire in 24 hours  
✅ **Automatic:** Token refresh happens in background  
✅ **Seamless:** User never notices the refresh  
✅ **Standard:** Same pattern as Instagram, X, Slack  

**Implementation Status:**
- ✅ Backend: Complete
- ⏳ Mobile App: Needs implementation (following this guide)

---

**Last Updated:** January 1, 2026  
**Author:** Fajr EMR Engineering Team  
**Status:** Ready for mobile app integration