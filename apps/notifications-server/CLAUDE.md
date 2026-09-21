# Notifications Server (Go)

Go microservice that bridges the web backend to APNs/FCM via Gorush.

## Architecture

```
Web backend
  → POST /api/push/send or /api/push/send-batch
  → push.go: query push_devices for active tokens
  → pusher.go: POST to Gorush /api/push
  → Gorush → APNs (iOS) / FCM (Android)
```

## Key Files

- `main.go` — HTTP server (port 8080), health checks, routes, also runs Telegram bot
- `push.go` — `GetUserDeviceTokens()`, `GetMultipleUsersDeviceTokens()`, `SendPushNotification()`, `SendPushNotifications()`
- `pusher.go` — `GorushPusher` struct, `SendToiOS()`, `SendToAndroid()`, `SendToMultiplePlatforms()`, `HealthCheck()`
- `gorush-config.yml` — Gorush config (iOS token-based auth with AuthKey.p8, Android disabled)

## Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/health` | GET | Status + uptime + DB/Gorush connectivity |
| `/api/push/send` | POST | Send push to single user `{ user_id, title, message, data }` |
| `/api/push/send-batch` | POST | Send to multiple users `[{ user_id, title, message, data }, ...]` |

## Docker Setup (`docker-compose.notifications.yml`)

1. **gorush-init**: Decodes `APNS_KEY_BASE64` env var → writes `/keys/AuthKey.p8`
2. **gorush**: Runs on port 8088, reads AuthKey.p8 from shared volume
3. **notifications-server**: Builds from Dockerfile, connects to PostgreSQL + Gorush

## Device Token Flow

- Mobile registers token via `POST /api/user/device-token` (web API route)
- Web stores in `push_devices` table (userId, token, platform, environment)
- This server queries `push_devices` at send time: `WHERE user_id = ? AND is_active = true AND environment = 'prod'`
- Gorush platform codes: 1 = iOS, 2 = Android

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `GORUSH_URL` — Gorush endpoint (default: `http://gorush:8088`)
- `PORT` — Server port (default: 8080)
- `APNS_KEY_BASE64` — Base64-encoded AuthKey.p8 (decoded by gorush-init)
- `GORUSH_IOS_KEY_ID` / `GORUSH_IOS_TEAM_ID` — Apple Developer credentials
