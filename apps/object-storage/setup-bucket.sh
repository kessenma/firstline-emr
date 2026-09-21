#!/bin/bash

# 🪣 RustFS Bucket Setup Script
# This script creates the required bucket in RustFS

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration from environment variables
ENDPOINT="${OBJECT_STORAGE_ENDPOINT:-localhost:9000}"
ACCESS_KEY="${OBJECT_STORAGE_KEY:-rustfsadmin}"
SECRET_KEY="${OBJECT_STORAGE_SECRET:-rustfsadmin}"
BUCKET="${OBJECT_STORAGE_BUCKET:-medflow}"
REGION="${OBJECT_STORAGE_REGION:-us-east-1}"

# Determine protocol (local vs production)
if [[ "$ENDPOINT" == "localhost"* ]] || [[ "$ENDPOINT" == "127.0.0.1"* ]]; then
  PROTOCOL="http"
else
  PROTOCOL="https"
fi

ENDPOINT_URL="${PROTOCOL}://${ENDPOINT}"

echo -e "${BLUE}🪣 RustFS Bucket Setup${NC}"
echo "======================"
echo "Endpoint: $ENDPOINT_URL"
echo "Bucket:   $BUCKET"
echo "Region:   $REGION"
echo ""

# Check if mc is installed
if ! command -v mc &> /dev/null; then
  echo -e "${RED}❌ MinIO Client (mc) is not installed.${NC}"
  echo ""
  echo "Install it with:"
  echo -e "${YELLOW}  macOS:  brew install minio/stable/mc${NC}"
  echo -e "${YELLOW}  Linux:  wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc && sudo mv mc /usr/local/bin/${NC}"
  echo ""
  exit 1
fi

# Configure mc alias
echo -e "${BLUE}🔧 Configuring mc alias...${NC}"
mc alias set rustfs-temp "$ENDPOINT_URL" "$ACCESS_KEY" "$SECRET_KEY" --api S3v4 2>/dev/null

if [ $? -ne 0 ]; then
  echo -e "${RED}❌ Failed to configure mc alias${NC}"
  echo "Please check your credentials and endpoint"
  exit 1
fi

# Check if bucket exists
echo -e "${BLUE}🔍 Checking if bucket exists...${NC}"
if mc ls rustfs-temp 2>/dev/null | grep -q "$BUCKET"; then
  echo -e "${GREEN}✅ Bucket '$BUCKET' already exists!${NC}"
else
  # Create bucket
  echo -e "${BLUE}📦 Creating bucket '$BUCKET'...${NC}"
  if mc mb "rustfs-temp/$BUCKET" 2>/dev/null; then
    echo -e "${GREEN}✅ Bucket '$BUCKET' created successfully!${NC}"
  else
    echo -e "${RED}❌ Failed to create bucket${NC}"
    mc alias remove rustfs-temp 2>/dev/null
    exit 1
  fi
fi

# Test upload
echo -e "${BLUE}🧪 Testing upload...${NC}"
if echo "test" | mc pipe "rustfs-temp/$BUCKET/test-file.txt" 2>/dev/null; then
  echo -e "${GREEN}✅ Upload test successful!${NC}"

  # Cleanup test file
  echo -e "${BLUE}🧹 Cleaning up test file...${NC}"
  mc rm "rustfs-temp/$BUCKET/test-file.txt" 2>/dev/null
else
  echo -e "${YELLOW}⚠️  Upload test failed (bucket exists but upload failed)${NC}"
fi

# Remove temporary alias
mc alias remove rustfs-temp 2>/dev/null

echo ""
echo -e "${GREEN}✅ Setup complete!${NC}"
echo ""
echo "Your bucket '$BUCKET' is ready to use."
echo ""
echo "Next steps:"
echo "1. Restart your web application"
echo "2. Test file upload through your app"
echo "3. Monitor logs for successful uploads"
echo ""
