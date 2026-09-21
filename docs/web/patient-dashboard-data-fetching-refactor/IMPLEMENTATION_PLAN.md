# Patient Dashboard Data Fetching Refactor - Implementation Plan

## 📋 Executive Summary

This document outlines a comprehensive plan to optimize patient data loading in the dashboard, targeting a **60-80% reduction in initial load time** through server-side rendering, query optimization, and architectural improvements.

**Current Issues:**
- Client-side only data fetching (slow initial load)
- N+1 query problem for unread messages
- No database query optimization
- Over-fetching of unnecessary fields

**Expected Performance Improvements:**
- **Server Components**: 50-70% faster initial load
- **Batch Unread Messages**: 80-95% reduction in API calls (from N to 1)
- **Database Indexes**: 30-50% faster queries for large datasets
- **Selective Field Fetching**: 20-30% faster response times, less bandwidth

**Total Estimated Time**: 4-6 hours (can be parallelized across 3-4 workstreams)

---

## 🎯 Implementation Phases

This refactor is divided into **5 parallel phases** that can be worked on simultaneously by different engineers or LLM agents.

### Phase 1: Database Optimization (PRIORITY: HIGH, TIME: 30 min)
**Status**: 🔴 Not Started  
**Assignable**: Yes, completely independent  
**Files**: 1 file modified

### Phase 2: Batch API for Unread Messages (PRIORITY: HIGH, TIME: 1-2 hours)
**Status**: 🔴 Not Started  
**Assignable**: Yes, completely independent  
**Files**: 3-4 files created/modified

### Phase 3: Server Component Migration (PRIORITY: CRITICAL, TIME: 2-3 hours)
**Status**: 🔴 Not Started  
**Assignable**: Yes, can work independently once Phase 1 is complete  
**Files**: 4-6 files created/modified

### Phase 4: Query Optimization & Field Selection (PRIORITY: MEDIUM, TIME: 1 hour)
**Status**: 🔴 Not Started  
**Assignable**: Yes, completely independent  
**Files**: 2-3 files modified

### Phase 5: Infinite Scrolling & MedEvac Integration (PRIORITY: MEDIUM, TIME: 2-3 hours)
**Status**: 🔴 Not Started  
**Assignable**: Yes, independent (recommended after Phases 1-4)  
**Files**: 8-10 files created/modified/deleted

---

## 📦 Phase 1: Database Optimization

### 🎯 Objective
Add composite indexes to speed up common query patterns by 30-50%.

### 📝 Tasks

#### Task 1.1: Add Composite Indexes
**File**: `apps/web/db/schema/patients.ts`  
**Estimated Time**: 15 minutes

**Changes Required**:
1. Add composite index for `status` + `coordinatorId` (common Evac user query)
2. Add index on `createdAt` for sorting optimization
3. Add composite index for `status` + `createdAt` for dashboard queries

**Implementation**:
```typescript
// In the patients table definition, update the indexes section:
(table) => ({
    emailIdx: index("patients_email_idx").on(table.email),
    statusIdx: index("patients_status_idx").on(table.status),
    coordinatorIdx: index("patients_coordinator_id_idx").on(table.coordinatorId),
    telegramIdx: index("patients_telegram_chat_id_idx").on(table.telegramChatId),
    
    // NEW: Composite indexes for optimized queries
    statusCoordinatorIdx: index("patients_status_coordinator_idx")
        .on(table.status, table.coordinatorId),
    createdAtIdx: index("patients_created_at_idx").on(table.createdAt),
    statusCreatedAtIdx: index("patients_status_created_at_idx")
        .on(table.status, table.createdAt),
})
```

#### Task 1.2: Generate and Run Migration
**Estimated Time**: 15 minutes

**Commands**:
```bash
# Generate migration
npm run db:generate

# Review the generated SQL migration file
# apps/web/drizzle/migrations/XXXX_add_composite_indexes.sql

# Run migration
npm run db:migrate

# Verify indexes were created
npm run db:studio
# Check indexes in the database
```

**Verification**:
- [ ] Migration generated successfully
- [ ] Migration applied to database
- [ ] All 3 new indexes visible in database schema
- [ ] No errors in console

### 🔗 Dependencies
- None (completely independent)

### ✅ Success Criteria
- [ ] Composite indexes added to schema
- [ ] Migration generated and applied
- [ ] Database queries show index usage (can verify with EXPLAIN in postgres)

---

## 📦 Phase 2: Batch API for Unread Messages

### 🎯 Objective
Replace N individual API calls with 1 batch request, reducing API calls by 80-95%.

### 📝 Tasks

#### Task 2.1: Create Batch Unread Messages API Route
**File**: `apps/web/app/api/telegram/unread-messages/batch/route.ts` (NEW)  
**Estimated Time**: 45 minutes

**Implementation**:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { verifySessionFromRequest } from "@/lib/dal";
// Import your Telegram/message fetching logic

export async function POST(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chatIds } = await request.json();
    
    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      return NextResponse.json({ error: "Invalid chatIds array" }, { status: 400 });
    }

    console.log(`[Debug] Fetching unread messages for ${chatIds.length} chats`);

    // TODO: Implement batch fetching logic
    // Option 1: Parallel Promise.all() for external API
    // Option 2: Single database query with WHERE IN clause
    const unreadMessagesMap: Record<string, number> = {};
    
    // Example implementation (adjust to your data source):
    const results = await Promise.all(
      chatIds.map(async (chatId) => {
        try {
          const count = await fetchUnreadMessageCount(chatId);
          return { chatId, count };
        } catch (error) {
          console.error(`Error fetching unread for ${chatId}:`, error);
          return { chatId, count: 0 };
        }
      })
    );

    results.forEach(({ chatId, count }) => {
      unreadMessagesMap[chatId] = count;
    });

    console.log(`[Debug] Successfully fetched unread messages for ${Object.keys(unreadMessagesMap).length} chats`);

    return NextResponse.json(unreadMessagesMap, { status: 200 });
  } catch (error: any) {
    console.error("[Error] Batch unread messages fetch failed:", error.message);
    return NextResponse.json(
      { error: `Failed to fetch batch unread messages: ${error.message}` },
      { status: 500 }
    );
  }
}
```

**Testing Checklist**:
- [ ] POST request with valid chatIds returns map of counts
- [ ] Empty array returns empty object
- [ ] Invalid request returns 400 error
- [ ] Unauthorized request returns 401 error
- [ ] Handles partial failures gracefully

#### Task 2.2: Create Batch API Client Function
**File**: `apps/web/lib/api.ts` (MODIFY)  
**Estimated Time**: 15 minutes

**Add New Function**:
```typescript
export const fetchBatchUnreadMessages = async (
  chatIds: string[]
): Promise<Record<string, number>> => {
  if (!chatIds || chatIds.length === 0) {
    return {};
  }

  const response = await fetch('/api/telegram/unread-messages/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ chatIds }),
  });

  if (!response.ok) {
    console.error('Failed to fetch batch unread messages:', response.status);
    return {}; // Return empty map on error, don't break the dashboard
  }

  return response.json();
};
```

#### Task 2.3: Update usePatientQueries to Use Batch API
**File**: `apps/web/components/patient-dashboard/viewModel/usePatientQueries.ts` (MODIFY)  
**Estimated Time**: 30 minutes

**Replace `addUnreadMessages` function**:
```typescript
import { fetchBatchUnreadMessages } from "@/lib/api"

// Replace the existing addUnreadMessages implementation
const addUnreadMessages = useCallback(async (data: IPatient[]) => {
    if (!data?.length) return [];

    // Extract all chat IDs that need unread message counts
    const chatIds = data
        .filter(patient => patient.telegramChatId)
        .map(patient => patient.telegramChatId)
        .filter((id): id is string => !!id); // Type guard to remove undefined

    if (chatIds.length === 0) {
        // No chat IDs to fetch, return patients with 0 unread messages
        return data.map(patient => ({
            ...patient,
            unreadMessages: 0
        })) as PatientWithMessages[];
    }

    console.log(`📥 Batching unread messages for ${chatIds.length} patients`);

    // BATCH REQUEST - fetch all unread messages in ONE API call
    const unreadMessagesMap = await fetchBatchUnreadMessages(chatIds);

    console.log(`✅ Received unread counts for ${Object.keys(unreadMessagesMap).length} chats`);

    // Map the results back to patients
    return data.map(patient => ({
        ...patient,
        unreadMessages: patient.telegramChatId 
            ? (unreadMessagesMap[patient.telegramChatId] || 0)
            : 0
    })) as PatientWithMessages[];
}, []);
```

**Testing Checklist**:
- [ ] Dashboard loads with unread message counts
- [ ] Console shows 1 batch request instead of N individual requests
- [ ] Handles patients without telegramChatId correctly
- [ ] Performance improvement measurable in Network tab

### 🔗 Dependencies
- None (completely independent from other phases)

### ✅ Success Criteria
- [ ] Batch API endpoint created and tested
- [ ] Client function added to lib/api.ts
- [ ] usePatientQueries refactored to use batch API
- [ ] Network tab shows 1 request instead of N requests
- [ ] No functionality regression

---

## 📦 Phase 3: Server Component Migration

### 🎯 Objective
Convert client-side data fetching to server-side rendering for 50-70% faster initial load.

### 📝 Tasks

#### Task 3.1: Create Session Verification Utility (if not exists)
**File**: `apps/web/lib/dal.ts` (VERIFY/MODIFY)  
**Estimated Time**: 15 minutes

**Verify/Add**:
```typescript
// Ensure verifySession function exists for server components
export async function verifySession() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return null;
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    accountType: session.user.accountType,
    user: session.user,
  };
}
```

#### Task 3.2: Create Server-Side Data Fetching Function
**File**: `apps/web/lib/server/patients.ts` (NEW)  
**Estimated Time**: 30 minutes

**Implementation**:
```typescript
import { db } from "@/db";
import { patients, users } from "@/db/schema";
import { eq, ne, and } from "drizzle-orm";

export type DashboardPatient = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  telegramChatId: string | null;
  status: string;
  priority: string;
  specialties: string[] | null;
  hospital: string;
  createdAt: Date;
  updatedAt: Date;
  coordinatorId: string | null;
  doctor: any;
  chiefComplaint: string | null;
  city: string | null;
  country: string | null;
  coordinator: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    accountType: string | null;
  } | null;
};

export async function fetchInitialDashboardPatients(
  userId: string,
  accountType: string
): Promise<DashboardPatient[]> {
  console.log("[Server] Fetching dashboard patients for:", userId, accountType);

  // Build query - exclude archived patients
  const whereConditions =
    accountType === "Evac"
      ? and(
          ne(patients.status, "Archived"),
          eq(patients.coordinatorId, userId)
        )
      : ne(patients.status, "Archived");

  const patientsList = await db
    .select({
      // Only select fields needed for initial dashboard render
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      email: patients.email,
      telegramChatId: patients.telegramChatId,
      status: patients.status,
      priority: patients.priority,
      specialties: patients.specialties,
      hospital: patients.hospital,
      createdAt: patients.createdAt,
      updatedAt: patients.updatedAt,
      coordinatorId: patients.coordinatorId,
      doctor: patients.doctor,
      chiefComplaint: patients.chiefComplaint,
      city: patients.city,
      country: patients.country,
      coordinator: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        accountType: users.accountType,
      },
    })
    .from(patients)
    .leftJoin(users, eq(patients.coordinatorId, users.id))
    .where(whereConditions)
    .orderBy(patients.createdAt);

  console.log("[Server] Fetched", patientsList.length, "patients");

  return patientsList as DashboardPatient[];
}
```

#### Task 3.3: Convert Main Page to Server Component
**File**: `apps/web/app/patient-dashboard/page.tsx` (MAJOR REFACTOR)  
**Estimated Time**: 45 minutes

**Complete Replacement**:
```typescript
// apps/web/app/patient-dashboard/page.tsx
// REMOVE "use client" directive

import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";
import { fetchInitialDashboardPatients } from "@/lib/server/patients";
import DashboardClientWrapper from "@/components/patient-dashboard/PatientDashboardClientWrapper";

// Server Component - fetches data on the server
export default async function DashboardPage() {
  console.log("[Server] Dashboard page rendering");

  // Verify session on the server
  const session = await verifySession();
  
  if (!session) {
    console.log("[Server] No session, redirecting to login");
    redirect("/auth/login");
  }

  if (!session.accountType) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error</h2>
          <p className="mt-2 text-gray-600">User account type not available</p>
        </div>
      </div>
    );
  }

  console.log("[Server] Fetching initial patients for", session.userId);

  // Fetch initial data on the server - much faster!
  const initialPatients = await fetchInitialDashboardPatients(
    session.userId,
    session.accountType
  );

  console.log("[Server] Rendering with", initialPatients.length, "patients");

  // Pass server-fetched data to client component
  return (
    <DashboardClientWrapper 
      initialPatients={initialPatients}
      session={session}
    />
  );
}
```

**Testing Checklist**:
- [ ] Page renders without "use client"
- [ ] No hydration errors in console
- [ ] Data appears immediately (no loading state)
- [ ] Redirects work correctly for unauthenticated users

#### Task 3.4: Create Client Wrapper Component
**File**: `apps/web/components/patient-dashboard/DashboardClientWrapper.tsx` (NEW)  
**Estimated Time**: 30 minutes

**Implementation**:
```typescript
"use client";

import React from "react";
import DashboardView from "@/components/patient-dashboard/DashboardView";
import type { DashboardPatient } from "@/lib/server/patients";

interface Props {
  initialPatients: DashboardPatient[];
  session: {
    userId: string;
    email: string;
    accountType: string;
    user: any;
  };
}

export default function DashboardClientWrapper({ 
  initialPatients, 
  session 
}: Props) {
  // Transform session to match NextAuth Session type
  const nextAuthSession = {
    user: {
      ...session.user,
      id: session.userId,
      email: session.email,
      accountType: session.accountType,
    },
    expires: "", // Not needed for dashboard
  };

  return (
    <div className="w-full h-screen mt-12 mb-16">
      <DashboardView 
        session={nextAuthSession} 
        initialPatients={initialPatients}
        isLoadingInitial={false} 
      />
    </div>
  );
}
```

#### Task 3.5: Update DashboardView to Accept Initial Data
**File**: `apps/web/components/patient-dashboard/DashboardView.tsx` (MODIFY)  
**Estimated Time**: 30 minutes

**Changes Required**:
1. Add `initialPatients` prop
2. Pass to `useDashboardViewModel`
3. Keep existing functionality for real-time updates

**Updated Interface**:
```typescript
interface Props {
    session: Session | null;
    isLoadingInitial: boolean;
    initialPatients?: any[]; // Add this
}

const DashboardView: React.FC<Props> = ({ 
    session, 
    isLoadingInitial,
    initialPatients = [] // Add this with default
}) => {
    const {
        rows,
        // ... rest of destructured values
    } = useDashboardViewModel(initialPatients) // Pass initial data

    // Rest of component unchanged
}
```

#### Task 3.6: Update ViewModel to Use Initial Data
**File**: `apps/web/components/patient-dashboard/viewModel/usePatientQueries.ts` (MODIFY)  
**Estimated Time**: 30 minutes

**Changes Required**:
```typescript
export function usePatientQueries(
    isAuthenticated: boolean, 
    userId: string | undefined, 
    showArchived: boolean,
    initialData: IPatient[] = [] // Add parameter
) {
    // ... existing code

    // Query for active patients - with initialData
    const {
        data: activePatients = [],
        isLoading: isLoadingActive,
        error: activeError,
        refetch: refetchActive,
    } = useQuery({
        queryKey: ["patients", "active"],
        queryFn: async () => {
            const data = await fetchPatients()
            return addUnreadMessages(data)
        },
        enabled: isAuthenticated && !!userId,
        staleTime: 1000 * 60 * 5, // 5 minutes
        initialData: initialData.length > 0 ? initialData : undefined, // Add this
    })

    // ... rest of code
}
```

**Update DashboardViewModel.ts**:
```typescript
export function useDashboardViewModel(initialPatients: any[] = []) {
    // ... existing code
    
    const {
        activePatients,
        // ... rest
    } = usePatientQueries(
        status === "authenticated", 
        session?.user?._id, 
        state.showArchived,
        initialPatients // Pass through
    )
    
    // ... rest of code
}
```

### 🔗 Dependencies
- Phase 1 should be complete (for optimal performance)
- Independent from Phase 2

### ✅ Success Criteria
- [ ] Page loads as server component
- [ ] Initial data rendered immediately (no loading skeleton)
- [ ] Client-side interactions still work (filters, updates, etc.)
- [ ] No hydration errors
- [ ] Performance improvement visible in Network tab
- [ ] Session verification works correctly

---

## 📦 Phase 4: Query Optimization & Field Selection

### 🎯 Objective
Reduce payload size and query time by 20-30% through selective field fetching.

### 📝 Tasks

#### Task 4.1: Create Minimal Patient Type for Lists
**File**: `apps/web/types/patient.ts` (NEW or MODIFY)  
**Estimated Time**: 15 minutes

**Implementation**:
```typescript
// Minimal patient data for list views
export type PatientListItem = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  status: string;
  priority: string;
  hospital: string;
  specialties: string[] | null;
  createdAt: Date;
  telegramChatId: string | null;
  unreadMessages?: number;
  coordinator?: {
    firstName: string | null;
    lastName: string | null;
  };
};

// Full patient data for detail views
export type PatientDetail = {
  // ... all fields
};
```

#### Task 4.2: Update API Routes to Support Field Selection
**File**: `apps/web/app/api/patient/route.ts` (MODIFY)  
**Estimated Time**: 30 minutes

**Add Query Parameter Support**:
```typescript
export async function GET(request: NextRequest) {
  try {
    const session = await verifySessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // NEW: Support field selection via query params
    const { searchParams } = new URL(request.url);
    const fields = searchParams.get('fields'); // e.g., "minimal" or "full"

    const { userId, accountType } = session;

    const whereConditions = /* ... existing logic ... */;

    // Define field sets
    const minimalFields = {
      id: patients.id,
      firstName: patients.firstName,
      lastName: patients.lastName,
      email: patients.email,
      status: patients.status,
      priority: patients.priority,
      hospital: patients.hospital,
      specialties: patients.specialties,
      createdAt: patients.createdAt,
      telegramChatId: patients.telegramChatId,
      coordinatorId: patients.coordinatorId,
    };

    const fullFields = {
      ...minimalFields,
      // ... all other fields
    };

    const selectFields = fields === 'minimal' ? minimalFields : fullFields;

    const patientsList = await db
      .select(selectFields)
      .from(patients)
      .leftJoin(users, eq(patients.coordinatorId, users.id))
      .where(whereConditions);

    return NextResponse.json(patientsList, { status: 200 });
  } catch (error: any) {
    console.error("[Error] Failed to fetch patients:", error.message);
    return NextResponse.json(
      { error: `Failed to fetch patients: ${error.message}` },
      { status: 500 }
    );
  }
}
```

#### Task 4.3: Update Client API Calls
**File**: `apps/web/lib/api.ts` (MODIFY)  
**Estimated Time**: 15 minutes

**Update Functions**:
```typescript
export const fetchPatients = async (fields: 'minimal' | 'full' = 'minimal') => {
    const response = await fetch(`/api/patient?fields=${fields}`, {
        credentials: 'include'
    });
    if (!response.ok) {
        throw new Error('Failed to fetch patients');
    }
    return response.json();
};

export const fetchArchivedPatients = async (fields: 'minimal' | 'full' = 'minimal') => {
    const response = await fetch(`/api/patient/archived?fields=${fields}`, {
        credentials: 'include'
    });
    if (!response.ok) {
        throw new Error('Failed to fetch archived patients');
    }
    return response.json();
};
```

### 🔗 Dependencies
- None (completely independent)

### ✅ Success Criteria
- [ ] Minimal patient type defined
- [ ] API routes support field selection
- [ ] Client requests use minimal fields by default
- [ ] Payload size reduced (verify in Network tab)
- [ ] No functionality regression

---

## 📦 Phase 5: Infinite Scrolling & MedEvac Integration

### 🎯 Objective
Replace pagination with infinite scrolling and integrate MedEvac patients into the dashboard filter.

### 📝 Tasks

#### Task 5.1: Update API Routes for Cursor Pagination
**Files**: `apps/web/app/api/patient/route.ts`, `apps/web/app/api/patient/archived/route.ts`, `apps/web/app/api/patient/medevac/route.ts` (NEW)  
**Estimated Time**: 45 minutes

**Changes Required**:
1. Add cursor-based pagination support to existing routes
2. Create new MedEvac patient API route
3. Support `cursor` and `limit` query parameters
4. Return pagination metadata (`nextCursor`, `hasMore`)

**Implementation**:
```typescript
// Add to patient API routes
interface PaginationParams {
  cursor?: string; // Patient ID for cursor
  limit?: number; // Default 20
}

// Return format
{
  data: Patient[],
  pagination: {
    nextCursor: string | null,
    hasMore: boolean,
    limit: number
  }
}
```

#### Task 5.2: Update Client API Functions
**File**: `apps/web/lib/api.ts` (MODIFY)  
**Estimated Time**: 30 minutes

**Add pagination parameters**:
```typescript
export const fetchPatients = async (cursor?: string, limit: number = 20)
export const fetchArchivedPatients = async (cursor?: string, limit: number = 20)
export const fetchMedEvacPatients = async (cursor?: string, limit: number = 20) // NEW
```

#### Task 5.3: Implement Infinite Scroll with React Query
**File**: `apps/web/components/patient-dashboard/viewModel/usePatientQueries.ts` (MAJOR REFACTOR)  
**Estimated Time**: 60 minutes

**Replace `useQuery` with `useInfiniteQuery`**:
- Implement `getNextPageParam` for cursor
- Flatten pages into single array
- Support multiple view types (active/archived/medevac)

#### Task 5.4: Create Infinite Scroll Hook
**File**: `apps/web/hooks/useInfiniteScroll.ts` (NEW)  
**Estimated Time**: 30 minutes

**Implement IntersectionObserver hook**:
- Detect when user scrolls near bottom
- Trigger `fetchNextPage` automatically
- Show loading indicator

#### Task 5.5: Update ArchiveFilterDropdown for MedEvac
**File**: `apps/web/components/patient-dashboard/ArchiveFilterDropdown.tsx` (MODIFY)  
**Estimated Time**: 20 minutes

**Add MedEvac filter option**:
- Add "MedEvac Patients" option to dropdown
- Use Plane icon
- Update filter type to include "medevac"

#### Task 5.6: Update DashboardView with Infinite Scroll
**File**: `apps/web/components/patient-dashboard/DashboardView.tsx` (MODIFY)  
**Estimated Time**: 45 minutes

**Changes**:
- Remove pagination controls
- Add infinite scroll trigger element
- Show loading indicator at bottom
- Handle "no more results" state

#### Task 5.7: Clean Up Old Pagination Code
**Files**: Multiple  
**Estimated Time**: 15 minutes

**Remove**:
- `PaginationControls.tsx` component (DELETE)
- `useInfiniteScroll` field from `userSettings` schema
- `saveLastPage` field from `userSettings` schema
- Generate and run migration to drop columns

**Testing Checklist**:
- [ ] Infinite scroll loads 20 patients at a time
- [ ] Scrolling to bottom loads next page automatically
- [ ] Loading indicator shows while fetching
- [ ] "No more patients" message at end
- [ ] MedEvac filter loads MedEvac patients
- [ ] No duplicate patients
- [ ] Smooth scroll performance

### 🔗 Dependencies
- None required, but recommended after Phases 1-4 for optimal performance

### ✅ Success Criteria
- [ ] Infinite scroll working for all patient types
- [ ] Cursor-based pagination implemented
- [ ] MedEvac patients accessible via filter
- [ ] PaginationControls removed
- [ ] User settings schema cleaned up
- [ ] Initial load 80% faster (only 20 patients vs all)
- [ ] Smooth UX with no pagination clicks needed

---

## 🔄 Testing Strategy

### Unit Tests
```typescript
// Test batch unread messages API
describe('Batch Unread Messages API', () => {
  it('should return unread counts for multiple chat IDs', async () => {
    // Test implementation
  });
  
  it('should handle empty array', async () => {
    // Test implementation
  });
  
  it('should handle partial failures gracefully', async () => {
    // Test implementation
  });
});

// Test server-side data fetching
describe('fetchInitialDashboardPatients', () => {
  it('should fetch patients for Evac user', async () => {
    // Test implementation
  });
  
  it('should fetch all non-archived patients for admin', async () => {
    // Test implementation
  });
});
```

### Integration Tests
1. **Dashboard Load Performance**
   - Measure time to first meaningful paint
   - Verify server component renders immediately
   - Check network waterfall for parallel requests

2. **Data Consistency**
   - Verify all patient data displays correctly
   - Test filter functionality
   - Test real-time updates still work

3. **Error Handling**
   - Test behavior when session expires
   - Test behavior when database is unavailable
   - Test behavior when batch API fails

### Manual Testing Checklist
- [ ] Dashboard loads faster than before
- [ ] All filters work correctly
- [ ] Patient actions (take case, archive, etc.) work
- [ ] Unread message counts display correctly
- [ ] No console errors or warnings
- [ ] Mobile/responsive view works
- [ ] Session timeout redirects to login

---

## 📊 Performance Monitoring

### Metrics to Track

**Before Optimization:**
- [ ] Time to First Byte (TTFB): _____ms
- [ ] First Contentful Paint (FCP): _____ms
- [ ] Largest Contentful Paint (LCP): _____ms
- [ ] Number of API requests on load: _____
- [ ] Total payload size: _____KB
- [ ] Database query time: _____ms

**After Optimization:**
- [ ] Time to First Byte (TTFB): _____ms (Target: -50%)
- [ ] First Contentful Paint (FCP): _____ms (Target: -60%)
- [ ] Largest Contentful Paint (LCP): _____ms (Target: -70%)
- [ ] Number of API requests on load: _____ (Target: -80%)
- [ ] Total payload size: _____KB (Target: -30%)
- [ ] Database query time: _____ms (Target: -40%)

### Tools
- Chrome DevTools Performance tab
- Chrome DevTools Network tab
- Lighthouse (run before and after)
- `console.time()` / `console.timeEnd()` for server-side timing

---

## 🚀 Deployment Strategy

### Development
1. Create feature branch: `feat/dashboard-performance-optimization`
2. Complete phases in order (or parallel with multiple devs)
3. Test thoroughly in development environment
4. Run performance benchmarks

### Staging
1. Deploy to staging environment
2. Run full regression test suite
3. Performance test with production-like data volume
4. Get stakeholder approval

### Production
1. Deploy during low-traffic window
2. Monitor error rates and performance metrics
3. Have rollback plan ready
4. Gradual rollout (if possible with feature flags)

---

## 🔒 Rollback Plan

If issues are detected in production:

### Immediate Rollback
```bash
# Revert to previous deployment
git revert <commit-hash>
npm run build
npm run deploy
```

### Phase-Specific Rollback

**Phase 1 (Database Indexes):**
- Run migration to drop indexes
- No code changes needed

**Phase 2 (Batch API):**
- Revert changes to `usePatientQueries.ts`
- Keep batch API endpoint (no harm)

**Phase 3 (Server Components):**
- Revert `page.tsx` to client component version
- Remove server-side data fetching

**Phase 4 (Field Selection):**
- Revert API changes to return all fields
- No client changes needed

---

## 📋 Work Distribution Example

### Scenario: 5 Engineers/Agents Working in Parallel

**Engineer/Agent 1 (30 min):**
- Phase 1: Database Optimization
- Run migrations
- Verify indexes

**Engineer/Agent 2 (1-2 hours):**
- Phase 2: Batch API for Unread Messages
- Create API endpoint
- Update client code
- Test thoroughly

**Engineer/Agent 3 (2-3 hours):**
- Phase 3: Server Component Migration
- Create server-side utilities
- Refactor page component
- Create wrapper components
- Test hydration

**Engineer/Agent 4 (1 hour):**
- Phase 4: Query Optimization
- Define types
- Update API routes
- Update client calls

**Engineer/Agent 5 (2-3 hours):**
- Phase 5: Infinite Scrolling & MedEvac Integration
- Implement cursor pagination
- Add infinite scroll
- Integrate MedEvac filter
- Clean up old code

**Total Parallel Time**: ~3 hours (vs 8 hours sequential)

---

## 🎯 Definition of Done

### Phase 1 Complete
- [ ] Database indexes added and deployed
- [ ] Migration successful in all environments
- [ ] Query performance improved (measurable)

### Phase 2 Complete
- [ ] Batch API endpoint created and tested
- [ ] Client code updated to use batch API
- [ ] API call count reduced from N to 1
- [ ] No regression in functionality

### Phase 3 Complete
- [ ] Page converted to server component
- [ ] Initial data loads server-side
- [ ] No hydration errors
- [ ] Client interactions still work
- [ ] Performance improvement measurable

### Phase 4 Complete
- [ ] Field selection implemented
- [ ] Payload size reduced
- [ ] API supports both minimal and full modes
- [ ] No data missing in UI

### Phase 5 Complete
- [ ] Infinite scroll implemented
- [ ] Cursor-based pagination working
- [ ] MedEvac filter integrated
- [ ] Old pagination code removed
- [ ] User settings schema cleaned up
- [ ] 80% reduction in initial data load

### Overall Project Complete
- [ ] All 5 phases deployed to production
- [ ] Performance metrics meet targets
- [ ] No regression bugs reported
- [ ] Documentation updated
- [ ] Team trained on new architecture

---

## 📚 Additional Resources

### Documentation to Update
- [ ] Architecture documentation
- [ ] API documentation (new batch endpoint + pagination)
- [ ] Performance benchmarking guide
- [ ] Deployment runbook
- [ ] Infinite scroll usage guide
- [ ] MedEvac integration guide

### Learning Resources
- [Next.js Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [React Query with Initial Data](https://tanstack.com/query/latest/docs/react/guides/initial-query-data)
- [PostgreSQL Index Performance](https://www.postgresql.org/docs/current/indexes.html)
- [Drizzle ORM Query Performance](https://orm.drizzle.team/docs/performance)

---

## 🤝 Support & Questions

For questions or issues during implementation:
1. Check this document first
2. Review related documentation
3. Test in isolation
4. Ask for help with specific error messages

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**Status**: Ready for Implementation
