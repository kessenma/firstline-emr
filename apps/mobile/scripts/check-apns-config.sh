#!/bin/bash

# APNs Configuration Diagnostic Script
# Checks all critical settings for push notifications before building

set -e

echo "🔍 APNs Configuration Diagnostic Check"
echo "========================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0

# Change to script directory
cd "$(dirname "$0")/.."

echo "📍 Working directory: $(pwd)"
echo ""

# ============================================================================
# 1. Check Archive Exists
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Checking for Archived Build"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

ARCHIVE_PATH=".rock/cache/ios/archive/FajrEMR.xcarchive"
APP_PATH="$ARCHIVE_PATH/Products/Applications/FajrEMR.app"

if [ ! -d "$ARCHIVE_PATH" ]; then
    echo -e "${RED}❌ Archive not found at: $ARCHIVE_PATH${NC}"
    echo "   Run a build first: npm run build:ios:archive-fresh"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ Archive found${NC}"
    echo "   Location: $ARCHIVE_PATH"

    if [ ! -d "$APP_PATH" ]; then
        echo -e "${RED}❌ .app bundle not found in archive${NC}"
        ERRORS=$((ERRORS + 1))
    else
        echo -e "${GREEN}✅ .app bundle found${NC}"
    fi
fi
echo ""

# ============================================================================
# 2. Check Entitlements
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Checking Entitlements (CRITICAL)"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -d "$APP_PATH" ]; then
    ENTITLEMENTS=$(codesign -d --entitlements :- "$APP_PATH" 2>/dev/null | plutil -p - 2>/dev/null)

    echo "📋 Full Entitlements:"
    echo "$ENTITLEMENTS" | sed 's/^/   /'
    echo ""

    # Check for aps-environment
    if echo "$ENTITLEMENTS" | grep -q '"aps-environment"'; then
        APS_ENV=$(echo "$ENTITLEMENTS" | grep '"aps-environment"' | sed 's/.*=> "\(.*\)"/\1/')
        echo -e "${GREEN}✅ aps-environment present: $APS_ENV${NC}"

        if [ "$APS_ENV" != "production" ]; then
            echo -e "${YELLOW}⚠️  WARNING: aps-environment is '$APS_ENV' (expected 'production' for TestFlight)${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${RED}❌ CRITICAL: aps-environment entitlement is MISSING${NC}"
        echo "   This will prevent APNs from working!"
        echo "   Fix: In Xcode → Signing & Capabilities → Add 'Push Notifications'"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for application-identifier
    if echo "$ENTITLEMENTS" | grep -q '"application-identifier"'; then
        APP_ID=$(echo "$ENTITLEMENTS" | grep '"application-identifier"' | sed 's/.*=> "\(.*\)"/\1/')
        echo -e "${GREEN}✅ application-identifier: $APP_ID${NC}"
    else
        echo -e "${RED}❌ application-identifier missing${NC}"
        ERRORS=$((ERRORS + 1))
    fi

    # Check for team-identifier (may be under com.apple.developer.team-identifier)
    if echo "$ENTITLEMENTS" | grep -q '"com.apple.developer.team-identifier"'; then
        TEAM_ID=$(echo "$ENTITLEMENTS" | grep '"com.apple.developer.team-identifier"' | sed 's/.*=> "\(.*\)"/\1/')
        echo -e "${GREEN}✅ team-identifier: $TEAM_ID${NC}"
    elif echo "$ENTITLEMENTS" | grep -q '"team-identifier"'; then
        TEAM_ID=$(echo "$ENTITLEMENTS" | grep '"team-identifier"' | sed 's/.*=> "\(.*\)"/\1/')
        echo -e "${GREEN}✅ team-identifier: $TEAM_ID${NC}"
    else
        echo -e "${YELLOW}⚠️  team-identifier not found (may be okay)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Skipping (no archive found)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ============================================================================
# 3. Check Info.plist for Background Modes
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Checking Info.plist Background Modes"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

INFO_PLIST="ios/FajrEMR/Info.plist"
if [ -f "$INFO_PLIST" ]; then
    if /usr/libexec/PlistBuddy -c "Print :UIBackgroundModes" "$INFO_PLIST" 2>/dev/null | grep -q "remote-notification"; then
        echo -e "${GREEN}✅ UIBackgroundModes contains 'remote-notification'${NC}"
    else
        echo -e "${RED}❌ UIBackgroundModes missing 'remote-notification'${NC}"
        echo "   Add in Xcode: Target → Signing & Capabilities → Background Modes → Remote notifications"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}❌ Info.plist not found at: $INFO_PLIST${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================================
# 4. Check AppDelegate.swift
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Checking AppDelegate.swift"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

APPDELEGATE="ios/FajrEMR/AppDelegate.swift"
if [ -f "$APPDELEGATE" ]; then
    # Check for required method implementations
    if grep -q "didRegisterForRemoteNotificationsWithDeviceToken" "$APPDELEGATE"; then
        echo -e "${GREEN}✅ didRegisterForRemoteNotificationsWithDeviceToken implemented${NC}"
    else
        echo -e "${RED}❌ didRegisterForRemoteNotificationsWithDeviceToken NOT implemented${NC}"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "didFailToRegisterForRemoteNotificationsWithError" "$APPDELEGATE"; then
        echo -e "${GREEN}✅ didFailToRegisterForRemoteNotificationsWithError implemented${NC}"
    else
        echo -e "${YELLOW}⚠️  didFailToRegisterForRemoteNotificationsWithError NOT implemented${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi

    if grep -q "RCTPushNotificationManager" "$APPDELEGATE"; then
        echo -e "${GREEN}✅ RCTPushNotificationManager forwarding present${NC}"
    else
        echo -e "${RED}❌ RCTPushNotificationManager forwarding NOT found${NC}"
        echo "   Tokens won't reach React Native!"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "registerForRemoteNotifications" "$APPDELEGATE"; then
        echo -e "${GREEN}✅ registerForRemoteNotifications() called${NC}"
    else
        echo -e "${YELLOW}⚠️  registerForRemoteNotifications() not explicitly called in AppDelegate${NC}"
        echo "   (May be called from React Native code)"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ AppDelegate.swift not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================================
# 5. Check Bridging Header
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Checking Bridging Header"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

BRIDGING_HEADER="ios/FajrEMR/FajrEMR-Bridging-Header.h"
if [ -f "$BRIDGING_HEADER" ]; then
    echo -e "${GREEN}✅ Bridging header exists${NC}"

    if grep -q "RCTPushNotificationManager" "$BRIDGING_HEADER"; then
        echo -e "${GREEN}✅ RCTPushNotificationManager imported in bridging header${NC}"
    else
        echo -e "${RED}❌ RCTPushNotificationManager NOT imported in bridging header${NC}"
        echo "   Add: #import <RNCPushNotificationIOS/RCTPushNotificationManager.h>"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Bridging header not found (may not be needed)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ============================================================================
# 6. Check PushNotificationService.ts
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Checking PushNotificationService.ts"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

PUSH_SERVICE="src/services/PushNotificationService.ts"
if [ -f "$PUSH_SERVICE" ]; then
    if grep -q "registerForRemoteNotifications()" "$PUSH_SERVICE"; then
        echo -e "${GREEN}✅ registerForRemoteNotifications() called in service${NC}"
    else
        echo -e "${RED}❌ registerForRemoteNotifications() NOT called in service${NC}"
        echo "   CRITICAL: This is required to trigger APNs token registration!"
        echo "   Add: PushNotificationIOS.registerForRemoteNotifications()"
        ERRORS=$((ERRORS + 1))
    fi

    if grep -q "addEventListener" "$PUSH_SERVICE" && grep -q "register" "$PUSH_SERVICE"; then
        echo -e "${GREEN}✅ Token registration event listener found${NC}"
    else
        echo -e "${YELLOW}⚠️  Token registration event listener not found${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "${RED}❌ PushNotificationService.ts not found${NC}"
    ERRORS=$((ERRORS + 1))
fi
echo ""

# ============================================================================
# 7. Check Dependencies
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Checking Dependencies"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if grep -q "@react-native-community/push-notification-ios" package.json; then
    echo -e "${GREEN}✅ @react-native-community/push-notification-ios in package.json${NC}"
else
    echo -e "${RED}❌ @react-native-community/push-notification-ios NOT in package.json${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ -d "ios/Pods/RNCPushNotificationIOS" ] || grep -q "RNCPushNotificationIOS" ios/Podfile.lock 2>/dev/null; then
    echo -e "${GREEN}✅ RNCPushNotificationIOS pod installed${NC}"
else
    echo -e "${YELLOW}⚠️  RNCPushNotificationIOS pod not found${NC}"
    echo "   Run: cd ios && pod install"
    WARNINGS=$((WARNINGS + 1))
fi
echo ""

# ============================================================================
# 8. Check Xcode Project Settings (if xcodebuild available)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  Checking Xcode Project Settings"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v xcodebuild &> /dev/null; then
    BUNDLE_ID=$(cd ios && xcodebuild -workspace FajrEMR.xcworkspace -scheme FajrEMR -showBuildSettings 2>/dev/null | grep "PRODUCT_BUNDLE_IDENTIFIER =" | head -1 | awk '{print $3}')
    VERSION=$(cd ios && xcodebuild -workspace FajrEMR.xcworkspace -scheme FajrEMR -showBuildSettings 2>/dev/null | grep "MARKETING_VERSION =" | head -1 | awk '{print $3}')
    BUILD=$(cd ios && xcodebuild -workspace FajrEMR.xcworkspace -scheme FajrEMR -showBuildSettings 2>/dev/null | grep "CURRENT_PROJECT_VERSION =" | head -1 | awk '{print $3}')

    if [ -n "$BUNDLE_ID" ]; then
        echo "   Bundle ID: $BUNDLE_ID"
        if [ "$BUNDLE_ID" = "com.fajr.emr" ]; then
            echo -e "${GREEN}✅ Bundle ID matches expected production bundle${NC}"
        else
            echo -e "${YELLOW}⚠️  Bundle ID is '$BUNDLE_ID' (expected 'com.fajr.emr')${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    fi

    if [ -n "$VERSION" ]; then
        echo "   Version: $VERSION"
    fi

    if [ -n "$BUILD" ]; then
        echo "   Build: $BUILD"
    fi
else
    echo -e "${YELLOW}⚠️  xcodebuild not available, skipping${NC}"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Your APNs configuration looks good. You should be able to:"
    echo "  1. Receive APNs tokens on real devices"
    echo "  2. Register devices with your backend"
    echo "  3. Receive push notifications"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  PASSED WITH $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "Configuration is mostly correct but has some warnings."
    echo "APNs should work, but review the warnings above."
    echo ""
    exit 0
else
    echo -e "${RED}❌ FAILED WITH $ERRORS ERROR(S) AND $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "CRITICAL ISSUES FOUND!"
    echo "Fix the errors above before deploying to TestFlight."
    echo ""
    echo "Common fixes:"
    echo "  • In Xcode: Target → Signing & Capabilities → Add 'Push Notifications'"
    echo "  • Ensure registerForRemoteNotifications() is called in your code"
    echo "  • Check that AppDelegate forwards tokens to RCTPushNotificationManager"
    echo ""
    exit 1
fi
