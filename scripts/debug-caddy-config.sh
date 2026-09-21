#!/bin/bash
# Caddy Configuration Diagnostic Script
# Checks what Coolify's Caddy proxy is actually configured with

echo "=================================================="
echo "Caddy Configuration Diagnostic"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

DOMAIN="ws.emr.fajr.org"

echo -e "${BLUE}1. Checking Caddy container status${NC}"
if docker ps | grep -q coolify-proxy; then
    echo -e "${GREEN}✅ coolify-proxy is running${NC}"
    CONTAINER_ID=$(docker ps | grep coolify-proxy | awk '{print $1}')
    echo "   Container ID: $CONTAINER_ID"
else
    echo -e "${RED}✗ coolify-proxy is NOT running${NC}"
    exit 1
fi
echo ""

echo -e "${BLUE}2. Listing Caddy config directory${NC}"
docker exec coolify-proxy ls -lah /config/caddy/
echo ""

echo -e "${BLUE}3. Checking for our domain in autosave.json${NC}"
if docker exec coolify-proxy grep -q "$DOMAIN" /config/caddy/autosave.json 2>/dev/null; then
    echo -e "${GREEN}✅ Found $DOMAIN in Caddy config${NC}"
    echo ""
    echo "Configuration for $DOMAIN:"
    echo "---"
    docker exec coolify-proxy cat /config/caddy/autosave.json | grep -A 20 -B 5 "$DOMAIN" || echo "Could not extract config snippet"
    echo "---"
else
    echo -e "${RED}✗ $DOMAIN NOT found in Caddy config${NC}"
    echo ""
    echo "This means Coolify hasn't added your domain to Caddy yet!"
    echo ""
    echo "Fix:"
    echo "1. In Coolify, go to your PowerSync service"
    echo "2. Go to 'Domains' or 'Proxy' tab"
    echo "3. Make sure $DOMAIN is listed as a domain"
    echo "4. If not, add it manually"
fi
echo ""

echo -e "${BLUE}4. Checking if Caddyfile.autosave has our domain${NC}"
if docker exec coolify-proxy grep -q "$DOMAIN" /config/caddy/Caddyfile.autosave 2>/dev/null; then
    echo -e "${GREEN}✅ Found $DOMAIN in Caddyfile.autosave${NC}"
    echo ""
    echo "Caddyfile configuration for $DOMAIN:"
    echo "---"
    docker exec coolify-proxy cat /config/caddy/Caddyfile.autosave
    echo "---"
else
    echo -e "${RED}✗ $DOMAIN NOT found in Caddyfile.autosave${NC}"
fi
echo ""

echo -e "${BLUE}5. Checking current Caddy routes via API${NC}"
ROUTES=$(docker exec coolify-proxy curl -s http://localhost:2019/config/apps/http/servers/srv0/routes 2>/dev/null)
if echo "$ROUTES" | grep -q "$DOMAIN"; then
    echo -e "${GREEN}✅ $DOMAIN is configured in Caddy's live routes${NC}"
else
    echo -e "${RED}✗ $DOMAIN is NOT in Caddy's live routes${NC}"
    echo ""
    echo "This confirms Caddy doesn't know about your domain."
fi
echo ""

echo -e "${BLUE}6. Testing actual endpoints${NC}"
echo "Testing: https://$DOMAIN/probes/liveness"
HEALTH_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://$DOMAIN/probes/liveness" 2>/dev/null)
echo "   HTTP Status: $HEALTH_CODE"

echo "Testing: https://$DOMAIN/sync/stream (WebSocket upgrade)"
WS_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "Connection: Upgrade" \
    -H "Upgrade: websocket" \
    -H "Sec-WebSocket-Version: 13" \
    -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
    "https://$DOMAIN/sync/stream" 2>/dev/null)
echo "   HTTP Status: $WS_CODE"
echo ""

echo "=================================================="
echo "Summary & Next Steps"
echo "=================================================="
echo ""

if docker exec coolify-proxy grep -q "$DOMAIN" /config/caddy/autosave.json 2>/dev/null; then
    if [ "$WS_CODE" = "401" ] || [ "$WS_CODE" = "101" ]; then
        echo -e "${GREEN}✅ Everything is configured correctly!${NC}"
        echo "   WebSocket is working (got $WS_CODE response)"
    else
        echo -e "${YELLOW}⚠ Domain is in Caddy, but WebSocket isn't working${NC}"
        echo ""
        echo "The configuration might be incorrect. Check:"
        echo "1. PowerSync container is running and healthy"
        echo "2. PowerSync is on the 'coolify' Docker network"
        echo "3. Caddy config proxies to http://powersync:6061"
        echo "4. WebSocket upgrade headers are configured"
        echo ""
        echo "Run: docker logs coolify-proxy --tail 50"
        echo "Look for errors related to $DOMAIN"
    fi
else
    echo -e "${RED}✗ Domain is NOT configured in Caddy${NC}"
    echo ""
    echo "TO FIX THIS IN COOLIFY:"
    echo ""
    echo "1. Go to Coolify dashboard"
    echo "2. Navigate to your PowerSync service/application"
    echo "3. Click on 'Domains' section"
    echo "4. Add domain: $DOMAIN"
    echo "5. Port: 6061"
    echo "6. Enable HTTPS"
    echo "7. IMPORTANT: Look for 'Proxy Configuration' or 'Custom Nginx/Caddy Config'"
    echo "8. In the custom config area, paste this:"
    echo ""
    echo "---START CADDY CONFIG---"
    cat << 'EOF'
@websockets {
    header Connection *Upgrade*
    header Upgrade websocket
}

reverse_proxy @websockets http://powersync:6061 {
    header_up Host {host}
    header_up X-Real-IP {remote_host}
    header_up Connection {header.Connection}
    header_up Upgrade {header.Upgrade}

    transport http {
        versions 1.1
        read_timeout 0
        write_timeout 0
    }
}

reverse_proxy http://powersync:6061 {
    header_up Host {host}
    header_up X-Real-IP {remote_host}
}

header {
    Access-Control-Allow-Origin *
    Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
    Access-Control-Allow-Headers "Authorization, Content-Type"
}
EOF
    echo "---END CADDY CONFIG---"
    echo ""
    echo "9. Save and restart the proxy"
    echo "10. Wait 30 seconds and run this script again"
fi
echo ""
echo "=================================================="
