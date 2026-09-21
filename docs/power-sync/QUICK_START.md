# PowerSync Admin Dashboard - Quick Start Guide

**Last Updated:** 2025-12-29  
**Time to Complete:** 5 minutes

---

## What You're Building

A PowerSync health monitoring section in your admin dashboard, similar to your translation service monitoring.

**Result:** Secure, authenticated health monitoring without public endpoints.

---

## Prerequisites

- ✅ PowerSync container running
- ✅ Admin dashboard with sections
- ✅ Next.js app with API routes

---

## Step 1: Add PowerSync Section to Admin Dashboard

Add the PowerSync monitoring component to your admin dashboard:

```tsx
// In your admin dashboard component
import { PowerSyncView } from "@/components/adminDashboard/sections/powersync";

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Other sections */}
      
      {/* PowerSync Monitoring */}
      <PowerSyncView />
      
      {/* More sections */}
    </div>
  );
}
```

---

## Step 2: Verify PowerSync is Running

Check that PowerSync is healthy:

```bash
# On your server
docker ps | grep powersync

# Should show: (healthy)
```

If not healthy, wait 60 seconds for startup to complete.

---

## Step 3: Access the Dashboard

1. Open your admin dashboard
2. Scroll to "PowerSync Service" section
3. Click "Check Health" button
4. See real-time status! 🎉

---

## What You Get

### Overview Tab
- 🟢 Service status (Healthy/Starting/Error)
- ⏱️ Uptime tracking
- ⚡ Response time metrics
- ✅ Started/Ready indicators

### Replication Tab
- 📊 Sync status
- 🔄 Replication state
- 📅 Last activity timestamp
- ℹ️ Sync information

### Details Tab
- 🔧 Service configuration
- 🌐 WebSocket endpoint for mobile
- 🔍 Advanced diagnostics
- 🛠️ Troubleshooting guide

---

## Features

✅ **Auto-Refresh:** Enable 30-second automatic updates  
✅ **Response Time:** Track health check performance  
✅ **Status Indicators:** Visual health status with colors  
✅ **Secure:** Protected behind admin authentication  
✅ **No Public Endpoints:** Internal monitoring only  

---

## API Endpoint

The health check is proxied through:
```
GET /api/powersync/health
```

This calls PowerSync internally at:
```
http://powersync:6061/probes/liveness
```

---

## Status Indicators

| Icon | Status | Meaning |
|------|--------|---------|
| 🟢 | Healthy | Service operational |
| 🟡 | Starting | Service initializing |
| 🔴 | Error | Service unavailable |

---

## Common Issues

### "Service Unavailable" Error

**Solution:**
```bash
# Check if PowerSync is running
docker ps | grep powersync

# If not running, start it
docker-compose -f docker-compose.powersync.yml up -d
```

### "Service Started but Not Ready"

**Solution:** Wait 30-60 seconds for initialization. The service needs time to:
1. Connect to PostgreSQL
2. Load sync rules
3. Start replication

### Slow Response Times (>500ms)

**Check:**
1. Database performance
2. Container resources
3. Network connectivity

---

## Configuration

### Environment Variables (Optional)

The web app will auto-detect PowerSync in production:

```bash
# Only needed if using non-standard URL
POWERSYNC_SERVICE_URL=http://powersync:6061
```

### No Changes Needed!

The admin dashboard integration works out-of-the-box with:
- ✅ Auto-detected internal URL
- ✅ Standard PowerSync port (6061)
- ✅ Docker network connectivity

---

## Mobile App Integration

Mobile apps connect separately via WebSocket:

```typescript
// In your React Native/Flutter app
const powerSyncConfig = {
  url: "wss://ws.emr.fajr.org",  // External WebSocket endpoint
  // ... other config
};
```

**Note:** Admin dashboard monitoring is separate from mobile sync!

---

## Testing

### Manual Health Check
1. Click "Check Health" button
2. Should return in <200ms
3. Status shows 🟢 Healthy

### Auto-Refresh
1. Click "Auto-Refresh On"
2. Dashboard updates every 30 seconds
3. Response times tracked

### Replication Status
1. Go to "Replication" tab
2. View sync state
3. Check last activity

---

## Comparison with Translation Service

Both follow the same pattern:

```tsx
// Translation Service
<TranslationServiceView />

// PowerSync Service
<PowerSyncView />
```

Same features:
- ✅ Auto-refresh
- ✅ Health checks
- ✅ Status indicators
- ✅ Troubleshooting guide
- ✅ Authenticated access

---

## Architecture

```
┌─────────────────────────┐
│   Admin Dashboard       │
│   (Your Browser)        │
└───────────┬─────────────┘
            │ HTTPS + Auth
            ↓
┌─────────────────────────┐
│   Next.js Web App       │
│   /api/powersync/health │
└───────────┬─────────────┘
            │ Internal Network
            ↓
┌─────────────────────────┐
│   PowerSync Container   │
│   :6061/probes/liveness │
└───────────┬─────────────┘
            │
            ↓
┌─────────────────────────┐
│   PostgreSQL Database   │
└─────────────────────────┘
```

---

## Files Involved

You already have everything you need! The integration includes:

**Dashboard Components:**
- `apps/web/components/adminDashboard/sections/powersync/PowerSyncView.tsx`
- `apps/web/components/adminDashboard/sections/powersync/PowerSyncViewModel.ts`
- `apps/web/components/adminDashboard/sections/powersync/index.ts`

**API Route:**
- `apps/web/app/api/powersync/health/route.ts`

**Docker:**
- `docker-compose.powersync.yml`

---

## Next Steps

1. ✅ Import `PowerSyncView` in your admin dashboard
2. ✅ Access the dashboard and click "Check Health"
3. ✅ Enable auto-refresh for continuous monitoring
4. ✅ Share with your team!

---

## Support

### Documentation
- **Full Integration Guide:** `docs/power-sync/ADMIN_DASHBOARD_INTEGRATION.md`
- **Component README:** `apps/web/components/adminDashboard/sections/powersync/README.md`
- **Troubleshooting:** `docs/power-sync/TROUBLESHOOTING.md`

### Logs
```bash
# PowerSync logs
docker logs <powersync-container-id>

# Web app logs (look for [requestId] entries)
# Check your Next.js console for API calls
```

---

## Success! 🎉

You now have:
- ✅ Secure health monitoring
- ✅ Real-time status updates
- ✅ Auto-refresh capability
- ✅ Consistent with translation service
- ✅ No public endpoints needed
- ✅ Production-ready monitoring

**Total setup time:** ~5 minutes  
**Maintenance required:** None! 🚀

---

*End of Quick Start Guide*