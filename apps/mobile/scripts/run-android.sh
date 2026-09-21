#!/bin/bash
# run-android.sh
# Start the Android emulator (if not already running) and run the app
#
# Usage:
#   ./scripts/run-android.sh                # Start Pixel_9a emulator + run app
#   ./scripts/run-android.sh "Medium_Phone_API_36.1"  # Use a different AVD

set -e

# Android SDK paths
ANDROID_HOME="${ANDROID_HOME:-$HOME/Library/Android/sdk}"
EMULATOR="$ANDROID_HOME/emulator/emulator"
ADB="$ANDROID_HOME/platform-tools/adb"

# Default AVD name (override with first argument)
AVD_NAME="${1:-Pixel_9a}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info()    { echo -e "${BLUE}ℹ️  $1${NC}"; }
print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error()   { echo -e "${RED}❌ $1${NC}"; }

# --- Verify SDK tools exist ---
if [ ! -f "$EMULATOR" ]; then
    print_error "Android emulator not found at $EMULATOR"
    print_info "Set ANDROID_HOME or install the Android SDK emulator package"
    exit 1
fi

if [ ! -f "$ADB" ]; then
    print_error "adb not found at $ADB"
    exit 1
fi

# --- Verify the AVD exists ---
if ! "$EMULATOR" -list-avds 2>/dev/null | grep -q "^${AVD_NAME}$"; then
    print_error "AVD '$AVD_NAME' not found. Available AVDs:"
    "$EMULATOR" -list-avds
    exit 1
fi

# --- Start emulator if no device/emulator is connected ---
RUNNING_DEVICE=$("$ADB" devices 2>/dev/null | grep -w "device" | head -1 | awk '{print $1}')

if [ -n "$RUNNING_DEVICE" ]; then
    print_success "Android device already connected: $RUNNING_DEVICE"
else
    print_info "No Android device detected — launching emulator: $AVD_NAME"

    # Launch emulator in a new session (setsid) so it's fully detached from
    # pnpm's process group and won't be killed when the script exits.
    perl -MPOSIX=setsid -e '
        defined(my $pid = fork) or die "fork: $!";
        exit 0 if $pid;
        setsid();
        open STDIN, "</dev/null";
        open STDOUT, ">/dev/null";
        open STDERR, ">/dev/null";
        exec @ARGV or die "exec: $!";
    ' -- "$EMULATOR" -avd "$AVD_NAME" -no-snapshot-load

    # Wait for the device to come online (up to 120s)
    print_info "Waiting for emulator to boot..."
    SECONDS_WAITED=0
    MAX_WAIT=120
    while [ $SECONDS_WAITED -lt $MAX_WAIT ]; do
        BOOT_COMPLETE=$("$ADB" shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
        if [ "$BOOT_COMPLETE" = "1" ]; then
            break
        fi
        sleep 2
        SECONDS_WAITED=$((SECONDS_WAITED + 2))
    done

    if [ "$BOOT_COMPLETE" = "1" ]; then
        print_success "Emulator booted in ~${SECONDS_WAITED}s"
    else
        print_error "Emulator failed to boot within ${MAX_WAIT}s"
        "$ADB" emu kill 2>/dev/null || true
        exit 1
    fi
fi

# --- Run the app ---
print_info "Running: rock run:android"
echo ""
exec rock run:android
