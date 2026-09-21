# Patient Dashboard Refactor - Quick Reference

## 🎯 TL;DR

**Goal**: Make dashboard 60-80% faster  
**Time**: 4-6 hours total (3 hours if parallelized)  
**Phases**: 4 independent workstreams  
**Risk**: Low (each phase can be rolled back independently)

---

## 📋 Cheat Sheet

### Phase Order by Priority

| Phase | Time | Priority | Can Parallelize? |
|-------|------|----------|------------------|
| Phase 1: Database Indexes | 30 min | HIGH ⚡ | ✅ Yes |
| Phase 3: Server Components | 2-3 hrs | CRITICAL 🔥 | After Phase 1 |
| Phase 2: Batch API | 1-2 hrs | HIGH ⚡ | ✅ Yes |
| Phase 4: Query Optimization | 1 hr | MEDIUM 🟡 | ✅ Yes |
| Phase 5: Infinite Scroll & MedEvac | 2-3 hrs | MEDIUM 🟡 | ✅ Yes |

### Expected Improvements

```
Before: 3-5 seconds, 50+ API calls, 500KB payload, pagination buttons
After:  1-2 seconds, 1-2 API calls, 300KB payload, infinite scroll
Result: 60-80% faster + better UX! 🚀
```

---

## 🚀 Phase 1: Database Indexes (30 min)

### What to Do
```typescript
// File: apps/web/db/schema/patients.ts
// Add these three indexes:

statusCoordinatorIdx: index("patients_status_coordinator_idx")
  .on(table.status, table.coordinatorId),
createdAtIdx: index("patients_created_at_idx")
  .on(table.createdAt),
statusCreatedAtIdx: index("patients_status_created_at_idx")
  .on(table.status, table.createdAt),
```

### Commands
```bash
npm run db:generate
npm run db:migrate
npm run db:studio  # Verify indexes
```

### Verify Success
- ✅ 3 new indexes visible in database
- ✅ Query execution time reduced
- ✅ Dashboard loads without errors

**Impact**: 30-50% faster queries

---

## 🚀 Phase 2: Batch API (1-2 hrs)

### Files to Create/Modify
1. `apps/web/app/api/telegram/unread-messages/batch/route.ts` (NEW)
2. `apps/web/lib/api.ts` (ADD function)
3. `apps/web/components/patient-dashboard/viewModel/usePatientQueries.ts` (MODIFY)

### Key Code Snippet

```typescript
// In usePatientQueries.ts - Replace addUnreadMessages:

const addUnreadMessages = useCallback(async (data: IPatient[]) => {
    if (!data?.length) return [];
    
    const chatIds = data
        .filter(p => p.telegramChatId)
        .map(p => p.telegramChatId)
        .filter((id): id is string => !!id);
    
    if (chatIds.length === 0) {
        return data.map(p => ({ ...p, unreadMessages: 0 }));
    }
    
    // BATCH REQUEST - 1 call instead of N
    const unreadMessagesMap = await fetchBatchUnreadMessages(chatIds);
    
    return data.map(patient => ({
        ...patient,
        unreadMessages: patient.telegramChatId 
            ? (unreadMessagesMap[patient.telegramChatId] || 0)
            : 0
    }));
}, []);
```

### Verify Success
- ✅ Network tab shows 1 batch request (not N requests)
- ✅ Unread counts display correctly
- ✅ Dashboard loads faster

**Impact**: 80-95% reduction in API calls

---

## 🚀 Phase 3: Server Components (2-3 hrs)

### Files to Create/Modify
1. `apps/web/lib/server/patients.ts` (NEW - server-side fetching)
2. `apps/web/app/patient-dashboard/page.tsx` (MAJOR CHANGE - remove "use client")
3. `apps/web/components/patient-dashboard/DashboardClientWrapper.tsx` (NEW)
4. `apps/web/components/patient-dashboard/DashboardView.tsx` (MODIFY - accept initialData)

### Key Changes

```typescript
// page.tsx - NOW A SERVER COMPONENT (no "use client")
export default async function DashboardPage() {
  const session = await verifySession();
  if (!session) redirect("/auth/login");
  
  // Fetch data on server
  const initialPatients = await fetchInitialDashboardPatients(
    session.userId,
    session.accountType
  );
  
  return <DashboardClientWrapper initialPatients={initialPatients} />;
}
```

### Verify Success
- ✅ No "use client" in page.tsx
- ✅ Data appears immediately (no loading skeleton)
- ✅ No hydration errors in console
- ✅ Client interactions still work (filters, etc.)

**Impact**: 50-70% faster initial load

---

## 🚀 Phase 4: Query Optimization (1 hr)

### What to Do
Add query parameter support for minimal vs full field selection

```typescript
// In app/api/patient/route.ts
const fields = searchParams.get('fields'); // "minimal" or "full"

const minimalFields = {
  id: patients.id,
  firstName: patients.firstName,
  lastName: patients.lastName,
  status: patients.status,
  priority: patients.priority,
  // ... only fields needed for list view
};

const selectFields = fields === 'minimal' ? minimalFields : fullFields;
```

### Verify Success
- ✅ Payload size reduced in Network tab
- ✅ All UI elements render correctly
- ✅ No missing data

**Impact**: 20-30% faster response times

---

## 🚀 Phase 5: Infinite Scroll & MedEvac (2-3 hrs)

### Files to Create/Modify
1. `apps/web/app/api/patient/route.ts` (MODIFY - add cursor pagination)
2. `apps/web/app/api/patient/archived/route.ts` (MODIFY - add cursor pagination)
3. `apps/web/app/api/patient/medevac/route.ts` (NEW - MedEvac endpoint)
4. `apps/web/lib/api.ts` (MODIFY - add pagination params)
5. `apps/web/hooks/useInfiniteScroll.ts` (NEW)
6. `apps/web/components/patient-dashboard/viewModel/usePatientQueries.ts` (MAJOR REFACTOR)
7. `apps/web/components/patient-dashboard/ArchiveFilterDropdown.tsx` (MODIFY - add MedEvac)
8. `apps/web/components/patient-dashboard/DashboardView.tsx` (MODIFY - infinite scroll)
9. `apps/web/components/patient-dashboard/PaginationControls.tsx` (DELETE)
10. `apps/web/db/schema/userSettings.ts` (MODIFY - remove pagination fields)

### Key Changes

**API Routes with Cursor Pagination**:
```typescript
// All patient APIs return this format
{
  data: Patient[],
  pagination: {
    nextCursor: string | null,  // Timestamp for next page
    hasMore: boolean,
    limit: number
  }
}

// Usage: GET /api/patient?cursor=2024-01-01T00:00:00Z&limit=20
```

**React Query Infinite Scroll**:
```typescript
// Replace useQuery with useInfiniteQuery
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage
} = useInfiniteQuery({
  queryKey: ["patients", viewType],
  queryFn: async ({ pageParam }) => fetchPatients(pageParam),
  getNextPageParam: (lastPage) => lastPage.nextCursor,
  initialPageParam: undefined,
});

// Flatten all pages
const allPatients = data?.pages.flatMap(page => page.data) ?? [];
```

**Infinite Scroll Hook**:
```typescript
// apps/web/hooks/useInfiniteScroll.ts
const { observerTarget } = useInfiniteScroll({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  threshold: 300, // px from bottom
});

// In component:
<div ref={observerTarget}>Loading...</div>
```

**MedEvac Filter Addition**:
```typescript
// In ArchiveFilterDropdown.tsx
<RadioCard.Item value="medevac">
  <Plane className="h-4 w-4" />
  <span>MedEvac Patients</span>
</RadioCard.Item>
```

**Clean Up**:
```bash
# Remove old pagination
rm apps/web/components/patient-dashboard/PaginationControls.tsx

# Remove from userSettings schema
# - useInfiniteScroll field
# - saveLastPage field

npm run db:generate
npm run db:migrate
```

### Verify Success
- ✅ Scrolling to bottom loads more patients automatically
- ✅ Only 20 patients load initially (80% less data)
- ✅ Loading indicator shows at bottom
- ✅ MedEvac filter accessible in dropdown
- ✅ No pagination buttons
- ✅ Smooth scroll performance

**Impact**: 80% less initial data load + simplified UX

---

## 🧪 Testing Checklist

### Before Starting
- [ ] Measure baseline: Load time, API count, payload size
- [ ] Take screenshot of Network waterfall
- [ ] Note database query execution time

### After Each Phase
- [ ] Dashboard loads successfully
- [ ] All filters and actions work
- [ ] No console errors
- [ ] Performance improved (measure!)

### Final Verification
- [ ] Total load time < 2 seconds
- [ ] API requests ≤ 2 on initial load
- [ ] Payload < 350KB (only 20 patients)
- [ ] Infinite scroll working smoothly
- [ ] MedEvac filter accessible
- [ ] All features functional
- [ ] Mobile works

---

## 🚨 Common Issues & Fixes

### Issue: Hydration Error (Phase 3)
```
Error: Text content does not match server-rendered HTML
```
**Fix**: Make sure client wrapper doesn't transform data differently than server

### Issue: Batch API Returns Empty (Phase 2)
```typescript
// Add logging to diagnose:
console.log('Received chatIds:', chatIds);
console.log('Unread map result:', unreadMessagesMap);
```
**Fix**: Implement `fetchUnreadMessageCount()` function in batch API

### Issue: Indexes Not Being Used (Phase 1)
```sql
-- Run this to check:
EXPLAIN ANALYZE SELECT * FROM patients WHERE status != 'Archived';
```
**Fix**: Run `ANALYZE patients;` to update query planner statistics

### Issue: TypeScript Errors
```
Type 'string | null' is not assignable to type 'string'
```
**Fix**: Use type guard: `.filter((id): id is string => !!id)`

---

## 🔄 Rollback Commands

### Phase 1 Rollback (Drop Indexes)
```sql
DROP INDEX patients_status_coordinator_idx;
DROP INDEX patients_created_at_idx;
DROP INDEX patients_status_created_at_idx;
```

### Phase 2 Rollback (Revert Hook)
```bash
git checkout HEAD~1 apps/web/components/patient-dashboard/viewModel/usePatientQueries.ts
```

### Phase 3 Rollback (Revert to Client Component)
```bash
git checkout HEAD~1 apps/web/app/patient-dashboard/page.tsx
rm apps/web/components/patient-dashboard/DashboardClientWrapper.tsx
```

### Phase 4 Rollback (Revert API)
```bash
git checkout HEAD~1 apps/web/app/api/patient/route.ts
```

### Phase 5 Rollback (Remove Infinite Scroll)
```bash
# Revert infinite scroll
git checkout HEAD~1 apps/web/components/patient-dashboard/viewModel/usePatientQueries.ts
git checkout HEAD~1 apps/web/components/patient-dashboard/DashboardView.tsx

# Restore pagination
git checkout HEAD~1 apps/web/components/patient-dashboard/PaginationControls.tsx

# Revert API changes
git checkout HEAD~1 apps/web/app/api/patient/route.ts
rm apps/web/app/api/patient/medevac/route.ts

# Restore user settings (if needed)
# ALTER TABLE user_settings ADD COLUMN use_infinite_scroll BOOLEAN DEFAULT false;
```

---

## 📊 Performance Tracking Template

```
=== BEFORE OPTIMIZATION ===
Date: __________
Load Time: _____ seconds
API Requests: _____
Payload Size: _____ KB
Query Time: _____ ms

=== AFTER PHASE 1 ===
Date: __________
Query Time: _____ ms (_____ % improvement)

=== AFTER PHASE 2 ===
Date: __________
API Requests: _____ (_____ % reduction)

=== AFTER PHASE 3 ===
Date: __________
Load Time: _____ seconds (_____ % improvement)

=== AFTER PHASE 4 ===
Date: __________
Payload Size: _____ KB (_____ % reduction)

=== AFTER PHASE 5 ===
Date: __________
Initial Data Load: _____ KB (_____ % reduction)
Scroll Performance: SMOOTH / LAGGY
MedEvac Integration: WORKING / ISSUES

=== FINAL RESULTS ===
Total Improvement: _____ % faster
API Call Reduction: _____ %
Initial Load Reduction: _____ %
UX Improvement: INFINITE SCROLL + MEDEVAC FILTER
Success: YES / NO
```

---

## 🎯 Work Distribution Examples

### Solo Developer (Sequential)
```
Day 1 Morning: Phase 1 (30 min) → Phase 3 Part 1 (1.5 hrs)
Day 1 Afternoon: Phase 3 Part 2 (1.5 hrs) → Phase 2 Part 1 (1 hr)
Day 2 Morning: Phase 2 Part 2 (1 hr) → Phase 4 (1 hr)
Day 2 Afternoon: Testing & Polish (1 hr)
```

### Team of 3 (Parallel)
```
Developer A: Phase 1 (30 min) → Phase 3 (2-3 hrs)
Developer B: Phase 2 (1-2 hrs) → Help with testing
Developer C: Phase 4 (1 hr) → Phase 5 (2-3 hrs)

Total Time: ~3 hours (parallel) vs 8 hours (sequential)
```

### 5 LLM Agents (Maximum Parallel)
```
Agent 1: Phase 1 (30 min) - Completes first
Agent 2: Phase 2 (1-2 hrs) - Independent
Agent 3: Phase 3 (2-3 hrs) - Start after Agent 1
Agent 4: Phase 4 (1 hr) - Independent
Agent 5: Phase 5 (2-3 hrs) - Independent (or after Phase 1)

Total Time: ~3 hours (maximum parallelization)
```

---

## 📚 Document Links

- [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Comprehensive overview
- [PHASE_1_DATABASE_INDEXES.md](./PHASE_1_DATABASE_INDEXES.md) - Detailed Phase 1 guide
- [PHASE_2_BATCH_API.md](./PHASE_2_BATCH_API.md) - Detailed Phase 2 guide
- [PHASE_5_INFINITE_SCROLL_MEDEVAC.md](./PHASE_5_INFINITE_SCROLL_MEDEVAC.md) - Detailed Phase 5 guide
- [README.md](./README.md) - Project overview

---

## ✅ Definition of Done

### Each Phase Complete When:
- [ ] Code changes committed
- [ ] Tests passing
- [ ] Performance improvement measured
- [ ] No regression bugs
- [ ] Documentation updated

### Project Complete When:
- [ ] All 4 phases deployed
- [ ] Performance targets met (60-80% improvement)
- [ ] No critical bugs in production
- [ ] Team trained on new architecture
- [ ] Monitoring shows sustained improvement

---

## 🎉 Success Criteria

```
✅ Initial load time: < 2 seconds (was 3-5 seconds)
✅ API requests: 1-2 (was 50+)
✅ Database queries: < 200ms (was 200-500ms)
✅ Payload size: < 100KB initial (was 500KB+)
✅ User sees data immediately (no skeleton)
✅ Infinite scroll working smoothly
✅ MedEvac patients accessible
✅ No pagination buttons needed
✅ All features work correctly
✅ Zero regression bugs
```

---

**Quick Start**: Read [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) → Pick a phase → Follow detailed guide → Test → Ship! 🚀