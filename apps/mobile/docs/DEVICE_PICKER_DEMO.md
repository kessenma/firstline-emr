# 📱 Interactive Device Picker - Visual Walkthrough

This guide shows exactly what you'll see when using the interactive device picker.

## 🚀 Quick Start

Just run:
```bash
pnpm ios:device
```

## 📺 What You'll See

### Step 1: Script Starts

```
ℹ️  Ruby environment initialized
```

### Step 2: Interactive Device Menu Appears

```
================================
Select Device
================================

Physical Devices:
  [1] Kyle iphone 17 (iOS 26.1)

Simulators:
  [2] iPhone 17 Pro (Simulator)
  [3] iPhone 17 (Simulator)
  [4] iPhone 17 Pro Max (Simulator)
  [5] iPhone Air (Simulator)
  [6] iPad Pro 13-inch (Simulator)
  [7] iPad Pro 11-inch (Simulator)
  [8] iPad Air 13-inch (Simulator)
  [9] iPad Air 11-inch (Simulator)
  [10] iPad mini (Simulator)
  [11] iPad (Simulator)
  [q] Quit

Select device: _
```

### Step 3: You Choose a Device

**Example 1: Physical iPhone**
```
Select device: 1
✅ Selected: Kyle iphone 17
```

**Example 2: Simulator**
```
Select device: 2
✅ Selected: iPhone 17 Pro
```

**Example 3: Cancel**
```
Select device: q
ℹ️  Cancelled by user
```

### Step 4: Build and Install

```
================================
Building and Installing on Device
================================

ℹ️  Device: Kyle iphone 17
ℹ️  Platform: iOS
ℹ️  Bundler: Rock + rs.pack (Rspack)

ℹ️  Step 1/3: Checking iOS dependencies...
✅ iOS dependencies ready

ℹ️  Step 2/3: Starting Metro bundler...
✅ Metro bundler started (PID: 12345)

ℹ️  Step 3/3: Building and installing app on device...

ℹ️  Running: rock run:ios --device "Kyle iphone 17" --destination device

┌  Running iOS app
│
◇  Calculated project fingerprint: 6c5de44fb722bf38d63b0bfec7f498ef1ccb7c78
│
◇  Build Settings:
│  Scheme          FajrEMR
│  Configuration   Debug
│
◐  Building the app
│  [Xcode build output...]
│
◇  Build succeeded
│
◐  Installing app on device...
│
◇  App installed successfully
│
◐  Launching app...
│
■  App launched! [45s]

✅ App successfully installed and launched on Kyle iphone 17!

ℹ️  The app is now running on your device
ℹ️  Metro bundler is still running for hot reload
ℹ️  Press Ctrl+C to stop Metro bundler
```

### Step 5: Development with Hot Reload

```
[Metro bundler is running in the background]

[You make code changes...]
[App automatically reloads on your device!]

[Press Ctrl+C when done]

ℹ️  Stopping Metro bundler...
^C
```

## 🎯 Usage Examples

### Example 1: Install on Physical iPhone

```bash
$ pnpm ios:device

Select device: 1         # Choose your physical iPhone
✅ Selected: Kyle iphone 17
ℹ️  Running: rock run:ios --device "Kyle iphone 17" --destination device
[Building and installing...]
✅ App successfully installed!
```

### Example 2: Test on Different Simulator

```bash
$ pnpm ios:device

Select device: 6         # Choose iPad Pro
✅ Selected: iPad Pro 13-inch
ℹ️  Running: rock run:ios --device "iPad Pro 13-inch"
[Building and installing...]
✅ App successfully installed!
```

### Example 3: Change Your Mind

```bash
$ pnpm ios:device

Select device: q         # Press 'q' to quit
ℹ️  Cancelled by user
```

## 🔥 Error Handling

### Invalid Selection

```
Select device: 99
❌ Invalid selection. Please choose a number between 1 and 11
Select device: _
```

### Non-numeric Input

```
Select device: abc
❌ Invalid selection. Please enter a number or 'q' to quit.
Select device: _
```

### No Devices Found

```
================================
Select Device
================================

Physical Devices:
  (No physical devices connected)

Simulators:
  [1] iPhone 17 Pro (Simulator)
  [2] iPhone 17 (Simulator)
  ...

ℹ️  Connect your iPhone via USB to see it here
ℹ️  Remember to unlock and tap "Trust This Computer"
```

## 🎨 Color Legend

The script uses colors to make output clear:

- 🔵 **Blue (ℹ️)** - Informational messages
- 🟢 **Green (✅)** - Success messages
- 🟡 **Yellow (⚠️)** - Warnings
- 🔴 **Red (❌)** - Errors
- 🔷 **Cyan ([1])** - Device options
- 🟣 **Magenta** - Section headers

## 💡 Pro Tips

### Tip 1: Remember Your Number
After the first time, you'll remember your device number:
- `1` is usually your physical iPhone
- `2-11` are simulators

### Tip 2: Quick Testing Workflow
```bash
# Terminal 1
pnpm ios:device
# Select [1] for iPhone

# [Make code changes]
# App hot reloads automatically!

# [Done? Press Ctrl+C]
```

### Tip 3: Multiple Devices
If you have multiple iPhones/iPads connected, they'll all show up:
```
Physical Devices:
  [1] Kyle iphone 17 (iOS 26.1)
  [2] Kyle iPad Pro (iOS 26.1)
  [3] Test iPhone 15 (iOS 25.0)
```

### Tip 4: Skip the Picker
If you already know your device name:
```bash
./scripts/run-on-device.sh "Kyle iphone 17"
```

### Tip 5: Understanding the Commands
The script automatically uses the correct Rock flags:
- **Physical devices**: `--destination device` flag is added automatically
- **Simulators**: No destination flag needed, just device name

## 🚀 Common Workflows

### Daily Development on Physical Device
```bash
$ pnpm ios:device
Select device: 1                    # Your iPhone
[Building...]
✅ App successfully installed!
[Make changes, app hot reloads]
[Press Ctrl+C when done]
```

### Testing on Multiple Devices
```bash
# Test on iPhone
$ pnpm ios:device
Select device: 1
[Testing...]
^C

# Test on iPad
$ pnpm ios:device
Select device: 6
[Testing...]
^C
```

### Quick Simulator Test
```bash
$ pnpm ios:device
Select device: 2                    # iPhone 17 Pro Simulator
[Quick test on simulator]
^C
```

## 📊 Comparison: Old vs New

### Old Way (Not Interactive)
```bash
$ pnpm ios:device
ℹ️  Auto-detecting...
✅ Found device: Kyle's MacBook Pro   # Wrong! 😞
❌ Build failed
```

### New Way (Interactive)
```bash
$ pnpm ios:device

Physical Devices:
  [1] Kyle iphone 17 (iOS 26.1)     # Clear choices! 😊
Simulators:
  [2] iPhone 17 Pro (Simulator)

Select device: 1                     # You choose!
✅ Selected: Kyle iphone 17
✅ Build succeeded
```

## 🎓 Learning the Script

### First Time Users
1. Run `pnpm ios:device`
2. Look at the numbered list
3. Find your device
4. Type the number
5. Press Enter
6. Done!

### After a Few Times
1. Run `pnpm ios:device`
2. Type `1` (you remember it's your iPhone)
3. Press Enter
4. Done!

### Power Users
```bash
# Skip the picker entirely
./scripts/run-on-device.sh "Kyle iphone 17"
```

## 🆘 Troubleshooting the Picker

### "No physical devices connected"
```bash
# Check what devices are visible
$ pnpm ios:device:list

# If your iPhone isn't listed:
# 1. Check USB cable is connected
# 2. Unlock your iPhone
# 3. Trust this computer if prompted
# 4. Try again
```

### Device Appears Then Disappears
- Your iPhone might have locked
- USB cable might be loose
- Reconnect and try again

### Can't Type a Number
- Make sure you're in the correct terminal window
- Terminal must have focus
- Try clicking the terminal first

## 📚 Related Commands

```bash
# Show device list without interactive picker
pnpm ios:device:list

# Run on specific device (skip picker)
./scripts/run-on-device.sh "Kyle iphone 17"

# Just start Metro bundler
pnpm start

# Original simulator command
pnpm ios
--dev-server	Automatically start a dev server (bundler) after building the app.
```

## 🔍 How It Works

### Device Type Detection

The script automatically detects whether you selected a physical device or simulator and adds the appropriate flags:

**For physical devices:**
```bash
rock run:ios --device "Kyle iphone 17" --destination device
```

**For simulators:**
```bash
rock run:ios --device "iPhone 17 Pro"
```

This is why you don't need to worry about Rock flags - the script handles it for you! 🎉

---

**Happy coding! 🎉**