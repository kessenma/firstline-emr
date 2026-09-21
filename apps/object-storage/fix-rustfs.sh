#!/bin/bash

# 🔧 RustFS Automated Fix Script
# This script fixes the "NoSuchBucket" error and sets up RustFS properly

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration from environment variables
ENDPOINT="${OBJECT_STORAGE_ENDPOINT:-s3.emr.fajr.org}"
ACCESS_KEY="${OBJECT_STORAGE_KEY:-admin}"
SECRET_KEY="${OBJECT_STORAGE_SECRET:-YourSecurePassword123!}"
BUCKET="${OBJECT_STORAGE_BUCKET:-fajr-media}"
REGION="${OBJECT_STORAGE_REGION:-us-east-1}"
PORT="${OBJECT_STORAGE_PORT:-9100}"

# Determine protocol (local vs production)
if [[ "$ENDPOINT" == "localhost"* ]] || [[ "$ENDPOINT" == "127.0.0.1"* ]]; then
  PROTOCOL="http"
else
  PROTOCOL="https"
fi

ENDPOINT_URL="${PROTOCOL}://${ENDPOINT}"
LOCAL_URL="http://localhost:${PORT}"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🔧 RustFS Automated Fix Script                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${BLUE}Configuration:${NC}"
echo "  Endpoint:     $ENDPOINT_URL"
echo "  Local:        $LOCAL_URL"
echo "  Bucket:       $BUCKET"
echo "  Region:       $REGION"
echo "  Access Key:   ${ACCESS_KEY:0:4}..."
echo ""

# Step 1: Stop and rebuild RustFS
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📦 Step 1: Stopping and rebuilding RustFS container${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

cd "$(dirname "$0")/../.."

echo "Stopping RustFS container..."
docker-compose -f docker-compose.object-storage.yml down 2>/dev/null || true

echo "Rebuilding RustFS container..."
docker-compose -f docker-compose.object-storage.yml build --no-cache rustfs-server

echo "Starting RustFS container..."
docker-compose -f docker-compose.object-storage.yml up -d rustfs-server

echo -e "${GREEN}✅ RustFS container restarted${NC}"
echo ""

# Step 2: Wait for RustFS to be ready
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}⏳ Step 2: Waiting for RustFS to be ready${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

MAX_WAIT=60
WAIT_COUNT=0
echo -n "Checking health endpoint"
while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  if curl -s -f "$LOCAL_URL/rustfs/health/live" > /dev/null 2>&1; then
    echo ""
    echo -e "${GREEN}✅ RustFS is ready!${NC}"
    break
  fi
  echo -n "."
  sleep 2
  WAIT_COUNT=$((WAIT_COUNT + 2))
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
  echo ""
  echo -e "${RED}❌ RustFS failed to start within ${MAX_WAIT} seconds${NC}"
  echo ""
  echo "Checking logs:"
  docker-compose -f docker-compose.object-storage.yml logs --tail=20 rustfs-server
  exit 1
fi

echo ""

# Step 3: Check if mc is installed
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔍 Step 3: Checking MinIO Client (mc)${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

if ! command -v mc &> /dev/null; then
  echo -e "${RED}❌ MinIO Client (mc) is not installed${NC}"
  echo ""
  echo "Please install it:"
  echo -e "${YELLOW}  macOS:  brew install minio/stable/mc${NC}"
  echo -e "${YELLOW}  Linux:  wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc && sudo mv mc /usr/local/bin/${NC}"
  echo ""
  echo "Then run this script again."
  exit 1
else
  echo -e "${GREEN}✅ MinIO Client (mc) is installed${NC}"
fi

echo ""

# Step 4: Configure mc alias
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔧 Step 4: Configuring mc connection${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Configuring mc alias 'rustfs-local'..."
if mc alias set rustfs-local "$LOCAL_URL" "$ACCESS_KEY" "$SECRET_KEY" --api S3v4 2>/dev/null; then
  echo -e "${GREEN}✅ mc alias configured successfully${NC}"
else
  echo -e "${RED}❌ Failed to configure mc alias${NC}"
  echo "Please check your credentials and try again"
  exit 1
fi

echo ""

# Step 5: Test connection
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🔌 Step 5: Testing connection${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Testing connection to RustFS..."
if mc admin info rustfs-local > /dev/null 2>&1; then
  echo -e "${GREEN}✅ Successfully connected to RustFS${NC}"
else
  echo -e "${YELLOW}⚠️  Could not get admin info (might not have admin permissions)${NC}"
  echo "Trying to list buckets instead..."
  if mc ls rustfs-local > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Successfully connected to RustFS${NC}"
  else
    echo -e "${RED}❌ Failed to connect to RustFS${NC}"
    exit 1
  fi
fi

echo ""

# Step 6: Create bucket
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🪣 Step 6: Creating bucket${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Checking if bucket '$BUCKET' exists..."
if mc ls rustfs-local 2>/dev/null | grep -q "$BUCKET"; then
  echo -e "${YELLOW}⚠️  Bucket '$BUCKET' already exists${NC}"
else
  echo "Creating bucket '$BUCKET'..."
  if mc mb "rustfs-local/$BUCKET" 2>/dev/null; then
    echo -e "${GREEN}✅ Bucket '$BUCKET' created successfully${NC}"
  else
    echo -e "${RED}❌ Failed to create bucket${NC}"
    mc alias remove rustfs-local 2>/dev/null
    exit 1
  fi
fi

echo ""

# Step 7: Test upload
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}🧪 Step 7: Testing upload/download${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

TEST_CONTENT="RustFS test file - $(date)"
TEST_FILE="/tmp/rustfs-test-$(date +%s).txt"

echo "$TEST_CONTENT" > "$TEST_FILE"

echo "Uploading test file..."
if echo "$TEST_CONTENT" | mc pipe "rustfs-local/$BUCKET/test-file.txt" 2>/dev/null; then
  echo -e "${GREEN}✅ Upload successful${NC}"

  echo "Downloading test file..."
  DOWNLOADED_CONTENT=$(mc cat "rustfs-local/$BUCKET/test-file.txt" 2>/dev/null)

  if [ "$DOWNLOADED_CONTENT" = "$TEST_CONTENT" ]; then
    echo -e "${GREEN}✅ Download successful (content matches)${NC}"
  else
    echo -e "${YELLOW}⚠️  Download successful but content doesn't match${NC}"
  fi

  echo "Cleaning up test file..."
  mc rm "rustfs-local/$BUCKET/test-file.txt" 2>/dev/null
  rm -f "$TEST_FILE"
  echo -e "${GREEN}✅ Test file cleaned up${NC}"
else
  echo -e "${RED}❌ Upload failed${NC}"
  rm -f "$TEST_FILE"
  mc alias remove rustfs-local 2>/dev/null
  exit 1
fi

echo ""

# Step 8: List bucket contents
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}📋 Step 8: Verifying bucket${NC}"
echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

echo "Current buckets in RustFS:"
mc ls rustfs-local

echo ""

# Cleanup mc alias
mc alias remove rustfs-local 2>/dev/null

# Success!
echo -e "${GREEN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                  ✅ Setup Complete!                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "${GREEN}Your RustFS instance is now ready!${NC}"
echo ""
echo -e "${CYAN}Next Steps:${NC}"
echo "  1. Restart your web application:"
echo "     ${YELLOW}docker-compose restart web${NC}"
echo ""
echo "  2. Test photo upload in your application"
echo ""
echo "  3. Check logs for successful uploads:"
echo "     ${YELLOW}docker-compose logs -f web${NC}"
echo ""
echo "  4. Verify files in bucket:"
echo "     ${YELLOW}mc alias set rustfs $LOCAL_URL $ACCESS_KEY $SECRET_KEY${NC}"
echo "     ${YELLOW}mc ls rustfs/$BUCKET/${NC}"
echo ""
echo -e "${CYAN}Console Access:${NC}"
echo "  Local:  http://localhost:9001/rustfs/console/index.html"
echo "  Prod:   $ENDPOINT_URL/console/"
echo ""
echo -e "${CYAN}Credentials:${NC}"
echo "  Username: $ACCESS_KEY"
echo "  Password: [your OBJECT_STORAGE_SECRET]"
echo ""
echo -e "${GREEN}Happy uploading! 🚀${NC}"
echo ""
