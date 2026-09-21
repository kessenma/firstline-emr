#!/bin/bash

# Configure Push Notifications for iOS
# This script updates the Xcode project to properly configure push notifications

set -e

echo "🔧 Configuring Push Notifications for iOS..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're in the right directory
if [ ! -f "Podfile" ]; then
    echo -e "${RED}Error: This script must be run from the ios directory${NC}"
    echo "Please run: cd ios && ./configure_push_notifications.sh"
    exit 1
fi

PROJECT_NAME="FajrEMR"
PROJECT_FILE="${PROJECT_NAME}.xcodeproj/project.pbxproj"

echo "📱 Project: ${PROJECT_NAME}"

# Function to add entitlements to project
add_entitlements_to_project() {
    echo "📝 Adding entitlements files to Xcode project..."

    # Check if project file exists
    if [ ! -f "$PROJECT_FILE" ]; then
        echo -e "${RED}Error: Project file not found at $PROJECT_FILE${NC}"
        exit 1
    fi

    # Backup project file
    cp "$PROJECT_FILE" "${PROJECT_FILE}.backup"
    echo "✅ Created backup: ${PROJECT_FILE}.backup"

    # Check if entitlements are already configured
    if grep -q "CODE_SIGN_ENTITLEMENTS" "$PROJECT_FILE"; then
        echo -e "${YELLOW}⚠️  Entitlements already configured in project${NC}"
    else
        echo "Adding entitlements configuration..."

        # This is a simplified approach - in production, use a tool like PlistBuddy or xcodeproj gem
        echo -e "${YELLOW}⚠️  Manual configuration required:${NC}"
        echo ""
        echo "Please open Xcode and:"
        echo "1. Select your project in the navigator"
        echo "2. Select your target (${PROJECT_NAME})"
        echo "3. Go to 'Signing & Capabilities' tab"
        echo "4. Click '+ Capability'"
        echo "5. Add 'Push Notifications'"
        echo "6. In 'Build Settings' tab, search for 'Code Signing Entitlements'"
        echo "7. Set Debug to: ${PROJECT_NAME}/${PROJECT_NAME}.entitlements"
        echo "8. Set Release to: ${PROJECT_NAME}/${PROJECT_NAME}.Release.entitlements"
    fi
}

# Function to verify push notification setup
verify_setup() {
    echo ""
    echo "🔍 Verifying push notification setup..."

    # Check Info.plist
    if grep -q "remote-notification" "${PROJECT_NAME}/Info.plist"; then
        echo -e "${GREEN}✅ Info.plist: UIBackgroundModes contains remote-notification${NC}"
    else
        echo -e "${RED}❌ Info.plist: Missing remote-notification in UIBackgroundModes${NC}"
    fi

    # Check entitlements files
    if [ -f "${PROJECT_NAME}/${PROJECT_NAME}.entitlements" ]; then
        if grep -q "aps-environment" "${PROJECT_NAME}/${PROJECT_NAME}.entitlements"; then
            echo -e "${GREEN}✅ Debug entitlements: aps-environment configured${NC}"
        else
            echo -e "${RED}❌ Debug entitlements: Missing aps-environment${NC}"
        fi
    else
        echo -e "${RED}❌ Debug entitlements file not found${NC}"
    fi

    if [ -f "${PROJECT_NAME}/${PROJECT_NAME}.Release.entitlements" ]; then
        if grep -q "production" "${PROJECT_NAME}/${PROJECT_NAME}.Release.entitlements"; then
            echo -e "${GREEN}✅ Release entitlements: aps-environment set to production${NC}"
        else
            echo -e "${RED}❌ Release entitlements: aps-environment not set to production${NC}"
        fi
    else
        echo -e "${RED}❌ Release entitlements file not found${NC}"
    fi

    # Check AppDelegate
    if grep -q "didRegisterForRemoteNotificationsWithDeviceToken" "${PROJECT_NAME}/AppDelegate.swift"; then
        echo -e "${GREEN}✅ AppDelegate: Push notification delegates implemented${NC}"
    else
        echo -e "${RED}❌ AppDelegate: Missing push notification delegate methods${NC}"
    fi
}

# Function to install pods
install_pods() {
    echo ""
    echo "📦 Installing/updating CocoaPods..."

    if command -v pod &> /dev/null; then
        pod install
        echo -e "${GREEN}✅ Pod installation complete${NC}"
    else
        echo -e "${YELLOW}⚠️  CocoaPods not installed. Run: sudo gem install cocoapods${NC}"
    fi
}

# Function to clean build
clean_build() {
    echo ""
    echo "🧹 Cleaning build artifacts..."

    # Clean DerivedData
    if [ -d ~/Library/Developer/Xcode/DerivedData ]; then
        echo "Cleaning DerivedData..."
        rm -rf ~/Library/Developer/Xcode/DerivedData/${PROJECT_NAME}-*
        echo -e "${GREEN}✅ DerivedData cleaned${NC}"
    fi

    # Clean build folder
    if [ -d "build" ]; then
        echo "Cleaning build folder..."
        rm -rf build
        echo -e "${GREEN}✅ Build folder cleaned${NC}"
    fi
}

# Main execution
echo ""
echo "Starting configuration..."
echo "========================"

add_entitlements_to_project
verify_setup
install_pods
clean_build

echo ""
echo "========================"
echo -e "${GREEN}✅ Configuration complete!${NC}"
echo ""
echo "Next steps:"
echo "-----------"
echo "1. Open Xcode and verify the Push Notifications capability is enabled"
echo "2. Ensure you have valid APNs certificates in Apple Developer Console"
echo "3. Configure your provisioning profiles to include push notifications"
echo "4. For TestFlight: Use Ad Hoc or App Store distribution profile"
echo "5. Clean build folder in Xcode (Shift+Cmd+K)"
echo "6. Build and test on a real device"
echo ""
echo "Testing push notifications:"
echo "---------------------------"
echo "1. Run the app on a real device (not simulator)"
echo "2. Grant notification permissions when prompted"
echo "3. Use the Device Registration debug tool in Settings"
echo "4. Check that you receive a valid 64-character APNs token"
echo ""
echo "If you still have issues, check:"
echo "- Network connectivity (no VPN/firewall blocking APNs)"
echo "- Device date/time is correct"
echo "- iOS notification permissions in Settings"
echo "- Apple Developer Console for certificate status"
echo ""
echo "For more help, see: docs/iOS_PUSH_TOKEN_REGISTRATION_TROUBLESHOOTING.md"
