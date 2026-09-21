#!/bin/bash

# 🪣 One-Time Bucket Creation Script
# Run this ONCE after RustFS is deployed to create the bucket

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "========================================================================"
echo "🪣 RustFS Bucket Creation Script"
echo "========================================================================"
echo ""

# Configuration from environment or defaults
ENDPOINT="${OBJECT_STORAGE_ENDPOINT:-s3.emr.fajr.org}"
BUCKET="${OBJECT_STORAGE_BUCKET:-fajr-media}"
ACCESS_KEY="${OBJECT_STORAGE_KEY:-admin}"
SECRET_KEY="${OBJECT_STORAGE_SECRET:-YourSecurePassword123!}"
PORT="${OBJECT_STORAGE_PORT:-9100}"

# Determine if local or remote
if [[ "$ENDPOINT" == "localhost"* ]] || [[ "$ENDPOINT" == "127.0.0.1"* ]]; then
  PROTOCOL="http"
else
  PROTOCOL="https"
fi

ENDPOINT_URL="${PROTOCOL}://${ENDPOINT}"

echo -e "${BLUE}Configuration:${NC}"
echo "  Endpoint: $ENDPOINT_URL"
echo "  Bucket:   $BUCKET"
echo "  Region:   us-east-1"
echo ""

# Check if mc is installed
if ! command -v mc &> /dev/null; then
    echo -e "${RED}❌ MinIO Client (mc) not found${NC}"
    echo ""
    echo "Install it with:"
    echo -e "${YELLOW}  macOS:  brew install minio/stable/mc${NC}"
    echo -e "${YELLOW}  Linux:  wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc && sudo mv mc /usr/local/bin/${NC}"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ MinIO Client (mc) found${NC}"
echo ""

# Configure mc alias
echo "Configuring mc connection..."
if mc alias set rustfs-temp "$ENDPOINT_URL" "$ACCESS_KEY" "$SECRET_KEY" --api S3v4 2>/dev/null; then
    echo -e "${GREEN}✅ Connected to RustFS${NC}"
else
    echo -e "${RED}❌ Failed to connect to RustFS${NC}"
    echo ""
    echo "Check that:"
    echo "  1. RustFS is running"
    echo "  2. Endpoint is correct: $ENDPOINT_URL"
    echo "  3. Credentials are correct"
    echo ""
    exit 1
fi
echo ""

# Check if bucket exists
echo "Checking if bucket '$BUCKET' exists..."
if mc ls rustfs-temp 2>/dev/null | grep -q "$BUCKET"; then
    echo -e "${YELLOW}⚠️  Bucket '$BUCKET' already exists${NC}"
    echo ""
    echo "Listing buckets:"
    mc ls rustfs-temp
else
    # Create bucket
    echo "Creating bucket '$BUCKET'..."
    if mc mb "rustfs-temp/$BUCKET" 2>/dev/null; then
        echo -e "${GREEN}✅ Bucket '$BUCKET' created successfully!${NC}"
        echo ""
        echo "Listing buckets:"
        mc ls rustfs-temp
    else
        echo -e "${RED}❌ Failed to create bucket${NC}"
        mc alias remove rustfs-temp 2>/dev/null
        exit 1
    fi
fi

echo ""

# Test upload
echo "Testing upload..."
echo "test-file-$(date +%s)" > /tmp/rustfs-test.txt
if mc cp /tmp/rustfs-test.txt "rustfs-temp/$BUCKET/" 2>/dev/null; then
    echo -e "${GREEN}✅ Upload test successful${NC}"
    mc rm "rustfs-temp/$BUCKET/rustfs-test.txt" 2>/dev/null
    rm /tmp/rustfs-test.txt
else
    echo -e "${YELLOW}⚠️  Upload test failed${NC}"
    rm /tmp/rustfs-test.txt
fi

# Cleanup
mc alias remove rustfs-temp 2>/dev/null

echo ""
echo "========================================================================"
echo -e "${GREEN}✅ Bucket Setup Complete!${NC}"
echo "========================================================================"
echo ""
echo "Next steps:"
echo "  1. Restart your web application:"
echo "     ${YELLOW}docker-compose restart web${NC}"
echo ""
echo "  2. Test photo upload in your application"
echo ""
echo "  3. Verify uploads in bucket:"
echo "     ${YELLOW}mc alias set rustfs $ENDPOINT_URL $ACCESS_KEY [SECRET]${NC}"
echo "     ${YELLOW}mc ls rustfs/$BUCKET/${NC}"
echo ""
