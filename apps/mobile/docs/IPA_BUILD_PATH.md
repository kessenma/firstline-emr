# IPA Build Path Documentation

This document traces the complete path of the IPA file during the iOS build and TestFlight upload process.

## 📦 Complete IPA Journey

When you run `pnpm run deploy:ios:rock-beta`, here's the complete path your IPA takes:

```
┌─────────────────────────────────────────────────────────────────┐
│                     1. BUILD PHASE                              │
│  Xcode builds the app and creates an .xcarchive                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        apps/mobile/.rock/cache/ios/archive/FajrEMR.xcarchive
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                  2. MANUAL EXPORT PHASE                         │
│  Extract .app, create Payload folder, zip to IPA                │
└─────────────────────────────────────────────────────────────────┘
                              ↓
    apps/mobile/.rock/cache/ios/manual-export/FajrEMR.ipa
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    3. MOVE TO EXPORT                            │
│  Move IPA to the final export directory                         │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        apps/mobile/.rock/cache/ios/export/FajrEMR.ipa  ✅
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                   4. UPLOAD TO TESTFLIGHT                       │
│  Fastlane uploads IPA to App Store Connect via API              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    Apple's Servers ☁️
                              ↓
                         TestFlight 🚀
```

## 🗂️ Directory Structure

```
apps/mobile/
├── .rock/
│   └── cache/
│       └── ios/
│           ├── archive/
│           │   └── FajrEMR.xcarchive/          # Xcode archive output
│           │       └── Products/
│           │           └── Applications/
│           │               └── FajrEMR.app      # Compiled app bundle
│           │
│           ├── manual-export/
│           │   ├── Payload/
│           │   │   └── FajrEMR.app              # Copy of app for packaging
│           │   └── FajrEMR.ipa                  # Temporary IPA location
│           │
│           └── export/
│               └── FajrEMR.ipa                  # Final IPA (uploaded to TestFlight) ✅
│
├── ios/
│   └── fastlane/
│       └── Fastfile                             # Deployment scripts
│
└── ios-version.json                             # Version tracking file
```

## 📍 Key File Locations

### 1. **Archive Location** (Step 1)
```
/Users/kyleessenmacher/WS/fajr-medflow-emr/apps/mobile/.rock/cache/ios/archive/FajrEMR.xcarchive
```
- Created by: `xcodebuild archive`
- Contains: Compiled app bundle and debug symbols
- Size: ~500MB - 1GB (includes debug info)

### 2. **Temporary IPA Location** (Step 2)
```
/Users/kyleessenmacher/WS/fajr-medflow-emr/apps/mobile/.rock/cache/ios/manual-export/FajrEMR.ipa
```
- Created by: Manual zip process
- Purpose: Temporary staging location
- Deleted after: Move to export directory

### 3. **Final IPA Location** (Step 3) ⭐
```
/Users/kyleessenmacher/WS/fajr-medflow-emr/apps/mobile/.rock/cache/ios/export/FajrEMR.ipa
```
- **This is the file that gets uploaded to TestFlight**
- Size: ~50-200MB (distribution build, no debug info)
- Persists after upload for manual distribution if needed

### 4. **Upload Destination** (Step 4)
```
App Store Connect API → TestFlight
```
- Uploaded via: Fastlane `upload_to_testflight` action
- Authentication: App Store Connect API Key (.p8 file)
- Processing time: 5-15 minutes on Apple's servers

## 🔍 Fastfile Code Reference

The relevant code in `ios/fastlane/Fastfile`:

### rock_beta lane (Full build + upload)

```ruby
# Step 1: Build and archive
sh("mkdir -p ../../.rock/cache/ios/archive")
sh("cd .. && xcodebuild -workspace FajrEMR.xcworkspace -scheme FajrEMR -configuration Release -destination 'generic/platform=iOS' -archivePath ../.rock/cache/ios/archive/FajrEMR.xcarchive archive")

# Step 2: Manually export the archive to IPA
sh("mkdir -p ../../.rock/cache/ios/manual-export")
sh("cd ../../.rock/cache/ios/manual-export && rm -f FajrEMR.ipa && mkdir -p Payload && cp -r ../archive/FajrEMR.xcarchive/Products/Applications/FajrEMR.app Payload/ && zip -r FajrEMR.ipa Payload")

# Step 3: Move IPA to export directory
sh("mkdir -p ../../.rock/cache/ios/export")
sh("rm -f ../../.rock/cache/ios/export/FajrEMR.ipa")
sh("mv ../../.rock/cache/ios/manual-export/FajrEMR.ipa ../../.rock/cache/ios/export/")

# Step 4: Upload to TestFlight
upload_rock_testflight()
```

### upload_rock_testflight lane (Upload only)

```ruby
# Default IPA path
ipa_path = options[:ipa_path] || "../../.rock/cache/ios/export/FajrEMR.ipa"

# Convert to absolute path
ipa_path = File.absolute_path(ipa_path)

# Upload to TestFlight
upload_to_testflight(
  ipa: ipa_path,
  api_key: { ... },
  skip_waiting_for_build_processing: skip_waiting,
  ...
)
```

## 🎯 Finding Your IPA

### Quick Check
```bash
ls -lh apps/mobile/.rock/cache/ios/export/FajrEMR.ipa
```

### View Full Path
```bash
# From project root
find . -name "FajrEMR.ipa" -type f
```

### Check IPA Size
```bash
du -h apps/mobile/.rock/cache/ios/export/FajrEMR.ipa
```

## 🚀 Upload Commands

### Upload Latest IPA
```bash
pnpm run deploy:ios:upload-testflight
```
This uploads: `.rock/cache/ios/export/FajrEMR.ipa`

### Build New IPA + Upload
```bash
pnpm run deploy:ios:rock-beta
```
This creates a fresh IPA and uploads it.

## 📤 Where Does the IPA Go After Upload?

1. **Fastlane uploads to**: App Store Connect API
2. **Apple processes at**: Apple's TestFlight servers
3. **Status visible in**: [App Store Connect](https://appstoreconnect.apple.com/)
4. **Available to testers**: After processing completes (~5-15 min)

### Check Upload Status
1. Go to https://appstoreconnect.apple.com/
2. Click **"My Apps"**
3. Select **"FajrEMR"**
4. Click **"TestFlight"** tab
5. View builds under **"iOS"** section

## 🧹 Cleaning Build Artifacts

### Remove All Cached IPAs
```bash
pnpm run deploy:ios:clean
```

This removes:
- `.rock/cache/ios/archive/`
- `.rock/cache/ios/manual-export/`
- `.rock/cache/ios/export/`

### Manual Cleanup
```bash
rm -rf apps/mobile/.rock/cache/ios/
```

## 💡 Pro Tips

1. **Keep the export IPA**: The file at `.rock/cache/ios/export/FajrEMR.ipa` can be manually distributed or re-uploaded if needed.

2. **Check before upload**: Use `deploy:ios:upload-testflight` to upload an existing IPA without rebuilding.

3. **Archive for records**: Consider archiving IPAs with version numbers:
   ```bash
   cp .rock/cache/ios/export/FajrEMR.ipa ~/Desktop/FajrEMR-1.0.8-build9.ipa
   ```

4. **Disk space**: The `.rock/cache/ios/archive/` directory can get large. Clean regularly.

## 🔐 Upload Authentication

The IPA is uploaded using:
- **API Key ID**: From `.env` file
- **Issuer ID**: From `.env` file  
- **Private Key**: `.p8` file in `ios/fastlane/`

These authenticate the upload to your Apple Developer account.

---

**Last Updated**: January 2025  
**Current Build**: 1.0.8 (9)  
**IPA Location**: `.rock/cache/ios/export/FajrEMR.ipa`
