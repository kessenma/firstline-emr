# 🪣 RustFS Bucket Setup Guide

## Problem

You're getting these errors when trying to upload files:

```
[StorageService] Upload failed: write EPROTO ... SSL routines:ssl3_read_bytes:tlsv1 alert internal error
```

And from RustFS:

```
S3Error { code: InvalidBucketName, .. }
```

**Root Cause:** The bucket doesn't exist in RustFS yet!

## Solution

You need to create the bucket before you can upload files to it.

---

## Option 1: Create Bucket Using MinIO Client (mc) - RECOMMENDED

### Step 1: Install MinIO Client

```bash
# macOS
brew install minio/stable/mc

# Linux
wget https://dl.min.io/client/mc/release/linux-amd64/mc
chmod +x mc
sudo mv mc /usr/local/bin/

# Windows
# Download from https://dl.min.io/client/mc/release/windows-amd64/mc.exe
```

### Step 2: Configure mc alias

Replace the values with your actual environment variables:

```bash
# Development/Local
mc alias set rustfs-local http://localhost:9000 YOUR_ACCESS_KEY YOUR_SECRET_KEY

# Production (use your actual domain)
mc alias set rustfs-prod https://YOUR_OBJECT_STORAGE_ENDPOINT YOUR_ACCESS_KEY YOUR_SECRET_KEY
```

**Example:**
```bash
mc alias set rustfs-local http://localhost:9000 rustfsadmin rustfsadmin
```

### Step 3: Create the bucket

```bash
# Development/Local
mc mb rustfs-local/YOUR_BUCKET_NAME

# Production
mc mb rustfs-prod/YOUR_BUCKET_NAME
```

**Example:**
```bash
mc mb rustfs-local/medflow
```

### Step 4: Verify the bucket exists

```bash
# List buckets
mc ls rustfs-local

# You should see:
# [2024-12-12 10:00:00 PST]     0B medflow/
```

### Step 5: Test upload

```bash
# Create a test file
echo "test" > test.txt

# Upload it
mc cp test.txt rustfs-local/medflow/

# Verify
mc ls rustfs-local/medflow/
```

---

## Option 2: Use RustFS Web Console

### Step 1: Access the console

Open your browser and go to:
- **Local:** http://localhost:9001/rustfs/console/index.html
- **Production:** https://YOUR_OBJECT_STORAGE_ENDPOINT/rustfs/console/index.html

### Step 2: Login

Use your RustFS credentials:
- **Username:** `YOUR_ACCESS_KEY` (from env vars)
- **Password:** `YOUR_SECRET_KEY` (from env vars)

Default credentials (if not changed):
- Username: `rustfsadmin`
- Password: `rustfsadmin`

### Step 3: Create bucket

1. Click "Buckets" in the left sidebar
2. Click "Create Bucket" button
3. Enter your bucket name (e.g., `medflow`)
4. Click "Create"

---

## Option 3: Use AWS CLI (S3-compatible)

### Step 1: Install AWS CLI

```bash
# macOS
brew install awscli

# Linux
pip install awscli

# Windows
# Download from https://aws.amazon.com/cli/
```

### Step 2: Configure AWS CLI for RustFS

Create/edit `~/.aws/credentials`:

```ini
[rustfs]
aws_access_key_id = YOUR_ACCESS_KEY
aws_secret_access_key = YOUR_SECRET_KEY
```

Create/edit `~/.aws/config`:

```ini
[profile rustfs]
region = us-east-1
output = json
```

### Step 3: Create the bucket

```bash
# Development/Local
aws --profile rustfs \
  --endpoint-url http://localhost:9000 \
  s3 mb s3://YOUR_BUCKET_NAME

# Production
aws --profile rustfs \
  --endpoint-url https://YOUR_OBJECT_STORAGE_ENDPOINT \
  s3 mb s3://YOUR_BUCKET_NAME
```

**Example:**
```bash
aws --profile rustfs \
  --endpoint-url http://localhost:9000 \
  s3 mb s3://medflow
```

### Step 4: Verify

```bash
aws --profile rustfs \
  --endpoint-url http://localhost:9000 \
  s3 ls

# You should see:
# 2024-12-12 10:00:00 medflow
```

---

## Automated Setup Script

Create a file `setup-bucket.sh`:

```bash
#!/bin/bash

# 🪣 RustFS Bucket Setup Script
# This script creates the required bucket in RustFS

set -e

# Configuration
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

echo "🪣 RustFS Bucket Setup"
echo "======================"
echo "Endpoint: $ENDPOINT_URL"
echo "Bucket:   $BUCKET"
echo "Region:   $REGION"
echo ""

# Check if mc is installed
if ! command -v mc &> /dev/null; then
  echo "❌ MinIO Client (mc) is not installed."
  echo ""
  echo "Install it with:"
  echo "  macOS:  brew install minio/stable/mc"
  echo "  Linux:  wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc && sudo mv mc /usr/local/bin/"
  echo ""
  exit 1
fi

# Configure mc alias
echo "🔧 Configuring mc alias..."
mc alias set rustfs-temp "$ENDPOINT_URL" "$ACCESS_KEY" "$SECRET_KEY" --api S3v4

# Check if bucket exists
echo "🔍 Checking if bucket exists..."
if mc ls rustfs-temp | grep -q "$BUCKET"; then
  echo "✅ Bucket '$BUCKET' already exists!"
else
  # Create bucket
  echo "📦 Creating bucket '$BUCKET'..."
  mc mb "rustfs-temp/$BUCKET"
  echo "✅ Bucket '$BUCKET' created successfully!"
fi

# Test upload
echo "🧪 Testing upload..."
echo "test" | mc pipe "rustfs-temp/$BUCKET/test-file.txt"
echo "✅ Upload test successful!"

# Cleanup test file
echo "🧹 Cleaning up test file..."
mc rm "rustfs-temp/$BUCKET/test-file.txt"

# Remove temporary alias
mc alias remove rustfs-temp

echo ""
echo "✅ Setup complete!"
echo ""
echo "Your bucket '$BUCKET' is ready to use."
echo ""
```

Make it executable and run:

```bash
chmod +x setup-bucket.sh
./setup-bucket.sh
```

---

## Quick Docker Exec Method

If you're running RustFS in Docker and have `mc` installed in the container:

```bash
# Enter the RustFS container
docker exec -it rustfs-server sh

# Inside the container, create bucket
mc alias set local http://localhost:9000 $RUSTFS_ACCESS_KEY $RUSTFS_SECRET_KEY
mc mb local/YOUR_BUCKET_NAME
mc ls local

# Exit
exit
```

---

## Troubleshooting

### Error: "Access Denied"

**Cause:** Wrong credentials

**Solution:** Check your `OBJECT_STORAGE_KEY` and `OBJECT_STORAGE_SECRET` environment variables

### Error: "Connection Refused"

**Cause:** RustFS is not running or wrong endpoint

**Solution:** 
1. Check if RustFS container is running: `docker ps | grep rustfs`
2. Check if port is accessible: `curl http://localhost:9000/rustfs/health/live`
3. Verify `OBJECT_STORAGE_ENDPOINT` is correct

### Error: "Invalid Bucket Name"

**Cause:** Bucket name doesn't follow S3 naming rules

**Solution:** Bucket names must:
- Be 3-63 characters long
- Contain only lowercase letters, numbers, dots (.), and hyphens (-)
- Start and end with a letter or number
- Not contain consecutive dots or dots next to hyphens

**Good examples:**
- `medflow`
- `my-bucket-123`
- `app.data.bucket`

**Bad examples:**
- `MyBucket` (uppercase)
- `my_bucket` (underscore)
- `-bucket` (starts with hyphen)
- `bucket-` (ends with hyphen)
- `ab` (too short)

---

## Production Checklist

- [ ] Bucket created in RustFS
- [ ] Bucket name follows S3 naming conventions
- [ ] Access credentials are correct and secure
- [ ] Endpoint URL is correct (https:// for production)
- [ ] SSL/TLS certificates are valid (for production)
- [ ] Network connectivity to RustFS is working
- [ ] Upload test successful
- [ ] Environment variables set correctly in your application

---

## Next Steps

After creating the bucket:

1. **Restart your web application** (to clear any cached errors)
2. **Test file upload** through your application
3. **Monitor logs** for successful uploads
4. **Set up bucket policies** (if needed for production)

---

## Reference

- [RustFS Docker Installation](./docker-setup-rust-ffs.md)
- [RustFS Bucket Management](https://docs.rustfs.com/manage/bucket/)
- [MinIO Client Documentation](https://min.io/docs/minio/linux/reference/minio-mc.html)