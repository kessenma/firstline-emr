> **📋 File Migration Info**
> - **Original Location:** `apps/docs/livekit/TROUBLESHOOTING.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# LiveKit Troubleshooting Guide

Common issues and solutions for LiveKit video calling in MedFlow EMR.

## Connection Issues

### Problem: "Failed to connect to LiveKit server"

**Symptoms:**
- Browser console shows WebSocket connection error
- Video call page shows "Connecting..." indefinitely
- Error: "WebSocket connection failed"

**Solutions:**

1. **Check if LiveKit server is running:**
```bash
# Check Docker container status
docker ps | grep livekit

# Check logs
docker-compose -f docker-compose.video.yml logs livekit-server

# Test health endpoint
curl http://localhost:7880/
```

2. **Verify environment variables:**
```bash
# Check .env file
cat .env | grep LIVEKIT

# Should see:
# LIVEKIT_URL=ws://localhost:7880
# NEXT_PUBLIC_LIVEKIT_URL=ws://localhost:7880
# LIVEKIT_API_KEY=devkey
# LIVEKIT_API_SECRET=secret
```

3. **Check WebSocket URL:**
- Local: `ws://localhost:7880`
- Production: `wss://call.dev.emr.fajrscientific.org`
- Must use `wss://` (not `ws://`) in production

4. **Verify firewall rules:**
```bash
# Check if port 7880 is accessible
telnet localhost 7880

# Or use netcat
nc -zv localhost 7880
```

### Problem: "Token generation failed"

**Symptoms:**
- Error: "Failed to generate token"
- 500 error from `/api/get-livekit-token`
- Console shows "LiveKit Token Error"

**Solutions:**

1. **Check API credentials:**
```bash
# Verify in .env
echo $LIVEKIT_API_KEY
echo $LIVEKIT_API_SECRET

# Should not be empty
```

2. **Verify credentials match:**
- Web app and LiveKit server must use same API key/secret
- Check both `.env` and `config.yaml`

3. **Check server logs:**
```bash
# Web app logs
docker-compose -f docker-compose.web.yml logs web

# Look for token generation errors
```

4. **Test token generation manually:**
```bash
# Install LiveKit CLI
brew install livekit

# Generate test token
lk token create \
  --api-key devkey \
  --api-secret secret \
  --join --room test \
  --identity test-user
```

## Audio/Video Issues

### Problem: "No audio or video"

**Symptoms:**
- Video call connects but no media
- Black screen or frozen video
- No audio heard

**Solutions:**

1. **Check browser permissions:**
- Click lock icon in address bar
- Verify camera and microphone are allowed
- Try refreshing page after granting permissions

2. **Check UDP ports:**
```bash
# Verify UDP ports 50000-60000 are open
sudo lsof -i UDP:50000-60000

# Check firewall rules
sudo iptables -L | grep 50000
```

3. **Test with different network:**
- Try mobile hotspot
- Try different WiFi network
- Corporate firewalls may block UDP

4. **Enable TURN server:**
```yaml
# In config.yaml
turn:
  enabled: true
  domain: call.dev.emr.fajrscientific.org
  tls_port: 443
```

5. **Check browser console:**
- Look for WebRTC errors
- Check for ICE connection failures
- Verify media tracks are published

### Problem: "Poor video quality or lag"

**Symptoms:**
- Choppy video
- Audio cutting out
- High latency

**Solutions:**

1. **Check network bandwidth:**
```bash
# Test internet speed
speedtest-cli

# Minimum requirements:
# - Upload: 2 Mbps per participant
# - Download: 2 Mbps per participant
```

2. **Check server resources:**
```bash
# Check CPU usage
docker stats livekit-server

# Should be < 80% CPU
```

3. **Reduce video quality:**
```typescript
// In VideoCallInterface.tsx
<LiveKitRoom
  token={token}
  serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL!}
  connect
  video={{ resolution: '720p' }} // Try 480p or 360p
>
```

4. **Check for packet loss:**
```bash
# Ping LiveKit server
ping call.dev.emr.fajrscientific.org

# Should have < 1% packet loss
```

## Deployment Issues

### Problem: "Container won't start"

**Symptoms:**
- Docker container exits immediately
- Error in Coolify deployment
- Container status: "Exited"

**Solutions:**

1. **Check Docker logs:**
```bash
docker-compose -f docker-compose.video.yml logs livekit-server

# Look for startup errors
```

2. **Verify configuration:**
```bash
# Check config.yaml syntax
cat apps/livekit-server/config.yaml

# Verify no YAML syntax errors
```

3. **Check environment variables:**
```bash
# List all env vars in container
docker exec livekit-server env | grep LIVEKIT
```

4. **Verify Docker image:**
```bash
# Pull latest LiveKit image
docker pull livekit/livekit-server:latest

# Rebuild container
docker-compose -f docker-compose.video.yml up -d --build
```

### Problem: "SSL/TLS errors"

**Symptoms:**
- "Certificate invalid" error
- "NET::ERR_CERT_AUTHORITY_INVALID"
- WebSocket connection fails with SSL error

**Solutions:**

1. **Verify SSL certificate:**
```bash
# Check certificate
openssl s_client -connect call.dev.emr.fajrscientific.org:443

# Should show valid certificate chain
```

2. **Check Caddy configuration:**
- Verify domain is correct in Coolify
- Check Caddy labels in docker-compose.video.yml
- Ensure SSL is enabled in Coolify

3. **Use correct protocol:**
- Local: `ws://` (no SSL)
- Production: `wss://` (with SSL)

### Problem: "TURN server not working"

**Symptoms:**
- Connection fails on restrictive networks
- Works on WiFi but not on mobile data
- Browser console shows "ICE failed"

**Solutions:**

1. **Verify TURN configuration:**
```yaml
# In config.yaml
turn:
  enabled: true
  domain: call.dev.emr.fajrscientific.org
  tls_port: 443
  udp_port: 3478
```

2. **Check TURN port:**
```bash
# Verify port 443 is open
telnet call.dev.emr.fajrscientific.org 443
```

3. **Test TURN server:**
```bash
# Use TURN test tool
# https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
```

4. **Check firewall rules:**
- Ensure TCP 443 is open
- Ensure UDP 3478 is open

## Browser-Specific Issues

### Chrome/Edge

**Problem: "Camera not detected"**

Solution:
1. Go to `chrome://settings/content/camera`
2. Ensure camera is not blocked
3. Check if other apps are using camera
4. Restart browser

**Problem: "Microphone echo"**

Solution:
1. Enable echo cancellation in Chrome flags
2. Use headphones
3. Reduce speaker volume

### Firefox

**Problem: "WebRTC not working"**

Solution:
1. Go to `about:config`
2. Search for `media.peerconnection.enabled`
3. Ensure it's set to `true`
4. Restart Firefox

### Safari

**Problem: "Camera permission not working"**

Solution:
1. Go to Safari → Settings → Websites → Camera
2. Allow camera access for your domain
3. Restart Safari
4. Clear cache and cookies

## Mobile Issues

### iOS

**Problem: "Video call not working on iPhone"**

Solution:
1. Ensure iOS 14.3 or later
2. Use Safari (not Chrome on iOS)
3. Check camera/microphone permissions in Settings
4. Ensure not in Low Power Mode

### Android

**Problem: "Video call not working on Android"**

Solution:
1. Use Chrome or Firefox
2. Check app permissions in Settings
3. Ensure not in Data Saver mode
4. Try disabling battery optimization

## Performance Issues

### Problem: "High CPU usage"

**Symptoms:**
- Server CPU at 100%
- Slow response times
- Video quality degradation

**Solutions:**

1. **Check active connections:**
```bash
# View LiveKit metrics
curl http://localhost:7880/metrics

# Count active rooms
```

2. **Scale resources:**
- Increase CPU cores
- Add more RAM
- Use faster network

3. **Optimize configuration:**
```yaml
# In config.yaml
rtc:
  # Reduce port range
  port_range_start: 50000
  port_range_end: 50100
```

### Problem: "High memory usage"

**Solutions:**

1. **Check for memory leaks:**
```bash
# Monitor memory over time
docker stats livekit-server
```

2. **Restart container:**
```bash
docker-compose -f docker-compose.video.yml restart livekit-server
```

3. **Increase memory limit:**
```yaml
# In docker-compose.video.yml
services:
  livekit-server:
    deploy:
      resources:
        limits:
          memory: 4G
```

## Debugging Tools

### Browser Console

Check for errors:
```javascript
// Open browser console (F12)
// Look for:
// - WebSocket errors
// - WebRTC errors
// - Token errors
// - Media errors
```

### Network Tab

Check WebSocket connection:
1. Open DevTools → Network tab
2. Filter by "WS" (WebSocket)
3. Look for connection to LiveKit
4. Check status (should be 101 Switching Protocols)

### LiveKit Logs

View detailed logs:
```bash
# Follow logs in real-time
docker-compose -f docker-compose.video.yml logs -f livekit-server

# Search for errors
docker-compose -f docker-compose.video.yml logs livekit-server | grep ERROR

# View last 100 lines
docker-compose -f docker-compose.video.yml logs --tail=100 livekit-server
```

### Test Tools

1. **WebRTC Test:**
   - https://test.webrtc.org/

2. **TURN Test:**
   - https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

3. **Network Test:**
   - https://www.speedtest.net/

## Common Error Messages

### "Failed to get token"

**Cause:** API credentials mismatch or missing

**Fix:**
```bash
# Check environment variables
echo $LIVEKIT_API_KEY
echo $LIVEKIT_API_SECRET

# Restart web app after updating
docker-compose -f docker-compose.web.yml restart web
```

### "Room not found"

**Cause:** Room doesn't exist or auto-create disabled

**Fix:**
```yaml
# In config.yaml
room:
  auto_create: true
```

### "Unauthorized"

**Cause:** Invalid or expired token

**Fix:**
1. Check token expiration
2. Verify API key/secret match
3. Generate new token

### "ICE connection failed"

**Cause:** Network/firewall blocking WebRTC

**Fix:**
1. Enable TURN server
2. Check UDP ports
3. Test with different network

## Getting Help

### Before Asking for Help

Gather this information:

1. **Environment:**
   - Local or production?
   - Browser and version
   - Operating system
   - Network type (WiFi, mobile, corporate)

2. **Logs:**
   ```bash
   # LiveKit logs
   docker-compose -f docker-compose.video.yml logs livekit-server > livekit.log
   
   # Web app logs
   docker-compose -f docker-compose.web.yml logs web > web.log
   
   # Browser console
   # Copy all errors from browser console
   ```

3. **Configuration:**
   ```bash
   # Environment variables (redact secrets!)
   cat .env | grep LIVEKIT
   
   # Config file
   cat apps/livekit-server/config.yaml
   ```

### Support Resources

1. **Documentation:**
   - `apps/docs/livekit/SETUP.md`
   - `apps/docs/livekit/ARCHITECTURE.md`
   - `apps/livekit-server/README.md`

2. **LiveKit Resources:**
   - [LiveKit Docs](https://docs.livekit.io/)
   - [LiveKit Community](https://livekit.io/community)
   - [LiveKit GitHub](https://github.com/livekit/livekit)

3. **WebRTC Resources:**
   - [WebRTC.org](https://webrtc.org/)
   - [MDN WebRTC Guide](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

## Quick Fixes Checklist

When something goes wrong, try these in order:

- [ ] Check if LiveKit container is running
- [ ] Verify environment variables are set
- [ ] Check browser console for errors
- [ ] Test with different browser
- [ ] Test with different network
- [ ] Restart LiveKit container
- [ ] Restart web app container
- [ ] Check firewall rules
- [ ] Verify SSL certificate
- [ ] Review LiveKit logs
- [ ] Clear browser cache
- [ ] Try incognito/private mode
- [ ] Check server resources (CPU, memory)
- [ ] Verify UDP ports are open
- [ ] Test TURN server
- [ ] Generate new API keys

If none of these work, gather logs and configuration, then seek help from the support resources above.
