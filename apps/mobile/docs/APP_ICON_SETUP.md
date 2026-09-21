# App Icon Setup Documentation

This document explains the app icon configuration for the FajrEMR iOS app.

## ✅ Icon Setup Complete

The app icons have been successfully configured and are ready for deployment.

## 📍 Icon Locations

### Source Icons
```
apps/mobile/0assets/fajr-logo/apple-devices/AppIcon.appiconset/
```
- Contains all 46 icon files for iOS, macOS, and watchOS
- Generated using makeappicon tool

### Active Icons (Used by Xcode)
```
apps/mobile/ios/FajrEMR/Images.xcassets/AppIcon.appiconset/
```
- Contains the same 46 icon files
- Referenced by the Xcode project
- This is what gets bundled into the IPA

## 📱 Required iOS Icon Sizes

All required iOS icon sizes are present:

| Size | Scale | Pixels | Filename | Purpose |
|------|-------|--------|----------|---------|
| 20x20 | @2x | 40x40 | icon-ios-20x20@2x.png | Notifications (iPhone) |
| 20x20 | @3x | 60x60 | icon-ios-20x20@3x.png | Notifications (iPhone) |
| 29x29 | @2x | 58x58 | icon-ios-29x29@2x.png | Settings (iPhone) |
| 29x29 | @3x | 87x87 | icon-ios-29x29@3x.png | Settings (iPhone) |
| 40x40 | @2x | 80x80 | icon-ios-40x40@2x.png | Spotlight (iPhone) |
| 40x40 | @3x | 120x120 | icon-ios-40x40@3x.png | Spotlight (iPhone) |
| **60x60** | **@2x** | **120x120** | **icon-ios-60x60@2x.png** | **App Icon (iPhone)** ⭐ |
| **60x60** | **@3x** | **180x180** | **icon-ios-60x60@3x.png** | **App Icon (iPhone)** ⭐ |
| 76x76 | @2x | 152x152 | icon-ios-76x76@2x.png | App Icon (iPad) |
| 83.5x83.5 | @2x | 167x167 | icon-ios-83.5x83.5@2x.png | App Icon (iPad Pro) |
| 1024x1024 | @1x | 1024x1024 | icon-ios-1024x1024.png | App Store Marketing |

**Note**: The 120x120 icon (60x60@2x) is the critical icon that was missing and causing the validation error.

## ✅ Verification

To verify the icons are correct:

```bash
# Check icon exists
ls -lh apps/mobile/ios/FajrEMR/Images.xcassets/AppIcon.appiconset/icon-ios-60x60@2x.png

# Verify dimensions
sips -g pixelWidth -g pixelHeight apps/mobile/ios/FajrEMR/Images.xcassets/AppIcon.appiconset/icon-ios-60x60@2x.png

# Count all icons (should be 46)
ls -1 apps/mobile/ios/FajrEMR/Images.xcassets/AppIcon.appiconset/*.png | wc -l
```

Expected output:
```
pixelWidth: 120
pixelHeight: 120
```

## 🔄 After Icon Changes

When you update icons, you MUST rebuild the app:

```bash
# Clean build artifacts
pnpm run deploy:ios:clean

# Rebuild and deploy to TestFlight
pnpm run deploy:ios:rock-beta
```

**Important**: Simply updating the icon files is not enough. The icons are bundled into the IPA during the build process, so you must rebuild to include the new icons.

## 📦 What Gets Bundled

When you build the app:
1. Xcode reads from `ios/FajrEMR/Images.xcassets/AppIcon.appiconset/`
2. Icons are compiled into the app bundle
3. The IPA includes the compiled asset catalog
4. Apple validates that all required icons are present

## 🐛 Troubleshooting

### Error: Missing 120x120 icon

**Problem**: 
```
Missing required icon file. The bundle does not contain an app icon 
for iPhone / iPod Touch of exactly '120x120' pixels
```

**Solution**:
The icons have been installed. Rebuild the app:
```bash
pnpm run deploy:ios:clean
pnpm run deploy:ios:rock-beta
```

### Error: Icon dimensions incorrect

**Problem**: Icon file exists but has wrong dimensions

**Solution**:
Verify the actual dimensions:
```bash
sips -g pixelWidth -g pixelHeight apps/mobile/ios/FajrEMR/Images.xcassets/AppIcon.appiconset/icon-ios-60x60@2x.png
```

If dimensions are wrong, replace with correct icon from source:
```bash
cp apps/mobile/0assets/fajr-logo/apple-devices/AppIcon.appiconset/icon-ios-60x60@2x.png \
   apps/mobile/ios/FajrEMR/Images.xcassets/AppIcon.appiconset/
```

### Contents.json Out of Sync

**Problem**: Icon files exist but Contents.json doesn't reference them

**Solution**: The Contents.json has been updated to reference all icons. If you need to regenerate it, it's located at:
```
apps/mobile/ios/FajrEMR/Images.xcassets/AppIcon.appiconset/Contents.json
```

## 🎨 Updating Icons

To update the app icons in the future:

1. **Generate new icons** using a tool like [makeappicon.com](https://makeappicon.com/) or [appicon.co](https://appicon.co/)

2. **Replace source icons**:
   ```bash
   # Replace all icons in source directory
   cp -r path/to/new/AppIcon.appiconset/* apps/mobile/0assets/fajr-logo/apple-devices/AppIcon.appiconset/
   ```

3. **Copy to Xcode project**:
   ```bash
   cp apps/mobile/0assets/fajr-logo/apple-devices/AppIcon.appiconset/*.png \
      apps/mobile/ios/FajrEMR/Images.xcassets/AppIcon.appiconset/
   ```

4. **Rebuild the app**:
   ```bash
   pnpm run deploy:ios:clean
   pnpm run deploy:ios:rock-beta
   ```

## 📋 Icon Design Guidelines

When creating app icons:

- ✅ Use PNG format
- ✅ Use RGB color space (not CMYK)
- ✅ No transparency (alpha channel should be fully opaque)
- ✅ Square aspect ratio
- ✅ High contrast and simple design
- ✅ Test at all sizes (icons should be recognizable at 29x29)
- ❌ Don't include rounded corners (iOS adds them automatically)
- ❌ Don't include text that's too small to read

## 🔗 References

- [Apple Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [iOS App Icon Sizes](https://developer.apple.com/design/human-interface-guidelines/app-icons#App-icon-sizes)
- [Asset Catalog Format Reference](https://developer.apple.com/library/archive/documentation/Xcode/Reference/xcode_ref-Asset_Catalog_Format/)

## 📊 Current Status

- ✅ All 46 icon files installed
- ✅ Contents.json properly configured
- ✅ Critical 120x120 icon present and verified
- ✅ 1024x1024 App Store icon present
- ⏳ **Next Step**: Rebuild the app to include icons in IPA

---

**Last Updated**: January 2025  
**Icon Count**: 46 files  
**Location**: `ios/FajrEMR/Images.xcassets/AppIcon.appiconset/`
