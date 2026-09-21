# Patient Dashboard Data Fetching Refactor

## 📋 Overview

This directory contains comprehensive documentation for optimizing patient data loading in the dashboard. The refactor targets a **60-80% reduction in initial load time** through server-side rendering, query optimization, and architectural improvements.

---

## 🎯 Performance Goals

| Metric | Current | Target | Improvement |
|--------|---------|--------|-------------|
| Initial Load Time | ~3-5 seconds | ~1-2 seconds | 50-70% faster |
| API Requests on Load | N+1 requests | 1-2 requests | 80-95% reduction |
| Database Query Time | Baseline | Optimized | 30-50% faster |
| Payload Size | Full data | Minimal data | 20-30% smaller |

---

## 📚 Documentation Structure

### [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
**Main document** - Comprehensive implementation plan with all phases, timelines, and coordination strategy.

**Contents**:
- Executive summary
- Phase breakdown (4 phases)
- Dependencies and parallel work opportunities
- Testing strategy
- Deployment plan
- Rollback procedures

**Use this document for**:
- Project planning and coordination
- Understanding the overall strategy
- Assigning work to multiple engineers/agents

---

### Phase-Specific Guides

#### [PHASE_1_DATABASE_INDEXES.md](./PHASE_1_DATABASE_INDEXES.md)
**Database Optimization** | ⏱️ 30 minutes | 🔥 High Priority

**What it covers**:
- Adding composite indexes for faster queries
- Database migration process
- Performance verification

**Expected improvement**: 30-50% faster queries

---

#### [PHASE_2_BATCH_API.md](./PHASE_2_BATCH_API.md)
**Batch API for Unread Messages** | ⏱️ 1-2 hours | 🔥 High Priority

**What it covers**:
- Creating batch API endpoint
- Replacing N+1 API calls with single batch request
- Client-side integration

**Expected improvement**: 80-95% reduction in API calls

---

#### [PHASE_3_SERVER_COMPONENTS.md](./PHASE_3_SERVER_COMPONENTS.md)
**Server Component Migration** | ⏱️ 2-3 hours | ⚡ Critical Priority

**What it covers**:
- Converting client-side page to server component
- Server-side data fetching
- Maintaining client-side interactivity

**Expected improvement**: 50-70% faster initial load

---

#### [PHASE_4_QUERY_OPTIMIZATION.md](./PHASE_4_QUERY_OPTIMIZATION.md)
**Query Optimization & Field Selection** | ⏱️ 1 hour | 🟡 Medium Priority

**What it covers**:
- Selective field fetching
- Reducing payload size
- API query parameters

**Expected improvement**: 20-30% faster response times

---

#### [PHASE_5_INFINITE_SCROLL_MEDEVAC.md](./PHASE_5_INFINITE_SCROLL_MEDEVAC.md)
**Infinite Scrolling & MedEvac Integration** | ⏱️ 2-3 hours | 🟡 Medium Priority

**What it covers**:
- Replacing pagination with infinite scroll
- Cursor-based API pagination (load 20 at a time)
- MedEvac patients filter integration
- Removing legacy pagination code

**Expected improvement**: 80% less initial data load + simplified UX

---

## 🚀 Quick Start Guide

### For Project Managers / Coordinators

1. **Read**: [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) - Full overview
2. **Identify**: Available engineers/agents (can work on 4 phases in parallel)
3. **Assign**: Phases based on priority and dependencies
4. **Track**: Use completion checklists in each phase document

### For Engineers / LLM Agents

#### 🏃 Quick Wins (Start Here)
1. **Phase 1**: Database Indexes (30 min, immediate impact)
2. **Phase 2**: Batch API (1-2 hours, high impact)

#### 🎯 Critical Path
3. **Phase 3**: Server Components (2-3 hours, biggest impact)

#### 🔧 Polish
4. **Phase 4**: Query Optimization (1 hour, nice-to-have)
5. **Phase 5**: Infinite Scroll & MedEvac (2-3 hours, UX enhancement)

### For Solo Developer

**Recommended order**:
1. Phase 1 (30 min) - Easy win, sets foundation
2. Phase 3 (2-3 hours) - Biggest impact
3. Phase 2 (1-2 hours) - High impact, independent
4. Phase 4 (1 hour) - Final polish
5. Phase 5 (2-3 hours) - UX enhancement (optional but recommended)

**Total time**: 6-9 hours

### For Team of 3-5 Developers

**Parallel work**:
- **Developer 1**: Phase 1 → Phase 3
- **Developer 2**: Phase 2 (independent)
- **Developer 3**: Phase 4 (independent)
- **Developer 4**: Phase 5 (independent, or after Phase 1)

**Total time**: ~3 hours (with parallelization)

---

## 📊 Current Architecture Issues

### Problem 1: Client-Side Only Rendering
```typescript
// ❌ Current: All data fetched on client
"use client"
export default function DashboardPage() {
  const { data: session } = useSession()
  // Page shows loading skeleton while fetching
}
```

**Impact**: Slow initial load, poor user experience

### Problem 2: N+1 Query Problem
```typescript
// ❌ Current: N individual API calls
data.map(async (patient) => {
  const unread = await fetchUnreadMessages(patient.chatId) // N calls!
})
```

**Impact**: 50 patients = 50 API requests = slow dashboard

### Problem 3: No Database Optimization
```sql
-- ❌ Current: Sequential scan on large table
SELECT * FROM patients WHERE status != 'Archived'
-- No indexes = slow queries
```

**Impact**: Poor performance as dataset grows

### Problem 4: Over-fetching
```typescript
// ❌ Current: Fetches ALL fields even when not needed
SELECT * FROM patients -- All 40+ fields!
```

**Impact**: Large payload, slow network transfer

---

## ✅ Proposed Solutions

### Solution 1: Server Components
```typescript
// ✅ New: Server-side data fetching
export default async function DashboardPage() {
  const patients = await fetchPatients() // Server-side
  return <DashboardClientWrapper initialData={patients} />
}
```

**Benefit**: Data ready before page renders, instant display

### Solution 2: Batch API
```typescript
// ✅ New: Single batch request
const chatIds = data.map(p => p.chatId)
const unreadMap = await fetchBatchUnreadMessages(chatIds) // 1 call!
```

**Benefit**: 50 patients = 1 API request = fast

### Solution 3: Database Indexes
```typescript
// ✅ New: Composite indexes
statusCoordinatorIdx: index().on(status, coordinatorId)
createdAtIdx: index().on(createdAt)
```

**Benefit**: Index scans instead of sequential scans = fast

### Solution 4: Selective Fetching
```typescript
// ✅ New: Only fetch needed fields
SELECT id, firstName, lastName, status, priority FROM patients
```

**Benefit**: Smaller payload = faster transfer

### Solution 5: Infinite Scroll + Cursor Pagination
```typescript
// ✅ New: Load 20 at a time, automatically
GET /api/patient?cursor=2024-01-01&limit=20
// Returns: { data: [...], pagination: { nextCursor, hasMore } }
```

**Benefit**: 80% less initial data + progressive loading

---

## 🔗 Dependencies Between Phases

```
Phase 1: Database Indexes
  ↓ (Optional: Improves Phase 3 performance)
Phase 3: Server Components
  ↓ (Can run in parallel)
Phase 2: Batch API ←→ Phase 4: Query Optimization ←→ Phase 5: Infinite Scroll
  ↓
  All phases complete
```

### Can Work in Parallel
- Phase 1 + Phase 2
- Phase 1 + Phase 4
- Phase 2 + Phase 3 (after Phase 1)
- Phase 2 + Phase 4 + Phase 5
- All phases are independent except Phase 3 benefits from Phase 1
- Phase 5 recommended after Phase 1 for optimal performance

---

## 🧪 Testing Strategy

### Before Starting
- [ ] Measure baseline performance metrics
- [ ] Record current API call count
- [ ] Note database query times
- [ ] Screenshot current Network waterfall

### During Implementation
- [ ] Test each phase independently
- [ ] Verify no regression in functionality
- [ ] Measure improvements incrementally
- [ ] Keep rollback plan ready

### After Completion
- [ ] Compare performance metrics
- [ ] Verify all features work
- [ ] Load test with production-like data
- [ ] Get stakeholder sign-off

---

## 📈 Expected Results

### Before Optimization
- Initial page load: 3-5 seconds
- API requests: 50+ (for 50 patients)
- Database query time: 200-500ms
- Payload size: 500KB+
- User sees loading skeleton for 3-5 seconds

### After Optimization
- Initial page load: 1-2 seconds ✅ (50-70% faster)
- API requests: 1-2 ✅ (95% reduction)
- Database query time: 100-200ms ✅ (40-50% faster)
- Payload size: 100KB initial ✅ (80% smaller - only 20 patients)
- User sees data immediately ✅ (instant render)
- Infinite scroll ✅ (automatic progressive loading)
- MedEvac integration ✅ (all patient types in one view)

---

## 🚨 Risk Mitigation

### Risk 1: Breaking Changes
**Mitigation**: 
- Implement phases incrementally
- Test thoroughly at each step
- Keep old code paths as fallback
- Use feature flags where possible

### Risk 2: Database Migration Issues
**Mitigation**:
- Test migrations in development first
- Backup database before applying
- Have rollback migration ready
- Apply during low-traffic window

### Risk 3: Server Component Hydration Errors
**Mitigation**:
- Follow Next.js best practices
- Test thoroughly in development
- Use TypeScript for type safety
- Keep client boundary clear

### Risk 4: Performance Regression
**Mitigation**:
- Measure before and after
- Monitor production metrics
- Have rollback plan ready
- Gradual rollout if possible

---

## 🔄 Rollback Strategy

Each phase has independent rollback:

### Phase 1: Drop Indexes
```sql
DROP INDEX patients_status_coordinator_idx;
DROP INDEX patients_created_at_idx;
DROP INDEX patients_status_created_at_idx;
```

### Phase 2: Revert Hook
```bash
git checkout HEAD~1 usePatientQueries.ts
```

### Phase 3: Revert to Client Component
```bash
git checkout HEAD~1 page.tsx
```

### Phase 4: Revert API Changes
```bash
git checkout HEAD~1 app/api/patient/route.ts
```

---

## 📞 Support

### Questions During Implementation
1. Check the relevant phase document first
2. Review troubleshooting section
3. Search for similar issues in git history
4. Ask with specific error messages

### Issues After Deployment
1. Check monitoring/logs
2. Compare metrics before/after
3. Review rollback procedures
4. Execute rollback if critical

---

## 📝 Progress Tracking

Use this checklist to track overall progress:

### Phase 1: Database Indexes
- [ ] Schema updated
- [ ] Migration generated
- [ ] Migration applied
- [ ] Indexes verified
- [ ] Performance tested
- [ ] **Status**: 🔴 Not Started / 🟡 In Progress / 🟢 Complete

### Phase 2: Batch API
- [ ] API endpoint created
- [ ] Client function added
- [ ] Hook refactored
- [ ] Tests passing
- [ ] Performance verified
- [ ] **Status**: 🔴 Not Started / 🟡 In Progress / 🟢 Complete

### Phase 3: Server Components
- [ ] Server utilities created
- [ ] Page converted
- [ ] Wrapper created
- [ ] No hydration errors
- [ ] Features working
- [ ] **Status**: 🔴 Not Started / 🟡 In Progress / 🟢 Complete

### Phase 4: Query Optimization
- [ ] Types defined
- [ ] API updated
- [ ] Client updated
- [ ] Payload reduced
- [ ] Tests passing
- [ ] **Status**: 🔴 Not Started / 🟡 In Progress / 🟢 Complete

### Phase 5: Infinite Scrolling & MedEvac
- [ ] Cursor pagination API created
- [ ] Infinite scroll hook implemented
- [ ] MedEvac filter added
- [ ] Pagination code removed
- [ ] User settings cleaned up
- [ ] Tests passing
- [ ] **Status**: 🔴 Not Started / 🟡 In Progress / 🟢 Complete

---

## 🎓 Learning Outcomes

After completing this refactor, you will understand:

✅ Server-side rendering with Next.js 13+ App Router  
✅ Database query optimization with indexes  
✅ Solving N+1 query problems with batching  
✅ Performance monitoring and benchmarking  
✅ Safe database migration practices  
✅ React Server Components patterns  
✅ API optimization techniques  
✅ Incremental refactoring strategies  
✅ Infinite scroll implementation with React Query  
✅ Cursor-based pagination for large datasets  
✅ Progressive data loading techniques

---

## 📚 Additional Resources

### Next.js Documentation
- [Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
- [API Routes](https://nextjs.org/docs/api-routes/introduction)

### Database Optimization
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)
- [Drizzle ORM Performance](https://orm.drizzle.team/docs/performance)
- [Query Optimization](https://use-the-index-luke.com/)

### React Patterns
- [React Query](https://tanstack.com/query/latest)
- [Server vs Client Components](https://react.dev/learn/start-a-new-react-project)
- [Performance Optimization](https://react.dev/learn/render-and-commit)

---

## 📊 Success Metrics

### Technical Metrics
- [ ] Initial load time: < 2 seconds
- [ ] API requests on load: ≤ 2
- [ ] Database query time: < 200ms
- [ ] Initial payload size: < 100KB (only 20 patients)
- [ ] No hydration errors
- [ ] Zero regression bugs
- [ ] Infinite scroll working smoothly
- [ ] MedEvac filter functional

### User Experience Metrics
- [ ] Instant data visibility (no loading skeleton)
- [ ] Smooth interactions (filters, actions)
- [ ] Fast navigation
- [ ] No error states
- [ ] Mobile performance improved
- [ ] Infinite scroll feels natural
- [ ] No pagination clicking required
- [ ] MedEvac patients easily accessible

### Business Metrics
- [ ] User satisfaction increased
- [ ] Page bounce rate decreased
- [ ] Task completion time decreased
- [ ] Support tickets for slow dashboard decreased

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Maintained By**: Engineering Team  
**Status**: Ready for Implementation

---

## 🎯 Next Steps

1. **Read** the [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)
2. **Choose** your starting phase based on your role
3. **Follow** the detailed phase guide
4. **Test** thoroughly as you go
5. **Track** your progress
6. **Consider** Phase 5 for enhanced UX with infinite scrolling
7. **Celebrate** the performance improvements! 🎉