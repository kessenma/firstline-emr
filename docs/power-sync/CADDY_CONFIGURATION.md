# Caddy Configuration for PowerSync WebSocket Support

This document explains how to configure Caddy (via Coolify) to properly proxy PowerSync WebSocket connections.

## Current Issue

The test script shows:
```
✗ FAIL (HTTP 404 - Not Found)
   /sync/stream path not configured in Caddy
```

This means Caddy is not proxying the PowerSync WebSocket endpoint correctly.

## Required Configuration

PowerSync needs **all paths** to be proxied to the backend, not just specific paths. The WebSocket upgrade happens on `/sync/stream`.

### Option 1: Coolify UI (Recommended)

1. **Go to Coolify Dashboard**
2. **Find the PowerSync service** (should be under `ws.emr.fajr.org`)
3. **Enable WebSocket Support:**
   - Look for "Enable WebSocket" toggle or checkbox
   - Make sure it's enabled
4. **Set Proxy Configuration:**
   - Ensure the proxy target is `http://powersync:6061`
   - Make sure ALL paths are proxied (not just `/probes/liveness`)
5. **Force HTTP/1.1 for WebSocket routes** (if option available)
6. **Save and Redeploy**

### Option 2: Manual Caddyfile Configuration

If you need to manually edit the Caddyfile (advanced users only):

```caddy
# PowerSync WebSocket Proxy
ws.emr.fajr.org {
    # Health check endpoint
    handle /probes/liveness {
        reverse_proxy http://powersync:6061 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Standard health check (rewrites to /probes/liveness)
    handle /health {
        reverse_proxy http://powersync:6061 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            rewrite /probes/liveness
        }
    }

    # WebSocket endpoints - MUST use HTTP/1.1
    handle /sync/* {
        reverse_proxy http://powersync:6061 {
            # Force HTTP/1.1 for WebSocket support
            transport http {
                versions 1.1
            }
            
            # WebSocket upgrade headers
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
            header_up Connection {header.Connection}
            header_up Upgrade {header.Upgrade}
        }
    }

    # All other paths (API endpoints, etc.)
    handle /* {
        reverse_proxy http://powersync:6061 {
            header_up Host {host}
            header_up X-Real-IP {remote_host}
            header_up X-Forwarded-For {remote_host}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Enable automatic HTTPS
    tls {
        protocols tls1.2 tls1.3
    }

    # Logging
    log {
        output file /var/log/caddy/powersync.log
        level INFO
    }
}
```

### Key Configuration Points

1. **HTTP/1.1 Required**: WebSocket upgrades don't work with HTTP/2
   ```caddy
   transport http {
       versions 1.1
   }
   ```

2. **Preserve WebSocket Headers**: Must forward `Connection` and `Upgrade` headers
   ```caddy
   header_up Connection {header.Connection}
   header_up Upgrade {header.Upgrade}
   ```

3. **Proxy All Paths**: Use wildcard routes to catch all PowerSync endpoints
   ```caddy
   handle /sync/* { ... }
   handle /* { ... }
   ```

4. **Container Network**: Ensure PowerSync container is on `coolify` network
   ```yaml
   networks:
     coolify:
       aliases:
         - powersync
   ```

## Testing the Configuration

After updating Caddy config:

### 1. Test Health Endpoint
```bash
curl https://ws.emr.fajr.org/health
# Should return 200 OK
```

### 2. Test WebSocket Upgrade (No Auth)
```bash
curl -v https://ws.emr.fajr.org/sync/stream \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ=="
  
# Should return 401 Unauthorized (auth required)
# NOT 404 Not Found or 502 Bad Gateway
```

### 3. Run Full Test Script
```bash
./test-powersync-websocket.sh
```

Expected results:
- ✅ Test 1 (HTTPS): 200 OK
- ✅ Test 2 (WebSocket no auth): 401 Unauthorized
- ✅ Test 3 (WebSocket with JWT): 101 Switching Protocols
- ✅ Test 4 (Container status): Running

## Common Issues

### 404 Not Found
**Cause**: Path not configured in Caddy
**Fix**: Add wildcard route `handle /* { ... }` or specific route for `/sync/*`

### 502 Bad Gateway
**Cause**: Caddy can't reach PowerSync container
**Fix**: 
- Check container is running: `docker ps | grep powersync`
- Verify network: `docker network inspect coolify`
- Ensure PowerSync has network alias: `powersync`

### 400 Bad Request
**Cause**: WebSocket headers not forwarded correctly
**Fix**: Add `header_up Connection` and `header_up Upgrade` directives

### Connection Refused
**Cause**: PowerSync not listening on port 6061
**Fix**: Check PowerSync logs for startup errors

## Coolify-Specific Notes

Coolify automatically generates Caddyfiles for services. To customize:

1. **Environment Variables**: Use Coolify's environment variable support
2. **Custom Caddy Config**: Some Coolify versions support custom Caddy snippets
3. **Proxy Settings**: Configure via Coolify UI under service settings
4. **Domain Settings**: Ensure domain is correctly pointed to `ws.emr.fajr.org`

## Verification Checklist

- [ ] PowerSync container is running
- [ ] Container is on `coolify` network with alias `powersync`
- [ ] Caddy can reach `http://powersync:6061`
- [ ] Health endpoint returns 200: `https://ws.emr.fajr.org/health`
- [ ] WebSocket upgrade returns 401 (not 404): `https://ws.emr.fajr.org/sync/stream`
- [ ] Test script shows WebSocket working
- [ ] Mobile app can connect and sync data

## Next Steps

After fixing Caddy configuration:

1. **Restart PowerSync** in Coolify (to clear replication locks)
2. **Wait 60 seconds** for health checks to pass
3. **Run test script** to verify WebSocket connectivity
4. **Test mobile app** - login as admin and check data sync

## References

- [PowerSync WebSocket Documentation](https://docs.powersync.com)
- [Caddy Reverse Proxy Guide](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy)
- [WebSocket over HTTP/2 Issues](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy#websockets)

---

*Last Updated: 2025-12-30*
*Related Files: docker-compose.powersync.yml, test-powersync-websocket.sh*