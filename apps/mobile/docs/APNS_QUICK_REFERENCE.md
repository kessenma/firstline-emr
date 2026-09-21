# APNs Push Notifications Quick Reference

**Last Updated:** January 14, 2026  
**For:** FajrEMR Mobile App (iOS)

---

## 🚀 Quick Start

### Deploy New Build with APNs Fix
```bash
cd apps/mobile

# 1. Check configuration
npm run check:apns

# 2. Deploy to TestFlight
npm run deploy:ios:rock-beta

# 3. Wait for Apple to process (5-15 min)
```

### Test on Device
1. Install from TestFlight on **real iPhone** (not simulator)
2. Open app → Grant notification permissions when prompted
3. Go to: Admin → Device Registration
4. Tap "Register Device"
5. Look for **64-character hex token** (not `SIMULATOR_`)

---

## ✅ Pre-Flight Checklist

Before deploying, verify:

- [ ] `npm run check:apns` passes
- [ ] Build version bumped
- [ ] Testing on real device (not simulator)
- [ ] Clean build (no cached issues)

---

## 🔍 What Was Fixed

### The Core Issue
**Missing:** `PushNotificationIOS.registerForRemoteNotifications()`

This is the method that actually contacts Apple's servers to get a token.

### Changes Made
1. **PushNotificationService.ts** - Added `registerForRemoteNotifications()` calls
2. **AppDelegate.swift** - Improved RCTPushNotificationManager forwarding
3. **Diagnostic Script** - Added pre-flight checks

---

## 📋 Expected Success Flow

```
User taps "Register Device"
  ↓
Request permissions (if needed)
  ↓
Call registerForRemoteNotifications()
  ↓
iOS contacts Apple APNs servers
  ↓
APNs validates entitlements
  ↓
APNs issues device token (64 hex chars)
  ↓
AppDelegate.didRegisterForRemoteNotifications
  ↓
Forward to React Native
  ↓
PushNotificationService receives token
  ↓
Store locally & send to backend
  ↓
✅ Success!
```

---

## 🚨 Troubleshooting

### Still Getting Simulator Token in Production

**Check:**
```bash
# Verify you built for real device
codesign -d --entitlements :- apps/mobile/.rock/cache/ios/archive/FajrEMR.xcarchive/Products/Applications/FajrEMR.app | plutil -p - | grep aps-environment

# Should show: "aps-environment" => "production"
```

**Fix:** Ensure testing on physical iPhone from TestFlight, not simulator.

---

### Token Registration Times Out

**Symptoms:**
- "APNs token registration timed out" error
- No token after 10 seconds
- Debug log shows waiting but no response

**Possible Causes & Solutions:**

| Cause | Solution |
|-------|----------|
| Permissions denied | Settings → FajrEMR → Notifications → Enable |
| VPN/Firewall blocking | Try cellular data instead of WiFi |
| Corporate network | Test on different network |
| APNs servers down | Check https://www.apple.com/support/systemstatus/ |
| iOS system issue | Reset Network Settings |

**Deep Debugging:**
1. Connect iPhone to Mac
2. Open Console.app
3. Filter for "apsd" or "APNs"
4. Look for error messages during registration

---

### Backend Returns 403 on /validate-apns

**Status:** Expected behavior  
**Reason:** Endpoint requires admin authentication  
**Impact:** None - token registration happens device→Apple, not device→backend  
**Action:** Can ignore this warning in debug logs

---

### Permission Prompt Doesn't Appear

**Reason:** User already granted or denied permissions

**Fix:**
```
Settings → FajrEMR → Notifications
  → Toggle ON all options
  → Allow Notifications
```

Or delete app and reinstall.

---

## 🔧 Manual Verification Commands

### Check Entitlements (Most Critical)
```bash
cd apps/mobile
codesign -d --entitlements :- .rock/cache/ios/archive/FajrEMR.xcarchive/Products/Applications/FajrEMR.app | plutil -p -
```

**Must have:**
- `"aps-environment" => "production"` ✅

---

### Check Info.plist
```bash
/usr/libexec/PlistBuddy -c "Print :UIBackgroundModes" ios/FajrEMR/Info.plist
```

**Must have:**
- `remote-notification` ✅

---

### Check Build Settings
```bash
cd ios
xcodebuild -workspace FajrEMR.xcworkspace -scheme FajrEMR -showBuildSettings | grep -E "PRODUCT_BUNDLE_IDENTIFIER|MARKETING_VERSION|CURRENT_PROJECT_VERSION"
```

**Should show:**
- `PRODUCT_BUNDLE_IDENTIFIER = com.fajr.emr`
- Current version and build number

---

## 📱 Device Registration Component

The diagnostic component shows detailed logs. Look for:

### ✅ Success Indicators
```
✅ Token received: [64 hex chars]
✅ This is a REAL DEVICE token (production-ready)
✅ Token sent to backend successfully
```

### ❌ Failure Indicators
```
❌ APNs token registration timed out
⚠️ This is a SIMULATOR token
❌ No token received from APNs
```

---

## 🎯 Required Files Checklist

| File | Key Requirement | Status |
|------|----------------|--------|
| `AppDelegate.swift` | Implements `didRegisterForRemoteNotifications` | ✅ |
| `AppDelegate.swift` | Forwards to `RCTPushNotificationManager` | ✅ |
| `Info.plist` | Has `UIBackgroundModes: remote-notification` | ✅ |
| `FajrEMR-Bridging-Header.h` | Imports `RCTPushNotificationManager.h` | ✅ |
| `PushNotificationService.ts` | Calls `registerForRemoteNotifications()` | ✅ |
| Xcode Capabilities | Push Notifications enabled | ✅ |
| Entitlements | `aps-environment: production` | ✅ |

---

## 📚 Key Documentation

- **React Native:** https://reactnative.dev/docs/pushnotificationios
- **Community Lib:** https://github.com/react-native-push-notification/ios
- **Apple APNs:** https://developer.apple.com/documentation/usernotifications
- **Full Fix Details:** See `APNS_FIX_SUMMARY.md`

---

## 🆘 Emergency Contacts

If all else fails:

1. Check `build-logs/` for detailed error messages
2. Review `APNS_FIX_SUMMARY.md` for complete context
3. Connect device to Mac and check Console.app for iOS system logs
4. Search Console.app for "apsd", "notification", or "APNs"

---

## 📦 Common Commands

```bash
# Check APNs configuration
npm run check:apns

# Deploy to TestFlight
npm run deploy:ios:rock-beta

# View current version
npm run version:ios

# Bump version
npm run version:ios:bump

# Clean build
npm run deploy:ios:clean
```

---

**Remember:** APNs tokens only work on **real devices**, not simulators. Always test on physical iPhone from TestFlight!