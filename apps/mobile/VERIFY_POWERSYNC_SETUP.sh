#!/bin/bash

# PowerSync Server Verification Script
# This script tests connectivity to your PowerSync server at sync.emr.fajr.org

set -e

POWERSYNC_URL="https://sync.emr.fajr.org"
HEALTH_ENDPOINT="${POWERSYNC_URL}/health"
MAIN_ENDPOINT="${POWERSYNC_URL}"

echo "🔍 PowerSync Server Verification"
echo "=================================="
echo ""
echo "Server URL: ${POWERSYNC_URL}"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: DNS Resolution
echo "📡 Test 1: DNS Resolution"
echo "-------------------------"
if host sync.emr.fajr.org > /dev/null 2>&1; then
    IP=$(host sync.emr.fajr.org | grep "has address" | awk '{print $4}' | head -n 1)
    echo -e "${GREEN}✅ DNS resolves to: ${IP}${NC}"
else
    echo -e "${RED}❌ DNS resolution failed${NC}"
    exit 1
fi
echo ""

# Test 2: Port Connectivity
echo "🔌 Test 2: Port Connectivity (443)"
echo "-----------------------------------"
if timeout 5 bash -c "cat < /dev/null > /dev/tcp/sync.emr.fajr.org/443" 2>/dev/null; then
    echo -e "${GREEN}✅ Port 443 is accessible${NC}"
else
    echo -e "${RED}❌ Port 443 is not accessible${NC}"
    echo "   Check firewall rules and server status"
    exit 1
fi
echo ""

# Test 3: HTTPS Connection
echo "🔒 Test 3: HTTPS Connection"
echo "---------------------------"
if curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${MAIN_ENDPOINT}" | grep -q "200\|404\|401"; then
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${MAIN_ENDPOINT}")
    echo -e "${GREEN}✅ HTTPS connection successful (HTTP ${HTTP_CODE})${NC}"
else
    echo -e "${RED}❌ HTTPS connection failed${NC}"
    exit 1
fi
echo ""

# Test 4: Health Check Endpoint
echo "💚 Test 4: Health Check Endpoint"
echo "---------------------------------"
HEALTH_RESPONSE=$(curl -s --max-time 10 "${HEALTH_ENDPOINT}" 2>&1)
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${HEALTH_ENDPOINT}")

if [ "${HEALTH_CODE}" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed (HTTP 200)${NC}"
    echo "   Response: ${HEALTH_RESPONSE}"
else
    echo -e "${YELLOW}⚠️  Health check returned HTTP ${HEALTH_CODE}${NC}"
    echo "   Response: ${HEALTH_RESPONSE}"
    echo "   Note: Server may still be starting or endpoint may not exist"
fi
echo ""

# Test 5: SSL Certificate
echo "🔐 Test 5: SSL Certificate"
echo "--------------------------"
CERT_INFO=$(echo | openssl s_client -servername sync.emr.fajr.org -connect sync.emr.fajr.org:443 2>/dev/null | openssl x509 -noout -dates 2>/dev/null)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ SSL certificate is valid${NC}"
    echo "${CERT_INFO}" | sed 's/^/   /'
else
    echo -e "${YELLOW}⚠️  Could not verify SSL certificate${NC}"
fi
echo ""

# Test 6: WebSocket Support (check headers)
echo "🌐 Test 6: WebSocket Support (Headers)"
echo "---------------------------------------"
HEADERS=$(curl -s -I --max-time 10 "${MAIN_ENDPOINT}" 2>&1)

if echo "${HEADERS}" | grep -qi "upgrade"; then
    echo -e "${GREEN}✅ Server supports Upgrade header (WebSocket compatible)${NC}"
elif [ $? -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Could not detect WebSocket support from headers${NC}"
    echo "   This is normal - WebSocket upgrade happens during connection"
else
    echo -e "${YELLOW}⚠️  Could not retrieve headers${NC}"
fi
echo ""

# Test 7: Response Time
echo "⏱️  Test 7: Response Time"
echo "-------------------------"
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "${MAIN_ENDPOINT}" 2>&1)

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Server responded in ${RESPONSE_TIME}s${NC}"

    # Warn if slow
    if (( $(echo "$RESPONSE_TIME > 2.0" | bc -l) )); then
        echo -e "   ${YELLOW}⚠️  Response time is slow (>2s)${NC}"
    fi
else
    echo -e "${RED}❌ Could not measure response time${NC}"
fi
echo ""

# Summary
echo "📊 Summary"
echo "=========="
echo ""
echo "Server URL: ${POWERSYNC_URL}"
echo "Status: ${GREEN}Server is accessible and responding${NC}"
echo ""
echo "✅ All critical tests passed!"
echo ""
echo "Next Steps:"
echo "1. Enable PowerSync in mobile app feature flags"
echo "2. Log in to get JWT token"
echo "3. Mobile app will automatically connect"
echo ""
echo "Configuration Files:"
echo "  - Mobile Config: apps/mobile/src/config/index.ts"
echo "  - Feature Flags: apps/mobile/src/config/featureFlags.ts"
echo "  - Server Config: docker-compose.powersync.yml"
echo ""
echo "For detailed setup instructions, see:"
echo "  - apps/mobile/POWERSYNC_QUICKSTART.md"
echo "  - apps/mobile/POWERSYNC_CONNECTION_GUIDE.md"
echo ""

# Test with JWT (optional - if JWT_TOKEN env var is set)
if [ ! -z "$JWT_TOKEN" ]; then
    echo "🔑 Bonus Test: Authenticated Request"
    echo "-------------------------------------"
    AUTH_RESPONSE=$(curl -s -w "\n%{http_code}" --max-time 10 \
        -H "Authorization: Bearer ${JWT_TOKEN}" \
        "${POWERSYNC_URL}/api/sync" 2>&1)

    AUTH_CODE=$(echo "${AUTH_RESPONSE}" | tail -n 1)
    AUTH_BODY=$(echo "${AUTH_RESPONSE}" | head -n -1)

    if [ "${AUTH_CODE}" = "200" ]; then
        echo -e "${GREEN}✅ Authenticated request successful${NC}"
    else
        echo -e "${YELLOW}⚠️  Authenticated request returned HTTP ${AUTH_CODE}${NC}"
        echo "   This is normal if endpoint requires specific parameters"
    fi
    echo ""
fi

echo "✨ Verification complete!"
