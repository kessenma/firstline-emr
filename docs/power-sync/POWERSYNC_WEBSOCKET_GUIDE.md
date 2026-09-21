# PowerSync WebSocket Connection Guide

## 🎯 Summary

PowerSync uses **WebSocket (RSocket protocol)** for sync connections, NOT HTTP REST endpoints.

**Correct Connection URL:** `wss://ws.emr.fajr.org` (root path, WebSocket upgrade)

**Incorrect URLs:** 
- ❌ `wss://ws.emr.fajr.org/sync` (doesn't exist)
- ❌ `wss://ws.emr.fajr.org/sync/stream` (doesn't exist)
- ❌ `https://ws.emr.fajr.org/api/sync` (doesn't exist)

---

## 🔍 Problem Background

### What We Discovered

1. **PowerSync IS running correctly** ✅
   - Health endpoint working: `/probes/liveness` → 200 OK
   - Replication working (syncing users, settings, notifications)
   - WebSocket connections active: "Currently have 1 active WebSocket connection(s)"

2. **HTTP REST endpoints DON'T exist** ❌
   - `/sync` → 404
   - `/api/sync` → 404
   - `/` → 404
   - This is NORMAL for PowerSync!

3. **JWT tokens were missing `kid` header** 🔧
   - PowerSync requires `kid` (Key ID) in JWT header
   - Error: "Could not find an appropriate key in the keystore"

---

## 🛠️ How PowerSync Works

### Architecture

```
Mobile App
    ↓
WebSocket Connection (wss://ws.emr.fajr.org)
    ↓
Caddy Proxy (SSL termination)
    ↓
PowerSync Container (port 6061)
    ↓
PostgreSQL (replication)
```

### PowerSync Sync Protocol

PowerSync uses **RSocket over WebSocket**, not traditional HTTP REST:

1. Client opens WebSocket connection to `wss://ws.emr.fajr.org`
2. Client sends JWT token in WebSocket handshake (Authorization header or query param)
3. PowerSync verifies JWT (checks signature, `kid`, expiration, issuer, audience)
4. If valid, establishes RSocket bi-directional streaming connection
5. Data syncs via RSocket frames (not HTTP requests)

### Why `/sync` Doesn't Exist

PowerSync's "unified" container mode exposes:
- ✅ `/probes/liveness` - HTTP health check
- ✅ `/probes/readiness` - HTTP readiness check (optional)
- ✅ `/` (root) - WebSocket upgrade endpoint for RSocket

It does NOT expose HTTP REST API endpoints like:
- ❌ `/sync` - doesn't exist
- ❌ `/api/sync` - doesn't exist
- ❌ `/sync/stream` - doesn't exist

These paths only exist if you run PowerSync in "API-only" mode with separate services.

---

## 🔐 JWT Authentication Requirements

### What PowerSync Needs

1. **JWT Header must include:**
   ```json
   {
     "alg": "HS256",
     "typ": "JWT",
     "kid": "fajr-emr-key"  ← REQUIRED!
   }
   ```

2. **JWT Payload must include:**
   ```json
   {
     "sub": "user-id-or-email",
     "iat": 1234567890,
     "exp": 1234567890
   }
   ```

3. **JWT must be signed with:**
   - Algorithm: `HS256`
   - Secret: Same as `NEXTAUTH_SECRET` (base64-encoded in PowerSync config)

### Why `kid` Is Required

The `kid` (Key ID) tells PowerSync which key to use for verification when you have multiple keys configured. It's not an authentication bypass—the JWT signature must still be valid.

**PowerSync config expects:**
```yaml
client_auth:
  jwks:
    keys:
      - kid: "fajr-emr-key"  # ← Must match JWT header
        kty: oct
        k: <base64-encoded-secret>
        alg: HS256
```

---

## ✅ Solution Applied

### 1. Fixed JWT Token Generation

**Files Updated:**
- `apps/web/app/api/auth/powersync-token/route.ts` ← PowerSync token endpoint
- `apps/web/app/api/mobile-auth/login/route.ts` ← Mobile login
- `apps/web/app/api/auth/mobile-login/route.ts` ← Legacy mobile login
- `apps/web/lib/auth.ts` ← NextAuth callbacks

**Change:**
```typescript
import { JWT_CONFIG } from "@/lib/jwt-config";

const token = jwt.sign(
  { sub: userId, email, ... },
  process.env.NEXTAUTH_SECRET!,
  {
    expiresIn: "24h",
    header: {
      kid: JWT_CONFIG.KID,  // ← Added this!
      alg: JWT_CONFIG.ALG,
    },
  }
);
```

### 2. PowerSync Configuration

**File:** `apps/powersync-server/config/powersync.yaml`

```yaml
# PowerSync listens on port 6061
port: 6061

# Authentication configuration
client_auth:
  supabase: false
  jwks:
    keys:
      - kid: "fajr-emr-key"  # ← Matches JWT_CONFIG.KID
        kty: oct
        k: <base64-encoded-NEXTAUTH_SECRET>
        alg: HS256
  audience: ["powersync", "powersync-dev"]
  issuer: https://emr.fajr.org

# Sync rules
sync_rules:
  path: /config/sync-rules.yaml
```

### 3. Caddy Proxy Configuration

**File:** `data/coolify/proxy/caddy/dynamic/powersync.wss.caddy`

```caddy
ws.emr.fajr.org {
    reverse_proxy powersync:6061 {
        # Enable WebSocket support
        header_up Upgrade {http.request.header.Upgrade}
        header_up Connection {http.request.header.Connection}
        header_up X-Real-IP {http.request.remote.host}
        header_up X-Forwarded-For {http.request.remote.host}
        header_up X-Forwarded-Proto {http.request.scheme}
        
        # Don't buffer WebSocket connections
        flush_interval -1
    }
}
```

---

## 🧪 Testing

### Test Script

Run the included test script:
```bash
chmod +x test-powersync-connection.sh
./test-powersync-connection.sh
```

### Manual Testing

1. **Test Health Endpoint:**
   ```bash
   curl https://ws.emr.fajr.org/probes/liveness
   # Expected: {"ready":true,"started":true,"touched_at":"..."}
   ```

2. **Test WebSocket Upgrade (no auth):**
   ```bash
   curl -I \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     https://ws.emr.fajr.org/
   ```
   Expected: `HTTP/2 401` (requires auth) or `HTTP/2 101` (upgrade successful)

3. **Generate JWT Token:**
   ```bash
   # Log in to https://emr.fajr.org
   # Get session token from DevTools > Application > Local Storage
   # Copy 'next-auth.session-token'
   
   curl -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
     https://emr.fajr.org/api/auth/powersync-token
   ```

4. **Test Authenticated WebSocket:**
   ```bash
   JWT_TOKEN="your-jwt-token"
   
   curl -I \
     -H "Connection: Upgrade" \
     -H "Upgrade: websocket" \
     -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
     -H "Authorization: Bearer $JWT_TOKEN" \
     https://ws.emr.fajr.org/
   ```
   Expected: `HTTP/2 101` (upgrade successful)

### Verify JWT Token Has `kid`

```bash
# Extract JWT token from API response
JWT_TOKEN="your-token-here"

# Decode the header (first part before first dot)
echo "$JWT_TOKEN" | cut -d. -f1 | base64 -d

# Should show:
# {"alg":"HS256","typ":"JWT","kid":"fajr-emr-key"}
```

---

## 📱 Mobile App Configuration

### PowerSync Client Setup

```typescript
import { PowerSyncDatabase } from '@powersync/react-native';

const powerSync = new PowerSyncDatabase({
  schema: mySchema,
  database: {
    dbFilename: 'powersync.db',
  },
});

await powerSync.connect({
  // ✅ CORRECT: Root path, WebSocket protocol
  endpoint: 'https://ws.emr.fajr.org',
  
  // ❌ WRONG: Don't add /sync or /sync/stream
  // endpoint: 'https://ws.emr.fajr.org/sync',
  
  fetchCredentials: async () => {
    // Get JWT token from your auth system
    const token = await getAuthToken();
    
    return {
      endpoint: 'https://ws.emr.fajr.org',
      token: token,
    };
  },
  
  uploadData: async (database) => {
    // Handle data uploads (CRUD operations)
    // This uses the same WebSocket connection
  },
});
```

### Key Points

1. **Use HTTPS URL** (not WSS)
   - PowerSync client converts to WebSocket automatically
   - Use: `https://ws.emr.fajr.org`
   - NOT: `wss://ws.emr.fajr.org` (client handles protocol upgrade)

2. **Use Root Path**
   - Use: `https://ws.emr.fajr.org` (no trailing slash)
   - NOT: `https://ws.emr.fajr.org/sync`

3. **Token in `fetchCredentials`**
   - Return JWT token from your login endpoint
   - Token must include `kid` header
   - Token is sent in WebSocket handshake

---

## 🔧 Troubleshooting

### Issue: "Could not find an appropriate key in the keystore"

**Cause:** JWT token missing `kid` header

**Fix:**
1. Ensure all JWT generation uses `JWT_CONFIG.KID`
2. Verify `kid` matches in PowerSync config
3. Log out and back in to get new token with `kid`

### Issue: "The path GET '/sync' does not exist on this server"

**Cause:** Trying to access HTTP REST endpoint that doesn't exist

**Fix:** 
- Use root path for WebSocket connection: `wss://ws.emr.fajr.org`
- Don't try to access `/sync`, `/api/sync`, etc.

### Issue: 401 Unauthorized

**Causes:**
1. JWT token expired
2. JWT signature invalid
3. JWT `kid` doesn't match PowerSync config
4. JWT missing required claims (`sub`, `iat`, `exp`)

**Fix:**
1. Generate new JWT token
2. Verify secret matches between web app and PowerSync
3. Check JWT header includes `kid`
4. Decode JWT to verify all claims present

### Issue: 404 Not Found

**Causes:**
1. Domain not configured in Caddy
2. PowerSync container not running
3. Wrong URL path (using `/sync` instead of `/`)

**Fix:**
1. Check Caddy config exists: `data/coolify/proxy/caddy/dynamic/powersync.wss.caddy`
2. Verify PowerSync container running: `docker ps | grep powersync`
3. Use root path: `wss://ws.emr.fajr.org`

### Issue: WebSocket connection drops immediately

**Causes:**
1. Caddy buffering WebSocket data
2. JWT token rejected after handshake

**Fix:**
1. Ensure Caddy has `flush_interval -1` for reverse_proxy
2. Check PowerSync logs for JWT validation errors

---

## 📋 Checklist

Before deploying:

- [ ] JWT tokens include `kid` header in all generation endpoints
- [ ] `kid` value matches in `jwt-config.ts` and `powersync.yaml`
- [ ] PowerSync config uses base64-encoded `NEXTAUTH_SECRET`
- [ ] Caddy reverse_proxy configured with WebSocket support
- [ ] Caddy has `flush_interval -1` to prevent buffering
- [ ] Domain registered in DNS: `ws.emr.fajr.org`
- [ ] SSL certificate valid for `ws.emr.fajr.org`
- [ ] PowerSync container running and healthy
- [ ] Mobile app uses correct URL: `https://ws.emr.fajr.org` (no /sync)

After deploying:

- [ ] Test health endpoint returns 200
- [ ] Test WebSocket upgrade returns 401 or 101
- [ ] Generate JWT token via API
- [ ] Verify JWT includes `kid` in header
- [ ] Test authenticated WebSocket returns 101
- [ ] Check PowerSync logs show no JWT errors
- [ ] Mobile app connects successfully
- [ ] Data syncs from PostgreSQL to mobile app

---

## 📚 Related Files

### Configuration
- `apps/web/lib/jwt-config.ts` - JWT configuration constants
- `apps/powersync-server/config/powersync.yaml` - PowerSync server config
- `apps/powersync-server/config/sync-rules.yaml` - Data sync rules
- `docker-compose.powersync.yml` - PowerSync Docker setup

### JWT Generation
- `apps/web/app/api/auth/powersync-token/route.ts` - PowerSync token endpoint
- `apps/web/app/api/mobile-auth/login/route.ts` - Mobile login endpoint
- `apps/web/app/api/auth/mobile-login/route.ts` - Legacy mobile login
- `apps/web/lib/auth.ts` - NextAuth configuration

### Caddy Proxy
- `data/coolify/proxy/caddy/dynamic/powersync.wss.caddy` - Caddy config
- `data/coolify/proxy/caddy/Caddyfile` - Main Caddyfile (imports dynamic configs)

### Testing & Documentation
- `test-powersync-connection.sh` - Connection test script
- `POWERSYNC_JWT_FIX.md` - JWT authentication fix details
- `docs/power-sync/TROUBLESHOOTING.md` - General troubleshooting guide

---

## 🎓 Key Takeaways

1. **PowerSync uses WebSocket, not HTTP REST**
   - Connect to root path: `wss://ws.emr.fajr.org`
   - Don't look for `/sync` or `/api/sync` endpoints

2. **JWT must include `kid` header**
   - PowerSync requires it to identify which key to use
   - Must match the `kid` in PowerSync config

3. **RSocket protocol, not HTTP**
   - Bi-directional streaming over WebSocket
   - Different from traditional REST APIs

4. **404 errors are normal**
   - HTTP REST endpoints like `/sync` don't exist
   - Only `/probes/liveness` and WebSocket endpoint exist

5. **Use HTTPS URL in client config**
   - PowerSync client converts to WebSocket automatically
   - Use: `https://ws.emr.fajr.org` not `wss://`

---

**Last Updated:** 2026-01-01
**Status:** ✅ Working with JWT `kid` fix applied