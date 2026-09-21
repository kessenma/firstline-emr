> **📋 File Migration Info**
> - **Original Location:** `apps/docs/WEBSOCKET_SETUP.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# WebSocket Server Setup Guide

## Overview

The WebSocket server has been integrated into `docker-compose.web.yml` to provide real-time messaging functionality for both **Telegram messages** and **Internal staff messages**.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Web Client    │◄───────►│  WebSocket Server│◄───────►│   Web Service   │
│  (Browser)      │  WS/WSS │   (Port 3001)    │  HTTP   │   (Next.js)     │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                     │
                                     │ Socket.IO rooms
                                     ▼
                    ┌────────────────────────────────┐
                    │  Room: telegram-chat-123       │
                    │  Room: internal-thread-456     │
                    │  Room: telegram-chat-789       │
                    └────────────────────────────────┘
```

## Docker Compose Configuration

### Services

The `docker-compose.web.yml` now includes:

1. **websocket-server**: Standalone WebSocket server
2. **web**: Next.js application (depends on websocket-server)

Both services are on the `coolify` network and can communicate internally.

### Environment Variables

Required environment variables in `.env`:

```env
# WebSocket Configuration
WEBSOCKET_PORT=3001
NEXT_PUBLIC_WEBSOCKET_URL=https://ws.dev.emr.fajrscientific.org  # For production
# NEXT_PUBLIC_WEBSOCKET_URL=http://localhost:3001  # For local development

# Enable WebSockets (optional, defaults to false)
NEXT_PUBLIC_ENABLE_WEBSOCKETS=true
```

### Internal vs External URLs

- **WEBSOCKET_SERVER_URL**: Used by the web service (server-side) to communicate with WebSocket server
  - In Docker: `http://websocket-server:3001`
  
- **NEXT_PUBLIC_WEBSOCKET_URL**: Used by the browser (client-side) to connect to WebSocket server
  - In production: `https://ws.dev.emr.fajrscientific.org` (via Caddy proxy)
  - In development: `http://localhost:3001`

## Caddy Proxy Configuration

The WebSocket server is exposed via Caddy reverse proxy with the following labels:

```yaml
labels:
  caddy: ws.dev.emr.fajrscientific.org
  caddy.@socketio.path: "/socket.io/*"
  caddy.handle.@socketio: "reverse_proxy {{upstreams 3001}}"
  caddy.handle.@socketio.reverse_proxy.transport.versions: "h2c 1.1"
```

This ensures WebSocket upgrade headers are properly handled.

## Usage in Code

### For Telegram Messages

The Telegram messages already use WebSocket via:
- `useWebSocketMessages` hook
- `socket-service.ts` singleton

### For Internal Messages

Internal messages now support WebSocket via:
- `useInternalWebSocketMessages` hook (new)
- Same `socket-service.ts` singleton

Both message types use the same WebSocket server but in different "rooms".

### Example: Joining a Room

```typescript
import socketService from './socket-service';

// For Telegram messages
socketService.connect();
socketService.joinChatRoom(telegramChatId);
socketService.subscribeToMessages(telegramChatId, handleNewMessage);

// For Internal messages
socketService.connect();
socketService.joinChatRoom(threadId);
socketService.subscribeToMessages(threadId, handleNewMessage);
```

### Message Format

**Telegram Message:**
```javascript
{
  _id: "123",
  text: "Hello",
  sender: "patient",
  telegramChatId: "telegram-chat-123",
  timestamp: new Date(),
  type: "text"
}
```

**Internal Message:**
```javascript
{
  _id: "456",
  text: "Hello team",
  sender: "Dr. Smith",
  senderId: "user-789",
  threadId: "thread-abc",
  timestamp: new Date(),
  type: "text"
}
```

## WebSocket Server Features

### Room Management
- Clients join rooms based on `telegramChatId` or `threadId`
- Messages are broadcast only to clients in the same room
- Automatic room cleanup on disconnect

### Message Caching
- Last 50 messages per room are cached in memory
- Useful for clients reconnecting after brief disconnections

### HTTP Endpoints

1. **Health Check**: `GET /health`
   - Returns: `"WebSocket server is running"`

2. **Get Recent Messages**: `GET /api/messages/{roomId}`
   - Returns cached messages for a room

3. **Send Message**: `POST /api/send-message`
   - Body: `{ telegramChatId: "...", message: {...} }`
   - Broadcasts message to all clients in the room

## Deployment Steps

### 1. Local Development

```bash
# Start the WebSocket server
npm run start:websocket

# In another terminal, start the web app
npm run dev
```

### 2. Docker Development

```bash
# Build and start services
docker-compose -f docker-compose.web.yml up --build

# View logs
docker-compose -f docker-compose.web.yml logs -f websocket-server
```

### 3. Production Deployment

```bash
# Deploy with environment variables
docker-compose -f docker-compose.web.yml up -d

# Verify WebSocket server is running
curl https://ws.dev.emr.fajrscientific.org/health
```

## Troubleshooting

### WebSocket Connection Fails

1. **Check environment variables**:
   ```bash
   echo $NEXT_PUBLIC_WEBSOCKET_URL
   echo $NEXT_PUBLIC_ENABLE_WEBSOCKETS
   ```

2. **Check Caddy proxy**:
   - Ensure Caddy is running and configured
   - Check Caddy logs for WebSocket upgrade errors

3. **Check network connectivity**:
   ```bash
   # From web container
   docker exec -it <web-container-id> curl http://websocket-server:3001/health
   ```

### Messages Not Broadcasting

1. **Check room joining**:
   - Look for "joined room" logs in WebSocket server
   - Verify `telegramChatId` or `threadId` matches exactly

2. **Check message handlers**:
   - Ensure `subscribeToMessages` is called before sending
   - Verify message has correct room ID field

### CORS Errors

The WebSocket server allows all origins (`*`). If you see CORS errors:
- Check browser console for exact error
- Verify `NEXT_PUBLIC_WEBSOCKET_URL` matches the URL in the browser
- Ensure Caddy proxy is forwarding headers correctly

## File Structure

```
apps/
├── websocket-server/
│   ├── server.js              # Main WebSocket server
│   ├── package.json
│   └── Dockerfile
│
└── web/
    ├── components/
    │   ├── messages/
    │   │   ├── useInternalWebSocketMessages.ts  # Internal messages WS hook
    │   │   └── InternalMessagesViewModel.ts     # Internal messages logic
    │   │
    │   └── patient-chart/
    │       └── telegram-messages/
    │           └── view-model/
    │               ├── socket-service.ts          # Shared WebSocket service
    │               └── useWebSocketMessages.ts    # Telegram messages WS hook
    │
    └── lib/
        └── websocket-utils.ts   # WebSocket URL utilities
```

## Performance Considerations

- **Connection Pooling**: The socket service is a singleton, so only one connection per client
- **Message Caching**: Limited to 50 messages per room to prevent memory issues
- **Reconnection**: Automatic reconnection with exponential backoff (max 10 attempts)
- **Heartbeat**: Socket.IO handles ping/pong automatically (25s interval, 60s timeout)

## Security Notes

- WebSocket server accepts connections from any origin (for development/testing)
- In production, consider restricting origins via CORS configuration
- All messages should be validated on the server side before broadcasting
- Consider adding authentication tokens to WebSocket connections

## Future Enhancements

- [ ] Add Redis adapter for horizontal scaling across multiple WebSocket servers
- [ ] Implement message persistence to database instead of in-memory cache
- [ ] Add typing indicators and read receipts
- [ ] Implement rate limiting per user
- [ ] Add message encryption for sensitive data
- [ ] Add WebSocket authentication with JWT tokens

## Support

For issues or questions:
1. Check WebSocket server logs: `docker logs <websocket-container-id>`
2. Check web app logs: `docker logs <web-container-id>`
3. Enable debug mode in `socket-service.ts` for verbose logging