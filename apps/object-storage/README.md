# 🗄️ RustFS Object Storage

This directory contains the configuration and documentation for the RustFS object storage service used by the Fajr Mission EMR system.

## ✨ **NEW: Auto-Bucket Creation!**

RustFS now **automatically creates the configured bucket on startup**! 

- ✅ No more manual bucket creation
- ✅ No more "NoSuchBucket" errors
- ✅ Bucket status visible in deployment logs
- ✅ Just deploy and it works!

See [AUTO_BUCKET_CREATION.md](./AUTO_BUCKET_CREATION.md) for details.

## 📋 Overview

RustFS is a high-performance, S3-compatible distributed object storage system that handles all file uploads in the application:
- 📸 Patient photos
- 🎤 Audio messages
- 📄 Documents
- 🏥 Medical licenses
- 💬 Telegram attachments

## 🚀 Quick Start

### First Time Setup

1. **Start RustFS container:**
   ```bash
   docker-compose -f docker-compose.object-storage.yml up -d --build
   ```

2. **Check logs to see bucket auto-creation:**
   ```bash
   docker-compose -f docker-compose.object-storage.yml logs -f rustfs-server
   
   # You should see:
   # ✅ Bucket 'fajr-media' created successfully!
   ```

3. **That's it!** The bucket is automatically created.

Your object storage is ready to use immediately!

### Production Deployment

1. **Update environment variables** in `.env`:
   ```bash
   OBJECT_STORAGE_ENDPOINT=s3.emr.fajr.org
   OBJECT_STORAGE_BUCKET=fajr-media
   OBJECT_STORAGE_KEY=admin
   OBJECT_STORAGE_SECRET=YourSecurePassword123!  # CHANGE THIS!
   OBJECT_STORAGE_REGION=us-east-1
   OBJECT_STORAGE_PORT=9100
   ```

2. **Deploy RustFS:**
   ```bash
   docker-compose -f docker-compose.object-storage.yml up -d --build
   ```

3. **Check deployment logs for bucket creation:**
   ```bash
   # Look for: ✅ Bucket 'fajr-media' created successfully!
   docker-compose -f docker-compose.object-storage.yml logs rustfs-server
   ```

4. **Restart web application:**
   ```bash
   docker-compose restart web
   ```

**That's it!** The bucket is automatically created during deployment.

## 📁 Directory Structure

```
apps/object-storage/
├── README.md                      # This file
├── Dockerfile                     # RustFS container configuration
├── entrypoint.sh                  # Auto-bucket creation script ⭐ NEW!
├── AUTO_BUCKET_CREATION.md        # Auto-creation feature docs ⭐ NEW!
├── DEPLOYMENT_GUIDE.md            # Deployment with auto-creation ⭐ NEW!
├── FIXES_SUMMARY.md               # Overview of configuration fixes
├── PRODUCTION_FIX.md              # Production troubleshooting guide
├── RESTART_GUIDE.md               # Step-by-step restart procedures
├── QUICK_REFERENCE.md             # Quick command reference
├── fix-rustfs.sh                  # Automated setup script
├── setup-bucket.sh                # Manual bucket creation script
├── docs/
│   ├── docker-setup-rust-ffs.md   # RustFS installation guide
│   └── setup-bucket.md            # Detailed bucket setup guide
├── data/                          # RustFS data volume (gitignored)
└── logs/                          # RustFS logs (gitignored)
```

## 🔴 Troubleshooting

### Upload Failing with "NoSuchBucket" Error?

**This should not happen anymore!** Buckets are auto-created on startup.

If you still see this error:

1. **Check deployment logs** - Did auto-creation succeed?
   ```bash
   docker-compose -f docker-compose.object-storage.yml logs rustfs-server | grep -i bucket
   
   # Look for: ✅ Bucket 'fajr-media' created successfully!
   ```

2. **If auto-creation failed, create manually:**
   ```bash
   mc alias set rustfs http://localhost:9100 admin YourSecurePassword123!
   mc mb rustfs/fajr-media
   docker-compose restart web
   ```

3. **Check bucket name matches** in `.env`:
   ```bash
   echo $OBJECT_STORAGE_BUCKET  # Should match what's in RustFS
   ```

### Can't Access RustFS Console?

1. **Check if container is running:**
   ```bash
   docker ps | grep rustfs
   ```

2. **Access console:**
   - Local: http://localhost:9001/rustfs/console/index.html
   - Production: https://s3.emr.fajr.org/console/

3. **Login credentials:**
   - Username: `admin` (from `OBJECT_STORAGE_KEY`)
   - Password: `YourSecurePassword123!` (from `OBJECT_STORAGE_SECRET`)

### SSL/TLS Errors in Web App?

Check that `OBJECT_STORAGE_ENDPOINT` does **NOT** include the protocol:
- ✅ Correct: `s3.emr.fajr.org`
- ❌ Wrong: `https://s3.emr.fajr.org`

The storage service adds `https://` automatically.

### More Help?

See detailed troubleshooting in:
- **Production issues:** `PRODUCTION_FIX.md`
- **Restart procedures:** `RESTART_GUIDE.md`
- **Quick commands:** `QUICK_REFERENCE.md`

## 📚 Documentation

| Document | Description |
|----------|-------------|
| **AUTO_BUCKET_CREATION.md** ⭐ | Auto-bucket creation feature (NEW!) |
| **DEPLOYMENT_GUIDE.md** ⭐ | Deployment with auto-creation (NEW!) |
| **QUICK_REFERENCE.md** | Common commands and quick fixes |
| **PRODUCTION_FIX.md** | Complete production troubleshooting |
| **RESTART_GUIDE.md** | Step-by-step restart procedures |
| **FIXES_SUMMARY.md** | Overview of configuration fixes |
| **docs/setup-bucket.md** | Manual bucket setup guide |
| **docs/docker-setup-rust-ffs.md** | RustFS installation guide |

## 🔧 Configuration

### Environment Variables

```bash
# Required Variables
OBJECT_STORAGE_ENDPOINT=s3.emr.fajr.org      # S3 API endpoint (no protocol!)
OBJECT_STORAGE_BUCKET=fajr-media             # Bucket name
OBJECT_STORAGE_KEY=admin                     # Access key
OBJECT_STORAGE_SECRET=YourSecurePassword123! # Secret key
OBJECT_STORAGE_REGION=us-east-1              # AWS region
OBJECT_STORAGE_PORT=9100                     # API port

# Optional Variables
OBJECT_STORAGE_CDN_ENDPOINT=s3.emr.fajr.org  # CDN endpoint
RUSTFS_CONSOLE_ENABLE=true                   # Enable web console
RUSTFS_SERVER_DOMAINS=s3.emr.fajr.org        # Server domains
```

### Ports

- **9100** - S3 API (configurable via `OBJECT_STORAGE_PORT`)
- **9001** - Web Console (fixed)

### Volumes

- **rustfs_data** - Object storage data (persistent)
- **rustfs_logs** - RustFS logs

## 🛠️ Common Operations

### Start/Stop RustFS

```bash
# Start
docker-compose -f docker-compose.object-storage.yml up -d

# Stop
docker-compose -f docker-compose.object-storage.yml down

# Restart
docker-compose -f docker-compose.object-storage.yml restart rustfs-server

# View logs
docker-compose -f docker-compose.object-storage.yml logs -f rustfs-server
```

### Bucket Management

```bash
# Configure mc (one-time setup)
mc alias set rustfs http://localhost:9100 admin YourSecurePassword123!

# List buckets
mc ls rustfs

# Create bucket
mc mb rustfs/fajr-media

# Delete bucket (WARNING: destructive!)
mc rb --force rustfs/fajr-media
```

### File Operations

```bash
# Upload file
mc cp photo.jpg rustfs/fajr-media/

# List files
mc ls rustfs/fajr-media/

# Download file
mc cp rustfs/fajr-media/photo.jpg ./downloaded.jpg

# Delete file
mc rm rustfs/fajr-media/photo.jpg
```

## 🔐 Security

### Change Default Credentials

**Never use default credentials in production!**

1. Update `.env` file:
   ```bash
   OBJECT_STORAGE_KEY=your-secure-access-key
   OBJECT_STORAGE_SECRET=your-very-secure-secret-key
   ```

2. Restart RustFS:
   ```bash
   docker-compose -f docker-compose.object-storage.yml restart rustfs-server
   ```

3. Update web application and restart:
   ```bash
   docker-compose restart web
   ```

### Bucket Security

```bash
# Set bucket to private (recommended)
mc policy set private rustfs/fajr-media

# Set bucket to public read (use with caution!)
mc policy set download rustfs/fajr-media

# Check current policy
mc policy get rustfs/fajr-media
```

## 📊 Monitoring

### Check Health

```bash
# API health
curl http://localhost:9100/rustfs/health/live

# Console health
curl http://localhost:9001/rustfs/console/index.html
```

### Check Disk Usage

```bash
# Bucket size
mc du rustfs/fajr-media

# Volume size
docker volume inspect fajr-medflow-emr_rustfs_data
```

### Check File Counts

```bash
# Total files
mc find rustfs/fajr-media --name "*" | wc -l

# Files by type
mc find rustfs/fajr-media --name "*.jpg" | wc -l
mc find rustfs/fajr-media --name "*.mp3" | wc -l
```

## 🔄 Backup & Recovery

### Backup Data

```bash
# Backup entire bucket
mc mirror rustfs/fajr-media /backup/fajr-media-$(date +%Y%m%d)/

# Backup specific path
mc mirror rustfs/fajr-media/prod /backup/fajr-media-prod-$(date +%Y%m%d)/
```

### Restore Data

```bash
# Restore entire bucket
mc mirror /backup/fajr-media-20241212/ rustfs/fajr-media

# Restore specific path
mc mirror /backup/fajr-media-prod-20241212/ rustfs/fajr-media/prod
```

## 🧪 Testing

### Test Upload/Download

```bash
# Create test file
echo "Hello RustFS" > test.txt

# Upload
mc cp test.txt rustfs/fajr-media/

# Download
mc cp rustfs/fajr-media/test.txt downloaded.txt

# Verify
diff test.txt downloaded.txt

# Cleanup
mc rm rustfs/fajr-media/test.txt
rm test.txt downloaded.txt
```

### Performance Testing

```bash
# Test upload speed (100MB file)
dd if=/dev/zero of=test-100mb.dat bs=1M count=100
time mc cp test-100mb.dat rustfs/fajr-media/
rm test-100mb.dat

# Test download speed
time mc cp rustfs/fajr-media/test-100mb.dat downloaded.dat
rm downloaded.dat
mc rm rustfs/fajr-media/test-100mb.dat
```

## 📦 Integration

### Web Application

The web application uses the shared storage service at `apps/web/lib/storage/storage-service.ts`.

All upload endpoints use this service:
- ✅ Telegram photo uploads
- ✅ Telegram audio uploads
- ✅ Internal message attachments
- ✅ Patient photos
- ✅ Medical licenses

See `apps/web/lib/storage/readme.md` for API documentation.

### Environment Variables (Web App)

The web app requires these environment variables:
```bash
OBJECT_STORAGE_ENDPOINT=s3.emr.fajr.org
OBJECT_STORAGE_BUCKET=fajr-media
OBJECT_STORAGE_KEY=admin
OBJECT_STORAGE_SECRET=YourSecurePassword123!
OBJECT_STORAGE_REGION=us-east-1
```

## 🚨 Emergency Procedures

### RustFS Container Won't Start

1. **Check logs:**
   ```bash
   docker-compose -f docker-compose.object-storage.yml logs rustfs-server
   ```

2. **Check port conflicts:**
   ```bash
   lsof -i :9100
   lsof -i :9001
   ```

3. **Rebuild container:**
   ```bash
   docker-compose -f docker-compose.object-storage.yml down
   docker-compose -f docker-compose.object-storage.yml up -d --build rustfs-server
   ```

### Data Corruption

1. **Stop RustFS:**
   ```bash
   docker-compose -f docker-compose.object-storage.yml down
   ```

2. **Restore from backup:**
   ```bash
   docker volume rm fajr-medflow-emr_rustfs_data
   docker volume create fajr-medflow-emr_rustfs_data
   # Copy backup data to volume
   ```

3. **Restart RustFS:**
   ```bash
   docker-compose -f docker-compose.object-storage.yml up -d
   ```

### Lost Access Credentials

1. **Stop RustFS:**
   ```bash
   docker-compose -f docker-compose.object-storage.yml down
   ```

2. **Update `.env` with new credentials**

3. **Start RustFS:**
   ```bash
   docker-compose -f docker-compose.object-storage.yml up -d
   ```

## 🎓 Learning Resources

- [RustFS Official Documentation](https://docs.rustfs.com/)
- [MinIO Client (mc) Documentation](https://min.io/docs/minio/linux/reference/minio-mc.html)
- [S3 API Reference](https://docs.aws.amazon.com/AmazonS3/latest/API/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)

## 💡 Tips & Best Practices

1. **Always use mc for operations** - It's faster and more reliable than the console
2. **Test locally before production** - Use `localhost:9100` for testing
3. **Monitor disk usage regularly** - RustFS uses local disk storage
4. **Backup your data volume** - Schedule regular backups
5. **Use environment-specific buckets** - e.g., `dev-media`, `prod-media`
6. **Never commit credentials** - Use `.env` files (gitignored)
7. **Change default passwords** - Never use default credentials in production
8. **Set up monitoring** - Monitor health endpoints and disk usage
9. **Use meaningful file paths** - Follow the pattern: `{env}/{domain}/{type}/{id}/`
10. **Test disaster recovery** - Practice backup/restore procedures

## 🤝 Contributing

When modifying RustFS configuration:
1. Test changes locally first
2. Update relevant documentation
3. Test backup/restore procedures
4. Verify web app integration still works
5. Update this README if needed

## 📞 Support

- **Documentation Issues:** Check `QUICK_REFERENCE.md` and `PRODUCTION_FIX.md`
- **Configuration Issues:** Check `FIXES_SUMMARY.md`
- **RustFS Issues:** See https://docs.rustfs.com/
- **Web App Integration:** See `apps/web/lib/storage/readme.md`

---

**Last Updated:** 2024-12-12  
**RustFS Version:** latest  
**Status:** ✅ Production Ready