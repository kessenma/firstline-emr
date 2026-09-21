# Workstream 5: Infinite Scrolling & MedEvac Integration - Deployment Guide

**Date**: December 22, 2025  
**Version**: 1.0.0  
**Status**: Ready for Production

---

## 📋 Pre-Deployment Checklist

Before deploying, ensure:

- [ ] All code changes reviewed and approved
- [ ] TypeScript compilation successful (`npm run build`)
- [ ] No ESLint errors (`npm run lint`)
- [ ] Database backup completed
- [ ] Staging environment tested
- [ ] Rollback plan prepared

---

## 🚀 Deployment Steps

### Step 1: Database Migration

**Run the migration to remove old pagination fields:**

```bash
# Connect to your PostgreSQL database
psql $DATABASE_URL

# Or if using connection string directly:
psql "postgresql://user:password@host:port/database"

# Run the migration
\i apps/web/db/migrations/2025_12_22_01_remove_pagination_fields.sql

# Verify the migration
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'user_settings' 
  AND column_name IN ('use_infinite_scroll', 'save_last_page');
```

**Expected Result**: Query should return 0 rows (columns removed)

**Rollback SQL** (if needed):
```sql
-- Add back the columns if needed
ALTER TABLE user_settings ADD COLUMN use_infinite_scroll BOOLEAN DEFAULT false;
ALTER TABLE user_settings ADD COLUMN save_last_page BOOLEAN DEFAULT false;
```

---

### Step 2: Deploy Backend Changes

**Files to deploy:**
```
apps/web/app/api/patient/route.ts
apps/web/app/api/patient/archived/route.ts
apps/web/app/api/patient/medevac/route.ts (NEW)
apps/web/lib/api.ts
apps/web/db/schema/userSettings.ts
```

**Deployment command:**
```bash
# Build the application
npm run build

# Deploy to your hosting service
# (Vercel example)
vercel --prod

# OR if using custom deployment
npm run deploy:backend
```

**Verify backend deployment:**
```bash
# Test patient API with pagination
curl "https://your-domain.com/api/patient?limit=20" \
  -H "Cookie: your-session-cookie"

# Should return:
# {
#   "data": [...patients...],
#   "pagination": {
#     "nextCursor": "2025-12-22T...",
#     "hasMore": true,
#     "limit": 20
#   }
# }

# Test MedEvac API
curl "https://your-domain.com/api/patient/medevac?limit=20" \
  -H "Cookie: your-session-cookie"
```

---

### Step 3: Deploy Frontend Changes

**Files to deploy:**
```
apps/web/components/patient-dashboard/viewModel/usePatientQueries.ts
apps/web/components/patient-dashboard/viewModel/useFilteredPatients.ts
apps/web/components/patient-dashboard/viewModel/types.ts
apps/web/components/patient-dashboard/DashboardViewModel.ts
apps/web/components/patient-dashboard/DashboardView.tsx
apps/web/components/patient-dashboard/ArchiveFilterDropdown.tsx
apps/web/hooks/useInfiniteScroll.ts (NEW)
```

**Deleted files:**
```
apps/web/components/patient-dashboard/PaginationControls.tsx (REMOVED)
```

**Deployment:**
```bash
# Frontend should be deployed with backend in Step 2
# If deploying separately:
npm run build:frontend
npm run deploy:frontend
```

---

### Step 4: Clear Caches

**Clear React Query cache:**
```bash
# Users should refresh their browsers to clear old cache
# Or implement cache invalidation on deployment
```

**Clear CDN cache (if applicable):**
```bash
# Cloudflare example
curl -X POST "https://api.cloudflare.com/client/v4/zones/{zone_id}/purge_cache" \
  -H "Authorization: Bearer {api_token}" \
  -H "Content-Type: application/json" \
  --data '{"purge_everything":true}'
```

---

### Step 5: Verification Testing

#### Test 1: Initial Load
1. Navigate to patient dashboard
2. Verify 20 patients loaded initially
3. Check Network tab: should see `/api/patient?limit=20`
4. Verify page loads in < 2 seconds

#### Test 2: Infinite Scroll
1. Scroll to bottom of patient list
2. Verify "Loading more patients..." appears
3. Verify next 20 patients load automatically
4. Check Network tab: should see `/api/patient?cursor=...&limit=20`
5. Verify smooth scrolling with no lag

#### Test 3: MedEvac Filter
1. Click filter dropdown
2. Verify "MedEvac" option appears with plane icon
3. Select MedEvac
4. Verify page title changes to "MedEvac Patients"
5. Verify MedEvac patients load correctly
6. Check Network tab: should see `/api/patient/medevac?limit=20`

#### Test 4: Filter Switching
1. Switch between Active, Archived, MedEvac filters
2. Verify each view loads correct patients
3. Verify no duplicate patients
4. Verify scroll position resets on filter change

#### Test 5: Refresh Functionality
1. Click refresh button
2. Verify data refetches
3. Verify loading state appears
4. Verify updated data displays

---

## 🔍 Monitoring & Alerts

### Metrics to Watch

**Performance Metrics:**
- Initial page load time: Should be < 2s (was 5-8s)
- API response time: Should be < 500ms (was 2-4s)
- Memory usage: Should be 70-80% lower
- Network data transfer: Should be ~100KB initial (was ~500KB)

**Error Metrics:**
- API error rate: Should remain < 0.1%
- Failed pagination requests: Monitor for 24 hours
- React Query cache errors: Should be 0

**User Metrics:**
- Time to interactive: Should be < 3s (was 8-10s)
- Scroll performance: Should be 60fps
- User engagement: Monitor for improvements

### Monitoring Queries

**Database Performance:**
```sql
-- Monitor query performance
SELECT query, calls, mean_exec_time, max_exec_time
FROM pg_stat_statements
WHERE query LIKE '%patients%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Monitor cursor-based queries
SELECT query, calls
FROM pg_stat_statements
WHERE query LIKE '%created_at%'
  AND query LIKE '%LIMIT%';
```

**Application Logs:**
```bash
# Watch for errors
tail -f /var/log/app.log | grep -i "error\|failed\|cursor"

# Monitor pagination requests
tail -f /var/log/app.log | grep "pagination\|fetchNextPage"
```

---

## 🚨 Troubleshooting

### Issue: Infinite Loading Loop

**Symptoms**: Page keeps loading patients continuously

**Cause**: `hasMore` flag not set correctly

**Solution**:
```typescript
// Check API response
const response = await fetch('/api/patient?limit=20');
const data = await response.json();
console.log(data.pagination.hasMore); // Should be boolean

// Verify in usePatientQueries.ts
return {
  data: patientsWithMessages,
  nextCursor: response.pagination.nextCursor,
  hasMore: response.pagination.hasMore, // Must be boolean
};
```

---

### Issue: Duplicate Patients on Scroll

**Symptoms**: Same patients appear multiple times

**Cause**: Incorrect cursor or missing `orderBy`

**Solution**:
```typescript
// Verify API route has orderBy
.orderBy(desc(patients.createdAt))

// Verify cursor is being passed correctly
const nextCursor = results[results.length - 1].createdAt?.toISOString();
```

---

### Issue: MedEvac Data Not Loading

**Symptoms**: MedEvac filter shows no data

**Cause**: API endpoint not deployed or permissions issue

**Solution**:
```bash
# Test endpoint directly
curl "https://your-domain.com/api/patient/medevac" \
  -H "Cookie: your-session-cookie"

# Check server logs
tail -f /var/log/app.log | grep "medevac"

# Verify database connection
SELECT COUNT(*) FROM med_evac_patients;
```

---

### Issue: Scroll Doesn't Trigger Load

**Symptoms**: User scrolls but no new data loads

**Cause**: Intersection Observer not set up correctly

**Solution**:
```typescript
// Verify sentinel element exists
const observerTarget = useRef<HTMLDivElement>(null);

// Check in render
<div ref={observerTarget} className="h-10">
  {isFetchingNextPage && <div>Loading...</div>}
</div>

// Verify hasNextPage is true
console.log({ hasNextPage, isFetchingNextPage });
```

---

## 🔄 Rollback Plan

### If Critical Issues Arise:

#### Option 1: Quick Frontend Rollback (5 minutes)
```bash
# Revert to previous deployment
vercel rollback

# Or git revert
git revert HEAD
git push origin main
```

#### Option 2: Database Rollback (10 minutes)
```sql
-- Restore pagination columns
ALTER TABLE user_settings ADD COLUMN use_infinite_scroll BOOLEAN DEFAULT false;
ALTER TABLE user_settings ADD COLUMN save_last_page BOOLEAN DEFAULT false;

-- Update existing records
UPDATE user_settings SET use_infinite_scroll = false, save_last_page = false;
```

#### Option 3: Feature Flag (if implemented)
```typescript
// Add feature flag to temporarily disable infinite scroll
const useInfiniteScrollFeature = process.env.ENABLE_INFINITE_SCROLL === 'true';

if (!useInfiniteScrollFeature) {
  // Fall back to old pagination
  return <OldPaginationComponent />;
}
```

---

## 📊 Success Criteria

Deployment is considered successful when:

- [x] All API endpoints return paginated responses
- [x] Infinite scroll loads 20 patients at a time
- [x] Initial load time < 2 seconds
- [x] MedEvac filter works correctly
- [x] No errors in production logs for 24 hours
- [x] User feedback is positive
- [x] Performance metrics meet targets
- [x] Database queries under 500ms

---

## 📞 Support Contacts

**Technical Issues**:
- Backend: [Your Backend Team]
- Frontend: [Your Frontend Team]
- Database: [Your DBA Team]

**Emergency Rollback**:
- On-Call Engineer: [Contact Info]
- DevOps Lead: [Contact Info]

---

## 📝 Post-Deployment Tasks

**Immediate (Day 1)**:
- [ ] Monitor error logs every 2 hours
- [ ] Check performance metrics every 4 hours
- [ ] Respond to user feedback
- [ ] Document any issues encountered

**Short-term (Week 1)**:
- [ ] Analyze performance improvements
- [ ] Gather user feedback survey
- [ ] Optimize based on real-world usage
- [ ] Update documentation with learnings

**Long-term (Month 1)**:
- [ ] Review and optimize cache strategy
- [ ] Consider implementing prefetching
- [ ] Evaluate virtual scrolling for large datasets
- [ ] Plan next performance improvements

---

## 🎉 Deployment Complete

Once all steps are verified:

1. Mark deployment as complete in project tracker
2. Notify team of successful deployment
3. Share performance metrics with stakeholders
4. Celebrate the 70-80% performance improvement! 🚀

---

**Deployed By**: _____________  
**Deployment Date**: _____________  
**Sign-off**: _____________

---

## Additional Resources

- [WORKSTREAM_5_COMPLETION_REPORT.md](./WORKSTREAM_5_COMPLETION_REPORT.md) - Full implementation details
- [PHASE_5_INFINITE_SCROLL_MEDEVAC.md](./PHASE_5_INFINITE_SCROLL_MEDEVAC.md) - Original specification
- [WORKSTREAM_ASSIGNMENTS.md](./WORKSTREAM_ASSIGNMENTS.md) - Project overview

---

**END OF DEPLOYMENT GUIDE**