# LiveKit Integration with MedFlow EMR

## How It Works

This document explains how LiveKit integrates with your existing MedFlow EMR application.

## Component Integration

### 1. Video Call Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                     Doctor Initiates Video Call                     │
└─────────────────────────────────────────────────────────────────────┘

Step 1: Doctor clicks "Start Call" in VideoCallView.tsx
   │
   ├──► VideoCallViewModel.tsx generates room link
   │    - Room name: Doctor's username
   │    - User param: Patient ID
   │
   └──► Calls getToken() to fetch LiveKit token

Step 2: Web app generates token
   │
   ├──► POST /api/get-livekit-token
   │    - Validates session (NextAuth)
   │    - Creates JWT with LiveKit SDK
   │    - Signs with API key/secret
   │
   └──► Returns token to client

Step 3: Doctor joins room
   │
   ├──► VideoCallInterface.tsx renders LiveKitRoom
   │    - Connects to LiveKit server via WebSocket
   │    - Authenticates with token
   │    - Publishes video/audio tracks
   │
   └──► Room is created and ready

Step 4: Patient joins via link
   │
   ├──► Patient clicks link: /video?room=doctor1&user=patient123
   │    - PatientVideoCall.tsx fetches token
   │    - Connects to same room
   │
   └──► Both participants see each other
```

## File Relationships

### Frontend Components

```
apps/web/app/video/page.tsx
    │
    └──► PatientVideoCall.tsx
            │
            ├──► Fetches token from API
            │
            └──► VideoCallInterface.tsx
                    │
                    ├──► LiveKitRoom (from @livekit/components-react)
                    │    - Handles WebRTC connection
                    │    - Manages media tracks
                    │
                    └──► VideoConference (from @livekit/components-react)
                         - Renders video tiles
                         - Controls (mute, camera, etc.)
```

### Doctor's View

```
apps/web/components/patient-chart/videocall/VideoCallView.tsx
    │
    └──► VideoCallViewModel.tsx
            │
            ├──► generateRoomLink()
            │    - Creates shareable link
            │    - Room = doctor's username
            │    - User = patient ID
            │
            ├──► getToken(roomName)
            │    - Calls /api/get-livekit-token
            │    - Returns JWT token
            │
            └──► scheduleCall()
                 - Schedules future calls
```

### Backend API

```
apps/web/app/api/get-livekit-token/route.ts
    │
    ├──► Validates NextAuth session
    │
    ├──► Creates AccessToken (from livekit-server-sdk)
    │    - Identity: userName (from request)
    │    - Room: roomName (from request)
    │    - Grant: roomJoin permission
    │
    └──► Signs token with API key/secret
         - Returns JWT to client
```

## Data Flow

### Token Generation

```typescript
// 1. Client requests token
const response = await fetch("/api/get-livekit-token", {
    method: "POST",
    body: JSON.stringify({ 
        roomName: "doctor1", 
        userName: "patient123" 
    })
});

// 2. Server generates token
const at = new AccessToken(
    process.env.LIVEKIT_API_KEY,
    process.env.LIVEKIT_API_SECRET,
    { identity: "patient123" }
);
at.addGrant({ roomJoin: true, room: "doctor1" });
const token = await at.toJwt();

// 3. Client connects to LiveKit
<LiveKitRoom
    token={token}
    serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
    connect
/>
```

### Room Management

```typescript
// Doctor creates room
const roomLink = generateRoomLink();
// Returns: /video?room=doctor1&user=patient123

// Patient joins room
// Both use same room name but different identities
// LiveKit manages the connection
```

## Environment Variables Flow

### Development

```
.env file
    │
    ├──► LIVEKIT_URL=ws://localhost:7880
    │    └──► Used by server-side API routes
    │
    ├──► NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
    │    └──► Used by client-side components
    │
    ├──► LIVEKIT_API_KEY=devkey
    │    └──► Used to sign tokens
    │
    └──► LIVEKIT_API_SECRET=secret
         └──► Used to sign tokens
```

### Production

```
Coolify Environment Variables
    │
    ├──► Web App Container
    │    ├──► LIVEKIT_URL (server-side)
    │    ├──► NEXT_PUBLIC_LIVEKIT_URL (client-side)
    │    ├──► LIVEKIT_API_KEY
    │    └──► LIVEKIT_API_SECRET
    │
    └──► LiveKit Container
         ├──► LIVEKIT_API_KEY (must match web app)
         └──► LIVEKIT_API_SECRET (must match web app)
```

## Network Communication

### WebSocket Connection

```
Browser                    Next.js                    LiveKit
   │                          │                          │
   │ 1. Request token         │                          │
   ├─────────────────────────►│                          │
   │                          │                          │
   │                          │ 2. Generate JWT          │
   │                          │    (with API key/secret) │
   │                          │                          │
   │ 3. Return token          │                          │
   │◄─────────────────────────┤                          │
   │                          │                          │
   │ 4. Connect WebSocket     │                          │
   │    (with token)          │                          │
   ├──────────────────────────┼─────────────────────────►│
   │                          │                          │
   │                          │    5. Validate token     │
   │                          │       Create/join room   │
   │                          │                          │
   │ 6. WebSocket established │                          │
   │◄─────────────────────────┼──────────────────────────┤
   │                          │                          │
```

### Media Exchange (WebRTC)

```
Doctor Browser                                    Patient Browser
      │                                                 │
      │ 1. Publish video/audio tracks                  │
      ├────────────────────────────────────────────────►│
      │            (via LiveKit SFU)                    │
      │                                                 │
      │                                                 │
      │ 2. Receive video/audio tracks                  │
      │◄────────────────────────────────────────────────┤
      │            (via LiveKit SFU)                    │
      │                                                 │
```

## Security Flow

### Authentication Chain

```
1. User Authentication (NextAuth)
   │
   ├──► User logs in to web app
   │    - Email/password or Google OAuth
   │    - Session stored in JWT
   │
   └──► Session validated on every request

2. Video Call Authorization
   │
   ├──► User requests video call
   │    - Session checked by getServerSession()
   │    - Only authenticated users can proceed
   │
   └──► Token generated if authorized

3. LiveKit Authentication
   │
   ├──► Client connects with token
   │    - LiveKit validates JWT signature
   │    - Checks token expiration
   │    - Verifies room permissions
   │
   └──► Connection established if valid
```

## Integration Points

### 1. Patient Dashboard → Video Call

```typescript
// In patient dashboard
<Button onClick={() => {
    // Generate video call link
    const link = generateRoomLink();
    // Copy to clipboard or send to patient
}}>
    Start Video Call
</Button>
```

### 2. Patient Chart → Video Call

```typescript
// In patient chart view
<VideoCallView />
// Integrated component that shows:
// - Start call now
// - Schedule call for later
// - Copy link to share
```

### 3. Telegram → Video Call

```typescript
// Future integration
// Send video call link via Telegram
await sendTelegramMessage(
    patientChatId,
    `Join video call: ${videoCallLink}`
);
```

## Deployment Architecture

### Local Development

```
┌─────────────────────────────────────────────────┐
│              localhost                          │
│                                                 │
│  ┌──────────────┐         ┌──────────────┐    │
│  │   Next.js    │         │   LiveKit    │    │
│  │  Port 3000   │◄───────►│  Port 7880   │    │
│  └──────────────┘         └──────────────┘    │
│                                                 │
└─────────────────────────────────────────────────┘
```

### Production (Coolify)

```
┌─────────────────────────────────────────────────────────┐
│                    Internet                             │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
            ┌────────────────────────┐
            │   Caddy (Coolify)      │
            │   SSL Termination      │
            └────────┬───────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Next.js    │ │   LiveKit    │ │  WebSocket   │
│   Container  │ │   Container  │ │   Container  │
│              │ │              │ │              │
│ web.dev.emr  │ │livekit.dev   │ │ ws.dev.emr   │
│ .fajr...org  │ │.emr.fajr...  │ │ .fajr...org  │
└──────────────┘ └──────────────┘ └──────────────┘
```

## Configuration Files

### docker-compose.video.yml

```yaml
services:
  livekit-server:
    build: ./apps/livekit-server
    environment:
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
    ports:
      - "7880:7880"  # WebSocket
      - "443:443"    # TURN/TLS
      - "50000-60000:50000-60000/udp"  # Media
```

### docker-compose.web.yml

```yaml
services:
  web:
    environment:
      - LIVEKIT_URL=${LIVEKIT_URL}
      - NEXT_PUBLIC_LIVEKIT_URL=${NEXT_PUBLIC_LIVEKIT_URL}
      - LIVEKIT_API_KEY=${LIVEKIT_API_KEY}
      - LIVEKIT_API_SECRET=${LIVEKIT_API_SECRET}
```

## Testing Integration

### 1. Test Token Generation

```bash
# Start both services
docker-compose -f docker-compose.web.yml up -d
docker-compose -f docker-compose.video.yml up -d

# Test token API
curl -X POST http://localhost:3000/api/get-livekit-token \
  -H "Content-Type: application/json" \
  -d '{"roomName":"test","userName":"user1"}'
```

### 2. Test Video Call

```bash
# Open two browser tabs
# Tab 1: http://localhost:3000/video?room=test&user=doctor1
# Tab 2: http://localhost:3000/video?room=test&user=patient1

# Both should connect and see each other
```

### 3. Test TURN Server

```bash
# Check TURN server is running
curl http://localhost:7880/

# Test TURN connectivity
# Use: https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
```

## Monitoring Integration

### Health Checks

```typescript
// Add to your monitoring system
const checkLiveKit = async () => {
    const response = await fetch('http://localhost:7880/');
    return response.ok;
};

// Check every 30 seconds
setInterval(checkLiveKit, 30000);
```

### Metrics

```typescript
// Optional: Enable Prometheus metrics
// In config.yaml:
// prometheus_port: 6789

// Scrape metrics
const metrics = await fetch('http://localhost:6789/metrics');
```

## Future Enhancements

### 1. Recording

```typescript
// Add recording capability
const startRecording = async (roomName: string) => {
    // Use LiveKit Egress API
    // Save recordings to object storage
};
```

### 2. Screen Sharing

```typescript
// Already supported by LiveKit components
<VideoConference 
    screenShareEnabled={true}
/>
```

### 3. Chat

```typescript
// Add text chat during calls
import { Chat } from '@livekit/components-react';

<Chat />
```

### 4. Call History

```typescript
// Store call metadata in MongoDB
interface CallHistory {
    roomName: string;
    participants: string[];
    startTime: Date;
    endTime: Date;
    duration: number;
}
```

## Summary

LiveKit is now fully integrated with your MedFlow EMR application:

✅ **Dockerized** - Runs in its own container
✅ **Isolated** - Separate docker-compose file
✅ **Secure** - Token-based authentication
✅ **Scalable** - Ready for production
✅ **Documented** - Complete guides and troubleshooting
✅ **Tested** - Local development ready

The integration is minimal and non-invasive:
- Added 4 environment variables
- Updated 1 component (VideoCallInterface.tsx)
- No changes to existing business logic
- Works with your existing authentication

You can now deploy to Coolify and start using video calls!
