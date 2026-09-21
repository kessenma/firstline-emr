#!/bin/bash

# Rock Bundler Status Checker
# Helps diagnose issues with Rock/Rspack dev server

set -e

echo "🔍 Rock Bundler Diagnostic"
echo "=========================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Change to mobile directory
cd "$(dirname "$0")/.."

echo "📍 Working directory: $(pwd)"
echo ""

# ============================================================================
# 1. Check if Rock is installed
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Checking Rock Installation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if command -v rock &> /dev/null; then
    ROCK_VERSION=$(rock --version 2>/dev/null || echo "unknown")
    echo -e "${GREEN}✅ Rock CLI installed${NC}"
    echo "   Version: $ROCK_VERSION"
else
    echo -e "${RED}❌ Rock CLI not found${NC}"
    echo "   Install with: pnpm install -g rock"
    exit 1
fi
echo ""

# ============================================================================
# 2. Check if bundler process is running
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Checking Bundler Process"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check for node processes on port 8081
BUNDLER_PID=$(lsof -ti :8081 2>/dev/null || echo "")

if [ -n "$BUNDLER_PID" ]; then
    echo -e "${GREEN}✅ Bundler process running${NC}"
    echo "   PID: $BUNDLER_PID"

    # Get process command
    PROCESS_CMD=$(ps -p "$BUNDLER_PID" -o command= 2>/dev/null || echo "unknown")
    echo "   Command: $PROCESS_CMD"
else
    echo -e "${RED}❌ No process found on port 8081${NC}"
    echo "   Start Rock with: pnpm start"
    echo ""
    echo "💡 Quick fix:"
    echo "   Terminal 1: pnpm start"
    echo "   Terminal 2: (rebuild from Xcode)"
    exit 1
fi
echo ""

# ============================================================================
# 3. Check if port 8081 is accessible
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Testing Port 8081 Accessibility"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if nc -z localhost 8081 2>/dev/null; then
    echo -e "${GREEN}✅ Port 8081 is accessible${NC}"
else
    echo -e "${RED}❌ Cannot connect to port 8081${NC}"
    echo "   Check if firewall is blocking the connection"
fi
echo ""

# ============================================================================
# 4. Check Rock/Rspack configuration
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Checking Configuration Files"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check rock.config.mjs
if [ -f "rock.config.mjs" ]; then
    echo -e "${GREEN}✅ rock.config.mjs found${NC}"
else
    echo -e "${RED}❌ rock.config.mjs missing${NC}"
fi

# Check rspack.config.mjs
if [ -f "rspack.config.mjs" ]; then
    echo -e "${GREEN}✅ rspack.config.mjs found${NC}"
else
    echo -e "${YELLOW}⚠️  rspack.config.mjs missing (may use defaults)${NC}"
fi

# Check index.js entry point
if [ -f "index.js" ]; then
    echo -e "${GREEN}✅ index.js entry point found${NC}"
else
    echo -e "${RED}❌ index.js missing${NC}"
fi
echo ""

# ============================================================================
# 5. Test bundle endpoints
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "5️⃣  Testing Bundle Endpoints"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Test Rock dev server status endpoint
echo "Testing status endpoint..."
STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/status 2>/dev/null || echo "000")
if [ "$STATUS_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Status endpoint responding (200)${NC}"
elif [ "$STATUS_CODE" != "000" ]; then
    echo -e "${YELLOW}⚠️  Status endpoint returned: $STATUS_CODE${NC}"
else
    echo -e "${RED}❌ Cannot reach status endpoint${NC}"
fi

# Test bundle endpoint
echo "Testing bundle endpoint..."
BUNDLE_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "http://localhost:8081/index.bundle?platform=ios&dev=true" 2>/dev/null || echo "000")
if [ "$BUNDLE_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Bundle endpoint responding (200)${NC}"
    BUNDLE_SIZE=$(curl -s --max-time 5 "http://localhost:8081/index.bundle?platform=ios&dev=true" 2>/dev/null | wc -c)
    echo "   Bundle size: $BUNDLE_SIZE bytes"

    if [ "$BUNDLE_SIZE" -lt 100 ]; then
        echo -e "${RED}❌ Bundle size too small - may be an error page${NC}"
    fi
elif [ "$BUNDLE_CODE" = "404" ]; then
    echo -e "${RED}❌ Bundle not found (404)${NC}"
    echo "   The bundle URL might be incorrect"
    echo "   Try: http://localhost:8081/index.bundle?platform=ios"
elif [ "$BUNDLE_CODE" = "000" ]; then
    echo -e "${RED}❌ Cannot reach bundle endpoint${NC}"
    echo "   Server may not be responding or timed out"
else
    echo -e "${YELLOW}⚠️  Bundle endpoint returned: $BUNDLE_CODE${NC}"
fi

# Try alternative bundle paths
echo ""
echo "Trying alternative bundle paths..."
for path in "/index.ios.bundle" "/.expo/.virtual-metro-entry.bundle?platform=ios" "/main.jsbundle"; do
    ALT_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 2 "http://localhost:8081${path}" 2>/dev/null || echo "000")
    if [ "$ALT_CODE" = "200" ]; then
        echo -e "${GREEN}✅ Found at: $path${NC}"
    fi
done
echo ""

# ============================================================================
# 6. Check iOS simulator/device connectivity
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "6️⃣  iOS Device Connectivity"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "unknown")
echo "   Local IP: $LOCAL_IP"
echo "   Localhost: 127.0.0.1"
echo ""
echo "   Simulator should use: http://localhost:8081"
echo "   Physical device should use: http://$LOCAL_IP:8081"
echo ""

# ============================================================================
# 7. Check React Native CLI
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "7️⃣  React Native Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check Node version
NODE_VERSION=$(node --version 2>/dev/null || echo "not found")
echo "   Node version: $NODE_VERSION"

# Check npm/pnpm
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version 2>/dev/null || echo "unknown")
    echo "   pnpm version: $PNPM_VERSION"
fi

# Check React Native version
if [ -f "package.json" ]; then
    RN_VERSION=$(grep '"react-native"' package.json | sed 's/.*: "\(.*\)".*/\1/' || echo "unknown")
    echo "   React Native: $RN_VERSION"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 SUMMARY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ -n "$BUNDLER_PID" ] && [ "$BUNDLE_CODE" = "200" ]; then
    echo -e "${GREEN}🎉 Rock bundler is running correctly!${NC}"
    echo ""
    echo "✅ Bundler process: Running (PID $BUNDLER_PID)"
    echo "✅ Bundle endpoint: Responding (HTTP 200)"
    echo "✅ Configuration: Files present"
    echo ""
    echo "If your app still shows 'No script URL' error:"
    echo ""
    echo "1. Clean Xcode build:"
    echo "   - Xcode → Product → Clean Build Folder (Cmd+Shift+K)"
    echo "   - Delete DerivedData: rm -rf ~/Library/Developer/Xcode/DerivedData/FajrEMR-*"
    echo ""
    echo "2. Verify AppDelegate.swift bundleURL() method returns:"
    echo "   http://localhost:8081/index.bundle?platform=ios&dev=true"
    echo ""
    echo "3. Check Xcode scheme:"
    echo "   - Edit Scheme → Run → Build Configuration = Debug"
    echo ""
    echo "4. Restart Rock:"
    echo "   - Kill process: kill $BUNDLER_PID"
    echo "   - Restart: pnpm start"
    echo ""
elif [ -z "$BUNDLER_PID" ]; then
    echo -e "${RED}❌ Rock bundler is NOT running${NC}"
    echo ""
    echo "Start Rock bundler:"
    echo "   cd $(pwd)"
    echo "   pnpm start"
    echo ""
    echo "Or use npm:"
    echo "   npm start"
    echo ""
elif [ "$BUNDLE_CODE" != "200" ]; then
    echo -e "${YELLOW}⚠️  Rock is running but bundle endpoint not responding correctly${NC}"
    echo ""
    echo "Try these steps:"
    echo ""
    echo "1. Restart Rock with cache reset:"
    echo "   pkill -f 'rock start'"
    echo "   pnpm start -- --reset-cache"
    echo ""
    echo "2. Check for errors in Rock terminal output"
    echo ""
    echo "3. Verify rspack.config.mjs has correct entry point:"
    echo "   entry: './index.js'"
    echo ""
else
    echo -e "${YELLOW}⚠️  Some issues detected${NC}"
    echo ""
    echo "Review the diagnostic output above for details."
fi
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
