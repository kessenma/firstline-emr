# Notifications Server

A Go-based microservice for handling push notifications (APNs/FCM) and Telegram bot integration for the Fajr Mission EMR system.

## Features

- 📱 **Push Notifications**: Send notifications to iOS (APNs) and Android (FCM) devices
- 🤖 **Telegram Bot**: Handle patient communications via Telegram
- 🔄 **Gorush Integration**: Uses Gorush as a reliable push notification proxy
- 💾 **Database Integration**: Direct PostgreSQL access for device management
- 🏥 **Health Checks**: Built-in health endpoints for monitoring

## Local Development

### Quick Start

From the project root:

```bash
# Option 1: Using the helper script (recommended)
./run-notifications-server-local.sh

# Option 2: Using docker-compose directly
docker-compose -f docker-compose.notifications.local.yml up --build
```

This starts:
- **Notifications Server** on `http://localhost:8080`
- **Gorush** on `http://localhost:8088`

### Configuration

Create/update `apps/web/.env.local`:

```bash
NOTIFICATIONS_SERVER_URL=http://localhost:8080
```

Required environment variables in root `.env`:

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/medflow
APNS_KEY_BASE64=<your_base64_encoded_apns_key>
TELEGRAM_BOT_TOKEN=<optional>
MEDFLOW_KEY=<optional>
NOTIFICATIONS_PORT=8080
```

### Testing

```bash
# Health check
curl http://localhost:8080/health

# Send test notification
curl -X POST http://localhost:8080/api/push/send \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "USER_ID",
    "title": "Test",
    "message": "Test notification",
    "data": {"type": "test"}
  }'

# View logs
docker logs notifications-server-local -f
```

## API Endpoints

### Push Notifications

#### `POST /api/push/send`
Send a push notification to a single user.

**Request Body:**
```json
{
  "user_id": "uuid",
  "title": "Notification Title",
  "message": "Notification message",
  "data": {
    "type": "notification",
    "custom_field": "value"
  }
}
```

#### `POST /api/push/send-batch`
Send push notifications to multiple users.

**Request Body:**
```json
[
  {
    "user_id": "uuid1",
    "title": "Title 1",
    "message": "Message 1"
  },
  {
    "user_id": "uuid2",
    "title": "Title 2",
    "message": "Message 2"
  }
]
```

#### `GET /api/push/stats`
Get push notification statistics (placeholder).

### Health Check

#### `GET /health`
Returns server health status.

**Response:**
```json
{
  "status": "healthy",
  "service": "notifications-server",
  "uptime": 123.45,
  "timestamp": "2024-01-01T12:00:00Z",
  "database_connected": true,
  "gorush_connected": true
}
```

## Architecture

```
┌──────────────┐
│   Web App    │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│  Notifications   │
│     Server       │◄──── Telegram Bot Integration
└──────┬───────────┘
       │
       ▼
┌──────────────┐
│   Gorush     │
└──────┬───────┘
       │
       ├────────┬────────┐
       ▼        ▼        ▼
   ┌─────┐  ┌─────┐  ┌────────┐
   │APNs │  │ FCM │  │ Device │
   └─────┘  └─────┘  └────────┘
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `GORUSH_URL` | Gorush service URL | Yes | `http://gorush:8088` |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | No | - |
| `MEDFLOW_KEY` | API authentication key | No | - |
| `API_BASE_URL` | Backend API URL | Yes | - |
| `NOTIFICATIONS_PORT` | Server port | No | `8080` |
| `OBJECT_STORAGE_*` | S3-compatible storage config | No | - |
| `NODE_ENV` | Environment mode | No | `development` |

## Building

### Local Build

```bash
cd apps/notifications-server
go build -o notifications-server .
./notifications-server
```

### Docker Build

```bash
docker build -t notifications-server:latest -f apps/notifications-server/Dockerfile .
```

## Deployment

### Production (Coolify)

Uses `docker-compose.notifications.yml` with:
- Coolify network
- Caddy reverse proxy
- Auto-restart policies
- Health checks

### Local Testing

Uses `docker-compose.notifications.local.yml` with:
- Bridge network
- Direct port exposure
- Local volume mounts

## Troubleshooting

### APNs Connection Issues

```bash
# Verify APNs key is correctly base64 encoded
echo $APNS_KEY_BASE64 | base64 -d | head -c 50
# Should show: -----BEGIN PRIVATE KEY-----

# Check gorush logs
docker logs gorush-local -f
```

### Database Connection Issues

```bash
# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Check push_devices table
psql $DATABASE_URL -c "SELECT COUNT(*) FROM push_devices WHERE is_active = true;"
```

### Notification Not Received

1. Check device is active in database
2. Verify token is valid and not expired
3. Check environment matches (dev vs prod)
4. Review gorush logs for APNs/FCM errors
5. Confirm device permissions are enabled

## Related Documentation

- [Admin Push Test Notification Guide](../../ADMIN_PUSH_TEST_NOTIFICATION_GUIDE.md)
- [Local Testing Guide](../../LOCAL_NOTIFICATIONS_TESTING.md)
- [Push Devices Implementation](../../PUSH_DEVICES_IMPLEMENTATION_SUMMARY.md)

## Support

For issues:
1. Check health endpoint: `curl http://localhost:8080/health`
2. Review logs: `docker logs notifications-server-local -f`
3. Verify environment variables are set
4. Test database connectivity
5. Consult troubleshooting guides above

This is a Go-based server that handles notifications for the MedFlow EMR system, including:
- Telegram bot integration for patient communication
- Mobile app push notifications via gorush https://github.com/appleboy/gorush

## Overview

The notifications server provides:
- Telegram bot integration for patient communication
- **Push notifications** via gorush (FCM for Android, APNS for iOS)
- Media file handling (images, videos, audio)
- Automated follow-up messaging
- Real-time notifications via WebSocket
- RustFS S3-compatible storage integration

## Features

### Push Notifications (NEW)
- iOS push notifications via Apple Push Notification Service (APNS)
- Android push notifications via Firebase Cloud Messaging (FCM)
- Batch notification sending
- Automatic token management

### Message Handling
- Text messages
- Image uploads with captions
- Video file processing
- Audio/voice message support
- Thread management

### Commands
- `/url` - Generate patient intake form links

### Automated Features
- Follow-up message scheduling
- Duplicate message prevention
- Environment-based file organization

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Telegram      │◄───────►│  Notifications   │◄───────►│   MedFlow API   │
│   Bot           │         │  Server (Go)     │         │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                │       │                    │
                                │       │                    │
                                ▼       ▼                    ▼
                        ┌──────────┐  ┌──────────┐   ┌──────────────┐
                        │  RustFS  │  │  Gorush  │   │   WebSocket  │
                        │  Storage │  │  (Push)  │   │   Server     │
                        └──────────┘  └──────────┘   └──────────────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │  FCM / APNS │
                                    └─────────────┘
```

## Push Notifications Setup

### 1. Get FCM Credentials (Android)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create one)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Save as `fcm-key.json` in `apps/notifications-server/`

### 2. Get APNS Credentials (iOS) - Optional

For iOS push notifications, you need either:

**Certificate-based:**
1. Go to [Apple Developer Portal](https://developer.apple.com/)
2. Create an APNS certificate for your app
3. Export as `.pem` or `.p12` file
4. Save as `apns-key.pem` in `apps/notifications-server/`
5. Update `gorush-config.yml` to enable iOS

**Token-based (JWT):**
1. Go to Apple Developer → Keys
2. Create an APNs Key
3. Download the `.p8` file
4. Update `gorush-config.yml` with key_id and team_id

### 3. Start the Services

```bash
# Start gorush and notifications-server
docker compose -f docker-compose.notifications.yml up -d
```

### 4. Verify Setup

```bash
# Check gorush health
curl http://localhost:8088/healthz

# Check gorush stats
curl http://localhost:8088/api/stat/app
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `TELEGRAM_BOT_TOKEN` | Telegram bot API token | Yes |
| `MEDFLOW_KEY` | API authorization key | Yes |
| `API_BASE_URL` | MedFlow backend URL | Yes |
| `GORUSH_URL` | Gorush server URL | No (default: http://gorush:8088) |
| `WEBSOCKET_SERVER_URL` | WebSocket server URL | No |
| `OBJECT_STORAGE_*` | RustFS S3 configuration | Yes |
| `RUSTFS_ACCESS_KEY` | RustFS admin access key | Yes |
| `RUSTFS_SECRET_KEY` | RustFS admin secret key | Yes |

### Storage Configuration

The server uses RustFS for S3-compatible object storage with automatic environment-based folder organization:

**Required RustFS Environment Variables:**
- `RUSTFS_ACCESS_KEY` - Admin access key (username equivalent)
- `RUSTFS_SECRET_KEY` - Admin secret key (password equivalent)
- `RUSTFS_CONSOLE_ENABLE=true` - Enable web console on port 9001
- `RUSTFS_ADDRESS=:9000` - API listening address
- `RUSTFS_SERVER_DOMAINS` - Domain name for virtual host routing

**S3 Client Configuration:**
- `OBJECT_STORAGE_ENDPOINT` - RustFS endpoint URL
- `OBJECT_STORAGE_KEY` - S3 access key (same as RUSTFS_ACCESS_KEY)
- `OBJECT_STORAGE_SECRET` - S3 secret key (same as RUSTFS_SECRET_KEY)
- `OBJECT_STORAGE_BUCKET` - Bucket name
- `OBJECT_STORAGE_REGION` - Region name
- `OBJECT_STORAGE_PORT` - API port (default: 9000)

```
bucket/
├── dev/
│   ├── images/
│   ├── videos/
│   └── audio/
├── staging/
│   └── ...
└── prod/
    └── ...
```

## API Endpoints

### Health Check
```
GET /health
```

Returns `OK` when the service is healthy.

## Development

### Prerequisites

- Go 1.24+
- Docker & Docker Compose
- Telegram bot token
- RustFS credentials

### Running Locally

```bash
# Build the application
go build -o notifications-server .

# Run with environment variables
export TELEGRAM_BOT_TOKEN=your_token
export MEDFLOW_KEY=your_key
# ... other env vars

./notifications-server
```

### Docker Development

```bash
# Using docker-compose
docker-compose -f docker-compose.notifications.yml up -d
```

## Deployment

### Production Deployment

The service is designed to run in Coolify with the provided `docker-compose.notifications.yml`:

```bash
# Deploy to Coolify
# Use docker-compose.notifications.yml as the compose file
# Domain: notifications.dev.emr.fajrscientific.org
```

### Health Monitoring

The service includes health checks and exposes metrics for monitoring.

## File Structure

```
apps/notifications-server/
├── main.go           # Application entry point
├── config.go         # Configuration management
├── types.go          # Type definitions
├── api.go            # Backend API client
├── storage.go        # S3 storage client
├── handlers.go       # Message handlers
├── cron.go           # Follow-up cron jobs
├── go.mod            # Go module definition
├── go.sum            # Dependency checksums
├── Dockerfile        # Docker build configuration
└── README.md         # This file
```

## Migration from Node.js

This service is a complete migration from the original Node.js Telegram bot, providing:

- **Performance**: ~10x faster startup, lower memory usage
- **Type Safety**: Compile-time error checking
- **Concurrency**: Native goroutines instead of event loop
- **Deployment**: Single binary deployment
- **Maintainability**: Better code organization and testing

## Monitoring & Logging

The service provides comprehensive logging with structured output:

```
[TELEGRAM-BOT-GO] 📨 Message from John Doe (@johndoe, ID: 12345) | Chat: 67890 | Text: 'Hello doctor'
[TELEGRAM-BOT-GO] 💾 Message saved for chat 67890
[TELEGRAM-BOT-GO] 📡 WebSocket notification sent for chat 67890
```

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check `TELEGRAM_BOT_TOKEN`
2. **API errors**: Verify `MEDFLOW_KEY` and `API_BASE_URL`
3. **File upload failures**: Check RustFS credentials and bucket permissions
4. **Health check failures**: Ensure port 8080 is accessible
5. **RustFS console access**: Verify `RUSTFS_ACCESS_KEY` and `RUSTFS_SECRET_KEY` are set

### Logs

```bash
# View application logs
docker-compose -f docker-compose.notifications.yml logs -f

# Check health endpoint
curl http://localhost:8080/health
```

## Contributing

1. Follow Go conventions and best practices
2. Add tests for new features
3. Update documentation
4. Ensure health checks pass

## License

Internal MedFlow EMR project.
