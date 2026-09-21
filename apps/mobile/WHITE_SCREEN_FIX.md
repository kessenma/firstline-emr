# White Screen Issue Fix Guide

## Problem Summary
The iOS app is showing a white screen on initial load and intermittently on reloads. The issue appears to be caused by race conditions during initialization where:
1. Navigation components try to initialize before the app is fully ready
2. API calls are made too early in the component lifecycle
3. Multiple async operations compete during startup

## Changes Made to Fix the Issue

### 1. Added Initialization Delays (MainNavigator.tsx)
- Added a 100ms delay before setting the navigator as ready
- Moved the unread notification count fetching to a safer hook
- Added proper loading state while initializing

### 2. Created Safe Unread Count Hook (useSafeUnreadCount.ts)
- Replaced the immediate API call with a delayed fetch (1 second)
- Added error handling that doesn't crash the app
- Added timeout to prevent hanging requests

### 3. Enhanced App.tsx Initialization
- Added module validation to ensure all components are loaded
- Increased delays between initialization steps (800ms for navigator)
- Added proper error recovery mechanisms
- Added fallback UI for render errors

### 4. Added Navigation Debugging (navigationDebug.ts)
- Created comprehensive logging for navigation lifecycle
- Added performance tracking
- Added state validation

### 5. Created LoadingNavigator Component
- Provides a simple navigation container while the main app initializes
- Prevents complex navigation setup from blocking initial render

## How to Test the Fix

1. **Clean build and test:**
```bash
# Clean everything
cd apps/mobile
rm -rf node_modules .rock ios/build ios/Pods
pnpm install

# Rebuild
cd ios && pod install && cd ..
pnpm ios
```

2. **Monitor initialization:**
Watch the console logs for the initialization sequence:
- Should see "App starting - checking for saved session..."
- Then "Session restored successfully"
- Then "MainNavigator: Starting delayed initialization"
- Finally "NavigationContainer: Ready"

3. **Test reload scenarios:**
- Initial app launch
- Command + Control + Z reload from simulator
- Command + R refresh
- Kill app and restart

## Debugging Steps if Issue Persists

### 1. Enable Debug Mode
Add this to your `index.js` before registering the app:
```javascript
import './src/debug/testInit';
```

### 2. Check Console for Errors
Look for these specific patterns:
- "No user or user.id provided" - Authentication issue
- "Missing critical modules" - Bundle loading issue
- "Navigation state is undefined" - Navigation initialization issue

### 3. Verify API Connectivity
Check if the API calls are working:
```javascript
// In App.tsx, add after session restore:
console.log('API URL:', getBaseUrl());
console.log('Token exists:', !!storageUtils.getToken());
```

### 4. Test Simplified Navigation
If the issue persists, temporarily replace MainNavigator with LoadingNavigator in App.tsx:
```javascript
// Replace this:
<MainNavigator user={currentUser} onLogout={handleLogout} />
// With this:
<LoadingNavigator />
```

## Root Causes Identified

1. **Race Condition**: NavigationContainer was trying to render before React Navigation was fully initialized
2. **Hook Rules Violation**: useUnreadNotificationCount was being called conditionally
3. **Missing Error Boundaries**: Component errors were causing silent failures
4. **Async Timing**: Multiple async operations starting simultaneously during init

## Prevention for Future

1. **Always delay complex initialization**: Use setTimeout or useEffect with delays for non-critical startup tasks
2. **Add loading states**: Never assume async data is immediately available
3. **Use error boundaries**: Wrap navigation components in error boundaries
4. **Log initialization steps**: Add console logs for each major initialization milestone
5. **Test on fresh installs**: Always test with `rm -rf node_modules` scenarios

## Configuration Recommendations

### Update rspack.config.mjs
Ensure these optimizations are in place:
```javascript
optimization: {
  splitChunks: {
    chunks: 'async',
    minSize: 20000,
    cacheGroups: {
      vendor: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendor',
        chunks: 'all',
      },
    },
  },
},
```

### Consider Metro Instead of Rspack
If issues persist, consider switching back to Metro bundler which is more battle-tested with React Native:
```bash
npx react-native start --reset-cache
```

## Emergency Rollback

If the fixes cause other issues, you can rollback by:
1. Removing the delays in MainNavigator.tsx
2. Reverting to the original useUnreadNotificationCount hook
3. Removing the isNavigatorReady state from App.tsx

## Monitoring Success

The fix is successful when:
- ✅ App loads without white screen on first launch
- ✅ Reload (Cmd+R) works consistently
- ✅ No "undefined is not an object" errors in console
- ✅ Navigation tabs appear within 2 seconds of launch
- ✅ All console logs show proper initialization sequence

## Additional Resources

- [React Navigation Troubleshooting](https://reactnavigation.org/docs/troubleshooting)
- [React Native Performance](https://reactnative.dev/docs/performance)
- [Rspack React Native Guide](https://www.rspack.dev/guide/tech/react)