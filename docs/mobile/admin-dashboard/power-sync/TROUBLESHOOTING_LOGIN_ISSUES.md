# Troubleshooting: Login and PowerSync Connection Issues

**Date:** December 2024  
**Status:** Fixes Applied - Ready for Testing  
**Issues:** Network request failed, PowerSync WebSocket errors, Storage utility errors

---

## 🐛 Issues Identified

### 1. Storage Utility Errors ✅ FIXED
**Symptoms:**
```
❌ Error: storageUtils.clearAuth is not a function
❌ Error: storageUtils.get is not a function
```

**Root Cause:**
- `storageUtils` object was missing several methods used by AdminContext and other parts of the app
- Methods `clearAuth`, `get`, `set`, and `delete` were not implemented

**Fix Applied:**
- Added all missing methods to `storageUtils` in `apps/mobile/src/utils/storage.ts`
- Methods now properly handle:
  - `clearAuth()` - Clears user and token
  - `get(key)` - Gets and parses any stored value
  - `set(key, value)` - Stores any value (auto-serializes)
  - `delete(key)` - Removes any key

---

### 2. PowerSync WebSocket Connection Failed ✅ PARTIALLY FIXED
**Symptoms:**
```
Failed to create websocket connection to wss://ws.emr.fajr.org/sync/stream
```

**Root Cause:**
- PowerSync trying to establish WebSocket connection but failing
- Could be due to:
  1. Authentication token format issue
  2. WebSocket endpoint path mismatch
  3. Reverse proxy (Caddy) configuration
  4. Network/firewall blocking WebSocket

**Fix Applied:**
- Made PowerSync initialization **non-blocking** - won't prevent login
- Added comprehensive error logging
- PowerSync now initializes in background (1 second delay)
- Login proceeds even if PowerSync fails
- Better error messages for debugging

**What This Means:**
- ✅ Login will work even if PowerSync fails
- ⚠️ Admin features will work but without offline capability
- 📊 Sync status indicator will show "Not Connected"

---

### 3. Network Request Failed on Login ⚠️ NEEDS TESTING
**Symptoms:**
```
❌ Mobile login error: [TypeError: Network request failed]
```

**Possible Causes:**
1. **Device Network Issues:**
   - No internet connection
   - WiFi/cellular data disabled
   - VPN blocking connections

2. **SSL Certificate Issues:**
   - Self-signed certificates on device
   - Certificate validation failing
   - Date/time on device incorrect

3. **Server Unreachable:**
   - Firewall blocking mobile app
   - DNS resolution issue
   - Server temporarily down

**Fixes Applied:**
- Added 30-second timeout to login request
- Better error messages with specific guidance
- Detailed error logging to identify issue type
- Abort controller to handle timeouts gracefully

**New Error Messages:**
- `"Connection timeout - please check your internet connection"`
- `"Network error - cannot reach server. Please check: 1. Internet connection, 2. VPN settings, 3. Server is accessible"`

---

## 🧪 Testing Steps

### Step 1: Rebuild and Run App

```bash
cd apps/mobile

# Clean build (recommended)
npm run android -- --reset-cache
# or
npm run ios -- --reset-cache

# Or normal run
npm run android
# or
npm run ios
```

### Step 2: Test Login

1. **Open the app**
2. **Ensure device has internet** (check WiFi/cellular)
3. **Select environment:**
   - Toggle to "Production" (should show: https://emr.fajr.org)
4. **Enter credentials** and tap "Sign In"

**What to Look For:**

✅ **Success Case:**
```
📱 Mobile login attempt for: your-email@example.com
Mobile auth response status: 200
✅ Mobile login successful
[AuthContext] User logged in successfully
[AuthContext] User is admin, initializing PowerSync...
```

❌ **Network Error Case:**
```
❌ Network fetch error: [TypeError: Network request failed]
❌ Error name: TypeError
❌ Error message: Network request failed
```

⏱️ **Timeout Case:**
```
❌ Network fetch error: [Error: AbortError]
❌ Error message: Connection timeout
```

### Step 3: Check PowerSync Status

If login succeeds:

1. Navigate to **Admin Dashboard**
2. Tap **"PowerSync Test"** button (top of screen)
3. Check sync status:
   - ✅ **Connected: Yes** - PowerSync working
   - ❌ **Connected: No** - WebSocket issue (see below)

**PowerSync Logs to Look For:**

✅ **Success:**
```
[AuthContext] User is admin, initializing PowerSync...
🔌 Attempting to connect to PowerSync...
🌐 Server URL: https://ws.emr.fajr.org
🔐 PowerSync fetchCredentials called
🔗 Connected to PowerSync server
✅ PowerSync initialized successfully for admin
```

❌ **Failure:**
```
[AuthContext] User is admin, initializing PowerSync...
🔌 Attempting to connect to PowerSync...
❌ PowerSync connection failed: Failed to create websocket connection
⚠️ PowerSync initialization failed (non-blocking)
```

---

## 🔧 Troubleshooting Specific Issues

### Issue A: "Network request failed" on Login

**Check Device Internet:**
```bash
# From device, open browser and try:
https://emr.fajr.org

# Should load the web app
```

**Check from Development Machine:**
```bash
curl https://emr.fajr.org/api/auth/mobile-login

# Should return 401 (expected without credentials)
```

**Possible Solutions:**

1. **WiFi/Cellular Data:**
   - Ensure device has active internet
   - Try switching between WiFi and cellular
   - Disable VPN if active

2. **Clear App Cache:**
   ```bash
   # Android
   npm run android -- --reset-cache
   
   # iOS
   npm run ios -- --reset-cache
   ```

3. **Check Device Date/Time:**
   - Go to Settings → Date & Time
   - Enable "Automatic date & time"
   - SSL certificates fail if date is wrong

4. **Test with Emulator/Simulator:**
   - iOS Simulator has direct network access
   - Android Emulator might need proxy settings

---

### Issue B: PowerSync WebSocket Connection Failed

**This is a known issue and won't block login.**

**Possible Causes:**

1. **WebSocket Path Mismatch:**
   - PowerSync SDK expects `/sync/stream`
   - Server might expose different path
   - Check Caddy configuration

2. **Authentication Token Format:**
   - JWT token might not be in expected format
   - Token might need specific claims
   - Check PowerSync server logs

3. **Reverse Proxy WebSocket Settings:**
   - Caddy needs proper WebSocket proxy config
   - Headers might not be forwarded correctly

**Debug Steps:**

1. **Check Server Logs:**
   ```bash
   docker-compose -f docker-compose.powersync.yml logs -f powersync
   ```
   Look for:
   - Connection attempts
   - Authentication failures
   - WebSocket upgrade requests

2. **Test WebSocket from Browser:**
   - Open browser console on https://emr.fajr.org
   - Try WebSocket connection:
   ```javascript
   const ws = new WebSocket('wss://ws.emr.fajr.org/sync/stream');
   ws.onopen = () => console.log('Connected!');
   ws.onerror = (e) => console.error('Error:', e);
   ```

3. **Verify Caddy Configuration:**
   - Check if Caddy is properly proxying WebSocket
   - Verify headers: `Upgrade`, `Connection`
   - Check if auth headers are forwarded

---

### Issue C: Storage Errors After Fix

**Should be fixed**, but if you still see storage errors:

1. **Clear App Data:**
   ```bash
   # Android
   adb shell pm clear com.fajremr.mobile
   
   # iOS
   # Reset simulator/device
   ```

2. **Verify Fix Applied:**
   ```bash
   # Check storage.ts has new methods
   grep -A5 "clearAuth:" apps/mobile/src/utils/storage.ts
   ```

3. **Rebuild App:**
   ```bash
   cd apps/mobile
   npm run android -- --reset-cache
   ```

---

## 📝 Expected Behavior After Fixes

### ✅ What Should Work Now

1. **Login:**
   - Should work even if PowerSync fails
   - Clear error messages if network issue
   - 30-second timeout prevents hanging

2. **Storage:**
   - No more `is not a function` errors
   - Session restoration works
   - Admin session management works

3. **PowerSync Initialization:**
   - Non-blocking (doesn't prevent login)
   - Initializes in background
   - Clear error logs if fails
   - Graceful degradation

### ⚠️ What Might Still Have Issues

1. **PowerSync WebSocket:**
   - May not connect yet
   - Needs server-side investigation
   - **Doesn't block other features**

2. **Offline Mode:**
   - Won't work until PowerSync connects
   - Admin features will be online-only for now

---

## 🔍 Diagnostic Commands

### Check if Server is Reachable

```bash
# From development machine
curl -v https://emr.fajr.org/api/auth/mobile-login
# Should return 401 (good)

curl -v https://ws.emr.fajr.org/probes/liveness
# Should return 200 (good)
```

### Check PowerSync Server Status

```bash
# Check if container is running
docker ps | grep powersync

# View recent logs
docker-compose -f docker-compose.powersync.yml logs --tail=100 powersync

# Check for connection attempts
docker-compose -f docker-compose.powersync.yml logs powersync | grep -i "websocket\|connection\|auth"
```

### Mobile App Logs

Look for these key log lines:

**Login:**
```
📱 Mobile login attempt for: [email]
Mobile auth URL: [url]
Mobile auth response status: [status]
✅ Mobile login successful
```

**PowerSync:**
```
[AuthContext] User is admin, initializing PowerSync...
🔌 Attempting to connect to PowerSync...
🌐 Server URL: https://ws.emr.fajr.org
🔐 PowerSync fetchCredentials called
```

**Errors:**
```
❌ Network fetch error
❌ PowerSync connection failed
⚠️ PowerSync init failed (non-blocking)
```

---

## 📊 Files Modified

1. **`apps/mobile/src/utils/storage.ts`**
   - Added `clearAuth()`, `get()`, `set()`, `delete()` methods
   - Storage errors should be gone

2. **`apps/mobile/src/contexts/AuthContext.tsx`**
   - PowerSync initialization now non-blocking
   - 1-second delay before initializing
   - Uses `setTimeout` instead of `await`
   - Better error handling

3. **`apps/mobile/src/services/AuthService.ts`**
   - Added 30-second timeout to login
   - Better error messages
   - Detailed error logging
   - Handles AbortError

4. **`apps/mobile/src/services/powersync/PowerSyncService.ts`**
   - Better error logging for connection issues
   - Logs WebSocket errors from sync status
   - More detailed credential logging

---

## 🎯 Next Steps

### Immediate (Now)
1. ✅ Rebuild mobile app with fixes
2. ✅ Test login with production environment
3. ✅ Check console logs for detailed errors
4. ✅ Verify storage errors are gone

### If Login Works
1. ✅ Navigate to Admin Dashboard
2. ✅ Test PowerSync Test screen
3. ✅ Check if data loads
4. ✅ Test New Signups section

### If PowerSync Fails (Expected)
1. 📋 Copy WebSocket error from logs
2. 🔍 Check PowerSync server logs
3. 🌐 Test WebSocket from browser
4. 📧 Report findings for server-side fix

### Server-Side Investigation (If Needed)
1. Check Caddy WebSocket proxy configuration
2. Verify PowerSync authentication setup
3. Check JWT token format/claims
4. Test direct connection (bypass Caddy)

---

## 💡 Quick Wins

**If you just want to test admin features without PowerSync:**

The app now works without PowerSync! You can:
- ✅ Login as admin
- ✅ View Admin Dashboard
- ✅ Use all admin sections (online-only)
- ✅ Approve/deny users (via API)
- ❌ Offline mode won't work (yet)

PowerSync is optional and won't block functionality anymore.

---

## 📞 Getting Help

**If login still fails:**
1. Share full error logs from console
2. Include device type (iOS/Android, version)
3. Network environment (WiFi/cellular, VPN?)
4. Server reachability test results

**If PowerSync connection fails:**
1. Share PowerSync server logs
2. Share mobile WebSocket error details
3. Test WebSocket from browser
4. Check Caddy configuration

---

**Status:** Fixes applied, ready for testing! 🚀