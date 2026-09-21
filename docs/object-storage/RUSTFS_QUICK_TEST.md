# RustFS Quick Test Reference Card

## 🚀 Quick Start (3 Steps)

```bash
# 1. Start RustFS
docker-compose -f docker-compose.object-storage.yml up -d

# 2. Test Connection
node test-rustfs-connection.js

# 3. Test Upload Endpoint
curl -X POST http://localhost:3000/api/telegram-thread/123456789/upload-photo \
  -F "file=@/path/to/test-image.jpg"
```

## 📦 RustFS Status Check

```bash
# Check if running
docker ps | grep rustfs

# View logs
docker logs rustfs-server

# Restart if needed
docker-compose -f docker-compose.object-storage.yml restart
```

## 🌐 Access Points

- **RustFS Console**: http://localhost:9001
- **API Port**: 9100 (default)
- **Credentials**: Check your `.env` for `OBJECT_STORAGE_KEY` and `OBJECT_STORAGE_SECRET`

## 🧪 Test Each Endpoint

### 1. Telegram Thread Photo Upload
```bash
curl -X POST http://localhost:3000/api/telegram-thread/TEST123/upload-photo \
  -F "file=@test-image.jpg"
```

### 2. Telegram Thread Audio Upload
```bash
curl -X POST http://localhost:3000/api/telegram-thread/TEST123/upload-audio \
  -F "file=@test-audio.ogg" \
  -F "duration=30"
```

### 3. Internal Messages Audio Upload
```bash
curl -X POST http://localhost:3000/api/internal-messages/MSG123/upload-audio \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-audio.ogg" \
  -F "duration=30"
```

### 4. Internal Messages Document Upload
```bash
curl -X POST http://localhost:3000/api/internal-messages/MSG123/upload-document \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-document.pdf"
```

### 5. Internal Messages Photo Upload
```bash
curl -X POST http://localhost:3000/api/internal-messages/MSG123/upload-photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg"
```

### 6. Patient Photo Upload
```bash
curl -X POST http://localhost:3000/api/patient/PATIENT123/upload-photo \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@test-image.jpg"
```

### 7. Medical License Upload
```bash
curl -X POST http://localhost:3000/api/upload-license \
  -F "file=@license.pdf" \
  -F "firstName=John" \
  -F "lastName=Doe" \
  -F "specialty=Cardiology" \
  -F "userId=USER123"
```

## ✅ Success Response Example

```json
{
  "filePath": "dev/telegram/photos/123456789/2024-01-15T10-30-00-image.jpg",
  "signedUrl": "https://your-endpoint.com/bucket/path?X-Amz-Algorithm=..."
}
```

## ❌ Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Connection Refused | RustFS not running | `docker-compose -f docker-compose.object-storage.yml up -d` |
| AccessDenied | Wrong credentials | Check `.env` for correct keys |
| NoSuchBucket | Bucket doesn't exist | Create in console or run test script |
| 403 on Signed URL | URL expired | URLs expire in 1 hour, regenerate |

## 🔍 Verify Upload in Console

1. Open: http://localhost:9001
2. Login with your credentials
3. Navigate to your bucket
4. Look for file in: `dev/telegram/photos/[chatId]/` (or similar path)

## 📊 Expected File Structure

```
your-bucket/
├── dev/
│   ├── telegram/
│   │   ├── photos/
│   │   │   └── 123456789/
│   │   │       └── 2024-01-15T10-30-00-image.jpg
│   │   └── audio/
│   ├── internal-messages-audio/
│   ├── internal-messages-documents/
│   ├── internal-messages-photos/
│   ├── patient-photos/
│   └── medical_license/
├── staging/ (same structure)
└── prod/ (same structure)
```

## 🔗 Test Signed URL

```bash
# Copy signed URL from response
curl -I "PASTE_SIGNED_URL_HERE"

# Should return: HTTP/1.1 200 OK
```

## 📝 Environment Variables Checklist

```bash
# Check if all are set
env | grep OBJECT_STORAGE
```

Required:
- ✅ OBJECT_STORAGE_ENDPOINT
- ✅ OBJECT_STORAGE_KEY
- ✅ OBJECT_STORAGE_SECRET
- ✅ OBJECT_STORAGE_BUCKET
- ✅ OBJECT_STORAGE_REGION

## 🎯 Quick Troubleshooting

```bash
# 1. Check environment
echo $OBJECT_STORAGE_ENDPOINT

# 2. Test connectivity
curl http://localhost:9100/health

# 3. Check bucket exists
# Use RustFS console or test script

# 4. View detailed logs
docker logs rustfs-server --tail 100 -f
```

## 📚 Full Documentation

- **Comprehensive Guide**: `docs/RUSTFS_TESTING_GUIDE.md`
- **Migration Summary**: `RUSTFS_MIGRATION_SUMMARY.md`
- **Test Script**: `test-rustfs-connection.js`

## 💡 Pro Tips

1. **Test with small files first** (< 1MB)
2. **Check console logs** if upload fails
3. **Use signed URLs within 1 hour** (they expire)
4. **Files are organized by environment** (dev/staging/prod)
5. **All files are private by default** (no ACL needed with RustFS)

## 🎬 Next Steps After Testing

1. ✅ Confirm all endpoints work
2. ✅ Test signed URL access
3. ✅ Verify file organization in console
4. ✅ Update production environment variables
5. ✅ Set up backups for `/data` volume
6. ✅ Monitor disk usage

---

**Quick Help**: If something doesn't work, run `node test-rustfs-connection.js` for detailed diagnostics.