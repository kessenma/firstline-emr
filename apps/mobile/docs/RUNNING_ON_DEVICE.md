# Running FajrEMR on Physical iPhone Device

This guide explains how to install and run the FajrEMR mobile app on your physical iPhone using Rock and rs.pack bundler.

## 🚀 Quick Start

### Prerequisites

1. **Physical iPhone** connected via USB
2. **Xcode** installed with command-line tools
3. **Developer certificate** configured in Xcode
4. **Device trusted** - You must have tapped "Trust This Computer" on your iPhone

### Install & Run (Automatic Device Detection)

```bash
# From the mobile directory
pnpm ios:device
```

This will:
1. Auto-detect your connected iPhone
2. Start Metro bundler in the background
3. Build and install the app using Rock + rs.pack
4. Launch the app on your device

### List Available Devices

```bash
pnpm ios:device:list
```

This shows all connected physical devices and available simulators.

### Run on Specific Device

```bash
./scripts/run-on-device.sh "Kyle iphone 17"
```

## 📱 Step-by-Step Process

### What the Script Does

When you run `pnpm ios:device`, the script performs these steps:

1. **Initializes Ruby Environment**
   - Sets up rbenv for CocoaPods and Fastlane
   - Ensures proper Ruby version

2. **Checks iOS Dependencies**
   - Verifies CocoaPods are installed
   - Ensures native dependencies are ready

3. **Starts Metro Bundler**
   - Launches Rock's development server on port 8081
   - Runs in background for hot reload support
   - Logs output to `.rock/metro.log`

4. **Builds and Installs App**
   - Uses Rock's `run:ios` command with your device name
   - Automatically adds `--destination device` flag for physical devices
   - Compiles native code with Xcode
   - Bundles JavaScript with rs.pack (Rspack)
   - Installs on your physical device
   - Launches the app automatically

5. **Keeps Metro Running**
   - Allows hot reload during development
   - Press Ctrl+C to stop when done

## 🔧 Manual Commands

If you prefer to run commands separately:

### Start Metro Bundler Only

```bash
pnpm start
# or
rock start
```

### Build and Install (Metro must be running separately)

```bash
# Physical device (requires --destination device flag)
rock run:ios --device "Kyle iphone 17" --destination device

# Simulator (no --destination flag needed)
rock run:ios --device "iPhone 17 Pro"
```

## 🐛 Troubleshooting

### "No physical devices found"

**Problem:** No iPhone detected via USB

**Solutions:**
1. Connect iPhone via USB cable
2. Unlock your iPhone
3. Tap "Trust This Computer" when prompted
4. Run `pnpm ios:device:list` to verify device appears

### "Failed to build or install app on device"

**Problem:** Build or installation failed

**Common Causes & Solutions:**

1. **Device Not Trusted**
   - Unlock iPhone and tap "Trust This Computer"
   - Re-run the script

2. **Invalid Developer Certificate**
   - Open `ios/FajrEMR.xcworkspace` in Xcode
   - Go to Signing & Capabilities
   - Select your development team
   - Ensure automatic signing is enabled

3. **Bundle ID Mismatch**
   - Verify bundle ID in Xcode matches `org.fajr.emr`
   - Check provisioning profile includes this bundle ID

4. **Device Locked**
   - Unlock your iPhone before running the script

5. **Xcode Command Line Tools Missing**
   ```bash
   xcode-select --install
   ```

### "Metro bundler failed to start"

**Problem:** Port 8081 is blocked or in use

**Solutions:**

1. **Kill existing Metro process:**
   ```bash
   lsof -ti:8081 | xargs kill -9
   ```

2. **Check for other processes on port 8081:**
   ```bash
   lsof -i:8081
   ```

3. **Try starting Metro manually first:**
   ```bash
   pnpm start
   ```

### "rock: command not found"

**Problem:** Rock CLI not installed

**Solution:**
```bash
pnpm install
```

This installs Rock as a dev dependency.

## 📊 Comparing with Simulators

| Feature | Physical Device | Simulator |
|---------|----------------|-----------|
| **Push Notifications** | ✅ Real APNs tokens | ❌ Fake tokens only |
| **Camera/Photos** | ✅ Real hardware | ⚠️ Limited support |
| **Performance** | ✅ Actual device speed | ⚠️ Mac CPU dependent |
| **Sensors** | ✅ Real accelerometer, GPS | ❌ Simulated only |
| **TestFlight Testing** | ✅ Same as production | ❌ Not possible |
| **Network Issues** | ✅ Real-world conditions | ⚠️ Mac's network |
| **Development Speed** | ⚠️ Slower builds | ✅ Faster builds |

**Use physical device for:**
- Testing push notifications (APNs)
- Performance testing
- Camera/photo features
- Real-world network conditions
- Final verification before TestFlight

**Use simulator for:**
- Rapid development
- UI/layout work
- Quick testing
- CI/CD pipelines

## 🎯 Development Workflow

### Recommended Workflow

1. **Develop on Simulator** (fast iteration)
   ```bash
   pnpm ios
   ```

2. **Test on Device** (verify features work)
   ```bash
   pnpm ios:device
   ```

3. **Deploy to TestFlight** (production testing)
   ```bash
   pnpm deploy:ios:rock-beta
   ```

### Hot Reload on Device

Once the app is installed and Metro is running:

1. **Make code changes** in your editor
2. **Save the file** (Cmd+S)
3. **App auto-reloads** on device (hot reload)

If hot reload doesn't work:
- Shake device to open dev menu
- Tap "Reload"

### Native Code Changes

If you modify Swift/Objective-C code or add new native modules:

1. Stop the script (Ctrl+C)
2. Clean build (optional):
   ```bash
   cd ios && xcodebuild clean
   ```
3. Re-run:
   ```bash
   pnpm ios:device
   ```

## 🔍 Debugging on Device

### View Native Logs

**Option 1: Xcode Console**
1. Open Xcode
2. Window > Devices and Simulators
3. Select your device
4. Click "Open Console"
5. Filter by "FajrEMR"

**Option 2: Terminal**
```bash
xcrun simctl spawn booted log stream --predicate 'processImagePath contains "FajrEMR"'
```

### View Metro Bundler Logs

```bash
tail -f .rock/metro.log
```

### View React Native Logs

```bash
npx react-native log-ios
```

## 🚦 Script Options

The `run-on-device.sh` script supports these options:

```bash
# Auto-detect first connected device
./scripts/run-on-device.sh

# Specify device by name
./scripts/run-on-device.sh "Kyle iphone 17"

# List all available devices
./scripts/run-on-device.sh --list
./scripts/run-on-device.sh -l
```

## 📱 Multiple Devices

If you have multiple iPhones connected:

1. **List devices:**
   ```bash
   pnpm ios:device:list
   ```

2. **Choose device:**
   ```bash
   ./scripts/run-on-device.sh "iPhone 1"
   # or
   ./scripts/run-on-device.sh "iPhone 2"
   ```

## ⚡ Performance Tips

1. **Close unnecessary apps** on your Mac (Xcode builds are CPU-intensive)

2. **Use Release build for performance testing:**
   ```bash
   rock run:ios --device "Your iPhone" --configuration Release
   ```

3. **Keep device plugged in** - development builds can drain battery quickly

4. **Disable animations** on device:
   - Settings > Accessibility > Motion > Reduce Motion

## 🔒 Security Notes

- Development builds include debugging symbols and are larger
- Don't distribute development builds - use TestFlight instead
- Development certificates expire - renew in Apple Developer Portal
- Keep your provisioning profiles up to date

## 📚 Related Documentation

- [APNs Debugging Guide](../APNS_DEBUGGING_GUIDE.md) - Troubleshooting push notifications
- [Deployment Checklist](../DEPLOYMENT_CHECKLIST.md) - Preparing for TestFlight/App Store
- [Rock Documentation](https://www.rockjs.dev/docs/cli/introduction) - Rock bundler CLI docs

## 🔧 Technical Details

### How the Script Detects Device Type

The script automatically detects whether you selected a physical device or simulator:

- **Physical devices**: Adds `--destination device` flag to Rock command
- **Simulators**: Uses device name only (no destination flag needed)

This is why the script works seamlessly for both physical devices and simulators!

## 🆘 Getting Help

If you encounter issues:

1. Check device appears in `pnpm ios:device:list`
2. Verify device is unlocked and trusted
3. Check Xcode signing settings
4. Review Metro bundler logs in `.rock/metro.log`
5. Check native logs in Xcode Console

---

**Last Updated:** January 2026
**Maintained by:** FajrEMR Development Team