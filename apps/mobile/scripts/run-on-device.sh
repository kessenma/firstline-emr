#!/bin/bash
# run-on-device.sh
# Install and run the FajrEMR app on a physical iPhone device
#
# Usage:
#   ./scripts/run-on-device.sh                    # Interactive device picker
#   ./scripts/run-on-device.sh "Kyle iphone 17"  # Specify device name
#   ./scripts/run-on-device.sh --list            # List available devices

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Functions
print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_header() {
    echo ""
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
    echo ""
}

print_option() {
    echo -e "${CYAN}  [$1]${NC} $2"
}

# --- Metro host management for physical devices ---
# Physical devices can't reach localhost, so we swap it for the Mac's LAN IP
# in AppDelegate.swift before building, then restore on exit.
APPDELEGATE_PATH="./ios/FajrEMR/AppDelegate.swift"
METRO_HOST_MODIFIED=false

get_local_ip() {
    ifconfig | grep "inet " | grep -v 127.0.0.1 | head -1 | awk '{print $2}'
}

swap_metro_host() {
    local ip="$1"
    if [ -z "$ip" ]; then
        print_error "Could not detect local IP address"
        return 1
    fi
    sed -i '' "s|http://localhost:8081|http://${ip}:8081|g" "$APPDELEGATE_PATH"
    METRO_HOST_MODIFIED=true
    print_success "Updated AppDelegate.swift: localhost -> $ip"
}

restore_metro_host() {
    if [ "$METRO_HOST_MODIFIED" = true ]; then
        sed -i '' -E 's|http://[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+:8081|http://localhost:8081|g' "$APPDELEGATE_PATH"
        echo -e "${GREEN}✅ Restored AppDelegate.swift -> localhost${NC}"
        METRO_HOST_MODIFIED=false
    fi
}

trap restore_metro_host EXIT

# Check if --list flag is provided
if [ "$1" == "--list" ] || [ "$1" == "-l" ]; then
    print_header "Available Devices"
    echo "Physical Devices:"
    xcrun xctrace list devices 2>&1 | grep -v "Simulator" | grep -v "==" | grep -iE "iphone|ipad" | grep "(" || echo "  No physical devices connected"
    echo ""
    echo "Simulators:"
    xcrun xctrace list devices 2>&1 | grep "Simulator" | head -10
    exit 0
fi

# Initialize rbenv for Ruby environment
if command -v rbenv &> /dev/null; then
    eval "$(rbenv init -)"
    print_info "Ruby environment initialized"
else
    print_warning "rbenv not found, using system Ruby"
fi

# Get device name from argument or show interactive picker
DEVICE_NAME="$1"

if [ -z "$DEVICE_NAME" ]; then
    print_header "Select Device"

    # Get physical devices (iPhones and iPads only, exclude Macs)
    PHYSICAL_DEVICES=()
    while IFS= read -r line; do
        PHYSICAL_DEVICES+=("$line")
    done < <(xcrun xctrace list devices 2>&1 | grep -v "Simulator" | grep -v "==" | grep -iE "iphone|ipad" | grep "(")

    # Get simulators
    SIMULATORS=()
    while IFS= read -r line; do
        SIMULATORS+=("$line")
    done < <(xcrun xctrace list devices 2>&1 | grep "Simulator" | head -10)

    if [ ${#PHYSICAL_DEVICES[@]} -eq 0 ] && [ ${#SIMULATORS[@]} -eq 0 ]; then
        print_error "No devices or simulators found!"
        print_info "Please connect your iPhone via USB or ensure Xcode simulators are installed"
        exit 1
    fi

    echo -e "${MAGENTA}Physical Devices:${NC}"
    if [ ${#PHYSICAL_DEVICES[@]} -eq 0 ]; then
        echo "  (No physical devices connected)"
    else
        for i in "${!PHYSICAL_DEVICES[@]}"; do
            # Extract device name (everything before the first parenthesis)
            DEVICE_DISPLAY=$(echo "${PHYSICAL_DEVICES[$i]}" | sed -E 's/^([^(]+).*/\1/' | xargs)
            # Extract iOS version
            IOS_VERSION=$(echo "${PHYSICAL_DEVICES[$i]}" | sed -E 's/.*\(([0-9]+\.[0-9]+)\).*/\1/')
            print_option "$((i+1))" "${DEVICE_DISPLAY} (iOS ${IOS_VERSION})"
        done
    fi

    echo ""
    echo -e "${MAGENTA}Simulators:${NC}"
    if [ ${#SIMULATORS[@]} -eq 0 ]; then
        echo "  (No simulators available)"
    else
        SIMULATOR_START=$((${#PHYSICAL_DEVICES[@]} + 1))
        for i in "${!SIMULATORS[@]}"; do
            DEVICE_DISPLAY=$(echo "${SIMULATORS[$i]}" | sed -E 's/ Simulator.*//' | xargs)
            print_option "$((SIMULATOR_START + i))" "${DEVICE_DISPLAY} (Simulator)"
        done
    fi

    echo ""
    print_option "q" "Quit"
    echo ""

    # Prompt for selection
    while true; do
        read -p "$(echo -e ${CYAN}"Select device: "${NC})" SELECTION

        # Check for quit
        if [ "$SELECTION" == "q" ] || [ "$SELECTION" == "Q" ]; then
            print_info "Cancelled by user"
            exit 0
        fi

        # Validate numeric input
        if ! [[ "$SELECTION" =~ ^[0-9]+$ ]]; then
            print_error "Invalid selection. Please enter a number or 'q' to quit."
            continue
        fi

        # Check if selection is valid
        TOTAL_DEVICES=$((${#PHYSICAL_DEVICES[@]} + ${#SIMULATORS[@]}))
        if [ "$SELECTION" -lt 1 ] || [ "$SELECTION" -gt "$TOTAL_DEVICES" ]; then
            print_error "Invalid selection. Please choose a number between 1 and $TOTAL_DEVICES"
            continue
        fi

        # Get the selected device
        if [ "$SELECTION" -le "${#PHYSICAL_DEVICES[@]}" ]; then
            # Physical device selected
            DEVICE_LINE="${PHYSICAL_DEVICES[$((SELECTION-1))]}"
        else
            # Simulator selected
            SIMULATOR_INDEX=$((SELECTION - ${#PHYSICAL_DEVICES[@]} - 1))
            DEVICE_LINE="${SIMULATORS[$SIMULATOR_INDEX]}"
        fi

        # Extract device name from line
        DEVICE_NAME=$(echo "$DEVICE_LINE" | sed -E 's/^([^(]+).*/\1/' | xargs)
        print_success "Selected: $DEVICE_NAME"
        break
    done
else
    print_info "Using specified device: $DEVICE_NAME"
fi

# Verify device exists
if ! xcrun xctrace list devices 2>&1 | grep -q "$DEVICE_NAME"; then
    print_error "Device '$DEVICE_NAME' not found!"
    print_info "Run './scripts/run-on-device.sh --list' to see available devices"
    exit 1
fi

print_header "Building and Installing on Device"
print_info "Device: $DEVICE_NAME"
print_info "Platform: iOS"
print_info "Bundler: Rock + rs.pack (Rspack)"
echo ""

# Step 1: Ensure iOS dependencies are installed
print_info "Step 1/3: Checking iOS dependencies..."
if [ -f "./scripts/ensure-ios-deps.sh" ]; then
    ./scripts/ensure-ios-deps.sh
    print_success "iOS dependencies ready"
else
    print_warning "ensure-ios-deps.sh not found, skipping dependency check"
fi

# Step 2: Ensure Metro bundler is running with correct host
print_info "Step 2/3: Checking Metro bundler..."

# Check if Metro is already running
if lsof -ti:8081 > /dev/null 2>&1; then
    print_success "Metro bundler is running on port 8081"
    METRO_PID=""
else
    print_error "Metro bundler is NOT running!"
    print_info ""
    print_info "For physical devices, Metro must be started with the correct host."
    print_info "Please run this in a separate terminal:"
    print_info ""
    print_info "  pnpm start"
    print_info ""
    print_info "This will start Metro with your Mac's IP address so your"
    print_info "physical device can connect to it."
    print_info ""
    print_info "After Metro starts, run this script again."
    exit 1
fi

# Note: We're not managing Metro lifecycle anymore
# User must start Metro separately with 'pnpm start'

# Step 3: Build and install app on device
print_info "Step 3/3: Building and installing app on device..."
echo ""

# Determine if this is a physical device or simulator
IS_PHYSICAL_DEVICE=false
if echo "$DEVICE_LINE" | grep -qv "Simulator"; then
    IS_PHYSICAL_DEVICE=true
fi

# For physical devices, clear caches and use --destination device
if [ "$IS_PHYSICAL_DEVICE" = true ]; then
    # Auto-detect local IP and update AppDelegate.swift so the device can reach Metro
    LOCAL_IP=$(get_local_ip)
    if [ -z "$LOCAL_IP" ]; then
        print_error "Cannot detect local IP address. Physical device needs your Mac's IP to connect to Metro."
        print_info "Make sure you're connected to a network."
        exit 1
    fi
    print_info "Detected local IP: $LOCAL_IP"
    swap_metro_host "$LOCAL_IP"
    echo ""

    print_warning "Physical device detected - clearing caches for fresh build..."

    # Clear all relevant caches to force fresh bundle with correct host
    print_info "Clearing Rock cache..."
    rm -rf .rock/cache/ios/bundle 2>/dev/null
    rm -rf .rock/cache/ios/archive 2>/dev/null

    print_info "Clearing Metro cache..."
    rm -rf node_modules/.cache 2>/dev/null
    rm -rf /tmp/metro-* 2>/dev/null
    rm -rf /tmp/haste-map-* 2>/dev/null

    echo ""
    print_info "Running: rock run:ios --device \"$DEVICE_NAME\" --destination device"
    print_warning "Note: Metro MUST be running with 'pnpm start' for this to work"
    echo ""
    ROCK_COMMAND="rock run:ios --device \"$DEVICE_NAME\" --destination device"
else
    print_info "Running: rock run:ios --device \"$DEVICE_NAME\""
    echo ""
    ROCK_COMMAND="rock run:ios --device \"$DEVICE_NAME\""
fi

# Run the Rock command
if eval $ROCK_COMMAND; then
    echo ""
    print_success "App successfully installed and launched on $DEVICE_NAME!"
    echo ""
    print_info "The app is now running on your device"
    print_info "Metro bundler is running in your other terminal for hot reload"
    print_info ""
    print_info "Make code changes and they'll hot reload automatically!"
    print_info "To stop Metro, press Ctrl+C in the terminal running 'pnpm start'"
    echo ""
else
    echo ""
    print_error "Failed to build or install app on device"
    print_info "Common issues:"
    print_info "  • Device not trusted - Check device and tap 'Trust This Computer'"
    print_info "  • Developer certificate not valid - Check Xcode signing settings"
    print_info "  • Device locked - Unlock your iPhone"
    print_info "  • Wrong bundle ID - Verify in Xcode project settings"
    exit 1
fi
