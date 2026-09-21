#!/bin/bash

# IPA Validation and Processing Delay Diagnostic Script
# Checks for common issues that cause App Store Connect processing delays

set -e

echo "🔍 IPA Validation & Processing Delay Diagnostic"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

ERRORS=0
WARNINGS=0
INFO=0

# Change to script directory
cd "$(dirname "$0")/.."

echo "📍 Working directory: $(pwd)"
echo ""

# ============================================================================
# 1. Check IPA Exists
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Checking IPA File"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

IPA_PATH=".rock/cache/ios/export/FajrEMR.ipa"

if [ ! -f "$IPA_PATH" ]; then
    echo -e "${RED}❌ IPA not found at: $IPA_PATH${NC}"
    echo "   Run: npm run deploy:ios:rock-beta"
    exit 1
fi

echo -e "${GREEN}✅ IPA found${NC}"
IPA_SIZE=$(ls -lh "$IPA_PATH" | awk '{print $5}')
echo "   Size: $IPA_SIZE"

if [ -f "$IPA_PATH" ]; then
    # Check if IPA is suspiciously small (< 5MB might indicate incomplete build)
    SIZE_BYTES=$(stat -f%z "$IPA_PATH" 2>/dev/null || stat -c%s "$IPA_PATH" 2>/dev/null)
    if [ "$SIZE_BYTES" -lt 5242880 ]; then
        echo -e "${YELLOW}⚠️  IPA seems small (< 5MB) - might be incomplete${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}✅ IPA size looks reasonable${NC}"
    fi
fi
echo ""

# ============================================================================
# 2. Extract and Validate IPA Contents
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Extracting IPA Contents for Validation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

EXTRACT_DIR=$(mktemp -d)
echo "   Temp directory: $EXTRACT_DIR"

unzip -q "$IPA_PATH" -d "$EXTRACT_DIR" 2>/dev/null || {
    echo -e "${RED}❌ Failed to extract IPA${NC}"
    ERRORS=$((ERRORS + 1))
}

APP_PATH=$(find "$EXTRACT_DIR" -name "*.app" -type d | head -1)

if [ -z "$APP_PATH" ]; then
    echo -e "${RED}❌ No .app bundle found in IPA${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo -e "${GREEN}✅ .app bundle found${NC}"
    echo "   Path: $(basename "$APP_PATH")"
fi
echo ""

# ============================================================================
# 3. Check Info.plist
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Validating Info.plist"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$APP_PATH" ]; then
    INFO_PLIST="$APP_PATH/Info.plist"

    if [ -f "$INFO_PLIST" ]; then
        echo -e "${GREEN}✅ Info.plist found${NC}"

        # Check Bundle ID
        BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$INFO_PLIST" 2>/dev/null)
        echo "   Bundle ID: $BUNDLE_ID"

        if [ "$BUNDLE_ID" != "com.fajr.emr" ]; then
            echo -e "${YELLOW}⚠️  Bundle ID is '$BUNDLE_ID' (expected 'com.fajr.emr')${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi

        # Check Version
        VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$INFO_PLIST" 2>/dev/null)
        BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$INFO_PLIST" 2>/dev/null)
        echo "   Version: $VERSION ($BUILD)"

        # Check for required keys that cause processing delays if missing
        DISPLAY_NAME=$(/usr/libexec/PlistBuddy -c "Print :CFBundleDisplayName" "$INFO_PLIST" 2>/dev/null)
        if [ -z "$DISPLAY_NAME" ]; then
            echo -e "${YELLOW}⚠️  CFBundleDisplayName is missing${NC}"
            WARNINGS=$((WARNINGS + 1))
        else
            echo "   Display Name: $DISPLAY_NAME"
        fi

        # Check executable
        EXECUTABLE=$(/usr/libexec/PlistBuddy -c "Print :CFBundleExecutable" "$INFO_PLIST" 2>/dev/null)
        if [ -z "$EXECUTABLE" ]; then
            echo -e "${RED}❌ CFBundleExecutable is missing${NC}"
            ERRORS=$((ERRORS + 1))
        else
            echo "   Executable: $EXECUTABLE"

            # Check if executable actually exists
            if [ -f "$APP_PATH/$EXECUTABLE" ]; then
                echo -e "${GREEN}✅ Executable binary found${NC}"
            else
                echo -e "${RED}❌ Executable binary NOT found: $APP_PATH/$EXECUTABLE${NC}"
                ERRORS=$((ERRORS + 1))
            fi
        fi

    else
        echo -e "${RED}❌ Info.plist not found${NC}"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${YELLOW}⚠️  Skipping (no .app bundle)${NC}"
fi
echo ""

# ============================================================================
# 4. Check Code Signing
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Validating Code Signature"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$APP_PATH" ]; then
    # Verify code signature
    CODESIGN_OUTPUT=$(codesign -vvv --deep --strict "$APP_PATH" 2>&1)
    CODESIGN_STATUS=$?

    if [ $CODESIGN_STATUS -eq 0 ]; then
        echo -e "${GREEN}✅ Code signature is valid${NC}"
    else
        echo -e "${RED}❌ Code signature verification failed${NC}"
        echo "$CODESIGN_OUTPUT" | grep -i "error" | sed 's/^/   /'
        ERRORS=$((ERRORS + 1))
    fi

    # Get signing identity
    SIGNING_IDENTITY=$(codesign -dvv "$APP_PATH" 2>&1 | grep "Authority=" | head -1 | sed 's/Authority=//')
    echo "   Signing Identity: $SIGNING_IDENTITY"

    # Check if it's a distribution certificate
    if echo "$SIGNING_IDENTITY" | grep -q "Apple Distribution"; then
        echo -e "${GREEN}✅ Using Apple Distribution certificate (correct for App Store/TestFlight)${NC}"
    elif echo "$SIGNING_IDENTITY" | grep -q "iPhone Distribution"; then
        echo -e "${GREEN}✅ Using iPhone Distribution certificate (correct for App Store/TestFlight)${NC}"
    else
        echo -e "${YELLOW}⚠️  Not using standard distribution certificate${NC}"
        echo "   This might cause processing delays"
        WARNINGS=$((WARNINGS + 1))
    fi

    # Check team ID
    TEAM_ID=$(codesign -dvv "$APP_PATH" 2>&1 | grep "TeamIdentifier=" | sed 's/TeamIdentifier=//')
    echo "   Team ID: $TEAM_ID"
fi
echo ""

# ============================================================================
# 5. Check Entitlements
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Validating Entitlements"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$APP_PATH" ]; then
    ENTITLEMENTS=$(codesign -d --entitlements :- "$APP_PATH" 2>/dev/null | plutil -p - 2>/dev/null)

    if [ -n "$ENTITLEMENTS" ]; then
        echo -e "${GREEN}✅ Entitlements found${NC}"

        # Check for aps-environment
        if echo "$ENTITLEMENTS" | grep -q '"aps-environment"'; then
            APS_ENV=$(echo "$ENTITLEMENTS" | grep '"aps-environment"' | sed 's/.*=> "\(.*\)"/\1/')
            echo "   aps-environment: $APS_ENV"

            if [ "$APS_ENV" != "production" ]; then
                echo -e "${YELLOW}⚠️  Using $APS_ENV environment (expected 'production' for TestFlight)${NC}"
                WARNINGS=$((WARNINGS + 1))
            fi
        else
            echo -e "${BLUE}ℹ️  No aps-environment entitlement (push notifications disabled)${NC}"
            INFO=$((INFO + 1))
        fi

        # Check for application-identifier
        if echo "$ENTITLEMENTS" | grep -q '"application-identifier"'; then
            APP_ID=$(echo "$ENTITLEMENTS" | grep '"application-identifier"' | sed 's/.*=> "\(.*\)"/\1/')
            echo "   application-identifier: $APP_ID"
        fi

        # Check for get-task-allow (MUST be false for App Store/TestFlight)
        if echo "$ENTITLEMENTS" | grep -q '"get-task-allow"'; then
            GET_TASK_ALLOW=$(echo "$ENTITLEMENTS" | grep '"get-task-allow"' | sed 's/.*=> \(.*\)/\1/')
            if [ "$GET_TASK_ALLOW" = "true" ]; then
                echo -e "${RED}❌ CRITICAL: get-task-allow is TRUE${NC}"
                echo "   This will cause App Store rejection!"
                echo "   You must use a Release/Distribution build, not Debug"
                ERRORS=$((ERRORS + 1))
            else
                echo -e "${GREEN}✅ get-task-allow is false (correct)${NC}"
            fi
        fi
    else
        echo -e "${YELLOW}⚠️  Could not read entitlements${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
fi
echo ""

# ============================================================================
# 6. Check for Bitcode (causes processing delays if present)
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  Checking for Bitcode"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$APP_PATH" ] && [ -n "$EXECUTABLE" ]; then
    if otool -l "$APP_PATH/$EXECUTABLE" 2>/dev/null | grep -q "__LLVM"; then
        echo -e "${YELLOW}⚠️  Bitcode detected in executable${NC}"
        echo "   Note: Bitcode is no longer required by Apple (as of Xcode 14)"
        echo "   It can cause longer processing times"
        INFO=$((INFO + 1))
    else
        echo -e "${GREEN}✅ No bitcode detected (good)${NC}"
    fi
fi
echo ""

# ============================================================================
# 7. Check Frameworks
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  Checking Embedded Frameworks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ -n "$APP_PATH" ]; then
    FRAMEWORKS_DIR="$APP_PATH/Frameworks"

    if [ -d "$FRAMEWORKS_DIR" ]; then
        FRAMEWORK_COUNT=$(find "$FRAMEWORKS_DIR" -name "*.framework" -o -name "*.dylib" | wc -l | tr -d ' ')
        echo "   Found $FRAMEWORK_COUNT frameworks/libraries"

        # Check each framework is signed
        UNSIGNED_COUNT=0
        while IFS= read -r framework; do
            if ! codesign -vv "$framework" >/dev/null 2>&1; then
                echo -e "${RED}❌ Unsigned framework: $(basename "$framework")${NC}"
                UNSIGNED_COUNT=$((UNSIGNED_COUNT + 1))
                ERRORS=$((ERRORS + 1))
            fi
        done < <(find "$FRAMEWORKS_DIR" -name "*.framework" -o -name "*.dylib")

        if [ $UNSIGNED_COUNT -eq 0 ]; then
            echo -e "${GREEN}✅ All frameworks are signed${NC}"
        fi
    else
        echo -e "${BLUE}ℹ️  No Frameworks directory (static linking)${NC}"
    fi
fi
echo ""

# ============================================================================
# 8. Check for Swift Support Files
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "8️⃣  Checking Swift Support"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

SWIFT_SUPPORT_DIR="$EXTRACT_DIR/SwiftSupport"
if [ -d "$SWIFT_SUPPORT_DIR" ]; then
    SWIFT_LIB_COUNT=$(find "$SWIFT_SUPPORT_DIR" -name "*.dylib" | wc -l | tr -d ' ')
    echo "   Found $SWIFT_LIB_COUNT Swift support libraries"
    echo -e "${GREEN}✅ Swift support included${NC}"
else
    echo -e "${BLUE}ℹ️  No Swift support directory${NC}"
    echo "   This is normal if your app doesn't use Swift"
fi
echo ""

# ============================================================================
# 9. Common Processing Delay Issues
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "9️⃣  Known Processing Delay Issues"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo "Checking for common issues that cause Apple processing delays..."
echo ""

# Check 1: Large IPA size
if [ "$SIZE_BYTES" -gt 104857600 ]; then  # > 100MB
    echo -e "${YELLOW}⚠️  Large IPA size (> 100MB)${NC}"
    echo "   Can cause longer processing times"
    INFO=$((INFO + 1))
fi

# Check 2: Architecture
if [ -n "$APP_PATH" ] && [ -n "$EXECUTABLE" ]; then
    ARCHS=$(lipo -info "$APP_PATH/$EXECUTABLE" 2>/dev/null | sed 's/.*: //')
    echo "   Architectures: $ARCHS"

    if echo "$ARCHS" | grep -q "arm64"; then
        echo -e "${GREEN}✅ arm64 architecture present${NC}"
    else
        echo -e "${RED}❌ Missing arm64 architecture${NC}"
        ERRORS=$((ERRORS + 1))
    fi

    if echo "$ARCHS" | grep -q "x86_64"; then
        echo -e "${YELLOW}⚠️  x86_64 (simulator) architecture included${NC}"
        echo "   Should not be in App Store/TestFlight builds"
        WARNINGS=$((WARNINGS + 1))
    fi
fi

echo ""

# ============================================================================
# 10. Cleanup and Summary
# ============================================================================
rm -rf "$EXTRACT_DIR"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 IPA VALIDATION PASSED!${NC}"
    echo ""
    echo "Your IPA appears to be valid. If it's still stuck processing:"
    echo ""
    echo "1. Wait up to 48 hours (Apple processing can be slow)"
    echo "2. Check Apple System Status: https://www.apple.com/support/systemstatus/"
    echo "3. Check spam folder for emails from Apple"
    echo "4. Contact Apple Developer Support if stuck > 48 hours"
    echo "   https://developer.apple.com/contact/topic/select"
    echo ""
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  IPA VALIDATION PASSED WITH $WARNINGS WARNING(S) AND $INFO INFO(S)${NC}"
    echo ""
    echo "The IPA is technically valid but has some warnings."
    echo "These are unlikely to cause processing delays but worth reviewing."
    echo ""
    exit 0
else
    echo -e "${RED}❌ IPA VALIDATION FAILED WITH $ERRORS ERROR(S) AND $WARNINGS WARNING(S)${NC}"
    echo ""
    echo "CRITICAL ISSUES FOUND!"
    echo "These errors could cause processing delays or rejection."
    echo ""
    echo "Recommended actions:"
    echo "  1. Fix the errors listed above"
    echo "  2. Clean build: npm run deploy:ios:clean"
    echo "  3. Rebuild: npm run deploy:ios:rock-beta"
    echo ""
    exit 1
fi
