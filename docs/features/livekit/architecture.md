> **📋 File Migration Info**
> - **Original Location:** `apps/docs/livekit/ARCHITECTURE.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# LiveKit Architecture for MedFlow EMR

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MedFlow EMR System                              │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   Doctor     │         │   Patient    │         │   Triage     │
│   Browser    │         │   Browser    │         │   Browser    │
└──────┬───────┘         └──────┬───────┘         └──────┬───────┘
       │                        │                        │
       │ HTTPS                  │ HTTPS                  │ HTTPS
       │                        │                        │
       └────────────────────────┼────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Caddy Reverse Proxy │
                    │   (SSL Termination)   │
                    └───────────┬───────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │   Next.js    │ │   LiveKit    │ │  WebSocket   │
        │   Web App    │ │   Server     │ │   Server     │
        │  (Port 3000) │ │ (Port 7880)  │ │ (Port 3001)  │
        └──────┬───────┘ └──────┬───────┘ └──────────────┘
               │                │
               │                │ WebRTC Signaling
               │                │
               ├────────────────┤
               │                │
               ▼                ▼
        ┌──────────────────────────┐
        │       MongoDB            │
        │   (Patient Data, etc.)   │
        └──────────────────────────┘

                                │
                                │ WebRTC Media (Direct P2P or via SFU)
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
        ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
        │   Doctor     │ │   Patient    │ │   Triage     │
        │   Browser    │ │   Browser    │ │   Browser    │
        └──────────────┘ └──────────────┘ └──────────────┘
```

## Component Responsibilities

### Next.js Web App
- **Purpose**: Main application interface
- **Responsibilities**:
  - User authentication
  - Patient management
  - Video call UI
  - Token generation for LiveKit
  - Room management
- **Technologies**: Next.js, React, NextAuth
- **Port**: 3000 (dev), configurable (prod)

### LiveKit Server
- **Purpose**: WebRTC SFU (Selective Forwarding Unit)
- **Responsibilities**:
  - WebRTC signaling
  - Media routing
  - Room management
  - Participant management
  - TURN server (NAT traversal)
- **Technologies**: LiveKit (Go-based)
- **Ports**: 
  - 7880 (HTTP/WebSocket)
  - 443 (TURN/TLS)
  - 50000-60000 (UDP media)

### Caddy Reverse Proxy
- **Purpose**: SSL termination and routing
- **Responsibilities**:
  - SSL/TLS termination
  - Domain routing
  - WebSocket proxying
  - Load balancing
- **Technologies**: Caddy (via Coolify)

## Video Call Flow

### 1. Initiating a Call

```
Doctor                    Web App                  LiveKit
  │                          │                        │
  │ 1. Click "Start Call"    │                        │
  ├─────────────────────────►│                        │
  │                          │                        │
  │                          │ 2. Generate Token      │
  │                          │    (API Key + Secret)  │
  │                          │                        │
  │ 3. Return Token          │                        │
  │◄─────────────────────────┤                        │
  │                          │                        │
  │ 4. Connect to LiveKit    │                        │
  │    (WebSocket + Token)   │                        │
  ├──────────────────────────┼───────────────────────►│
  │                          │                        │
  │                          │    5. Validate Token   │
  │                          │       Create Room      │
  │                          │                        │
  │ 6. Room Joined           │                        │
  │◄─────────────────────────┼────────────────────────┤
  │                          │                        │
```

### 2. Patient Joins Call

```
Patient                   Web App                  LiveKit
  │                          │                        │
  │ 1. Click Link            │                        │
  │    /video?room=X&user=Y  │                        │
  ├─────────────────────────►│                        │
  │                          │                        │
  │                          │ 2. Generate Token      │
  │                          │                        │
  │ 3. Return Token          │                        │
  │◄─────────────────────────┤                        │
  │                          │                        │
  │ 4. Connect to LiveKit    │                        │
  ├──────────────────────────┼───────────────────────►│
  │                          │                        │
  │                          │    5. Join Room        │
  │                          │       Notify Doctor    │
  │                          │                        │
  │ 6. Room Joined           │                        │
  │◄─────────────────────────┼────────────────────────┤
  │                          │                        │
```

### 3. Media Exchange

```
Doctor                    LiveKit                  Patient
  │                          │                        │
  │ 1. Publish Video/Audio   │                        │
  ├─────────────────────────►│                        │
  │                          │                        │
  │                          │ 2. Forward Media       │
  │                          ├───────────────────────►│
  │                          │                        │
  │                          │ 3. Publish Video/Audio │
  │                          │◄───────────────────────┤
  │                          │                        │
  │ 4. Receive Media         │                        │
  │◄─────────────────────────┤                        │
  │                          │                        │
```

## Data Flow

### Token Generation

```typescript
// apps/web/app/api/get-livekit-token/route.ts

1. User requests video call
2. Web app validates user session
3. Web app generates JWT token with:
   - API Key (from env)
   - API Secret (from env)
   - Room name
   - User identity
   - Permissions (roomJoin: true)
4. Token returned to client
5. Client connects to LiveKit with token
```

### Room Management

```typescript
// apps/web/components/patient-chart/videocall/VideoCallViewModel.tsx

1. Doctor creates room (uses their username as room name)
2. Generate shareable link with room name and patient ID
3. Patient clicks link
4. Patient joins room using patient ID as identity
5. Both participants see each other in the room
```

## Network Architecture

### Development (Local)

```
┌─────────────────────────────────────────────────┐
│              localhost                          │
│                                                 │
│  ┌──────────────┐         ┌──────────────┐    │
│  │   Next.js    │         │   LiveKit    │    │
│  │  Port 3000   │◄───────►│  Port 7880   │    │
│  └──────────────┘         └──────────────┘    │
│         │                        │             │
│         └────────────────────────┘             │
│                  │                             │
│                  ▼                             │
│         ┌──────────────┐                       │
│         │   MongoDB    │                       │
│         └──────────────┘                       │
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
└──────┬───────┘ └──────┬───────┘ └──────────────┘
       │                │
       └────────────────┘
              │
              ▼
       ┌──────────────┐
       │   MongoDB    │
       │   (External) │
       └──────────────┘
```

## Security Architecture

### Authentication Flow

```
1. User logs in to Next.js app (NextAuth)
2. Session stored in JWT
3. User requests video call
4. Server validates session
5. Server generates LiveKit token (short-lived)
6. Client connects to LiveKit with token
7. LiveKit validates token signature
8. Connection established
```

### Token Security

- **Generation**: Server-side only
- **Lifetime**: < 24 hours (configurable)
- **Scope**: Specific room and identity
- **Validation**: Signature verified by LiveKit
- **Transmission**: HTTPS/WSS only

### Network Security

- **SSL/TLS**: All connections encrypted
- **Firewall**: Only necessary ports open
- **TURN Auth**: Integrated with LiveKit
- **API Keys**: Never exposed to client

## Scaling Considerations

### Single Node (< 100 concurrent users)

```
┌──────────────────────────┐
│   LiveKit Server         │
│   - 4 CPU cores          │
│   - 8 GB RAM             │
│   - 10 Gbps network      │
└──────────────────────────┘
```

### Multi-Node (> 100 concurrent users)

```
                    ┌──────────────┐
                    │   Redis      │
                    │  (Signaling) │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│   LiveKit    │   │   LiveKit    │   │   LiveKit    │
│   Node 1     │   │   Node 2     │   │   Node 3     │
└──────────────┘   └──────────────┘   └──────────────┘
```

## Monitoring

### Health Checks

- **LiveKit**: `GET /` (HTTP 200)
- **Web App**: `GET /api/health`
- **Frequency**: Every 30 seconds

### Metrics

- **Connection Count**: Active WebSocket connections
- **Room Count**: Active rooms
- **Participant Count**: Total participants
- **Bandwidth**: Ingress/egress per room
- **CPU/Memory**: Server resources

### Logging

- **LiveKit**: Structured JSON logs
- **Web App**: Next.js logs
- **Aggregation**: Coolify log viewer

## Disaster Recovery

### Backup Strategy

- **Configuration**: Version controlled (Git)
- **API Keys**: Stored in secrets manager
- **Logs**: Retained for 30 days

### Recovery Procedures

1. **LiveKit Failure**:
   - Restart container
   - Check logs
   - Verify network connectivity
   - Regenerate tokens if needed

2. **Network Issues**:
   - Verify firewall rules
   - Check DNS resolution
   - Test TURN server
   - Verify SSL certificates

3. **Performance Issues**:
   - Check server resources
   - Review active connections
   - Consider scaling
   - Optimize configuration

## Future Enhancements

### Planned Features

- [ ] Recording functionality
- [ ] Screen sharing
- [ ] Chat during calls
- [ ] Call history/logs
- [ ] Analytics dashboard
- [ ] Multi-party calls (> 2 participants)
- [ ] Mobile app integration

### Scaling Plans

- [ ] Redis for multi-node coordination
- [ ] Load balancer for multiple LiveKit instances
- [ ] CDN for static assets
- [ ] Dedicated TURN servers
- [ ] Geographic distribution

## References

- [LiveKit Documentation](https://docs.livekit.io/)
- [WebRTC Fundamentals](https://webrtc.org/)
- [Next.js Documentation](https://nextjs.org/docs)
- [Coolify Documentation](https://coolify.io/docs)
