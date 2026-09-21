#!/bin/bash

echo "🔍 PowerSync Endpoint Diagnostics"
echo "=================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Find PowerSync container
echo "📦 Finding PowerSync container..."
CONTAINER=$(docker ps --filter "name=powersync" --format "{{.Names}}" | head -1)

if [ -z "$CONTAINER" ]; then
    echo -e "${RED}❌ No running PowerSync container found${NC}"
    echo ""
    echo "Checking all containers with 'powersync' in name:"
    docker ps -a | grep powersync
    exit 1
fi

echo -e "${GREEN}✅ Found container: $CONTAINER${NC}"
echo ""

# Check container status
echo "🏥 Container Health Status:"
docker ps --filter "name=powersync" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
echo ""

# Check last 50 lines of logs
echo "📋 Recent PowerSync Logs (last 50 lines):"
echo "=========================================="
docker logs --tail 50 "$CONTAINER" 2>&1
echo ""

# Check for specific log patterns
echo "🔍 Searching for endpoint registration in logs:"
echo "================================================"
docker logs "$CONTAINER" 2>&1 | grep -i "endpoint\|route\|listening\|started\|server" | tail -20
echo ""

# Check for errors in logs
echo "⚠️  Checking for errors in logs:"
echo "================================"
docker logs "$CONTAINER" 2>&1 | grep -i "error\|fail\|exception" | tail -10
echo ""

# Test internal endpoints from inside container
echo "🧪 Testing internal endpoints (from inside container):"
echo "======================================================"

echo "Test 1: Health check"
docker exec "$CONTAINER" curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:6061/probes/liveness || echo "Failed to connect"
echo ""

echo "Test 2: Root path"
docker exec "$CONTAINER" curl -s http://localhost:6061/ || echo "Failed to connect"
echo ""

echo "Test 3: /sync endpoint"
docker exec "$CONTAINER" curl -s http://localhost:6061/sync || echo "Failed to connect"
echo ""

echo "Test 4: /api/sync endpoint"
docker exec "$CONTAINER" curl -s http://localhost:6061/api/sync || echo "Failed to connect"
echo ""

# Check PowerSync configuration
echo "⚙️  PowerSync Configuration Files:"
echo "=================================="
echo "Config file:"
docker exec "$CONTAINER" cat /config/config.yaml 2>&1 | head -30
echo ""

echo "Sync rules file:"
docker exec "$CONTAINER" cat /config/sync-rules.yaml 2>&1 | head -20
echo ""

# Check what process is running
echo "🔄 Running processes in container:"
echo "=================================="
docker exec "$CONTAINER" ps aux
echo ""

# Check PowerSync mode
echo "🎯 Checking PowerSync startup command:"
echo "======================================"
docker inspect "$CONTAINER" | grep -A 5 "Cmd"
echo ""

# Network connectivity
echo "🌐 Network Information:"
echo "======================"
docker inspect "$CONTAINER" | grep -A 10 "Networks"
echo ""

echo "✅ Diagnostics complete!"
echo ""
echo "📝 Summary of tests:"
echo "  1. Container is running: ${GREEN}✓${NC}"
echo "  2. Logs collected above"
echo "  3. Internal endpoint tests completed"
echo ""
echo "🔧 Next steps based on results:"
echo "  - If no errors in logs: PowerSync may not have API mode enabled"
echo "  - If 'connection refused': Service not listening on expected port"
echo "  - If 404s from PowerSync: API endpoints not registered"
echo ""
echo "💡 Common fixes:"
echo "  1. Verify PowerSync is running in 'unified' or 'api' mode"
echo "  2. Check sync-rules.yaml is valid"
echo "  3. Verify JWT configuration is correct"
echo "  4. Try: docker restart $CONTAINER"
