# LiveKit Server - Quick Start

## What Was Created

This setup includes:

1. **LiveKit Server App** (`apps/livekit-server/`)
   - Dockerfile for containerized deployment
   - Configuration file (`config.yaml`)
   - README with documentation
   - Local development startup script

2. **Docker Compose** (`docker-compose.video.yml`)
   - Separate compose file for LiveKit
   - Configured for Coolify deployment
   - Includes Caddy labels for reverse proxy

3. **Environment Variables**
   - Added to `docker-compose.web.yml`
   - Example file: `.env.livekit.example`

4. **Documentation** (`apps/docs/livekit/`)
   - Setup guide
   - Deployment checklist
   - Local development guide

## Quick Start - Local Development

### 1. Add Environment Variables

Add these to your `.env` file:

```bash
# LiveKit Configuration
LIVEKIT_URL=ws://localhost:7880
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_PORT=7880
```

### 2. Start LiveKit Server

```bash
# Use docker-compose:
docker-compose -f docker-compose.video.yml up -d

# Check if it's running:
docker ps | grep livekit

# View logs:
docker-compose -f docker-compose.video.yml logs -f
```

### 3. Start Your Web App

```bash
cd apps/web
npm run dev
```

### 4. Test Video Call

Navigate to: `http://localhost:3000/video?room=test&user=doctor1`

Open another browser tab with: `http://localhost:3000/video?room=test&user=patient1`

## Quick Start - Production (Coolify)

### 1. Generate API Keys

```bash
# Generate API key
openssl rand -base64 32

# Generate API secret
openssl rand -base64 32
```

### 2. Create LiveKit App in Coolify

1. Create new app
2. Set Docker Compose file: `docker-compose.video.yml`
3. Configure domain: `call.dev.emr.fajrscientific.org`
4. Add environment variables:

```bash
LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org
NEXT_PUBLIC_LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org
LIVEKIT_API_KEY=<your_generated_key>
LIVEKIT_API_SECRET=<your_generated_secret>
LIVEKIT_PORT=7880
LIVEKIT_TURN_DOMAIN=call.dev.emr.fajrscientific.org
NODE_ENV=production
```

### 3. Update Web App Environment

Add the same variables to your web app in Coolify.

### 4. Deploy

Deploy both apps in Coolify.

### 5. Test

Navigate to: `https://your-app.com/video?room=test&user=doctor1`

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Browser       │         │   Next.js Web    │         │   LiveKit       │
│   (Patient/Dr)  │◄───────►│   Application    │◄───────►│   Server        │
│                 │  HTTPS  │                  │   WSS   │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
     WebRTC ◄──────────────────────────────────────────────────┘
```

## Port Requirements

| Port | Protocol | Purpose |
|------|----------|---------|
| 7880 | TCP | HTTP/WebSocket API |
| 443 | TCP | TURN/TLS |
| 50000-60000 | UDP | Media (RTP/RTCP) |

## Files Modified

1. `docker-compose.web.yml` - Added LiveKit environment variables
2. `apps/web/components/patient-chart/videocall/VideoCallInterface.tsx` - Updated to use `NEXT_PUBLIC_LIVEKIT_URL`

## Files Created

1. `apps/livekit-server/Dockerfile`
2. `apps/livekit-server/config.yaml`
3. `apps/livekit-server/README.md`
4. `apps/livekit-server/start-local.sh`
5. `apps/livekit-server/.dockerignore`
6. `docker-compose.video.yml`
7. `.env.livekit.example`
8. `apps/docs/livekit/SETUP.md`
9. `apps/docs/livekit/DEPLOYMENT_CHECKLIST.md`

## Next Steps

1. **Local Development:**
   - Run `./apps/livekit-server/start-local.sh`
   - Test video calls locally

2. **Production Deployment:**
   - Follow `apps/docs/livekit/DEPLOYMENT_CHECKLIST.md`
   - Configure domain and SSL
   - Deploy to Coolify

3. **Testing:**
   - Test with multiple participants
   - Test on different networks
   - Test on mobile devices

## Troubleshooting

### Server won't start
- Check Docker is running
- Verify environment variables are set
- Check logs: `docker-compose -f docker-compose.video.yml logs`

### Can't connect to video call
- Verify LiveKit server is running
- Check browser console for errors
- Verify WebSocket URL is correct
- Check firewall rules

### No audio/video
- Check browser permissions
- Verify UDP ports are open
- Test with different network
- Check TURN server configuration

## Resources

- [Full Setup Guide](../docs/livekit/SETUP.md)
- [Deployment Checklist](../docs/livekit/DEPLOYMENT_CHECKLIST.md)
- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit React Components](https://docs.livekit.io/reference/components/react/)

## Support

For issues or questions:
1. Check the documentation in `apps/docs/livekit/`
2. Review LiveKit documentation
3. Check Docker logs
4. Contact your team lead
