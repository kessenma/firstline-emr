#!/bin/bash

# 🪣 Create RustFS Bucket - Simple Script
# Run this ONCE to create the fajr-media bucket

echo ""
echo "========================================"
echo "🪣 Creating RustFS Bucket"
echo "========================================"
echo ""

# Check if mc is installed
if ! command -v mc &> /dev/null; then
    echo "❌ MinIO Client (mc) not found"
    echo ""
    echo "Install it with:"
    echo "  macOS:  brew install minio/stable/mc"
    echo "  Linux:  wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc && sudo mv mc /usr/local/bin/"
    echo ""
    exit 1
fi

echo "✅ MinIO Client found"
echo ""

# Configuration
ENDPOINT="https://s3.emr.fajr.org"
BUCKET="fajr-media"
ACCESS_KEY="admin"
SECRET_KEY="YourSecurePassword123!"

echo "Connecting to RustFS..."
mc alias set rustfs "$ENDPOINT" "$ACCESS_KEY" "$SECRET_KEY" --api S3v4

echo ""
echo "Creating bucket: $BUCKET"
mc mb "rustfs/$BUCKET" 2>&1 | grep -v "already" || echo "✅ Bucket '$BUCKET' ready!"

echo ""
echo "Verifying bucket exists..."
mc ls rustfs | grep "$BUCKET" && echo "✅ Bucket verified!" || echo "❌ Bucket not found"

echo ""
echo "Cleaning up..."
mc alias remove rustfs

echo ""
echo "========================================"
echo "✅ Done!"
echo "========================================"
echo ""
echo "Next steps:"
echo "  1. Restart web app: docker-compose restart web"
echo "  2. Test photo upload in your application"
echo ""
