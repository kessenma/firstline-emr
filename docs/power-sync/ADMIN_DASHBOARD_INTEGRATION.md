# PowerSync Admin Dashboard Integration

**Last Updated:** January 1, 2026  
**Status:** ✅ Production Ready  
**Related Fixes:** JWT Authentication (kid header, base64 decoding, sub claim)

## Overview

The PowerSync Admin Dashboard provides real-time monitoring and management capabilities for the PowerSync synchronization service. This document details the integration, configuration, and troubleshooting of the admin dashboard components.

## Table of Contents

- [Architecture](#architecture)
- [Components](#components)
- [JWT Authentication](#jwt-authentication)
- [API Endpoints](#api-endpoints)
- [Configuration](#configuration)
- [Monitoring & Health Checks](#monitoring--health-checks)
- [Troubleshooting](#troubleshooting)
- [Recent Updates](#recent-updates)

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Admin Dashboard (Browser)                    │
│  Components: PowerSyncView, PowerSyncViewModel                  │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js Web Application                       │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /api/powersync/health                                     │  │
│  │  - Proxies health checks to PowerSync service             │  │
│  │  - Adds response time metrics                             │  │
│  │  - Handles errors gracefully                              │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │                                      │
│  ┌────────────────────────┴──────────────────────────────────┐  │
│  │  /api/auth/powersync-token (Web)                          │  │
│  │  - Generates JWT for web client authentication           │  │
│  │  - Uses NextAuth session                                  │  │
│  │  - 24-hour token expiry                                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /api/auth/mobile-login (Mobile)                          │  │
│  │  - Validates credentials                                  │  │
│  │  - Generates JWT for mobile authentication               │  │
│  │  - 14-day token expiry                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │ Internal Docker Network
                             ↓
┌─────────────────────────────────────────────────────────────────┐
│                    PowerSync Service (Docker)                    │
│                                                                   │
│  Internal: http://powersync:6061                                │
│  External: wss://ws.emr.fajr.org                                │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  /probes/liveness                                         │  │
│  │  - Health check endpoint                                  │  │
│  │  - Returns ready/started status                           │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  JWT Authentication (JWKS)                                │  │
│  │  - kid: "fajr-emr-key"                                    │  │
│  │  - alg: HS256                                             │  │
│  │  - Validates sub, iat, exp claims                         │  │
│  └───────────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ↓
                    PostgreSQL Database
                    (Replication & Storage)
```

## Components

### 1. PowerSyncView.tsx

**Location:** `apps/web/components/adminDashboard/sections/powersync/PowerSyncView.tsx`

Main React component providing the admin dashboard UI.

**Features:**
- 📊 **Overview Tab**: Service status, uptime, response time
- 🔄 **Replication Tab**: Sync status, ready state, last activity
- 🔧 **Details Tab**: Service configuration, JWT settings, troubleshooting
- ⚡ **Auto-Refresh**: Optional 30-second automatic health checks
- 🎨 **Dark Mode**: Full dark mode support

**Key UI Elements:**
```tsx
<Tabs>
  <Tab value="overview">
    - Service Status Badge
    - Uptime Monitor
    - Response Time Card
    - Last Activity Timestamp
  </Tab>
  
  <Tab value="replication">
    - Ready State Badge
    - Started State Badge
    - Last Sync Activity
  </Tab>
  
  <Tab value="details">
    - Internal/External URLs
    - JWT Configuration (kid, alg)
    - Token Endpoints
    - Troubleshooting Guide
  </Tab>
</Tabs>
```

### 2. PowerSyncViewModel.ts

**Location:** `apps/web/components/adminDashboard/sections/powersync/PowerSyncViewModel.ts`

Custom React hook managing state and business logic.

**Responsibilities:**
- Health check API calls (`/api/powersync/health`)
- Auto-refresh management (30-second intervals)
- Response time tracking
- Status formatting utilities
- Error handling and state management

**Exported Functions:**
```typescript
{
  healthData: HealthData | null,
  isLoading: boolean,
  error: string | null,
  lastChecked: Date | null,
  autoRefresh: boolean,
  serviceUrl: string,
  checkHealth: () => Promise<void>,
  toggleAutoRefresh: () => void,
  formatUptime: (seconds: number) => string,
  getStatusColor: (status: string) => string,
  getStatusBadgeColor: (status: string) => string,
}
```

### 3. Health API Route

**Location:** `apps/web/app/api/powersync/health/route.ts`

Server-side API endpoint that proxies health checks to PowerSync service.

**Features:**
- ✅ Internal Docker network communication
- ✅ 10-second request timeout
- ✅ Response time tracking
- ✅ Detailed error logging
- ✅ Handles empty response bodies

**Request Flow:**
```
GET /api/powersync/health
  ↓
Fetch http://powersync:6061/probes/liveness
  ↓
Parse JSON response
  ↓
Add duration metric
  ↓
Return to client
```

## JWT Authentication

### Overview

PowerSync uses JWT (JSON Web Tokens) for authentication. Recent fixes (January 1, 2026) resolved three critical JWT issues:

1. ✅ Missing `kid` (Key ID) header
2. ✅ Base64 decoding of JWT_SECRET
3. ✅ Missing `sub` (subject) claim

### JWT Token Structure

**Header:**
```json
{
  "kid": "fajr-emr-key",
  "alg": "HS256",
  "typ": "JWT"
}
```

**Payload (Mobile):**
```json
{
  "sub": "5dddd510-544f-4f37-a75d-4f35053e6057",
  "id": "5dddd510-544f-4f37-a75d-4f35053e6057",
  "email": "dev@example.com",
  "accountType": "Evac",
  "isAdmin": true,
  "firstName": "Kyle",
  "lastName": "Essenmacher",
  "doctorSpecialty": [],
  "iat": 1767285848,
  "exp": 1768495448
}
```

**Payload (Web):**
```json
{
  "sub": "dev@example.com",
  "user_id": "dev@example.com",
  "email": "dev@example.com",
  "iat": 1767285848,
  "exp": 1767372248
}
```

### JWT Configuration

**File:** `apps/web/lib/jwt-config.ts`

```typescript
export const JWT_CONFIG = {
  KID: "fajr-emr-key",
  ALG: "HS256" as const,
  MOBILE_TOKEN_EXPIRY: "14d",
} as const;
```

### PowerSync JWKS Configuration

**File:** `apps/powersync-server/config/powersync.yaml`

```yaml
client_auth:
  jwks:
    keys:
      - kid: "fajr-emr-key"        # Must match JWT header
        kty: oct                    # Symmetric key
        k: 5lhohZ8w...ktuDQ==      # Base64-encoded secret
        alg: HS256                  # Algorithm
  audience: ["powersync", "powersync-dev"]
  issuer: https://emr.fajr.org
```

### Token Generation (Correct Implementation)

**Mobile Login Endpoint:**
```typescript
// apps/web/app/api/auth/mobile-login/route.ts

// CRITICAL: Decode base64 secret before use
const JWT_SECRET_BASE64 = process.env.JWT_SECRET || "";
const JWT_SECRET = Buffer.from(JWT_SECRET_BASE64, 'base64');

const token = jwt.sign(
  {
    sub: user.id,              // ✅ Required 'sub' claim
    id: user.id,
    email: user.email,
    accountType,
    isAdmin: !!user.admin,
    firstName: user.firstName,
    lastName: user.lastName,
    doctorSpecialty: user.settings?.doctorSpecialty || [],
  },
  JWT_SECRET,                   // ✅ Decoded secret
  {
    expiresIn: "14d",
    header: {
      kid: "fajr-emr-key",     // ✅ Required 'kid' header
      alg: "HS256",
    },
  }
);
```

## API Endpoints

### 1. Health Check

**Endpoint:** `GET /api/powersync/health`  
**Access:** Protected (admin only)  
**Purpose:** Check PowerSync service health

**Response:**
```json
{
  "ready": true,
  "started": true,
  "touched_at": "2026-01-01T16:44:09.000Z",
  "duration": 127
}
```

### 2. PowerSync Token (Web)

**Endpoint:** `GET /api/auth/powersync-token`  
**Access:** Authenticated users  
**Purpose:** Generate JWT for web client authentication

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImZhanItZW1yLWtleSJ9..."
}
```

### 3. Mobile Login

**Endpoint:** `POST /api/auth/mobile-login`  
**Access:** Public (with credentials)  
**Purpose:** Mobile authentication + JWT generation

**Request:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImZhanItZW1yLWtleSJ9...",
  "user": {
    "id": "5dddd510-544f-4f37-a75d-4f35053e6057",
    "email": "user@example.com",
    "firstName": "Kyle",
    "lastName": "Essenmacher",
    "accountType": "Evac",
    "isAdmin": true
  }
}
```

## Configuration

### Environment Variables

**Web Application:**
```bash
# PowerSync Service URL (Internal Docker Network)
POWERSYNC_SERVICE_URL=http://powersync:6061

# JWT Secret (Base64-encoded, 64 bytes decoded)
JWT_SECRET=<REDACTED-generate-with-openssl-rand-base64-64>

# NextAuth Secret (Session management only)
NEXTAUTH_SECRET=<REDACTED-generate-with-openssl-rand-base64-32>
```

**PowerSync Service:**
```bash
# PostgreSQL Connection
POSTGRES_HOST=<DB_HOST>
POSTGRES_PORT=5433
POSTGRES_DB=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=<REDACTED-set-your-own-password>

# JWT Secret (MUST match web app)
JWT_SECRET=<REDACTED-generate-with-openssl-rand-base64-64>

# Service Port
POWERSYNC_PORT=6061
```

### Mobile App Configuration

**File:** `apps/mobile/src/config/index.ts`

```typescript
export const config = {
  PROD: {
    BASE_URL: 'https://emr.fajr.org',
    API_URL: 'https://emr.fajr.org/api',
    WS_URL: 'wss://emr.fajr.org',
    POWERSYNC_URL: 'https://ws.emr.fajr.org',  // SDK converts to wss://
  },
  DEV: {
    BASE_URL: 'http://localhost:3000',
    API_URL: 'http://localhost:3000/api',
    WS_URL: 'ws://localhost:3000',
    POWERSYNC_URL: 'http://localhost:6061',
  },
};
```

## Monitoring & Health Checks

### Health Check Response

```typescript
interface HealthData {
  ready: boolean;        // Service ready for connections
  started: boolean;      // Service startup complete
  touched_at: string;    // ISO timestamp of last activity
  duration?: number;     // Response time (ms)
}
```

### Status Indicators

| Status | Color | Meaning |
|--------|-------|---------|
| Healthy | 🟢 Green | Service operational and ready |
| Starting | 🟡 Yellow | Service starting or not yet ready |
| Error | 🔴 Red | Service unavailable or error |

### Performance Expectations

| Metric | Expected | Action if Exceeded |
|--------|----------|-------------------|
| Health Check | < 200ms | Check network/database |
| Service Startup | 30-60s | Review logs for errors |
| Replication Lag | < 1s | Check database performance |
| Response Time | < 500ms | Monitor container resources |

## Troubleshooting

### 1. JWT Authentication Errors

#### Error: Missing required claim 'sub'

**Symptoms:**
```
[PSYNC_S2101] JWT payload is missing a required claim "sub"
```

**Root Cause:**  
JWT tokens don't include the `sub` (subject) claim required by PowerSync.

**Solution:**
1. ✅ **Fix Applied:** Mobile-login endpoint now includes `sub: user.id`
2. Users must **log out and log back in** to get fresh tokens
3. Force quit app completely if old tokens are cached
4. Verify token includes `sub` claim using jwt.io

#### Error: Signature verification failed

**Symptoms:**
```
[PSYNC_S2101] signature verification failed
```

**Root Cause:**  
JWT_SECRET is base64-encoded but was used as-is instead of being decoded.

**Solution:**
1. ✅ **Fix Applied:** Both endpoints now decode the secret:
   ```typescript
   const JWT_SECRET = Buffer.from(JWT_SECRET_BASE64, 'base64');
   ```
2. Redeploy web application
3. Users must log out and back in

#### Error: Could not find appropriate key

**Symptoms:**
```
[PSYNC_S2101] Could not find an appropriate key in the keystore
```

**Root Cause:**  
JWT header missing `kid` (Key ID) field.

**Solution:**
1. ✅ **Fix Applied:** Both endpoints now include `kid` header:
   ```typescript
   header: { kid: "fajr-emr-key", alg: "HS256" }
   ```
2. Verify JWT_CONFIG.KID matches PowerSync JWKS
3. Users must log out and back in

### 2. Service Health Issues

#### Service Not Responding

**Check:**
```bash
# 1. Container running?
docker ps | grep powersync

# 2. View logs
docker logs <powersync-container> --tail 100

# 3. Test internal network
docker exec <web-container> curl http://powersync:6061/probes/liveness

# 4. Check PostgreSQL connection
docker exec <powersync-container> psql -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -c "SELECT 1;"
```

#### Service Started but Not Ready

**Causes:**
- Replication slot not configured
- PostgreSQL publication missing
- Sync rules validation errors
- Lock conflicts

**Solutions:**
```bash
# Check sync rules
docker exec <powersync-container> cat /config/sync-rules.yaml

# Check PostgreSQL replication
docker exec <postgres-container> psql -U postgres -c "SELECT * FROM pg_replication_slots WHERE slot_name = 'powersync_slot';"

# Clear locks if needed
docker exec <postgres-container> psql -U postgres -d postgres -c "
  UPDATE powersync.sync_rules SET state = 'STOPPED' WHERE state = 'ACTIVE';
  DELETE FROM powersync.locks;
"
```

### 3. Mobile App Connection Issues

**Symptoms:**
- App logs in successfully but PowerSync fails to connect
- Continuous retry attempts every ~5 seconds
- Error: "Closed. Original cause [Error: ...]"

**Diagnostic Steps:**

1. **Check Token Structure:**
   ```bash
   # Get token from mobile app logs
   TOKEN="eyJhbGc..."
   
   # Decode header
   echo "$TOKEN" | cut -d. -f1 | base64 -d | jq
   
   # Should show:
   # { "kid": "fajr-emr-key", "alg": "HS256", "typ": "JWT" }
   
   # Decode payload
   echo "$TOKEN" | cut -d. -f2 | base64 -d | jq
   
   # Should include:
   # { "sub": "...", "id": "...", "email": "...", ... }
   ```

2. **Verify Mobile App Config:**
   ```typescript
   // Should be:
   POWERSYNC_URL: 'https://ws.emr.fajr.org'
   
   // NOT:
   POWERSYNC_URL: 'ws://...'  // Wrong protocol
   POWERSYNC_URL: 'http://...'  // Wrong protocol
   ```

3. **Test PowerSync WebSocket:**
   ```bash
   # From your machine
   wscat -c wss://ws.emr.fajr.org
   
   # Should connect successfully (will close without auth)
   ```

## Recent Updates

### January 1, 2026 - JWT Authentication Fixes

**Summary:** Three critical JWT issues resolved, enabling mobile app authentication with PowerSync.

#### Fix 1: Missing `kid` Header
- **Commit:** `5aab81ab`
- **File:** `apps/web/app/api/auth/powersync-token/route.ts`
- **Change:** Added `kid: "fajr-emr-key"` to JWT header
- **Impact:** PowerSync can now identify which key to use for verification

#### Fix 2: Base64 Secret Decoding
- **Commit:** `d11a61cc`
- **Files:** `mobile-login/route.ts`, `powersync-token/route.ts`
- **Change:** Decode base64 secret before `jwt.sign()`
- **Impact:** JWT signatures now match PowerSync expectations

#### Fix 3: Missing `sub` Claim
- **Commit:** (Current)
- **File:** `apps/web/app/api/auth/mobile-login/route.ts`
- **Change:** Added `sub: user.id` to JWT payload
- **Impact:** PowerSync can identify authenticated users

**Deployment Status:**
- ✅ Commits pushed to repository
- ⏳ Web application redeployment pending
- ⏳ Mobile app testing pending

**Testing Checklist:**
- [ ] Redeploy web application
- [ ] Mobile users log out completely
- [ ] Mobile users log back in (get fresh tokens)
- [ ] Verify PowerSync connection successful
- [ ] Verify data sync working bidirectionally

## Related Documentation

- **JWT Fixes:** `docs/power-sync/01_01_2026_jwt_kid_fix.md`
- **JWT Fixes:** `docs/power-sync/01_01_2026_jwt_sub_claim_fix.md`
- **Component README:** `apps/web/components/adminDashboard/sections/powersync/README.md`
- **PowerSync Server:** `apps/powersync-server/README.md`
- **Sync Rules:** `apps/powersync-server/config/sync-rules.yaml`
- **PowerSync Config:** `apps/powersync-server/config/powersync.yaml`

## Security Considerations

### JWT Secret Management

**Current Setup:**
- ✅ 64-byte random secret, base64-encoded
- ✅ Stored in Coolify environment variables (encrypted at rest)
- ✅ Never committed to git
- ✅ Decoded before use with `jwt.sign()`

**Secret Rotation Procedure:**
1. Generate new 64-byte secret: `openssl rand -base64 64`
2. Update Coolify env vars for both web and PowerSync services
3. Update PowerSync JWKS config `k` field
4. Redeploy both services
5. **All users must re-login** (existing tokens invalidated)

### Access Control

- ✅ Admin dashboard protected by NextAuth
- ✅ PowerSync health endpoint requires authentication
- ✅ Internal Docker network only (PowerSync not exposed)
- ✅ WebSocket endpoint uses JWT authentication
- ✅ No sensitive data in health responses

## Future Enhancements

- [ ] Historical metrics charts (health check response times)
- [ ] Replication lag tracking over time
- [ ] Active connection count monitoring
- [ ] Alert system for service degradation
- [ ] JWT token validation tool in admin UI
- [ ] Active mobile clients viewer
- [ ] Sync rules validation and editor
- [ ] Real-time sync activity feed
- [ ] Performance profiling tools
- [ ] Database migration status tracking

---

**Last Reviewed:** January 1, 2026  
**Maintainer:** Fajr EMR Engineering Team  
**License:** Part of the Fajr EMR project