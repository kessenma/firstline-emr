# Quick Start Guide - Fajr EMR Mobile App

## Setup (First Time)

### Prerequisites
- Node.js >= 20
- iOS: Xcode and CocoaPods
- Android: Android Studio

### Installation

```bash
# Clone and install
git clone https://github.com/<your-org>/fajr-medflow-emr.git
cd fajr-medflow-emr/apps/mobile
npm install

# iOS only
cd ios && pod install && cd ..
```

## Running the App

```bash
# Start Metro bundler
npm start

# In separate terminals:
npm run ios     # iOS Simulator
npm run android # Android Emulator
```

## Environment Setup

### Using Production (Recommended for Testing)

1. Open the app (LoginScreen appears)
2. Toggle: **Production** (right side)
3. URL shows: `https://emr.fajr.org`
4. Login with your credentials
5. ✅ Everything works!

### Using Local Development

1. Toggle: **Local Dev** (left side)
2. URL shows: `http://localhost:3000`
3. **Important for iOS Simulator**: Update config with your Mac's IP

```typescript
// apps/mobile/src/config/index.ts (line ~16)
DEV: {
  BASE_URL: 'http://192.168.1.XXX:3000',  // Your Mac's IP!
  API_URL: 'http://192.168.1.XXX:3000/api',
  WS_URL: 'ws://192.168.1.XXX:3000',
}
```

4. Start local server:
```bash
cd ../web
npm run dev
```

5. Login and test

**Find your Mac's IP:**
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## Common Issues

### "Network request failed" on Messages Screen
**Cause**: Environment mismatch (logged in with production, but app using localhost)

**Fix**: 
1. Check environment toggle setting
2. Log out and log back in with correct environment
3. All console logs should show same base URL

### Back Button Hidden Under Status Bar (iOS)
**Fixed**: Both `MessagesScreen` and `ThreadDetailScreen` now use `SafeAreaView`

**If still an issue**: Make sure you have latest code and app is rebuilt

### Localhost Not Working on iOS Simulator
**Fix**: Use your Mac's IP address instead of `localhost` (see above)

## Project Structure

```
apps/mobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── config/         # Environment & API config
│   ├── contexts/       # React contexts
│   ├── hooks/          # Custom hooks
│   ├── screens/        # Screen components
│   ├── services/       # API services
│   ├── types/          # TypeScript types
│   └── utils/          # Utility functions
├── docs/               # Documentation (you are here!)
└── App.tsx             # Root component
```

## Key Files

- `App.tsx` - Root app with navigation
- `src/config/index.ts` - Environment configuration
- `src/screens/LoginScreen.tsx` - Login with environment toggle
- `src/screens/MessagesScreen.tsx` - Messages list
- `src/hooks/useMessages.ts` - Message fetching logic
- `src/utils/storage.ts` - MMKV storage utilities

## Development Workflow

### 1. Making Changes

```bash
# Edit files in src/
# Metro auto-reloads on save
# Cmd+R (iOS) or RR (Android) to manual reload
```

### 2. Adding Dependencies

```bash
npm install <package>

# If native dependency (iOS):
cd ios && pod install && cd ..
npm run ios
```

### 3. Debugging

```bash
# View logs
npm start
# Press 'j' to open debugger

# iOS logs
npm run ios -- --verbose

# Android logs
npm run android -- --verbose
```

## Console Logs Guide

### Successful Login + Messages Load

```
👋=== LOGIN DEBUG ===👋
Base URL: https://emr.fajr.org
✅ Login successful

🔄 Environment changed to: production
🌐 New base URL: https://emr.fajr.org

🔍 Fetching threads...
🌐 Current API config: { baseUrl: "https://emr.fajr.org" }
🌐 Fetching from URLs:
  Internal: https://emr.fajr.org/api/internal-messages
  Messages: https://emr.fajr.org/api/messages
✅ Threads loaded successfully: 5 threads
```

### Environment Mismatch (Problem!)

```
Base URL: https://emr.fajr.org
✅ Login successful

🔍 Fetching threads...
🌐 Fetching from URLs:
  Internal: http://localhost:3000/api/internal-messages  ⚠️ WRONG!
  Messages: http://localhost:3000/api/messages           ⚠️ WRONG!
❌ Network request failed
```

**Fix**: Log out, check toggle, log back in

## Testing Checklist

Before committing:
- [ ] Builds without errors (`npm run ios` / `npm run android`)
- [ ] Login works (production)
- [ ] Messages load successfully
- [ ] Back button visible on iPhone (not under status bar)
- [ ] No console errors
- [ ] Environment toggle persists after app restart

## Useful Commands

```bash
# Clean build
rm -rf node_modules ios/Pods
npm install
cd ios && pod install && cd ..

# Reset Metro cache
npm start -- --reset-cache

# iOS specific
npm run ios -- --simulator="iPhone 15 Pro"

# Android specific
npm run android -- --variant=release
```

## Documentation

- `environment-fix.md` - Environment mismatch problem details
- `environment-toggle.md` - Complete toggle usage guide
- `ios-safe-area-fix.md` - Safe area implementation
- `recent-fixes-summary.md` - Latest fixes overview

## Getting Help

1. Check console logs first
2. Review documentation in `docs/`
3. Verify environment toggle setting
4. Try logging out and back in
5. Clean build if issues persist

## Pro Tips

✅ **Always use Production mode** unless actively developing API changes

✅ **Check environment toggle** before reporting "Network request failed"

✅ **Rebuild iOS app** after pod install or native dependency changes

✅ **Use `getApiUrl()`** for all API calls (never hardcode URLs)

✅ **Test on physical device** for camera, location, and network features

## Quick Reference

| Task | Command |
|------|---------|
| Start dev server | `npm start` |
| Run iOS | `npm run ios` |
| Run Android | `npm run android` |
| Clean install | `rm -rf node_modules && npm install` |
| Reset cache | `npm start -- --reset-cache` |
| Check IP | `ifconfig \| grep "inet "` |

---

**Ready to code!** 🚀

If you encounter issues, check the detailed docs in `apps/mobile/docs/` or review console logs for debugging hints.