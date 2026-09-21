#!/bin/bash
# PowerSync Connection Diagnostic Script
# This script helps diagnose WebSocket connection issues

echo "=================================================="
echo "PowerSync Connection Diagnostics"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if PowerSync container is running
echo "1. Checking PowerSync container status..."
if docker ps | grep -q powersync; then
    echo -e "${GREEN}✓${NC} PowerSync container is running"
    CONTAINER_ID=$(docker ps | grep powersync | awk '{print $1}')
    echo "   Container ID: $CONTAINER_ID"
else
    echo -e "${RED}✗${NC} PowerSync container is NOT running"
    echo "   Run: docker-compose up -d powersync"
    exit 1
fi
echo ""

# Check internal PowerSync health
echo "2. Testing PowerSync internal health endpoint..."
HEALTH_RESPONSE=$(docker exec $CONTAINER_ID curl -s -o /dev/null -w "%{http_code}" http://localhost:6061/probes/liveness 2>/dev/null)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} Internal health check passed (HTTP $HEALTH_RESPONSE)"
else
    echo -e "${RED}✗${NC} Internal health check failed (HTTP $HEALTH_RESPONSE)"
fi
echo ""

# Check PostgreSQL connection
echo "3. Checking PostgreSQL connectivity..."
PG_HOST=$(docker exec $CONTAINER_ID printenv POSTGRES_HOST 2>/dev/null)
PG_PORT=$(docker exec $CONTAINER_ID printenv POSTGRES_PORT 2>/dev/null)
echo "   PostgreSQL Host: $PG_HOST:$PG_PORT"
if [ -n "$PG_HOST" ]; then
    echo -e "${GREEN}✓${NC} PostgreSQL configuration found"
else
    echo -e "${YELLOW}⚠${NC} PostgreSQL configuration not found in environment"
fi
echo ""

# Check sync rules file
echo "4. Checking sync rules configuration..."
if docker exec $CONTAINER_ID test -f /config/sync-rules.yaml 2>/dev/null; then
    echo -e "${GREEN}✓${NC} Sync rules file exists at /config/sync-rules.yaml"
    # Count number of bucket definitions
    BUCKET_COUNT=$(docker exec $CONTAINER_ID grep -c "bucket_definitions:" /config/sync-rules.yaml 2>/dev/null || echo "0")
    echo "   Bucket definitions found: $BUCKET_COUNT"
else
    echo -e "${RED}✗${NC} Sync rules file not found"
fi
echo ""

# Check network connectivity
echo "5. Checking network configuration..."
NETWORK=$(docker inspect $CONTAINER_ID | grep -oP '"NetworkMode": "\K[^"]+' 2>/dev/null)
echo "   Network: $NETWORK"
if [ "$NETWORK" = "coolify" ]; then
    echo -e "${GREEN}✓${NC} Container on expected network (coolify)"
else
    echo -e "${YELLOW}⚠${NC} Container network is not 'coolify'"
fi
echo ""

# Check if ports are exposed
echo "6. Checking port configuration..."
EXPOSED_PORTS=$(docker port $CONTAINER_ID 2>/dev/null)
if [ -z "$EXPOSED_PORTS" ]; then
    echo -e "${YELLOW}⚠${NC} No ports exposed externally (internal only)"
    echo "   This is expected if using a reverse proxy"
else
    echo -e "${GREEN}✓${NC} Exposed ports:"
    echo "$EXPOSED_PORTS" | sed 's/^/   /'
fi
echo ""

# Test external HTTPS endpoint
echo "7. Testing external HTTPS endpoint..."
EXTERNAL_URL="https://ws.emr.fajr.org/probes/liveness"
echo "   Testing: $EXTERNAL_URL"
HTTPS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$EXTERNAL_URL" 2>/dev/null)
if [ "$HTTPS_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓${NC} External HTTPS endpoint accessible (HTTP $HTTPS_RESPONSE)"
else
    echo -e "${RED}✗${NC} External HTTPS endpoint failed (HTTP $HTTPS_RESPONSE)"
    echo "   This suggests reverse proxy issues"
fi
echo ""

# Test WebSocket endpoint
echo "8. Testing WebSocket endpoint..."
WS_URL="https://ws.emr.fajr.org/sync/stream"
echo "   Testing: $WS_URL"
WS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "$WS_URL" 2>/dev/null)

if [ "$WS_RESPONSE" = "101" ]; then
    echo -e "${GREEN}✓${NC} WebSocket upgrade successful (HTTP $WS_RESPONSE)"
elif [ "$WS_RESPONSE" = "401" ]; then
    echo -e "${YELLOW}⚠${NC} WebSocket requires authentication (HTTP $WS_RESPONSE)"
    echo "   This is expected - endpoint is working but needs JWT token"
elif [ "$WS_RESPONSE" = "502" ] || [ "$WS_RESPONSE" = "503" ]; then
    echo -e "${RED}✗${NC} WebSocket endpoint not accessible (HTTP $WS_RESPONSE)"
    echo "   Issue: Reverse proxy cannot reach PowerSync"
    echo "   Fix: Configure reverse proxy for WebSocket support"
elif [ "$WS_RESPONSE" = "404" ]; then
    echo -e "${RED}✗${NC} WebSocket endpoint not found (HTTP $WS_RESPONSE)"
    echo "   Issue: /sync/stream path not configured in reverse proxy"
else
    echo -e "${RED}✗${NC} Unexpected response (HTTP $WS_RESPONSE)"
fi
echo ""

# Check PowerSync logs for errors
echo "9. Checking recent PowerSync logs for errors..."
ERROR_COUNT=$(docker logs $CONTAINER_ID --tail 100 2>&1 | grep -ci "error" || echo "0")
if [ "$ERROR_COUNT" -gt "0" ]; then
    echo -e "${YELLOW}⚠${NC} Found $ERROR_COUNT error(s) in recent logs"
    echo "   Recent errors:"
    docker logs $CONTAINER_ID --tail 100 2>&1 | grep -i "error" | tail -5 | sed 's/^/   /'
else
    echo -e "${GREEN}✓${NC} No recent errors in logs"
fi
echo ""

# Summary
echo "=================================================="
echo "Diagnostic Summary"
echo "=================================================="
echo ""

ISSUES=0

if ! docker ps | grep -q powersync; then
    echo -e "${RED}✗ PowerSync not running${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ "$HEALTH_RESPONSE" != "200" ]; then
    echo -e "${RED}✗ Internal health check failing${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ "$HTTPS_RESPONSE" != "200" ]; then
    echo -e "${RED}✗ External HTTPS endpoint not accessible${NC}"
    ISSUES=$((ISSUES + 1))
fi

if [ "$WS_RESPONSE" != "101" ] && [ "$WS_RESPONSE" != "401" ]; then
    echo -e "${RED}✗ WebSocket connection failing${NC}"
    echo "   This is the main issue preventing mobile sync"
    ISSUES=$((ISSUES + 1))
fi

echo ""
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo "  PowerSync should be working correctly."
else
    echo -e "${RED}Found $ISSUES issue(s)${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Review the errors above"
    echo "2. Check docs/POWERSYNC-WEBSOCKET-FIX.md for solutions"
    echo "3. Configure reverse proxy for WebSocket support"
    echo "4. Run: docker logs powersync-server for detailed logs"
fi
echo ""
echo "For more help, see: apps/mobile/docs/POWERSYNC-WEBSOCKET-FIX.md"
echo "=================================================="
