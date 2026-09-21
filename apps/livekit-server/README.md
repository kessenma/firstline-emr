# LiveKit Server

This directory contains the LiveKit server configuration and Docker setup for video calling functionality.

## Overview

LiveKit is a WebRTC SFU (Selective Forwarding Unit) that enables real-time video and audio communication. This setup is configured to work with the MedFlow EMR application.

## Local Development

### Prerequisites

- Docker and Docker Compose
- LiveKit CLI (optional, for testing): `brew install livekit`

### Running Locally

1. Start the LiveKit server:
```bash
docker-compose -f docker-compose.video.yml up
```

2. The server will be available at:
   - WebSocket: `ws://localhost:7880`
   - HTTP API: `http://localhost:7880`

### Testing Connection

You can test the connection using the LiveKit CLI:

```bash
# Generate a test token
lk token create \
  --api-key devkey \
  --api-secret secret \
  --join --room test-room \
  --identity test-user \
  --valid-for 24h

# Or use the web interface at http://localhost:7880
```

## Configuration

### Environment Variables

The following environment variables are required:

- `LIVEKIT_URL`: WebSocket URL for the LiveKit server
- `LIVEKIT_API_KEY`: API key for authentication
- `LIVEKIT_API_SECRET`: API secret for authentication
- `LIVEKIT_TURN_DOMAIN`: Domain for TURN server (optional, for better connectivity)

### Production Deployment

For production deployment with Coolify:

1. The server requires UDP ports 50000-60000 for media traffic
2. TURN server on port 443 for firewall traversal
3. SSL certificate for secure connections
4. External IP address or STUN server for NAT traversal

## Integration with Web App

The web app connects to LiveKit using the `@livekit/components-react` library. See:

- `apps/web/app/video/page.tsx` - Video call page
- `apps/web/components/patient-chart/videocall/` - Video call components
- `apps/web/app/api/get-livekit-token/route.ts` - Token generation API

## Architecture

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Browser   │◄───────►│   Next.js    │◄───────►│  LiveKit    │
│   Client    │  HTTPS  │   Web App    │   HTTP  │   Server    │
└─────────────┘         └──────────────┘         └─────────────┘
                              │                         │
                              │                         │
                              ▼                         ▼
                        ┌──────────┐            ┌──────────┐
                        │ MongoDB  │            │  Redis   │
                        └──────────┘            └──────────┘
```

## Troubleshooting

### Connection Issues

1. Check that UDP ports 50000-60000 are open
2. Verify TURN server is configured correctly
3. Check firewall rules
4. Ensure external IP is correctly detected

### Audio/Video Issues

1. Check browser permissions for camera/microphone
2. Verify WebRTC is supported in the browser
3. Check network connectivity
4. Review LiveKit server logs

## Resources

- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit Server GitHub](https://github.com/livekit/livekit)
- [LiveKit React Components](https://docs.livekit.io/reference/components/react/)
