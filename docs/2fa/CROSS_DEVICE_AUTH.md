# Cross-Device Passkey Authentication (Future)

## Feature Flag

`CROSS_DEVICE_PASSKEY_AUTH=true` (default: `false`)

Currently scaffolded as a feature flag only. Implementation deferred until Phases 1-5 are stable in production.

## Concept

Allow users on a desktop web browser (e.g., Windows PC) to authenticate using their mobile device's passkey (Face ID / Touch ID) without needing to enter a TOTP code.

## Proposed Flow

1. **Web login page** shows "Authenticate with phone" button (hidden behind feature flag)
2. User clicks button
3. **Web** calls `POST /api/auth/cross-device/request` → creates auth request record
4. **Server** sends push notification to user's registered devices via `PushNotificationService`
5. **Push payload**: `{ type: 'cross_device_auth', sessionId: '...', challenge: '...' }`
6. **Mobile app** receives push → shows passkey prompt (Face ID / Touch ID)
7. User authenticates on mobile
8. **Mobile** sends result to `POST /api/auth/cross-device/complete` with sessionId + passkey result
9. **Web** polls `GET /api/auth/cross-device/status?sessionId=xxx` every 2 seconds
10. Once completed, web receives auth token and completes login

## Required Infrastructure

### Database Table
```sql
CREATE TABLE cross_device_auth_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id VARCHAR(255) NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, completed, expired, cancelled
  challenge TEXT NOT NULL,
  result TEXT, -- Encrypted auth token on completion
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL, -- 5 minutes from creation
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);
```

### API Routes
- `POST /api/auth/cross-device/request` — Create request, send push notification
- `GET /api/auth/cross-device/status` — Poll for completion (web)
- `POST /api/auth/cross-device/complete` — Submit passkey result (mobile)

### Push Notification
- New payload type in `PushNotificationService`
- Mobile app handler in notification routing

### Mobile Handler
- Deep link or notification handler that opens passkey prompt
- Sends result back to server

## Considerations

- **Timeout**: Requests expire after 5 minutes
- **Security**: Only works for users with push devices registered
- **Fallback**: TOTP code entry remains available if cross-device fails
- **WebSocket alternative**: Polling can be replaced with WebSocket for real-time updates (lower priority)
