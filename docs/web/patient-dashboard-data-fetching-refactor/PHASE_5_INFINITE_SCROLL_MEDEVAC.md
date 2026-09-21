# Phase 5: Infinite Scrolling & MedEvac Integration - Implementation Guide

## 📋 Overview

**Objective**: Replace pagination with infinite scrolling and integrate MedEvac patients into the dashboard filter  
**Time Estimate**: 2-3 hours  
**Priority**: MEDIUM  
**Dependencies**: Phases 1-4 (recommended but not required)  
**Status**: 🔴 Not Started

---

## 🎯 Goals

1. Remove pagination controls and implement infinite scrolling
2. Update API to support cursor-based pagination (load 20 at a time)
3. Add MedEvac filter option to ArchiveFilterDropdown
4. Clean up pagination-related code and user settings
5. Optimize rendering with virtualization (optional enhancement)

---

## 🔍 Problem Analysis

### Current Implementation Issues

```typescript
// ❌ Current: Full pagination with toggle
- PaginationControls component (complex, unused)
- useInfiniteScroll setting in userSettings (unnecessary)
- All data loaded at once or paginated manually
- Separate MedEvac table/route instead of integrated filter
```

### Desired Implementation

```typescript
// ✅ New: Simple infinite scroll
- Infinite scroll by default for all users
- API loads 20 records at a time
- Automatic loading on scroll
- MedEvac patients accessible via filter dropdown
- Cleaner codebase
```

---

## 📝 Step-by-Step Instructions

### Step 1: Update API Routes for Cursor Pagination (45 minutes)

#### 1.1 Modify Patient API Route

**File**: `apps/web/app/api/patient/route.ts` (MODIFY)

**Add Pagination Support**:

```typescript
// At the top, add pagination types
interface PaginationParams {
  cursor?: string; // Patient ID for cursor
  limit?: number;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Parse pagination parameters
    const cursor = searchParams.get('cursor'); // Last patient ID from previous fetch
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    
    const { userId, accountType } = session;

    // Build query conditions
    const whereConditions =
      accountType === "Evac"
        ? and(
            ne(patients.status, "Archived"),
            eq(patients.coordinatorId, userId)
          )
        : ne(patients.status, "Archived");

    // Add cursor condition for pagination
    const paginationConditions = cursor
      ? and(whereConditions, lt(patients.createdAt, new Date(cursor)))
      : whereConditions;

    const patientsList = await db
      .select({
        id: patients.id,
        firstName: patients.firstName,
        lastName: patients.lastName,
        // ... other fields
        createdAt: patients.createdAt,
        updatedAt: patients.updatedAt,
      })
      .from(patients)
      .leftJoin(users, eq(patients.coordinatorId, users.id))
      .where(paginationConditions)
      .orderBy(desc(patients.createdAt)) // Important: consistent ordering
      .limit(limit + 1); // Fetch one extra to check if there's more

    // Check if there are more results
    const hasMore = patientsList.length > limit;
    const results = hasMore ? patientsList.slice(0, limit) : patientsList;

    // Calculate next cursor
    const nextCursor = hasMore
      ? results[results.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      data: results,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error("[Error] Failed to fetch patients:", error.message);
    return NextResponse.json(
      { error: `Failed to fetch patients: ${error.message}` },
      { status: 500 }
    );
  }
}
```

#### 1.2 Update Archived Patients Route

**File**: `apps/web/app/api/patient/archived/route.ts` (MODIFY)

Apply the same cursor-based pagination logic as above.

#### 1.3 Create MedEvac Patients API Route

**File**: `apps/web/app/api/patient/medevac/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
import { db } from "@/db";
import { medEvacPatients, patients, users } from "@/db/schema";
import { eq, desc, lt, and } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // Build pagination condition
    const paginationCondition = cursor
      ? lt(medEvacPatients.createdAt, new Date(cursor))
      : undefined;

    // Fetch MedEvac patients with joined patient data
    const medEvacList = await db
      .select({
        // MedEvac fields
        id: medEvacPatients.id,
        urgency: medEvacPatients.urgency,
        hospitalAssigned: medEvacPatients.hospitalAssigned,
        hospitalAcceptanceStatus: medEvacPatients.hospitalAcceptanceStatus,
        treatmentStatus: medEvacPatients.treatmentStatus,
        fitToFly: medEvacPatients.fitToFly,
        passportStatus: medEvacPatients.passportStatus,
        usVisaStatus: medEvacPatients.usVisaStatus,
        cogatStatus: medEvacPatients.cogatStatus,
        createdAt: medEvacPatients.createdAt,
        updatedAt: medEvacPatients.updatedAt,
        
        // Patient fields
        patient: {
          id: patients.id,
          firstName: patients.firstName,
          lastName: patients.lastName,
          email: patients.email,
          status: patients.status,
          priority: patients.priority,
          chiefComplaint: patients.chiefComplaint,
          city: patients.city,
          country: patients.country,
          telegramChatId: patients.telegramChatId,
        },
      })
      .from(medEvacPatients)
      .leftJoin(patients, eq(medEvacPatients.patientId, patients.id))
      .where(paginationCondition)
      .orderBy(desc(medEvacPatients.createdAt))
      .limit(limit + 1);

    const hasMore = medEvacList.length > limit;
    const results = hasMore ? medEvacList.slice(0, limit) : medEvacList;

    const nextCursor = hasMore
      ? results[results.length - 1].createdAt.toISOString()
      : null;

    return NextResponse.json({
      data: results,
      pagination: {
        nextCursor,
        hasMore,
        limit,
      },
    }, { status: 200 });
  } catch (error: any) {
    console.error("[Error] Failed to fetch MedEvac patients:", error.message);
    return NextResponse.json(
      { error: `Failed to fetch MedEvac patients: ${error.message}` },
      { status: 500 }
    );
  }
}
```

**Verification**:
- [ ] Pagination works with cursor parameter
- [ ] Returns correct `hasMore` flag
- [ ] Returns consistent results
- [ ] Limit parameter respected

---

### Step 2: Update Client API Functions (30 minutes)

**File**: `apps/web/lib/api.ts` (MODIFY)

```typescript
// Update existing functions to support pagination
export const fetchPatients = async (cursor?: string, limit: number = 20) => {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);
  params.append('limit', limit.toString());

  const response = await fetch(`/api/patient?${params.toString()}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch patients');
  }

  return response.json();
};

export const fetchArchivedPatients = async (cursor?: string, limit: number = 20) => {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);
  params.append('limit', limit.toString());

  const response = await fetch(`/api/patient/archived?${params.toString()}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch archived patients');
  }

  return response.json();
};

// New function for MedEvac patients
export const fetchMedEvacPatients = async (cursor?: string, limit: number = 20) => {
  const params = new URLSearchParams();
  if (cursor) params.append('cursor', cursor);
  params.append('limit', limit.toString());

  const response = await fetch(`/api/patient/medevac?${params.toString()}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    throw new Error('Failed to fetch MedEvac patients');
  }

  return response.json();
};
```

---

### Step 3: Implement Infinite Scroll with React Query (60 minutes)

**File**: `apps/web/components/patient-dashboard/viewModel/usePatientQueries.ts` (MAJOR REFACTOR)

```typescript
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { fetchPatients, fetchArchivedPatients, fetchMedEvacPatients, fetchBatchUnreadMessages } from "@/lib/api";
import type { IPatient } from "@/models/patient";
import type { PatientWithMessages } from "./types";

export function usePatientQueries(
  isAuthenticated: boolean, 
  userId: string | undefined, 
  viewType: "active" | "archived" | "medevac"
) {
  const queryClient = useQueryClient();

  // Determine which fetch function to use
  const fetchFunction = 
    viewType === "active" ? fetchPatients :
    viewType === "archived" ? fetchArchivedPatients :
    fetchMedEvacPatients;

  // Infinite query for patients
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["patients", viewType],
    queryFn: async ({ pageParam }) => {
      const response = await fetchFunction(pageParam);
      
      // Add unread messages to the data
      const patientsWithMessages = await addUnreadMessages(response.data);
      
      return {
        data: patientsWithMessages,
        nextCursor: response.pagination.nextCursor,
        hasMore: response.pagination.hasMore,
      };
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: undefined as string | undefined,
    enabled: isAuthenticated && !!userId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Flatten all pages into single array
  const allPatients = data?.pages.flatMap((page) => page.data) ?? [];

  // Batch unread messages helper (from Phase 2)
  const addUnreadMessages = async (patients: IPatient[]): Promise<PatientWithMessages[]> => {
    if (!patients?.length) return [];

    const chatIds = patients
      .filter(patient => patient.telegramChatId)
      .map(patient => patient.telegramChatId)
      .filter((id): id is string => !!id);

    if (chatIds.length === 0) {
      return patients.map(patient => ({
        ...patient,
        unreadMessages: 0
      })) as PatientWithMessages[];
    }

    const unreadMessagesMap = await fetchBatchUnreadMessages(chatIds);

    return patients.map(patient => ({
      ...patient,
      unreadMessages: patient.telegramChatId 
        ? (unreadMessagesMap[patient.telegramChatId] || 0)
        : 0
    })) as PatientWithMessages[];
  };

  return {
    patients: allPatients,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage: data?.pages[data.pages.length - 1]?.hasMore ?? false,
    isFetchingNextPage,
    refetch,
  };
}
```

---

### Step 4: Create Infinite Scroll Hook (30 minutes)

**File**: `apps/web/hooks/useInfiniteScroll.ts` (NEW)

```typescript
import { useEffect, useRef, useCallback } from 'react';

interface UseInfiniteScrollOptions {
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  threshold?: number; // pixels from bottom to trigger
}

export function useInfiniteScroll({
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  threshold = 500,
}: UseInfiniteScrollOptions) {
  const observerTarget = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        console.log('[InfiniteScroll] Loading next page...');
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null, // viewport
      rootMargin: `${threshold}px`,
      threshold: 0,
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [handleObserver, threshold]);

  return { observerTarget };
}
```

---

### Step 5: Update ArchiveFilterDropdown for MedEvac (20 minutes)

**File**: `apps/web/components/patient-dashboard/ArchiveFilterDropdown.tsx` (MODIFY)

```typescript
import { Plane } from 'lucide-react' // Add new icon

interface ArchiveFilterDropdownProps {
    showArchived: boolean
    showFollowUps?: boolean
    onFilterChange: (filterType: "active" | "archived" | "both" | "followups" | "medevac") => void
}

// Update getFilterDetails function
const getFilterDetails = () => {
    switch (currentFilter) {
        case "active":
            return { icon: <UserCheck className="h-4 w-4" />, color: "text-foreground", bgColor: "bg-accent" };
        case "archived":
            return { icon: <Archive className="h-4 w-4" />, color: "text-foreground", bgColor: "bg-accent" };
        case "both":
            return { icon: <UsersRound className="h-4 w-4" />, color: "text-foreground", bgColor: "bg-accent" };
        case "followups":
            return { icon: <Ghost className="h-4 w-4" />, color: "text-foreground", bgColor: "bg-accent" };
        case "medevac": // NEW
            return { icon: <Plane className="h-4 w-4" />, color: "text-foreground", bgColor: "bg-accent" };
        default:
            return { icon: <Users className="h-4 w-4" />, color: "text-muted-foreground", bgColor: "bg-muted" };
    }
};

// Update getButtonText function
const getButtonText = () => {
    switch (currentFilter) {
        case "active":
            return "Active Patients";
        case "archived":
            return "Archived Patients";
        case "both":
            return "All Patients";
        case "followups":
            return "Follow-Ups";
        case "medevac": // NEW
            return "MedEvac Patients";
        default:
            return "Patient Filter";
    }
}

// Add new RadioCard.Item in the dropdown
<RadioCard.Item
    value="medevac"
    className="py-3 hover:bg-accent data-[state=checked]:bg-accent"
>
    <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground">
            <Plane className="h-4 w-4" />
        </div>
        <div className="flex flex-col items-start">
            <span className="font-medium text-foreground">MedEvac Patients</span>
            <span className="text-xs text-muted-foreground">View medical evacuation cases</span>
        </div>
    </div>
</RadioCard.Item>
```

---

### Step 6: Update DashboardView with Infinite Scroll (45 minutes)

**File**: `apps/web/components/patient-dashboard/DashboardView.tsx` (MODIFY)

```typescript
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

const DashboardView: React.FC<Props> = ({ session, isLoadingInitial, initialPatients = [] }) => {
    const {
        rows,
        // ... other destructured values
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useDashboardViewModel(initialPatients)

    // Setup infinite scroll
    const { observerTarget } = useInfiniteScroll({
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        threshold: 300, // Load more when 300px from bottom
    });

    return (
        <ToastProvider>
            <div className="w-full h-screen px-0 relative dashboard-page">
                {/* ... existing header code ... */}
                
                <div className="h-[calc(100vh-10rem)] w-full overflow-auto">
                    {showFollowUps ? (
                        <FollowUpsView />
                    ) : isLoading ? (
                        <TableSkeleton rowCount={8} columnCount={5} />
                    ) : (
                        <>
                            <PatientTable
                                rows={sortedAndFilteredRows}
                                // ... other props
                            />
                            
                            {/* Infinite scroll trigger */}
                            <div ref={observerTarget} className="h-20 flex items-center justify-center">
                                {isFetchingNextPage && (
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                        <span className="text-sm">Loading more patients...</span>
                                    </div>
                                )}
                                {!hasNextPage && rows.length > 0 && (
                                    <div className="text-sm text-muted-foreground">
                                        No more patients to load
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </ToastProvider>
    )
}
```

---

### Step 7: Clean Up Old Pagination Code (15 minutes)

#### 7.1 Remove PaginationControls Component

**File**: `apps/web/components/patient-dashboard/PaginationControls.tsx` (DELETE)

```bash
rm apps/web/components/patient-dashboard/PaginationControls.tsx
```

#### 7.2 Remove useInfiniteScroll from UserSettings

**File**: `apps/web/db/schema/userSettings.ts` (MODIFY)

```typescript
// Remove these fields:
// useInfiniteScroll: boolean("use_infinite_scroll").default(false),
// saveLastPage: boolean("save_last_page").default(false),

// Keep only:
export const userSettings = pgTable(
  "user_settings",
  {
    // ... other fields
    
    // UI preferences (cleaned up)
    lastView: varchar("last_view", { length: 500 }).default("/"),
    lastViewSavedAt: varchar("last_view_saved_at", { length: 255 }),
    lastViewSessionId: varchar("last_view_session_id", { length: 255 }),
    themeMode: varchar("theme_mode", { length: 20 }).default("system"),
    
    // ... rest of fields
  }
);
```

#### 7.3 Create Migration to Remove Columns

```bash
npm run db:generate
# Review migration file - should drop useInfiniteScroll and saveLastPage columns
npm run db:migrate
```

#### 7.4 Remove Pagination Logic from ViewModel

**File**: `apps/web/components/patient-dashboard/DashboardViewModel.ts` (MODIFY)

Remove any pagination-related state and functions:
- `currentPage`
- `itemsPerPage`
- `onPageChange`
- Any pagination calculations

---

### Step 8: Update Mobile API Service (Optional - 30 minutes)

**File**: `apps/mobile/src/services/api/PatientApiService.ts` (MODIFY)

```typescript
// Update getPatients method to support cursor pagination
async getPatients(
  options: PatientQueryOptions & { cursor?: string } = {}
): Promise<ApiResponse<{ data: IPatient[]; pagination: { nextCursor?: string; hasMore: boolean } }>> {
  try {
    const filters = options.filters || {};
    const params: Record<string, string> = {
      limit: (options.limit || 20).toString(),
      sortBy: options.sortBy || 'createdAt',
      sortDirection: options.sortDirection || 'desc',
    };

    if (options.cursor) {
      params.cursor = options.cursor;
    }

    // Add filters to params
    if (filters.status) params.status = filters.status;
    if (filters.priority) params.priority = filters.priority;
    if (filters.specialty) params.specialty = filters.specialty;
    if (filters.search) params.search = filters.search;

    return await this.powerSyncRequest<{ data: IPatient[]; pagination: any }>('/patient', {
      method: 'GET',
      params,
      cacheOffline: true,
    });
  } catch (error) {
    console.error('Failed to fetch patients:', error);
    throw error;
  }
}
```

---

## 🧪 Testing Checklist

### Functional Testing

#### Infinite Scroll
- [ ] Initial 20 patients load correctly
- [ ] Scrolling to bottom loads next 20 patients
- [ ] Loading indicator appears while fetching
- [ ] "No more patients" message appears at end
- [ ] No duplicate patients loaded
- [ ] Scroll position maintained after loading

#### MedEvac Integration
- [ ] MedEvac filter appears in dropdown
- [ ] Selecting MedEvac loads MedEvac patients
- [ ] MedEvac patient data displays correctly
- [ ] Can switch between Active/Archived/MedEvac views
- [ ] MedEvac patients have proper fields displayed

#### API Testing
- [ ] `/api/patient?cursor=X&limit=20` returns correct results
- [ ] Cursor pagination works consistently
- [ ] `hasMore` flag is accurate
- [ ] Results are in correct order (newest first)
- [ ] Edge case: Last page handled correctly

### Performance Testing
- [ ] Initial load < 1 second
- [ ] Next page load < 500ms
- [ ] Smooth scrolling (no jank)
- [ ] Memory usage stable (no leaks)
- [ ] Network requests optimized

### Edge Cases
- [ ] Empty patient list
- [ ] Exactly 20 patients (one page)
- [ ] 21 patients (hasMore = false on page 2)
- [ ] Network error during fetch
- [ ] Rapid scrolling
- [ ] Filter change while loading

---

## 📊 Performance Improvements

### Before (Pagination)
```
- Load all patients at once OR
- Manual page buttons
- Complex pagination state management
- User confusion with toggle switch
```

### After (Infinite Scroll)
```
- Load 20 at a time (80% less initial data)
- Automatic progressive loading
- Simple, intuitive UX
- Cleaner codebase
- Better mobile experience
```

### Expected Metrics
- **Initial load data**: -80% (from ~100 to ~20 patients)
- **Time to first render**: -50% (faster initial load)
- **User interactions**: -100% (no pagination buttons to click)
- **Code complexity**: -30% (removed pagination logic)

---

## 🚨 Troubleshooting

### Issue: Duplicate Patients on Scroll

**Symptoms**: Same patients appear twice in the list

**Diagnosis**:
```typescript
// Check if cursor is being passed correctly
console.log('Next cursor:', lastPage.nextCursor);
console.log('Has more:', lastPage.hasMore);
```

**Solution**: Ensure `getNextPageParam` returns the correct cursor

### Issue: Infinite Loading Loop

**Symptoms**: Page keeps loading endlessly

**Diagnosis**: Check `hasMore` logic in API

**Solution**:
```typescript
// Make sure to check length properly
const hasMore = patientsList.length > limit;
const results = hasMore ? patientsList.slice(0, limit) : patientsList;
```

### Issue: Scroll Doesn't Trigger Load

**Symptoms**: Need to scroll multiple times to load

**Diagnosis**: Check IntersectionObserver threshold

**Solution**: Increase `rootMargin` in observer options

### Issue: MedEvac Data Not Loading

**Symptoms**: Empty table when selecting MedEvac

**Diagnosis**:
```typescript
// Check API route exists and is accessible
curl http://localhost:3000/api/patient/medevac
```

**Solution**: Verify route file created and exported correctly

---

## 🔄 Rollback Plan

### Quick Rollback (Revert Components)

```bash
# Revert infinite scroll changes
git checkout HEAD~1 apps/web/components/patient-dashboard/DashboardView.tsx
git checkout HEAD~1 apps/web/components/patient-dashboard/viewModel/usePatientQueries.ts

# Restore PaginationControls
git checkout HEAD~1 apps/web/components/patient-dashboard/PaginationControls.tsx
```

### Database Rollback

```sql
-- Restore removed columns if needed
ALTER TABLE user_settings ADD COLUMN use_infinite_scroll BOOLEAN DEFAULT false;
ALTER TABLE user_settings ADD COLUMN save_last_page BOOLEAN DEFAULT false;
```

### API Rollback

```bash
# Revert API changes
git checkout HEAD~1 apps/web/app/api/patient/route.ts
git checkout HEAD~1 apps/web/app/api/patient/archived/route.ts

# Remove MedEvac route
rm apps/web/app/api/patient/medevac/route.ts
```

---

## ✅ Completion Checklist

### Implementation
- [ ] API routes support cursor pagination
- [ ] Client API functions updated
- [ ] React Query infinite scroll implemented
- [ ] useInfiniteScroll hook created
- [ ] DashboardView updated with infinite scroll
- [ ] ArchiveFilterDropdown includes MedEvac option
- [ ] PaginationControls component removed
- [ ] UserSettings schema cleaned up
- [ ] Database migration applied

### Testing
- [ ] Infinite scroll works correctly
- [ ] MedEvac filter works
- [ ] Performance improved
- [ ] No regression bugs
- [ ] Mobile tested (if applicable)

### Documentation
- [ ] Code comments added
- [ ] API changes documented
- [ ] Migration notes recorded

### Deployment
- [ ] Changes committed to git
- [ ] Code reviewed
- [ ] Tested in staging
- [ ] Ready for production

---

## 📝 Notes

**Date Completed**: __________  
**Completed By**: __________  
**Performance Improvement**: _____% faster initial load  
**Issues Encountered**: __________  
**MedEvac Integration Status**: __________  
**Additional Notes**: __________

---

## 🔗 Related Documents

- [Main Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Phase 1: Database Indexes](./PHASE_1_DATABASE_INDEXES.md)
- [Phase 2: Batch API](./PHASE_2_BATCH_API.md)
- [Phase 3: Server Components](./PHASE_3_SERVER_COMPONENTS.md)
- [Phase 4: Query Optimization](./PHASE_4_QUERY_OPTIMIZATION.md)

---

## 🎓 Learning Resources

- [React Query Infinite Queries](https://tanstack.com/query/latest/docs/react/guides/infinite-queries)
- [Intersection Observer API](https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API)
- [Cursor-based Pagination](https://engineering.fb.com/2015/11/10/core-data/building-out-the-infrastructure-for-cursor-based-pagination/)
- [Virtualized Lists Performance](https://web.dev/virtualize-long-lists-react-window/)

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation