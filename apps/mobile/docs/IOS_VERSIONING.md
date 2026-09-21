# iOS Versioning & Deployment Guide

This guide explains how to manage iOS app versions and deploy builds to TestFlight for the FajrEMR mobile app.

## 📋 Version File

The app version is tracked in `ios-version.json` at the root of the mobile app directory:

```json
{
  "major": 1,
  "minor": 0,
  "patch": 8,
  "build": 9
}
```

This file is the **single source of truth** for version numbers and is automatically synced to the Xcode project.

## 🔢 Version Format

- **Marketing Version**: `{major}.{minor}.{patch}` (e.g., `1.0.8`)
  - This is what users see in the App Store
- **Build Number**: Increments with every build (e.g., `9`)
  - Required to be unique for each TestFlight upload

## 📱 Available Commands

### Check Current Version

```bash
pnpm run version:ios
# or
node scripts/bump-ios-version.js current
```

Output:
```
📱 App Version: 1.0.8
🔢 Build Number: 9
📋 Full Version: 1.0.8 (9)
```

### Bump Version

#### Patch Version (1.0.8 → 1.0.9)
```bash
pnpm run version:ios:bump
# or
node scripts/bump-ios-version.js bump patch
```

Use for: Bug fixes, minor updates

#### Minor Version (1.0.9 → 1.1.0)
```bash
pnpm run version:ios:bump:minor
# or
node scripts/bump-ios-version.js bump minor
```

Use for: New features, improvements

#### Major Version (1.1.0 → 2.0.0)
```bash
pnpm run version:ios:bump:major
# or
node scripts/bump-ios-version.js bump major
```

Use for: Major releases, breaking changes

**Note**: The build number automatically increments with every version bump.

### Initialize Version Tracking

If the `ios-version.json` file gets deleted or you need to reset it:

```bash
pnpm run version:ios:init
# or
node scripts/bump-ios-version.js init
```

## 🚀 Deployment Workflows

### Full Build & Deploy to TestFlight

This is the **recommended** workflow for most deployments:

```bash
pnpm run deploy:ios:rock-beta
```

This command:
1. ✅ Bumps the patch version and build number
2. ✅ Builds and archives the app with Xcode
3. ✅ Creates the IPA file
4. ✅ Uploads to TestFlight

### Build Without Uploading

If you just want to create the IPA without uploading:

```bash
pnpm run build:ios
```

### Upload Pre-Built IPA to TestFlight

If you already have an IPA and just want to upload it:

```bash
pnpm run deploy:ios:upload-testflight
```

This will upload the IPA from `.rock/cache/ios/export/FajrEMR.ipa`.

### Upload to App Store Connect

For production releases (not TestFlight):

```bash
pnpm run deploy:ios:rock-release
```

## 📊 Build Information

To see the current version without bumping:

```bash
pnpm run build:info
```

## 🔄 Complete Release Workflow Example

### For a Bug Fix Release

```bash
# 1. Check current version
pnpm run version:ios

# 2. Deploy to TestFlight (auto-bumps patch version)
pnpm run deploy:ios:rock-beta

# 3. Check App Store Connect after ~10 minutes
open https://appstoreconnect.apple.com/
```

### For a Feature Release

```bash
# 1. Manually bump to next minor version
pnpm run version:ios:bump:minor

# 2. Deploy to TestFlight
pnpm run deploy:ios:rock-beta

# 3. Check App Store Connect
open https://appstoreconnect.apple.com/
```

### For a Major Release

```bash
# 1. Manually bump to next major version
pnpm run version:ios:bump:major

# 2. Deploy to production (App Store)
pnpm run deploy:ios:rock-release

# 3. Submit for review in App Store Connect
open https://appstoreconnect.apple.com/
```

## 🛠️ Manual Version Management

You can also manually edit `ios-version.json` if needed:

```json
{
  "major": 2,
  "minor": 0,
  "patch": 0,
  "build": 10
}
```

Then run the init command to sync to Xcode:

```bash
pnpm run version:ios:init
```

## 📁 Files Modified by Versioning

- `ios-version.json` - Version tracking file
- `ios/FajrEMR.xcodeproj/project.pbxproj` - Xcode project file
  - Updates `MARKETING_VERSION`
  - Updates `CURRENT_PROJECT_VERSION`

## 🔍 Troubleshooting

### Build Number Conflict

If TestFlight rejects a build saying the build number already exists:

```bash
# Manually increment just the build number
node scripts/bump-ios-version.js bump patch
```

### Version Out of Sync

If the Xcode project version doesn't match `ios-version.json`:

```bash
pnpm run version:ios:init
```

### Can't Find App in App Store Connect

Make sure the app with bundle ID `com.fajr.emr` exists in App Store Connect:
1. Go to https://appstoreconnect.apple.com/
2. Click "My Apps"
3. If the app doesn't exist, create it with the "+" button

## 📚 Additional Resources

- [Fastlane Documentation](https://docs.fastlane.tools/)
- [App Store Connect](https://appstoreconnect.apple.com/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- Project Fastfile: `ios/fastlane/Fastfile`
- Version Script: `scripts/bump-ios-version.js`

## 🎯 Quick Reference

| Task | Command |
|------|---------|
| Check version | `pnpm run version:ios` |
| Bump patch | `pnpm run version:ios:bump` |
| Bump minor | `pnpm run version:ios:bump:minor` |
| Bump major | `pnpm run version:ios:bump:major` |
| Build & upload to TestFlight | `pnpm run deploy:ios:rock-beta` |
| Upload existing IPA | `pnpm run deploy:ios:upload-testflight` |
| Deploy to App Store | `pnpm run deploy:ios:rock-release` |
| Initialize version file | `pnpm run version:ios:init` |

## 📦 IPA File Location

After building, your IPA file is located at:

```
apps/mobile/.rock/cache/ios/export/FajrEMR.ipa
```

**Full Path:**
```
/Users/kyleessenmacher/WS/fajr-medflow-emr/apps/mobile/.rock/cache/ios/export/FajrEMR.ipa
```

This is the file that gets uploaded to TestFlight. You can:
- Keep it for manual distribution
- Re-upload it without rebuilding using `pnpm run deploy:ios:upload-testflight`
- Archive it with version info: `cp .rock/cache/ios/export/FajrEMR.ipa ~/Desktop/FajrEMR-1.0.8-build9.ipa`

**Current IPA Size**: ~7.3 MB

For a detailed explanation of the complete build and upload path, see [IPA_BUILD_PATH.md](./IPA_BUILD_PATH.md).

---

**Last Updated**: January 2025  
**Current Version**: 1.0.8 (Build 9)  
**IPA Location**: `.rock/cache/ios/export/FajrEMR.ipa`