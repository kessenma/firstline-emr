> **📋 File Migration Info**
> - **Original Location:** `apps/docs/livekit/SETUP.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# LiveKit Setup Guide for MedFlow EMR

This guide will help you set up LiveKit for video calling in the MedFlow EMR application.

## Overview

LiveKit is deployed as a separate Docker container that handles WebRTC video/audio streaming. The Next.js web app connects to LiveKit to enable video calls between doctors and patients.

## Architecture

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Browser       │         │   Next.js Web    │         │   LiveKit       │
│   (Patient/Dr)  │◄───────►│   Application    │◄───────►│   Server        │
│                 │  HTTPS  │                  │   WS    │                 │
└─────────────────┘         └──────────────────┘         └─────────────────┘
     WebRTC ◄──────────────────────────────────────────────────┘
     (Direct P2P or via LiveKit SFU)
```

## Local Development Setup

### 1. Add Environment Variables

Copy the LiveKit variables from `.env.livekit.example` to your `.env` file:

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
# Start only the LiveKit server
docker-compose -f docker-compose.video.yml up -d

# Or start all services including LiveKit
docker-compose -f docker-compose.web.yml -f docker-compose.services.yml -f docker-compose.video.yml up -d
```

### 3. Verify LiveKit is Running

```bash
# Check if LiveKit is running
curl http://localhost:7880/

# Check Docker logs
docker-compose -f docker-compose.video.yml logs -f livekit-server
```

### 4. Test Video Call

1. Start your Next.js development server
2. Navigate to `/video?room=test-room&user=test-user`
3. Allow camera/microphone permissions
4. Open another browser tab with a different user to test

## Production Deployment with Coolify

### 1. Prerequisites

- Domain name for LiveKit (e.g., `call.dev.emr.fajrscientific.org`)
- SSL certificate for the domain
- Open UDP ports 50000-60000 for media traffic
- Open TCP port 443 for TURN/TLS

### 2. Generate Production API Keys

Generate secure API keys:

```bash
# Generate API key
openssl rand -base64 32

# Generate API secret
openssl rand -base64 32
```

### 3. Configure Environment Variables in Coolify

Add these environment variables to your Coolify app:

```bash
# Production LiveKit URLs
LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org
NEXT_PUBLIC_LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org

# Your generated keys
LIVEKIT_API_KEY=your_generated_api_key
LIVEKIT_API_SECRET=your_generated_api_secret

# TURN domain (same as LiveKit domain or separate)
LIVEKIT_TURN_DOMAIN=call.dev.emr.fajrscientific.org

# Port (default is fine)
LIVEKIT_PORT=7880
```

### 4. Deploy to Coolify

1. Create a new app in Coolify for LiveKit
2. Set the Docker Compose file to `docker-compose.video.yml`
3. Configure the domain: `call.dev.emr.fajrscientific.org`
4. Add the environment variables
5. Deploy the app

### 5. Configure Firewall Rules

Ensure these ports are open:

- **TCP 7880**: HTTP/WebSocket (behind reverse proxy)
- **TCP 443**: TURN/TLS for firewall traversal
- **UDP 50000-60000**: Media traffic (RTP/RTCP)

### 6. Update Web App Environment

Update your web app's environment variables in Coolify to point to the LiveKit server:

```bash
LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org
NEXT_PUBLIC_LIVEKIT_URL=wss://call.dev.emr.fajrscientific.org
LIVEKIT_API_KEY=your_generated_api_key
LIVEKIT_API_SECRET=your_generated_api_secret
```

## Network Configuration

### Port Requirements

| Port Range | Protocol | Purpose | Required |
|------------|----------|---------|----------|
| 7880 | TCP | HTTP/WebSocket API | Yes |
| 7881 | TCP | ICE/TCP fallback | Recommended |
| 443 | TCP | TURN/TLS | Recommended |
| 3478 | UDP | TURN/UDP | Optional |
| 50000-60000 | UDP | Media (RTP/RTCP) | Yes |

### Firewall Configuration

For cloud deployments (AWS, GCP, Azure, etc.):

1. **Security Group / Firewall Rules**:
   - Allow inbound TCP 7880 (from load balancer only)
   - Allow inbound TCP 443
   - Allow inbound/outbound UDP 50000-60000

2. **Load Balancer**:
   - Configure SSL termination for port 7880
   - Enable WebSocket support
   - Set up health checks on `/`

### NAT Traversal

LiveKit uses STUN to discover its public IP address. If you're behind NAT:

1. **Option 1**: Set `use_external_ip: true` in config (recommended)
   - LiveKit will use STUN to discover the public IP

2. **Option 2**: Set explicit IP in config:
   ```yaml
   rtc:
     node_ip: "your.public.ip.address"
   ```

## Testing

### Test Token Generation

```bash
# Install LiveKit CLI
brew install livekit

# Generate a test token
lk token create \
  --api-key your_api_key \
  --api-secret your_api_secret \
  --join --room test-room \
  --identity test-user \
  --valid-for 24h
```

### Test Connection

1. **Using LiveKit CLI**:
```bash
lk room list --url wss://call.dev.emr.fajrscientific.org
```

2. **Using Web App**:
   - Navigate to `/video?room=test&user=doctor1`
   - Check browser console for connection logs
   - Verify WebSocket connection in Network tab

### Common Issues

#### Connection Fails

1. Check LiveKit server logs:
```bash
docker-compose -f docker-compose.video.yml logs livekit-server
```

2. Verify environment variables are set correctly
3. Check firewall rules
4. Verify SSL certificate is valid

#### No Audio/Video

1. Check browser permissions for camera/microphone
2. Verify UDP ports 50000-60000 are open
3. Check if TURN server is configured correctly
4. Test with different network (mobile hotspot)

#### High Latency

1. Check network bandwidth
2. Verify media ports are not blocked
3. Consider enabling TURN/UDP on port 443
4. Check server resources (CPU, memory)

## Monitoring

### Health Checks

LiveKit exposes a health endpoint:

```bash
curl https://call.dev.emr.fajrscientific.org/
```

### Prometheus Metrics (Optional)

Enable Prometheus metrics in `config.yaml`:

```yaml
prometheus_port: 6789
```

Then scrape metrics from `http://localhost:6789/metrics`

### Logs

View LiveKit logs:

```bash
# Docker logs
docker-compose -f docker-compose.video.yml logs -f livekit-server

# In Coolify
# Navigate to your LiveKit app → Logs tab
```

## Scaling

### Single Node

For small deployments (< 100 concurrent participants), a single LiveKit instance is sufficient.

Recommended specs:
- 4 CPU cores
- 8 GB RAM
- 10 Gbps network

### Multi-Node with Redis

For larger deployments, use Redis for coordination:

1. Add Redis to your deployment
2. Update `config.yaml`:
```yaml
redis:
  address: redis:6379
```

3. Deploy multiple LiveKit instances
4. Use a load balancer to distribute connections

## Security

### API Keys

- Never commit API keys to version control
- Use strong, randomly generated keys
- Rotate keys periodically
- Use different keys for dev/staging/prod

### Network Security

- Use SSL/TLS for all connections
- Restrict access to LiveKit ports
- Use VPC/private networks when possible
- Enable TURN authentication

### Token Security

- Tokens should be short-lived (< 24 hours)
- Generate tokens server-side only
- Include room and identity in token
- Validate tokens on the server

## Resources

- [LiveKit Documentation](https://docs.livekit.io/)
- [LiveKit Server GitHub](https://github.com/livekit/livekit)
- [LiveKit React Components](https://docs.livekit.io/reference/components/react/)
- [LiveKit Cloud](https://livekit.io/cloud) - Managed hosting alternative
