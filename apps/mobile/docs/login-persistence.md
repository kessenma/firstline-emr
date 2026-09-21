# Login Persistence - Stay Logged In

## Overview

The mobile app now supports **login persistence**, allowing users to stay logged in after closing and reopening the app. This provides a seamless experience similar to other mobile apps.

## How It Works

### 1. Session Storage (MMKV)

When you successfully log in, your user data and JWT token are stored securely in MMKV:

```typescript
// Stored data includes:
{
  id: string,
  email: string,
  firstName: string,
  lastName: string,
  token: string,  // JWT token for API authentication
  accountType: 'Doctor' | 'Triage' | 'Evac',
  // ... other user fields
}
```

### 2. Session Restoration

When the app launches, it automatically:

1. **Checks for stored session** in MMKV
2. **Validates JWT token** (checks expiry)
3. **Verifies with server** (optional, falls back to offline)
4. **Auto-logs in** if session is valid
5. **Shows login screen** if no valid session

### 3. Token Validation

The JWT token is validated by:
- Decoding the token payload
- Checking the `exp` (expiry) field
- Comparing with current time
- Clearing storage if expired

### 4. Server Verification (Optional)

The app attempts to verify the session with the server by calling:
```
GET /api/auth/session
```

**If server is reachable:**
- ✅ Valid session → Auto-login with fresh data
- ❌ Invalid session → Redirect to login screen

**If server is unreachable (offline):**
- Token still valid → Use stored data (offline mode)
- Token expired → Redirect to login screen

## User Experience

### First Launch (Not Logged In)
```
┌─────────────────────────┐
│         🏥              │
│                         │
│    Login Screen         │
│                         │
└─────────────────────────┘
```

### Subsequent Launches (Logged In)
```
┌─────────────────────────┐
│         🏥              │
│    Fajr EMR            │
│  Restoring session...   │  ← Brief splash (< 1 second)
└─────────────────────────┘
         ↓
┌─────────────────────────┐
│    Messages  [5]        │
│                         │
│  Auto-logged in! ✅     │  ← Goes directly to app
└─────────────────────────┘
```

### Token Expired
```
┌─────────────────────────┐
│         🏥              │
│                         │
│    Login Screen         │
│  (Session expired)      │  ← Must login again
└─────────────────────────┘
```

## Security Features

### 1. JWT Token Expiry
- Tokens expire after **14 days** (configurable)
- Expired tokens are automatically cleared
- User must re-login after expiry

### 2. Secure Storage
- MMKV storage is encrypted
- Data stored locally on device only
- Cleared on logout

### 3. Server Verification
- Session validated with backend on restore
- Invalid sessions cleared immediately
- Protects against token tampering

## Console Logs

### Successful Session Restoration
```
🚀 App starting - checking for saved session...
🔄 Attempting to restore session from storage...
✅ Found stored user: doctor@example.com
✅ Token valid for 13440 more minutes
🌐 Verifying session with server...
✅ Server session valid
✅ Session restored successfully: doctor@example.com
```

### Expired Token
```
🚀 App starting - checking for saved session...
🔄 Attempting to restore session from storage...
✅ Found stored user: doctor@example.com
❌ Token expired
ℹ️ No valid session to restore: Token expired
```

### No Stored Session (First Launch)
```
🚀 App starting - checking for saved session...
🔄 Attempting to restore session from storage...
❌ No stored user data found
ℹ️ No valid session to restore: No stored session
```

### Offline Mode (Server Unreachable)
```
🚀 App starting - checking for saved session...
🔄 Attempting to restore session from storage...
✅ Found stored user: doctor@example.com
✅ Token valid for 1200 more minutes
🌐 Verifying session with server...
⚠️ Network error during session verification, using stored data
✅ Session restored successfully: doctor@example.com
```

## Logout Behavior

### Manual Logout
When user clicks **Logout** button:
1. Calls backend logout endpoint
2. Clears MMKV storage (`clearAuth()`)
3. Resets app state
4. Shows login screen

```typescript
const handleLogout = async () => {
  await authService.logout();  // Clears storage
  setCurrentUser(null);
  setIsAuthenticated(false);
};
```

### What Gets Cleared
```typescript
storageUtils.clearAuth() clears:
- @fajr_emr:user      // User data
- @fajr_emr:token     // JWT token  
- @fajr_emr:session   // Session data
```

## Token Lifetime

### Default Configuration
```typescript
// JWT token expires after 14 days
SESSION_TIMEOUT: 14 * 24 * 60 * 60 * 1000  // 14 days in milliseconds
```

### Token Payload Example
```json
{
  "id": "686c53889a049f76f4dfcc8d",
  "email": "doctor@example.com",
  "isAdmin": true,
  "iat": 1763660074,      // Issued at (Unix timestamp)
  "exp": 1764869674       // Expires at (Unix timestamp)
}
```

### Checking Remaining Time
The app logs how long the token is valid:
```
✅ Token valid for 13440 more minutes  // ~9 days remaining
```

## Implementation Details

### AuthService Methods

#### `restoreSession()`
```typescript
async restoreSession(): Promise<LoginResponse>
```
- Gets stored user from MMKV
- Validates JWT token expiry
- Verifies session with server
- Returns success/failure

#### `checkSession()`
```typescript
async checkSession(): Promise<SessionUser | null>
```
- Calls `/api/auth/session`
- Returns current session from server
- Used during restoration

#### `logout()`
```typescript
async logout(): Promise<void>
```
- Calls `/api/auth/signout`
- Clears MMKV storage
- Resets internal state

### App.tsx Flow

```typescript
useEffect(() => {
  const restoreSession = async () => {
    // 1. Set base URL
    authService.setBaseUrl(getBaseUrl());
    
    // 2. Attempt restore
    const result = await authService.restoreSession();
    
    // 3. Update state
    if (result.success) {
      setCurrentUser(result.user);
      setIsAuthenticated(true);
    }
    
    // 4. Hide loading screen
    setIsRestoringSession(false);
  };
  
  restoreSession();
}, []);
```

## Testing

### Test Cases

#### 1. First Launch (No Session)
- [ ] Shows login screen immediately
- [ ] No loading delay
- [ ] No error messages

#### 2. Valid Session
- [ ] Shows "Restoring session..." splash
- [ ] Auto-logs in (< 1 second)
- [ ] Goes directly to Messages screen
- [ ] Console shows successful restoration

#### 3. Expired Token
- [ ] Shows login screen
- [ ] Console shows "Token expired"
- [ ] Storage cleared automatically
- [ ] Can log in normally

#### 4. Logout
- [ ] Logout button works
- [ ] Returns to login screen
- [ ] Storage cleared
- [ ] Next launch shows login screen

#### 5. Offline Mode
- [ ] Valid token works offline
- [ ] Shows last cached data
- [ ] Can navigate app
- [ ] Syncs when back online

### Manual Testing

```bash
# 1. Fresh install
npm run ios

# Should show login screen
# Login with credentials
# Close app completely (Cmd+Q or swipe up)

# 2. Reopen app
npm run ios

# Should auto-login within 1 second
# Should show Messages screen directly

# 3. Test expiry (optional)
# Manually edit token in MMKV to be expired
# Reopen app
# Should show login screen

# 4. Test logout
# Click Profile → Logout
# Should return to login screen
# Reopen app
# Should show login screen (not auto-login)
```

## Troubleshooting

### App Doesn't Auto-Login

**Check console logs:**
```
❌ No stored user data found
```
**Cause:** No previous login or storage was cleared
**Solution:** Normal behavior for first launch

```
❌ Token expired
```
**Cause:** More than 14 days since last login
**Solution:** User must re-login

```
❌ Invalid token format
```
**Cause:** Corrupted token in storage
**Solution:** Storage auto-cleared, re-login required

### Always Shows Login Screen

**Possible causes:**
1. Storage not persisting (MMKV issue)
2. Token expiring immediately (server time mismatch)
3. Session validation failing (network issue)

**Debug steps:**
```typescript
// Check if data is stored
import { storageUtils } from './src/utils/storage';
console.log('Stored user:', storageUtils.getUser());
console.log('Stored token:', storageUtils.getToken());
```

### Loading Screen Hangs

**Cause:** Network request to `/api/auth/session` timing out

**Solution:** App should fall back to offline mode after timeout. If stuck:
1. Force quit app
2. Check network connectivity
3. Try switching environment (Dev/Prod)

### Session Expired Too Quickly

**Check token expiry:**
```typescript
const token = storageUtils.getToken();
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('Expires:', new Date(payload.exp * 1000));
```

**If expiring too soon:**
- Check server JWT configuration
- Verify server time is correct
- Confirm `SESSION_TIMEOUT` setting

## Best Practices

### 1. Security
✅ **Use HTTPS in production** (tokens transmitted securely)
✅ **Never log full tokens** (only first/last chars)
✅ **Clear storage on logout** (don't leave data)
✅ **Validate tokens before use** (check expiry)

### 2. User Experience
✅ **Show loading indicator** during restoration
✅ **Keep splash brief** (< 1 second)
✅ **Handle offline gracefully** (use cached data)
✅ **Provide logout option** (user control)

### 3. Development
✅ **Test token expiry** (don't assume it works)
✅ **Handle network errors** (server might be down)
✅ **Log restoration flow** (easier debugging)
✅ **Clear storage in dev** (test fresh state)

## Configuration

### Adjust Session Timeout

To change how long users stay logged in:

```typescript
// apps/mobile/src/config/index.ts
export const AUTH_CONFIG = {
  SESSION_TIMEOUT: 7 * 24 * 60 * 60 * 1000,  // 7 days instead of 14
  // ...
};
```

**Note:** Server must also be configured with matching timeout.

### Disable Server Verification

For faster startup (uses only local token validation):

```typescript
// apps/mobile/src/services/AuthService.ts
async restoreSession(): Promise<LoginResponse> {
  // ...
  
  // Comment out or skip server verification:
  // const session = await this.checkSession();
  
  // Just use stored data:
  this.currentUser = storedUser;
  return { success: true, user: storedUser };
}
```

**Tradeoff:** Faster startup but no server-side validation.

## Related Files

- `apps/mobile/App.tsx` - Session restoration on launch
- `apps/mobile/src/services/AuthService.ts` - `restoreSession()` method
- `apps/mobile/src/utils/storage.ts` - MMKV storage utilities
- `apps/mobile/src/config/index.ts` - Session timeout configuration
- `apps/mobile/src/screens/ProfileScreen.tsx` - Logout button

## Summary

✅ **Automatic login** after app restart
✅ **Secure token storage** with MMKV encryption  
✅ **Token expiry validation** prevents stale sessions
✅ **Offline support** works without network
✅ **Manual logout** for user control
✅ **Brief loading screen** (< 1 second)

Users can now close and reopen the app without needing to log in every time, significantly improving the mobile experience! 🎉