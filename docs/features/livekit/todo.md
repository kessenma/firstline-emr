> **📋 File Migration Info**
> - **Original Location:** `LIVEKIT_TODO.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# LiveKit Setup - TODO Checklist

Use this checklist to complete your LiveKit setup.

## ✅ Completed (Already Done)

- [x] Created LiveKit server app structure
- [x] Created Dockerfile for LiveKit
- [x] Created docker-compose.video.yml
- [x] Updated docker-compose.web.yml with env vars
- [x] Updated VideoCallInterface.tsx to use correct env var
- [x] Created comprehensive documentation
- [x] Created startup scripts
- [x] Created troubleshooting guide

## 📋 Next Steps - Local Development

### 1. Add Environment Variables

- [ ] Copy variables from `.env.livekit.example` to your `.env` file:

```bash
# Add these to your .env file:
LIVEKIT_URL=ws://localhost:7880
NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
LIVEKIT_API_KEY=devkey
LIVEKIT_API_SECRET=secret
LIVEKIT_PORT=7880
```

### 2. Test Locally

- [ ] Start LiveKit server:
```bash
# Just use docker-compose directly:
docker-compose -f docker-compose.video.yml up -d

# (Optional: You can also use the convenience script)
# ./apps/livekit-server/start-local.sh
```

- [ ] Verify LiveKit is running:
```bash
curl http://localhost:7880/
# Should return: OK or similar response
```

- [ ] Check logs:
```bash
docker-compose -f docker-compose.video.yml logs -f livekit-server
```

- [ ] Start your Next.js app:
```bash
cd apps/web
npm run dev
```

- [ ] Test video call:
  - [ ] Open: `http://localhost:3000/video?room=test&user=doctor1`
  - [ ] Allow camera/microphone permissions
  - [ ] Open second tab: `http://localhost:3000/video?room=test&user=patient1`
  - [ ] Verify both participants can see/hear each other

### 3. Test Integration

- [ ] Test from patient dashboard
- [ ] Test from patient chart
- [ ] Test token generation API
- [ ] Test with different browsers
- [ ] Test on mobile device (optional)

## 🚀 Production Deployment - Coolify

### 1. Pre-Deployment

- [ ] Read `apps/docs/livekit/DEPLOYMENT_CHECKLIST.md`
- [ ] Ensure you have a domain: `call.dev.emr.fajrscientific.org`
- [ ] Configure DNS A record
- [ ] Verify DNS propagation: `nslookup call.dev.emr.fajrscientific.org`

### 2. Generate Production Credentials

- [ ] Generate API key:
```bash
openssl rand -base64 32
# Save this securely!
```

- [ ] Generate API secret:
```bash
openssl rand -base64 32
# Save this securely!
```

- [ ] Store credentials in password manager
- [ ] **Never commit these to Git!**

### 3. Create LiveKit App in Coolify

- [ ] Log in to Coolify
- [ ] Create new app
- [ ] Name: `livekit-server`
- [ ] Repository: Your repo
- [ ] Docker Compose file: `docker-compose.video.yml`
- [ ] Domain: `call.dev.emr.fajrscientific.org`
- [ ] Enable SSL/TLS

### 4. Configure LiveKit Environment in Coolify

Add these environment variables to the LiveKit app:

- [ ] `LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org`
- [ ] `NEXT_PUBLIC_LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org`
- [ ] `LIVEKIT_API_KEY=<your_generated_key>`
- [ ] `LIVEKIT_API_SECRET=<your_generated_secret>`
- [ ] `LIVEKIT_PORT=7880`
- [ ] `LIVEKIT_TURN_DOMAIN=call.dev.emr.fajrscientific.org`
- [ ] `NODE_ENV=production`

### 5. Update Web App Environment in Coolify

Add these to your existing web app:

- [ ] `LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org`
- [ ] `NEXT_PUBLIC_LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org`
- [ ] `LIVEKIT_API_KEY=<same_as_livekit_server>`
- [ ] `LIVEKIT_API_SECRET=<same_as_livekit_server>`

### 6. Configure Firewall/Network

- [ ] Open TCP port 7880 (HTTP/WebSocket)
- [ ] Open TCP port 443 (TURN/TLS)
- [ ] Open UDP ports 50000-60000 (media traffic)
- [ ] Configure security groups (if cloud provider)
- [ ] Verify external IP is accessible

### 7. Deploy

- [ ] Deploy LiveKit app in Coolify
- [ ] Wait for build to complete
- [ ] Check deployment logs
- [ ] Verify container is running
- [ ] Deploy/restart web app with new env vars

### 8. Test Production Deployment

- [ ] Test health endpoint:
```bash
curl https://call.dev.emr.fajrscientific.org/
```

- [ ] Test WebSocket connection (browser console)
- [ ] Test video call:
  - [ ] Navigate to: `https://your-app.com/video?room=test&user=doctor1`
  - [ ] Allow permissions
  - [ ] Open second tab with different user
  - [ ] Verify connection works

- [ ] Test from different networks:
  - [ ] Office WiFi
  - [ ] Mobile data
  - [ ] VPN (if applicable)

- [ ] Test on different devices:
  - [ ] Desktop browser
  - [ ] Mobile browser
  - [ ] Tablet (optional)

### 9. Monitor

- [ ] Set up health check monitoring
- [ ] Configure alerts for downtime
- [ ] Check logs regularly for first week
- [ ] Monitor server resources (CPU, memory)

## 📚 Documentation Review

- [ ] Read `apps/livekit-server/QUICKSTART.md`
- [ ] Read `apps/docs/livekit/SETUP.md`
- [ ] Read `apps/docs/livekit/ARCHITECTURE.md`
- [ ] Read `apps/docs/livekit/TROUBLESHOOTING.md`
- [ ] Bookmark these for reference

## 🔒 Security Checklist

- [ ] API keys are not in Git
- [ ] API keys are different for dev/prod
- [ ] SSL/TLS is enabled in production
- [ ] Tokens are generated server-side only
- [ ] Token expiration is set (< 24 hours)
- [ ] Firewall rules are configured
- [ ] Only necessary ports are open

## 📝 Team Communication

- [ ] Document the new video call feature
- [ ] Train team on how to use it
- [ ] Create user guide for doctors/patients
- [ ] Document troubleshooting steps
- [ ] Share this checklist with team

## 🎯 Optional Enhancements

- [ ] Set up Prometheus metrics
- [ ] Configure Redis for multi-node (if scaling)
- [ ] Add call recording functionality
- [ ] Add screen sharing
- [ ] Add text chat during calls
- [ ] Store call history in MongoDB
- [ ] Add call scheduling notifications

## 🐛 If Something Goes Wrong

1. **Check the logs:**
```bash
# LiveKit logs
docker-compose -f docker-compose.video.yml logs livekit-server

# Web app logs
docker-compose -f docker-compose.web.yml logs web
```

2. **Review troubleshooting guide:**
   - `apps/docs/livekit/TROUBLESHOOTING.md`

3. **Common issues:**
   - Environment variables not set
   - Firewall blocking UDP ports
   - SSL certificate issues
   - API key mismatch

4. **Get help:**
   - Check LiveKit documentation
   - Review your logs
   - Ask in LiveKit community

## ✨ Success Criteria

You'll know it's working when:

- [ ] LiveKit container starts without errors
- [ ] Health endpoint returns 200 OK
- [ ] Token generation API works
- [ ] Two users can join the same room
- [ ] Video and audio work both ways
- [ ] Connection works on different networks
- [ ] No errors in browser console
- [ ] No errors in server logs

## 📊 Performance Benchmarks

After deployment, verify:

- [ ] Connection time < 3 seconds
- [ ] Video quality is good (720p)
- [ ] Audio is clear with no echo
- [ ] Latency < 500ms
- [ ] CPU usage < 50% (idle)
- [ ] Memory usage < 2GB (idle)

## 🎉 When Complete

- [ ] Mark deployment date: _______________
- [ ] Document any issues encountered
- [ ] Share success with team
- [ ] Plan for user training
- [ ] Schedule follow-up review in 1 week

---

## Quick Reference

**Local URLs:**
- LiveKit: `ws://localhost:7880`
- Web App: `http://localhost:3000`
- Test Call: `http://localhost:3000/video?room=test&user=doctor1`

**Production URLs:**
- LiveKit: `wss://call.dev.emr.fajrscientific.org`
- Web App: `https://your-app.com`
- Test Call: `https://your-app.com/video?room=test&user=doctor1`

**Important Files:**
- Config: `apps/livekit-server/config.yaml`
- Docker Compose: `docker-compose.video.yml`
- Env Example: `.env.livekit.example`
- Startup Script: `apps/livekit-server/start-local.sh`

**Documentation:**
- Quick Start: `apps/livekit-server/QUICKSTART.md`
- Setup Guide: `apps/docs/livekit/SETUP.md`
- Troubleshooting: `apps/docs/livekit/TROUBLESHOOTING.md`
- Architecture: `apps/docs/livekit/ARCHITECTURE.md`
- Integration: `apps/livekit-server/INTEGRATION.md`

**Support:**
- LiveKit Docs: https://docs.livekit.io/
- LiveKit Community: https://livekit.io/community
- WebRTC Test: https://test.webrtc.org/

---

Good luck with your deployment! 🚀
