> **📋 File Migration Info**
> - **Original Location:** `apps/docs/WEBSOCKET_QUICKSTART.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# WebSocket Quick Start Guide

## TL;DR

The WebSocket server has been moved to `docker-compose.web.yml` and supports both Telegram and Internal messaging.

## Quick Setup

### 1. Environment Variables

Add to your `.env` file:

```env
# WebSocket Port
WEBSOCKET_PORT=3001

# Client-side WebSocket URL (what the browser connects to)
NEXT_PUBLIC_WEBSOCKET_URL=https://ws.dev.emr.fajrscientific.org  # Production
# NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001                # Development

# Enable WebSockets (optional, defaults to false)
NEXT_PUBLIC_ENABLE_WEBSOCKETS=true
```

### 2. Deploy

```bash
# Start both web and websocket services
docker-compose -f docker-compose.web.yml up -d --build

# Verify WebSocket server is running
curl https://ws.dev.emr.fajrscientific.org/health
# Should return: "WebSocket server is running"
```

### 3. Test

Open your browser console and check for:
```
[SocketService] Connecting to WebSocket server at: https://ws.dev.emr.fajrscientific.org
Connected to WebSocket server with ID: abc123
```

## What Changed?

### ✅ Moved to docker-compose.web.yml
- WebSocket server is now in `docker-compose.web.yml` (alongside the web service)
- Removed from `docker-compose.services.yml`
- Both services share the `coolify` network

### ✅ Internal Messages Now Support WebSocket
- Created `useInternalWebSocketMessages` hook
- Internal messages get real-time updates just like Telegram messages
- Same WebSocket server, different rooms

### ✅ Unified Socket Service
- Single `socket-service.ts` handles both message types
- Telegram messages use `telegramChatId` as room ID
- Internal messages use `threadId` as room ID

## Architecture

```
Browser
  ↓ (NEXT_PUBLIC_WEBSOCKET_URL)
WebSocket Server (Port 3001)
  ↓ (Socket.IO rooms)
├── Room: telegram-chat-123    → Telegram messages
├── Room: telegram-chat-456    → Telegram messages
└── Room: thread-abc           → Internal messages
```

## URLs Explained

| Variable | Used By | Purpose | Example |
|----------|---------|---------|---------|
| `NEXT_PUBLIC_WEBSOCKET_URL` | Browser | Client connects to WS server | `https://ws.dev.emr.fajrscientific.org` |
| `WEBSOCKET_SERVER_URL` | Next.js Server | Server-to-server communication | `http://websocket-server:3001` |

## Common Issues

### "WebSocket connection failed"

**Solution**: Check that `NEXT_PUBLIC_WEBSOCKET_URL` is correct and accessible from the browser.

```bash
# Test from your local machine
curl https://ws.dev.emr.fajrscientific.org/health
```

### "Messages not appearing in real-time"

**Solution**: Ensure WebSockets are enabled.

```env
NEXT_PUBLIC_ENABLE_WEBSOCKETS=true
```

### "CORS error"

**Solution**: The WebSocket server allows all origins. Check that Caddy proxy is configured correctly with the labels in `docker-compose.web.yml`.

## Verification Checklist

- [ ] `.env` has `NEXT_PUBLIC_WEBSOCKET_URL` set
- [ ] `.env` has `NEXT_PUBLIC_ENABLE_WEBSOCKETS=true`
- [ ] Health endpoint responds: `curl https://ws.dev.emr.fajrscientific.org/health`
- [ ] Browser console shows "Connected to WebSocket server"
- [ ] Sending a message shows real-time updates in other browser tabs
- [ ] Both Telegram and Internal messages work with WebSocket

## Local Development

```bash
# Terminal 1: Start WebSocket server
cd apps/websocket-server
npm install
npm start

# Terminal 2: Start web app
cd apps/web
npm run dev
```

Set in `.env.local`:
```env
NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001
NEXT_PUBLIC_ENABLE_WEBSOCKETS=true
```

## Logs

```bash
# WebSocket server logs
docker logs -f $(docker ps -q -f name=websocket-server)

# Web app logs
docker logs -f $(docker ps -q -f name=web)
```

Look for:
- `[WebSocketServer] Server started successfully`
- `[SocketService] Connecting to WebSocket server at: ...`
- `Connected to WebSocket server with ID: ...`
- `Socket X joined room: ...`

## Rollback (If Needed)

If you need to disable WebSockets temporarily:

```env
NEXT_PUBLIC_ENABLE_WEBSOCKETS=false
```

The app will fall back to HTTP polling for Telegram messages. Internal messages will still work but without real-time updates.

## Next Steps

1. Monitor logs for connection errors
2. Test with multiple users in same thread/chat
3. Test reconnection after server restart
4. Configure Redis adapter for scaling (see `WEBSOCKET_SETUP.md`)

## Files Modified

- ✏️ `docker-compose.web.yml` - Added websocket-server service
- ✏️ `apps/web/components/messages/useInternalWebSocketMessages.ts` - New file
- ✏️ `apps/web/components/messages/InternalMessagesViewModel.ts` - Added WebSocket support
- ✏️ `apps/web/components/patient-chart/telegram-messages/view-model/socket-service.ts` - Support both message types
- ✏️ `apps/websocket-server/server.js` - Support both telegram and internal messages

## Support

For detailed documentation, see `WEBSOCKET_SETUP.md`.