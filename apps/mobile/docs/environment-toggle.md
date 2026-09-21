# Environment Toggle Guide

## Overview

The mobile app includes an environment toggle that allows you to switch between **Local Development** and **Production** environments. This ensures all API calls (login, messages, notifications, etc.) use the same base URL.

## How It Works

### 1. Environment Storage

When you toggle between environments in the LoginScreen, your selection is persisted to MMKV storage:

```typescript
// apps/mobile/src/config/index.ts
export const setEnvironment = (env: 'development' | 'production'): void => {
  storage.set(ENV_STORAGE_KEY, env);
  console.log('🔄 Environment changed to:', env);
  console.log('🌐 New base URL:', API_CONFIG.current.BASE_URL);
};
```

### 2. API Configuration

The `API_CONFIG.current` getter checks storage first, then falls back to `NODE_ENV`:

```typescript
get current() {
  // Check if user has explicitly set environment preference
  const storedEnv = storage.getString(ENV_STORAGE_KEY);
  if (storedEnv === 'production') {
    return this.PROD;
  } else if (storedEnv === 'development') {
    return this.DEV;
  }
  // Default based on NODE_ENV
  return __DEV__ ? this.DEV : this.PROD;
}
```

### 3. API Calls

All API calls use `getApiUrl()` which automatically reads from the config:

```typescript
export const getApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.current.API_URL}${endpoint}`;
};
```

This means:
- `useMessages` hook ✅
- `AuthService` ✅
- `ThreadDetailScreen` ✅
- All other API calls ✅

...all use the same environment!

## Environment Settings

### Production
- **Base URL**: `https://emr.fajr.org`
- **API URL**: `https://emr.fajr.org/api`
- **WebSocket**: `wss://emr.fajr.org`

### Local Development
- **Base URL**: `http://localhost:3000`
- **API URL**: `http://localhost:3000/api`
- **WebSocket**: `ws://localhost:3000`

## Using the Toggle

### In the App

1. Open the app (you'll see the LoginScreen)
2. Look for the environment toggle near the top
3. Toggle between "Local Dev" and "Production"
4. The current URL is displayed below the toggle
5. Your selection is automatically saved

### Visual Indicator

```
┌─────────────────────────────────────┐
│        Environment:                  │
│  Local Dev  [====○] Production      │
│  https://emr.fajr.org               │
└─────────────────────────────────────┘
```

## Important Notes

### For Production Use

✅ **Set toggle to "Production"** before logging in
- Uses secure HTTPS connection
- Connects to live database
- No CORS issues
- Works on any device/network

### For Local Development

⚠️ **iOS Simulator Limitation**

When using "Local Dev" mode on iOS Simulator:
- `localhost` refers to the simulator, not your Mac
- You need to use your Mac's IP address instead

**Solution**: Update the DEV configuration:

```typescript
// apps/mobile/src/config/index.ts
DEV: {
  BASE_URL: 'http://192.168.1.100:3000',  // Use your Mac's IP
  API_URL: 'http://192.168.1.100:3000/api',
  WS_URL: 'ws://192.168.1.100:3000',
},
```

To find your Mac's IP:
```bash
# On macOS
ifconfig | grep "inet " | grep -v 127.0.0.1
```

### Persistence

- Your environment selection **persists across app restarts**
- You only need to set it once
- To switch environments, just toggle and log in again

## Troubleshooting

### Messages Not Loading

**Symptom**: Login works but messages fail with "Network request failed"

**Cause**: Environment mismatch

**Solution**:
1. Check which environment you're using (toggle setting)
2. Ensure you logged in with the same environment
3. If needed, toggle to correct environment and log in again

**Verification**: Check console logs after login:
```
🔄 Environment changed to: production
🌐 New base URL: https://emr.fajr.org
✅ Login successful
🔍 Fetching threads...
🌐 Current API config: { baseUrl: "https://emr.fajr.org", environment: "development" }
```

The `baseUrl` in the API config should match your login URL.

### Localhost Not Working on Device

**Symptom**: "Network request failed" when using Local Dev mode

**Solutions**:
1. **Use your computer's IP address** instead of localhost (see above)
2. **Ensure your device and computer are on the same network**
3. **Check firewall settings** - allow incoming connections on port 3000
4. **Verify local server is running**: Visit `http://localhost:3000` in your browser

### Toggle Not Saving

**Symptom**: Environment resets after app restart

**Cause**: MMKV storage issue

**Solution**:
1. Clear app data and reinstall
2. Check that `react-native-mmkv` is properly installed
3. Rebuild the app: `npm run ios` or `npm run android`

## Development Workflow

### Recommended Setup

1. **For Testing with Production Data**:
   - Toggle: Production
   - Test real features with live data
   - No local setup needed

2. **For Local API Development**:
   - Toggle: Local Dev
   - Update config to use your Mac's IP
   - Run local server: `cd apps/web && npm run dev`
   - Test API changes immediately

3. **Switching Between Modes**:
   - Simply toggle and log in again
   - No need to rebuild or restart Metro

## Console Debugging

The app logs environment info to help with debugging:

```
# When environment changes:
🔄 Environment changed to: production
🌐 New base URL: https://emr.fajr.org

# When fetching messages:
🔍 Fetching threads...
🌐 Current API config: { 
  baseUrl: "https://emr.fajr.org", 
  environment: "development" 
}
🌐 Fetching from URLs:
  Internal: https://emr.fajr.org/api/internal-messages
  Messages: https://emr.fajr.org/api/messages
```

If you see mismatched URLs, log out and log in again.

## Code Examples

### Getting Current Environment

```typescript
import { getEnvironment } from '../config';

const currentEnv = getEnvironment(); // 'development' | 'production'
console.log('Current environment:', currentEnv);
```

### Changing Environment Programmatically

```typescript
import { setEnvironment } from '../config';

// Switch to production
setEnvironment('production');

// Switch to development
setEnvironment('development');
```

### Making API Calls

```typescript
import { getApiUrl } from '../config';

// Always uses the correct environment
const response = await fetch(getApiUrl('/messages'), {
  headers: {
    'Authorization': `Bearer ${token}`,
  },
});
```

## Best Practices

1. ✅ **Always use `getApiUrl()`** for API endpoints
2. ✅ **Never hardcode URLs** in your code
3. ✅ **Check environment before testing** production features
4. ✅ **Use production mode** when demonstrating to stakeholders
5. ✅ **Keep local dev updated** with your machine's IP if it changes

## Related Files

- `apps/mobile/src/config/index.ts` - Environment configuration
- `apps/mobile/src/screens/LoginScreen.tsx` - Toggle UI
- `apps/mobile/src/hooks/useMessages.ts` - Example API usage
- `apps/mobile/src/utils/storage.ts` - MMKV storage utilities