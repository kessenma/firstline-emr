#!/bin/bash

# 🔍 Verification Script - Check if entrypoint is properly embedded in Docker image

set -e

echo "=========================================="
echo "🔍 RustFS Docker Image Verification"
echo "=========================================="
echo ""

# Check if docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker."
    exit 1
fi

echo "1️⃣  Building Docker image..."
cd "$(dirname "$0")"
docker build -t rustfs-verify:latest . --quiet

if [ $? -ne 0 ]; then
    echo "❌ Docker build failed"
    exit 1
fi
echo "✅ Docker image built successfully"
echo ""

echo "2️⃣  Checking if entrypoint exists in image..."
if docker run --rm rustfs-verify:latest test -f /entrypoint.sh; then
    echo "✅ /entrypoint.sh exists in image"
else
    echo "❌ /entrypoint.sh NOT found in image"
    exit 1
fi
echo ""

echo "3️⃣  Checking if entrypoint is executable..."
if docker run --rm rustfs-verify:latest test -x /entrypoint.sh; then
    echo "✅ /entrypoint.sh is executable"
else
    echo "❌ /entrypoint.sh is NOT executable"
    exit 1
fi
echo ""

echo "4️⃣  Checking entrypoint file size..."
SIZE=$(docker run --rm rustfs-verify:latest wc -c < /entrypoint.sh)
echo "   File size: $SIZE bytes"
if [ "$SIZE" -gt 100 ]; then
    echo "✅ Entrypoint script has content (size > 100 bytes)"
else
    echo "❌ Entrypoint script is too small or empty"
    exit 1
fi
echo ""

echo "5️⃣  Checking entrypoint shebang..."
SHEBANG=$(docker run --rm rustfs-verify:latest head -n1 /entrypoint.sh)
if [[ "$SHEBANG" == "#!/bin/bash"* ]]; then
    echo "✅ Shebang is correct: $SHEBANG"
else
    echo "❌ Invalid or missing shebang: $SHEBANG"
    exit 1
fi
echo ""

echo "6️⃣  Checking for key functions in entrypoint..."
CONTENT=$(docker run --rm rustfs-verify:latest cat /entrypoint.sh)

if echo "$CONTENT" | grep -q "create_bucket_s3"; then
    echo "✅ Found create_bucket_s3 function"
else
    echo "❌ create_bucket_s3 function NOT found"
    exit 1
fi

if echo "$CONTENT" | grep -q "OBJECT_STORAGE_BUCKET"; then
    echo "✅ Found OBJECT_STORAGE_BUCKET variable"
else
    echo "❌ OBJECT_STORAGE_BUCKET variable NOT found"
    exit 1
fi

if echo "$CONTENT" | grep -q "Auto-Bucket Creation"; then
    echo "✅ Found auto-bucket creation header"
else
    echo "❌ Auto-bucket creation header NOT found"
    exit 1
fi
echo ""

echo "7️⃣  Verifying ENTRYPOINT is set..."
ENTRYPOINT=$(docker inspect rustfs-verify:latest | grep -A 1 '"Entrypoint"' | tail -n1)
if echo "$ENTRYPOINT" | grep -q "entrypoint.sh"; then
    echo "✅ ENTRYPOINT is set to /entrypoint.sh"
    echo "   $ENTRYPOINT"
else
    echo "❌ ENTRYPOINT is NOT set correctly"
    echo "   $ENTRYPOINT"
    exit 1
fi
echo ""

echo "=========================================="
echo "✅ All Verification Checks Passed!"
echo "=========================================="
echo ""
echo "The Docker image is properly configured with:"
echo "  ✅ Entrypoint script exists"
echo "  ✅ Entrypoint is executable"
echo "  ✅ Entrypoint has correct content"
echo "  ✅ Auto-bucket creation logic present"
echo "  ✅ ENTRYPOINT directive set correctly"
echo ""
echo "🚀 Ready to deploy!"
echo ""

# Cleanup
echo "Cleaning up verification image..."
docker rmi rustfs-verify:latest --force > /dev/null 2>&1
echo "✅ Cleanup complete"
echo ""
