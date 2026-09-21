# PowerSync Health Check Endpoints

**Last Updated:** 2025-12-29

---

## Available Endpoints

PowerSync now supports **two health check endpoints** for maximum compatibility:

### 1. Official PowerSync Endpoint
```bash
https://ws.emr.fajr.org/probes/liveness
```
- **Source:** Native PowerSync endpoint (official)
- **Returns:** 200 OK when healthy
- **Use Case:** Load balancers, official health checks

### 2. Standard Health Endpoint (Aliased)
```bash
https://ws.emr.fajr.org/health
```
- **Source:** Caddy rewrite rule (redirects to `/probes/liveness`)
- **Returns:** 200 OK when healthy
- **Use Case:** Standard monitoring tools, mobile apps, convenience

---

## How It Works

```
Client Request: /health
       ↓
Caddy Proxy: Rewrites /health → /probes/liveness
       ↓
PowerSync: Responds from /probes/liveness
       ↓
Client: Receives 200 OK
```

The rewrite happens at the Caddy layer via this label:
```yaml
caddy.rewrite: "/health /probes/liveness"
```

---

## Testing Commands

### Test from outside the container (via Caddy)
```bash
# Test the standard /health endpoint
curl -i https://ws.emr.fajr.org/health

# Test the official /probes/liveness endpoint
curl -i https://ws.emr.fajr.org/probes/liveness
```

### Test from inside the container (direct)
```bash
# Get container ID
docker ps | grep powersync

# Test official endpoint inside container
docker exec <container-id> curl -f http://localhost:6061/probes/liveness

# Note: /health does NOT work inside the container (no Caddy rewrite)
# This will return 404:
docker exec <container-id> curl -f http://localhost:6061/health
```

---

## Expected Responses

### Healthy Response
```bash
$ curl -i https://ws.emr.fajr.org/health
HTTP/2 200 OK
content-type: application/json
date: Sun, 29 Dec 2025 12:00:00 GMT

{"status":"ok"}
```

### Unhealthy Response (Container Down)
```bash
$ curl -i https://ws.emr.fajr.org/health
HTTP/2 502 Bad Gateway
...
```

---

## Docker Health Check

The Docker health check uses the official endpoint directly inside the container:

```dockerfile
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:6061/probes/liveness || exit 1
```

**Why not use `/health`?**
- The `/health` rewrite only exists at the Caddy layer (external proxy)
- Inside the container, only `/probes/liveness` exists natively
- Docker health checks run inside the container, so they must use the native endpoint

---

## Integration Examples

### Mobile App (React Native / Flutter)
```javascript
// Use the standard /health endpoint for convenience
const healthCheck = async () => {
  const response = await fetch('https://ws.emr.fajr.org/health');
  return response.ok; // true if healthy
};
```

### Monitoring (Uptime Kuma, etc.)
```
URL: https://ws.emr.fajr.org/health
Method: GET
Expected Status: 200
```

### Kubernetes Liveness Probe
```yaml
livenessProbe:
  httpGet:
    path: /probes/liveness  # Use official endpoint
    port: 6061
  initialDelaySeconds: 40
  periodSeconds: 30
```

---

## Troubleshooting

### Issue: `/health` returns 404
**Possible Causes:**
1. Caddy proxy not restarted after adding rewrite rule
2. Docker labels not applied correctly
3. Accessing container directly instead of through Caddy

**Solution:**
```bash
# Restart Caddy proxy
docker restart coolify-proxy

# Wait 10 seconds for Caddy to reload configuration
sleep 10

# Test again
curl -i https://ws.emr.fajr.org/health
```

### Issue: Both endpoints return 502
**Possible Causes:**
1. PowerSync container is unhealthy
2. Container hasn't finished starting (wait 40s for start_period)
3. PowerSync service crashed

**Solution:**
```bash
# Check container status
docker ps | grep powersync

# Check logs for errors
docker logs <container-id> --tail 50

# Check health status
docker inspect <container-id> | grep -A 20 '"Health"'
```

### Issue: Direct container access to `/health` returns 404
**This is expected behavior!**
- The `/health` endpoint only exists through Caddy's rewrite
- Inside the container, only `/probes/liveness` exists
- Use `/probes/liveness` for direct container access

---

## Summary

✅ **Both endpoints work externally** (through Caddy):
- `https://ws.emr.fajr.org/health` ← Use this for simplicity
- `https://ws.emr.fajr.org/probes/liveness` ← Official PowerSync endpoint

✅ **Only one endpoint works internally** (inside container):
- `http://localhost:6061/probes/liveness` ← Docker health checks use this

✅ **Rewrite is transparent**:
- Clients don't know about the rewrite
- Both endpoints return the same response
- Maximum compatibility with monitoring tools

---

## References

- **PowerSync Health Check Docs:** https://docs.powersync.com/self-hosting/lifecycle-maintenance#health-checks
- **Caddy Rewrite Directive:** https://caddyserver.com/docs/caddyfile/directives/rewrite
- **Docker Health Checks:** https://docs.docker.com/engine/reference/builder/#healthcheck