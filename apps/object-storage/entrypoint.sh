#!/bin/bash

# 🚀 RustFS Entrypoint Script with Bucket Auto-Creation
# This script starts RustFS and automatically creates the required bucket using S3 API

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo "========================================================================"
echo "🚀 RustFS Entrypoint - Auto-Bucket Creation"
echo "========================================================================"
echo ""

# Configuration from environment variables
BUCKET="${OBJECT_STORAGE_BUCKET:-fajr-media}"
ACCESS_KEY="${RUSTFS_ACCESS_KEY:-${OBJECT_STORAGE_KEY:-admin}}"
SECRET_KEY="${RUSTFS_SECRET_KEY:-${OBJECT_STORAGE_SECRET:-admin}}"
ADDRESS="${RUSTFS_ADDRESS:-:9100}"
PORT="${ADDRESS#:}"
REGION="${RUSTFS_GLOBAL_REGION:-${OBJECT_STORAGE_REGION:-us-east-1}}"
CONSOLE_ENABLE="${RUSTFS_CONSOLE_ENABLE:-true}"
SERVER_DOMAINS="${RUSTFS_SERVER_DOMAINS:-${OBJECT_STORAGE_ENDPOINT}}"

echo -e "${BLUE}Configuration:${NC}"
echo "  Address:       $ADDRESS"
echo "  Port:          $PORT"
echo "  Bucket:        $BUCKET"
echo "  Region:        $REGION"
echo "  Console:       $CONSOLE_ENABLE"
echo "  Domains:       $SERVER_DOMAINS"
echo "  Access Key:    ${ACCESS_KEY:0:4}***"
echo ""

# Enable verbose Rust logs for deeper diagnostics
export RUST_LOG="${RUST_LOG:-info,s3s=trace,s3s::ops=trace,rustfs=debug,rustfs_ahm=debug}"
echo -e "${BLUE}Logging:${NC}"
echo "  RUST_LOG:      $RUST_LOG"
echo ""

# Build RustFS command
RUSTFS_CMD="/usr/bin/rustfs"
RUSTFS_ARGS=(
    "--address" "$ADDRESS"
)

if [ "$CONSOLE_ENABLE" = "true" ]; then
    RUSTFS_ARGS+=("--console-enable")
fi

if [ -n "$ACCESS_KEY" ]; then
    RUSTFS_ARGS+=("--access-key" "$ACCESS_KEY")
fi

if [ -n "$SECRET_KEY" ]; then
    RUSTFS_ARGS+=("--secret-key" "$SECRET_KEY")
fi

if [ -n "$SERVER_DOMAINS" ]; then
    RUSTFS_ARGS+=("--server-domains" "$SERVER_DOMAINS")
fi

if [ -n "$REGION" ]; then
    RUSTFS_ARGS+=("--region" "$REGION")
fi

# Add data directory as last argument
RUSTFS_ARGS+=("/data")

echo "========================================================================"
echo -e "${BLUE}📦 Starting RustFS Server${NC}"
echo "========================================================================"
echo ""
echo "Command: $RUSTFS_CMD ${RUSTFS_ARGS[*]}"
echo ""

# Mirror logs to a file as well as stdout
LOG_DIR="/data/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/rustfs-$(date -u +%Y%m%dT%H%M%SZ).log"
echo "Logs will also be written to: $LOG_FILE"
echo ""

# Start RustFS in the background
"$RUSTFS_CMD" "${RUSTFS_ARGS[@]}" 2>&1 | tee -a "$LOG_FILE" &
RUSTFS_PID=$!

echo -e "${GREEN}RustFS started with PID: $RUSTFS_PID${NC}"
echo ""

# Wait for RustFS to be ready
echo -e "${YELLOW}⏳ Waiting for RustFS to be ready...${NC}"
MAX_WAIT=60
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
    if wget --spider --quiet --timeout=2 "http://localhost:$PORT/rustfs/health/live" 2>/dev/null; then
        echo -e "${GREEN}✅ RustFS is ready!${NC}"
        break
    fi

    # Check if RustFS process is still running
    if ! kill -0 $RUSTFS_PID 2>/dev/null; then
        echo -e "${RED}❌ RustFS process died during startup!${NC}"
        exit 1
    fi

    sleep 1
    WAIT_COUNT=$((WAIT_COUNT + 1))

    if [ $((WAIT_COUNT % 10)) -eq 0 ]; then
        echo "  Still waiting... ($WAIT_COUNT seconds)"
    fi
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
    echo -e "${RED}❌ RustFS failed to start within $MAX_WAIT seconds${NC}"
    kill $RUSTFS_PID 2>/dev/null || true
    exit 1
fi

echo ""
echo "========================================================================"
echo -e "${BLUE}🪣 Creating Bucket: $BUCKET${NC}"
echo "========================================================================"
echo ""

# Function to create bucket using S3 API
create_bucket_s3() {
    local bucket=$1
    local endpoint="http://localhost:$PORT"
    local date=$(date -u +"%Y%m%dT%H%M%SZ")

    echo "Checking if bucket '$bucket' exists..."

    # Try to HEAD the bucket (check if it exists)
    if curl -s -f -I --user "$ACCESS_KEY:$SECRET_KEY" "$endpoint/$bucket/" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Bucket '$bucket' already exists${NC}"
        return 0
    fi

    echo "Bucket '$bucket' does not exist. Creating it..."

    # Create bucket using S3 PUT bucket operation
    response=$(curl -s -w "\n%{http_code}" -X PUT \
        --user "$ACCESS_KEY:$SECRET_KEY" \
        "$endpoint/$bucket/" 2>&1)

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
        echo -e "${GREEN}✅ Bucket '$bucket' created successfully!${NC}"
        return 0
    elif [ "$http_code" = "409" ]; then
        echo -e "${GREEN}✅ Bucket '$bucket' already exists (409 response)${NC}"
        return 0
    else
        echo -e "${YELLOW}⚠️  Bucket creation response: HTTP $http_code${NC}"
        if [ -n "$body" ]; then
            echo "Response body: $body"
        fi
        return 1
    fi
}

# Try to create bucket
if create_bucket_s3 "$BUCKET"; then
    echo ""
    echo -e "${GREEN}Bucket '$BUCKET' is ready!${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Could not auto-create bucket via S3 API${NC}"
    echo ""
    echo "Please create the bucket manually using one of these methods:"
    echo ""
    echo -e "${CYAN}1. Using MinIO Client (mc) from host machine:${NC}"
    echo "   mc alias set rustfs http://localhost:$PORT $ACCESS_KEY [SECRET_KEY]"
    echo "   mc mb rustfs/$BUCKET"
    echo ""
    echo -e "${CYAN}2. Using RustFS Web Console:${NC}"
    echo "   http://localhost:9001/rustfs/console/index.html"
    echo "   Login with access key: $ACCESS_KEY"
    echo ""
    echo -e "${CYAN}3. Using AWS CLI:${NC}"
    echo "   aws --endpoint-url http://localhost:$PORT s3 mb s3://$BUCKET"
    echo ""
fi

# List buckets
echo ""
echo "Listing all buckets..."
bucket_list=$(curl -s --user "$ACCESS_KEY:$SECRET_KEY" "http://localhost:$PORT/" 2>&1)
if echo "$bucket_list" | grep -q "<Bucket>"; then
    echo -e "${GREEN}Found buckets:${NC}"
    echo "$bucket_list" | grep -o "<Name>[^<]*</Name>" | sed 's/<Name>//g' | sed 's/<\/Name>//g' | sed 's/^/  - /'
else
    echo -e "${YELLOW}No buckets found or unable to list${NC}"
fi

echo ""
echo "========================================================================"
echo -e "${GREEN}✅ RustFS Startup Complete${NC}"
echo "========================================================================"
echo ""
echo -e "${CYAN}API Endpoints:${NC}"
echo "  - Health: http://localhost:$PORT/rustfs/health/live"
echo "  - S3 API: http://localhost:$PORT"
echo ""
if [ "$CONSOLE_ENABLE" = "true" ]; then
    echo -e "${CYAN}Web Console:${NC}"
    echo "  - URL: http://localhost:9001/rustfs/console/index.html"
    echo "  - Username: $ACCESS_KEY"
    echo "  - Password: [REDACTED]"
    echo ""
fi
echo -e "${CYAN}Storage:${NC}"
echo "  - Bucket: $BUCKET"
echo "  - Region: $REGION"
echo ""
echo -e "${GREEN}RustFS is now running. Waiting for signals...${NC}"
echo "========================================================================"
echo ""

# Wait for RustFS process
wait $RUSTFS_PID
