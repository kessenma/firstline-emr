# Production Configuration for Firstline LiveKit

## Your Production Setup

### Domain
```
call.dev.firstline.care
```

### Environment Variables for Coolify

#### LiveKit Server App
```bash
LIVEKIT_URL=wss://call.dev.firstline.care
NEXT_PUBLIC_LIVEKIT_URL=wss://call.dev.firstline.care
LIVEKIT_API_KEY=<generate_with_openssl>
LIVEKIT_API_SECRET=<generate_with_openssl>
LIVEKIT_PORT=7880
LIVEKIT_TURN_DOMAIN=call.dev.firstline.care
NODE_ENV=production
```

#### Web App (Add these to existing env vars)
```bash
LIVEKIT_URL=wss://call.dev.firstline.care
NEXT_PUBLIC_LIVEKIT_URL=wss://call.dev.firstline.care
LIVEKIT_API_KEY=<same_as_livekit_server>
LIVEKIT_API_SECRET=<same_as_livekit_server>
```

### Generate API Credentials

```bash
# Generate API Key
openssl rand -base64 32

# Generate API Secret
openssl rand -base64 32
```

**Important:** 
- Use the same API key/secret for both LiveKit server and web app
- Store these securely (password manager)
- Never commit to Git

### DNS Configuration

```bash
# A Record
call.dev.firstline.care → Your Server IP

# Verify DNS
nslookup call.dev.firstline.care
```

### SSL Certificate

Coolify/Caddy will automatically provision SSL certificate via Let's Encrypt for:
```
call.dev.firstline.care
```

### Firewall Rules

**Required Ports:**
- TCP 7880 - HTTP/WebSocket (behind reverse proxy)
- TCP 443 - TURN/TLS
- UDP 50000-60000 - Media traffic

### Coolify App Configuration

**App Name:** `livekit-server`

**Docker Compose File:** `docker-compose.video.yml`

**Domain:** `call.dev.firstline.care`

**SSL:** Enabled (automatic via Caddy)

### Testing After Deployment

```bash
# Test health endpoint
curl https://call.dev.firstline.care/

# Test video call
# Navigate to: https://dev.firstline.care/video?room=test&user=doctor1
```

### URLs

**Production:**
- LiveKit Server: `wss://call.dev.firstline.care`
- Web App: `https://dev.firstline.care`
- Test Call: `https://dev.firstline.care/video?room=test&user=doctor1`

**Local Development:**
- LiveKit Server: `ws://localhost:7880`
- Web App: `http://localhost:3000`
- Test Call: `http://localhost:3000/video?room=test&user=doctor1`

### Architecture

```
Internet
    │
    ▼
Caddy (Coolify)
    │
    ├──► dev.firstline.care → Web App
    │
    └──► call.dev.firstline.care → LiveKit Server
```

### Monitoring

**Health Check:**
```bash
curl https://call.dev.firstline.care/
```

**Logs:**
```bash
# In Coolify UI
Navigate to: livekit-server app → Logs tab
```

### Quick Deployment Steps

1. **DNS:** Point `call.dev.firstline.care` to your server
2. **Generate Keys:** Run `openssl rand -base64 32` twice
3. **Coolify:** Create new app with `docker-compose.video.yml`
4. **Domain:** Set to `call.dev.firstline.care`
5. **Env Vars:** Add all variables listed above
6. **Deploy:** Click deploy in Coolify
7. **Update Web App:** Add LiveKit env vars to web app
8. **Test:** Visit test URL

### Troubleshooting

**Connection fails:**
- Check DNS: `nslookup call.dev.firstline.care`
- Check SSL: `curl https://call.dev.firstline.care/`
- Check logs in Coolify

**No audio/video:**
- Verify UDP ports 50000-60000 are open
- Check firewall rules
- Test TURN server

**Token errors:**
- Verify API key/secret match in both apps
- Check environment variables are set
- Restart both containers

### Support

- Documentation: `apps/docs/livekit/`
- Troubleshooting: `apps/docs/livekit/TROUBLESHOOTING.md`
- LiveKit Docs: https://docs.livekit.io/

---

**Ready to deploy!** Follow the steps above and you'll have video calling working in production.
