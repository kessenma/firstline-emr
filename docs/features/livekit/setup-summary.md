> **📋 File Migration Info**
> - **Original Location:** `LIVEKIT_SETUP_SUMMARY.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# LiveKit Setup Summary

## What Was Done

I've set up a complete LiveKit server infrastructure for your MedFlow EMR video calling feature. Here's what was created:

## 📁 New Files Created

### 1. LiveKit Server App (`apps/livekit-server/`)
- **Dockerfile** - Container configuration using official LiveKit image
- **config.yaml** - Production-ready LiveKit configuration
- **README.md** - Documentation for the LiveKit server
- **QUICKSTART.md** - Quick reference guide
- **start-local.sh** - Script to start LiveKit locally
- **.dockerignore** - Files to exclude from Docker build

### 2. Docker Compose
- **docker-compose.video.yml** - Separate compose file for LiveKit deployment
  - Configured for Coolify with Caddy labels
  - Exposes necessary ports (7880, 443, 50000-60000)
  - Includes health checks

### 3. Environment Configuration
- **.env.livekit.example** - Example environment variables
- Updated **docker-compose.web.yml** with LiveKit env vars

### 4. Documentation (`apps/docs/livekit/`)
- **SETUP.md** - Complete setup guide (local + production)
- **DEPLOYMENT_CHECKLIST.md** - Step-by-step deployment checklist
- **ARCHITECTURE.md** - System architecture and data flow diagrams

### 5. Code Updates
- **apps/web/components/patient-chart/videocall/VideoCallInterface.tsx**
  - Changed `NEXT_PUBLIC_LIVEKIT_SERVER_URL` to `NEXT_PUBLIC_LIVEKIT_URL`

## 🚀 Quick Start - Local Development

### 1. Add to your `.env` file:

```bash
# LiveKit Configuration
LIVEKIT_URL=ws://localhost:7880
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_PORT=7880
```

### 2. Start LiveKit:

```bash
# Use docker-compose:
docker-compose -f docker-compose.video.yml up -d
```

### 3. Test:

Navigate to: `http://localhost:3000/video?room=test&user=doctor1`

## 🌐 Production Deployment (Coolify)

### 1. Generate API Keys:

```bash
openssl rand -base64 32  # API Key
openssl rand -base64 32  # API Secret
```

### 2. Create LiveKit App in Coolify:

- **Name**: `livekit-server`
- **Docker Compose**: `docker-compose.video.yml`
- **Domain**: `call.dev.emr.fajrscientific.org`

### 3. Add Environment Variables in Coolify:

```bash
LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org
NEXT_PUBLIC_LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org
LIVEKIT_API_KEY=<your_generated_key>
LIVEKIT_API_SECRET=<your_generated_secret>
LIVEKIT_PORT=7880
LIVEKIT_TURN_DOMAIN=call.dev.emr.fajrscientific.org
NODE_ENV=production
```

### 4. Update Web App Environment:

Add the same variables to your web app in Coolify.

### 5. Deploy Both Apps

## 📋 Port Requirements

| Port | Protocol | Purpose | Required |
|------|----------|---------|----------|
| 7880 | TCP | HTTP/WebSocket | Yes |
| 443 | TCP | TURN/TLS | Recommended |
| 50000-60000 | UDP | Media (RTP/RTCP) | Yes |

## 🏗️ Architecture

```
Browser (Doctor/Patient)
    │
    │ HTTPS/WSS
    ▼
Caddy Reverse Proxy (Coolify)
    │
    ├──► Next.js Web App (Port 3000)
    │    └──► MongoDB
    │
    └──► LiveKit Server (Port 7880)
         └──► WebRTC Media
```

## 📚 Documentation

All documentation is in `apps/docs/livekit/`:

1. **SETUP.md** - Complete setup guide
2. **DEPLOYMENT_CHECKLIST.md** - Production deployment checklist
3. **ARCHITECTURE.md** - System architecture details
4. **livekit-local.md** - Running LiveKit locally
5. **livekit-docker.md** - Docker best practices

## ✅ What's Already Working

Your existing video call components are ready:
- ✅ `apps/web/app/video/page.tsx` - Video call page
- ✅ `apps/web/components/patient-chart/videocall/PatientVideoCall.tsx` - Patient component
- ✅ `apps/web/components/patient-chart/videocall/VideoCallInterface.tsx` - Video interface
- ✅ `apps/web/components/patient-chart/videocall/VideoCallView.tsx` - Doctor view
- ✅ `apps/web/components/patient-chart/videocall/VideoCallViewModel.tsx` - Business logic
- ✅ `apps/web/app/api/get-livekit-token/route.ts` - Token generation API

## 🔧 Next Steps

### For Local Testing:
1. Add environment variables to `.env`
2. Run `./apps/livekit-server/start-local.sh`
3. Start your Next.js app
4. Test at `http://localhost:3000/video?room=test&user=doctor1`

### For Production:
1. Follow `apps/docs/livekit/DEPLOYMENT_CHECKLIST.md`
2. Configure domain and SSL in Coolify
3. Generate production API keys
4. Deploy LiveKit app
5. Update web app environment
6. Test thoroughly

## 🐛 Troubleshooting

### Server won't start:
```bash
# Check logs
docker-compose -f docker-compose.video.yml logs -f livekit-server
```

### Can't connect:
- Verify environment variables are set
- Check firewall rules (UDP 50000-60000)
- Verify WebSocket URL is correct
- Check browser console for errors

### No audio/video:
- Check browser permissions
- Verify UDP ports are open
- Test with different network
- Check TURN server configuration

## 📞 Support Resources

- **Setup Guide**: `apps/docs/livekit/SETUP.md`
- **Quick Start**: `apps/livekit-server/QUICKSTART.md`
- **Architecture**: `apps/docs/livekit/ARCHITECTURE.md`
- **LiveKit Docs**: https://docs.livekit.io/
- **LiveKit Community**: https://livekit.io/community

## 🎯 Key Features

- ✅ Dockerized LiveKit server
- ✅ Separate docker-compose for easy deployment
- ✅ Coolify-ready with Caddy labels
- ✅ TURN server for firewall traversal
- ✅ Health checks and monitoring
- ✅ Production-ready configuration
- ✅ Complete documentation
- ✅ Local development support

## 🔐 Security Notes

- API keys are never exposed to client
- Tokens are generated server-side only
- All connections use SSL/TLS
- Tokens are short-lived (< 24 hours)
- TURN server has integrated authentication

## 📊 Scaling

**Current Setup**: Single node (good for < 100 concurrent users)

**Future Scaling**: 
- Add Redis for multi-node coordination
- Deploy multiple LiveKit instances
- Use load balancer for distribution

See `apps/docs/livekit/ARCHITECTURE.md` for details.

---

**Ready to go!** Start with local testing, then follow the deployment checklist for production.
