#!/bin/bash
# install-physical-device.sh
# Direct install to physical device with complete cache clearing

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_error() { echo -e "${RED}❌ $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🚀 PHYSICAL DEVICE INSTALLER"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Get physical device UDID
PHYSICAL_DEVICE_UDID="00008150-0019043A0287801C"
DEVICE_NAME="Kyle iphone 17"

print_info "Target Device: $DEVICE_NAME"
print_info "Target UDID: $PHYSICAL_DEVICE_UDID"
echo ""

# Check if device is connected
if ! xcrun xctrace list devices 2>&1 | grep -q "$PHYSICAL_DEVICE_UDID"; then
    print_error "Device not found! Please connect your iPhone via USB"
    print_info "Make sure the device is unlocked and you've trusted this computer"
    exit 1
fi

print_success "Device detected and connected"
echo ""

# Check Metro
if ! lsof -ti:8081 > /dev/null 2>&1; then
    print_error "Metro bundler is NOT running!"
    print_info ""
    print_info "Please start Metro in another terminal:"
    print_info "  cd /Users/ke/ws/fajr-medflow-emr/apps/mobile"
    print_info "  pnpm start"
    print_info ""
    exit 1
fi

print_success "Metro bundler is running"
echo ""

# Nuclear cache clearing
print_warning "Clearing ALL caches for fresh build..."
echo ""

print_info "1. Clearing Rock cache..."
rm -rf .rock/cache/ios/bundle 2>/dev/null || true
rm -rf .rock/cache/ios/archive 2>/dev/null || true
rm -rf .rock/cache 2>/dev/null || true

print_info "2. Clearing Metro cache..."
rm -rf node_modules/.cache 2>/dev/null || true
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/haste-map-* 2>/dev/null || true
rm -rf $TMPDIR/metro-* 2>/dev/null || true
rm -rf $TMPDIR/haste-map-* 2>/dev/null || true

print_info "3. Clearing Xcode build cache..."
rm -rf ios/build 2>/dev/null || true
rm -rf ~/Library/Developer/Xcode/DerivedData/FajrEMR-* 2>/dev/null || true

print_info "4. Clearing React Native cache..."
rm -rf $TMPDIR/react-native-* 2>/dev/null || true
rm -rf $TMPDIR/RCTCache-* 2>/dev/null || true

print_success "All caches cleared!"
echo ""

# Kill any existing app on device
print_info "Killing any existing app instance on device..."
xcrun devicectl device process kill --device "$PHYSICAL_DEVICE_UDID" com.fajr.emr 2>/dev/null || true
sleep 1

echo ""
print_info "═══════════════════════════════════════════════════════════"
print_info "Starting fresh build and install to physical device..."
print_info "═══════════════════════════════════════════════════════════"
echo ""
print_warning "This will take a few minutes for a clean build"
echo ""

# Build and install using Rock (via pnpm)
if pnpm rock run:ios --device "$DEVICE_NAME" --destination device; then
    echo ""
    echo "═══════════════════════════════════════════════════════════"
    print_success "App successfully installed on physical device!"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    print_info "Next steps:"
    print_info "1. Check the Metro logs for device UDID"
    print_info "2. Look for: Device ID (UDID): $PHYSICAL_DEVICE_UDID"
    print_info "3. Try the push notification test"
    echo ""
else
    echo ""
    print_error "Build or installation failed!"
    echo ""
    print_info "Common issues:"
    print_info "• Device not trusted - Unlock device and tap 'Trust This Computer'"
    print_info "• App already running - Close the app on your device"
    print_info "• Code signing issue - Check Xcode signing settings"
    print_info "• Wrong network - Ensure Mac and iPhone on same WiFi"
    echo ""
    exit 1
fi
