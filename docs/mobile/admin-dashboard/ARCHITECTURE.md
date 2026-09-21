# Admin Dashboard Architecture Guide

This document provides a visual and conceptual overview of the admin dashboard architecture for the mobile app.

## 🏛️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Admin Dashboard Screen                   │
│                                                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              AdminDashboardView                        │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Header (Search, Refresh, Help)                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Accordion (Expandable Sections)                │  │  │
│  │  │  ┌─────────────────────────────────────────┐   │  │  │
│  │  │  │  Section 1: Create User                 │   │  │  │
│  │  │  │  └─ CreateUserView (ViewModel)          │   │  │  │
│  │  │  ├─────────────────────────────────────────┤   │  │  │
│  │  │  │  Section 2: New Signups                 │   │  │  │
│  │  │  │  └─ NewSignupsView (ViewModel)          │   │  │  │
│  │  │  ├─────────────────────────────────────────┤   │  │  │
│  │  │  │  Section 3: Existing Users              │   │  │  │
│  │  │  │  └─ ExistingUsersView (ViewModel)       │   │  │  │
│  │  │  ├─────────────────────────────────────────┤   │  │  │
│  │  │  │  ... (10 more sections)                 │   │  │  │
│  │  │  └─────────────────────────────────────────┘   │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🔄 View + ViewModel Pattern

### Data Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────┐
│             │  uses   │              │  calls  │         │
│    View     │────────>│  ViewModel   │────────>│   API   │
│ (Component) │         │   (Hook)     │         │         │
│             │<────────│              │<────────│         │
└─────────────┘ updates └──────────────┘ returns └─────────┘
                state
```

### Detailed Flow

```
User Action (e.g., Approve User)
        │
        ▼
┌────────────────────────┐
│   View Component       │
│   - Handles UI         │
│   - User interactions  │
└───────────┬────────────┘
            │ calls
            ▼
┌────────────────────────┐
│   ViewModel Hook       │
│   - State management   │
│   - Business logic     │
└───────────┬────────────┘
            │ calls
            ▼
┌────────────────────────┐
│   Admin API Wrapper    │
│   - HTTP requests      │
│   - Error handling     │
└───────────┬────────────┘
            │ HTTP
            ▼
┌────────────────────────┐
│   Backend API          │
│   - Authentication     │
│   - Data processing    │
└───────────┬────────────┘
            │ returns
            ▼
        Response
            │
            ▼ (propagates back up)
┌────────────────────────┐
│   View Updates         │
│   - Re-renders         │
│   - Shows feedback     │
└────────────────────────┘
```

## 📁 Directory Structure

```
apps/mobile/src/
│
├── screens/
│   └── admin/
│       └── AdminDashboardScreen.tsx ─────┐ (Entry point)
│                                          │
├── components/                            │
│   └── admin/                            │
│       ├── AdminDashboardView.tsx ◄──────┘ (Main container)
│       ├── AdminDashboardHeader.tsx
│       ├── AdminAccordion.tsx
│       │
│       ├── sections/ ─────────────────────┐ (13 sections)
│       │   ├── createUser/                │
│       │   │   ├── CreateUserView.tsx     │
│       │   │   └── CreateUserForm.tsx     │
│       │   ├── newSignups/                │
│       │   │   ├── NewSignupsView.tsx     │
│       │   │   └── NewSignupCard.tsx      │
│       │   ├── existingUsers/             │
│       │   ├── deniedUsers/               │
│       │   ├── adminManagement/           │
│       │   ├── passwordReset/             │
│       │   ├── notifications/             │
│       │   ├── medOrders/                 │
│       │   ├── statistics/                │
│       │   ├── analytics/                 │
│       │   ├── patientIntake/             │
│       │   ├── imageStorage/              │
│       │   └── clearTestData/             │
│       │                                   │
│       └── shared/ ───────────────────────┘ (Reusable)
│           ├── EmptyState.tsx
│           ├── ErrorState.tsx
│           ├── LoadingState.tsx
│           ├── BulkActionBar.tsx
│           ├── UserCard.tsx
│           └── ConfirmDialog.tsx
│
├── viewModels/
│   └── admin/ ───────────────────────────┐ (Business logic)
│       ├── useNewSignupsViewModel.ts     │
│       ├── useExistingUsersViewModel.ts  │
│       ├── useAdminManagementViewModel.ts│
│       └── ... (one per section)         │
│                                          │
├── contexts/                              │
│   └── AdminContext.tsx ◄─────────────────┘ (Global state)
│
├── utils/
│   └── admin/
│       ├── adminApi.ts ──────────────────┐ (API wrapper)
│       └── adminHelpers.ts               │
│                                          │
└── types/                                 │
    └── admin.ts ◄───────────────────────┘ (TypeScript types)
```

## 🎯 Component Hierarchy

```
AdminDashboardScreen
└── AdminContext.Provider
    └── QueryClientProvider
        └── AdminDashboardView
            ├── AdminDashboardHeader
            │   ├── SearchInput
            │   ├── RefreshButton
            │   └── HelpButton
            └── Accordion
                ├── AccordionItem (Create User)
                │   └── CreateUserView
                │       └── CreateUserForm
                ├── AccordionItem (New Signups)
                │   └── NewSignupsView
                │       ├── BulkActionBar
                │       └── FlatList
                │           └── NewSignupCard (x N)
                ├── AccordionItem (Existing Users)
                │   └── ExistingUsersView
                │       ├── FilterTabs
                │       ├── SearchBar
                │       └── FlatList
                │           └── UserCard (x N)
                └── ... (10 more sections)
```

## 🔌 ViewModel Internal Structure

```
┌─────────────────────────────────────────────────────┐
│         useNewSignupsViewModel()                     │
├─────────────────────────────────────────────────────┤
│  STATE                                               │
│  ┌─────────────────────────────────────────────┐   │
│  │ - users: User[]                             │   │
│  │ - loading: boolean                          │   │
│  │ - error: string | null                      │   │
│  │ - selectedUsers: string[]                   │   │
│  │ - page: number                              │   │
│  │ - hasMore: boolean                          │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  COMPUTED VALUES (useMemo)                          │
│  ┌─────────────────────────────────────────────┐   │
│  │ - allSelected: boolean                      │   │
│  │ - someSelected: boolean                     │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  ACTIONS (useCallback)                              │
│  ┌─────────────────────────────────────────────┐   │
│  │ - fetchNewSignups()                         │   │
│  │ - approveUser(userId)                       │   │
│  │ - denyUser(userId)                          │   │
│  │ - bulkApprove()                             │   │
│  │ - bulkDeny()                                │   │
│  │ - toggleSelection(userId)                   │   │
│  │ - selectAll()                               │   │
│  │ - loadMore()                                │   │
│  │ - refresh()                                 │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  EFFECTS (useEffect)                                │
│  ┌─────────────────────────────────────────────┐   │
│  │ - Initial data fetch                        │   │
│  │ - Session monitoring                        │   │
│  └─────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────┤
│  RETURN (Public API)                                │
│  ┌─────────────────────────────────────────────┐   │
│  │ return {                                    │   │
│  │   users, loading, error,                    │   │
│  │   selectedUsers, allSelected, someSelected, │   │
│  │   approveUser, denyUser,                    │   │
│  │   bulkApprove, bulkDeny,                    │   │
│  │   toggleSelection, selectAll,               │   │
│  │   loadMore, refresh                         │   │
│  │ }                                           │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 🌊 State Management Flow

### Local State (within ViewModel)

```
Component Mounts
      │
      ▼
useEffect triggers
      │
      ▼
fetchNewSignups() ────► API Call ────► Update State
      │                                      │
      │                                      ▼
      │                                Re-render View
      │
User Interaction
      │
      ▼
Call ViewModel Action
      │
      ▼
Update State ────────────────────────────► Re-render View
      │
      ▼
API Call (if needed)
      │
      ▼
Update State ────────────────────────────► Re-render View
```

### Global State (AdminContext)

```
┌─────────────────────────────────────────────────┐
│            AdminContext.Provider                 │
├─────────────────────────────────────────────────┤
│  Global State:                                   │
│  - isAdmin: boolean                             │
│  - token: string                                │
│  - refreshTrigger: number                       │
│  - specialtyData: Specialty[]                   │
│                                                  │
│  Global Actions:                                │
│  - triggerGlobalRefresh()                       │
│  - updateAdminStatus()                          │
└─────────────────────────────────────────────────┘
         │                                 ▲
         │ provides                        │ updates
         ▼                                 │
┌─────────────────────────────────────────────────┐
│         All Admin Components                     │
│  (can access global state & actions)            │
└─────────────────────────────────────────────────┘
```

## 📡 API Layer Architecture

```
┌─────────────────────────────────────────────────┐
│              ViewModel Layer                     │
│  (useNewSignupsViewModel, etc.)                 │
└────────────────┬────────────────────────────────┘
                 │ calls
                 ▼
┌─────────────────────────────────────────────────┐
│           Admin API Wrapper                      │
│  (adminApi.ts)                                  │
│                                                  │
│  ┌─────────────────────────────────────────┐   │
│  │ export const adminApi = {               │   │
│  │   getNewSignups(page),                  │   │
│  │   approveUsers(userIds),                │   │
│  │   denyUsers(userIds),                   │   │
│  │   ...                                    │   │
│  │ }                                        │   │
│  └─────────────────────────────────────────┘   │
└────────────────┬────────────────────────────────┘
                 │ uses
                 ▼
┌─────────────────────────────────────────────────┐
│           API Client                             │
│  (with auth, error handling, etc.)              │
│                                                  │
│  - Adds Authorization header                    │
│  - Handles errors                               │
│  - Manages retries                              │
│  - Formats responses                            │
└────────────────┬────────────────────────────────┘
                 │ HTTP
                 ▼
┌─────────────────────────────────────────────────┐
│           Backend API                            │
│  /api/admin/GET/new-users                       │
│  /api/admin/POST/approve-users                  │
│  /api/admin/POST/deny-users                     │
│  ...                                             │
└─────────────────────────────────────────────────┘
```

## 🎨 UI Component States

```
Component Lifecycle States:

┌─────────────┐
│   LOADING   │ ◄─── Initial mount, data fetching
└──────┬──────┘
       │
       ├──────► Success ──────┐
       │                      │
       │                      ▼
       │              ┌──────────────┐
       │              │   HAS DATA   │
       │              └──────┬───────┘
       │                     │
       │              ┌──────┴───────┐
       │              │              │
       │              ▼              ▼
       │      ┌──────────────┐  ┌──────────┐
       │      │  DATA VIEW   │  │  EMPTY   │
       │      │ (list items) │  │  STATE   │
       │      └──────────────┘  └──────────┘
       │
       └──────► Error ───────┐
                             │
                             ▼
                     ┌──────────────┐
                     │ ERROR STATE  │
                     │ (with retry) │
                     └──────────────┘
```

## 🔐 Authentication Flow

```
┌─────────────────────────────────────────────────┐
│              User Opens App                      │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│          AuthContext checks token                │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
  ┌───────────┐   ┌──────────────┐
  │   Valid   │   │   Invalid    │
  └─────┬─────┘   └──────┬───────┘
        │                │
        │                ▼
        │         ┌──────────────┐
        │         │ Redirect to  │
        │         │    Login     │
        │         └──────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│       Check if user is admin                     │
└────────────────┬────────────────────────────────┘
                 │
         ┌───────┴───────┐
         │               │
         ▼               ▼
  ┌───────────┐   ┌──────────────┐
  │  Is Admin │   │  Not Admin   │
  └─────┬─────┘   └──────┬───────┘
        │                │
        │                ▼
        │         ┌──────────────┐
        │         │ Show Error   │
        │         │ Redirect Out │
        │         └──────────────┘
        │
        ▼
┌─────────────────────────────────────────────────┐
│       AdminContext provides admin state          │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│      All admin sections can access token         │
└─────────────────────────────────────────────────┘
```

## 🔄 Section Lifecycle

```
Section accordion closed
         │
         │ User taps to expand
         │
         ▼
┌─────────────────────────────────────────────────┐
│       AccordionItem opens                        │
│       └─ Section View mounts                     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│       ViewModel hook initializes                 │
│       - Sets up state                            │
│       - Registers effects                        │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│       useEffect triggers                         │
│       - Fetches initial data                     │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│       View renders with data                     │
│       - User interacts                           │
│       - Actions trigger updates                  │
└────────────────┬────────────────────────────────┘
                 │
                 │ User closes section
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│       Component unmounts                         │
│       - Cleanup effects                          │
│       - Release resources                        │
└─────────────────────────────────────────────────┘
```

## 📦 Shared Component Usage

```
Multiple Sections use shared components:

┌─────────────────────────────────────────────────┐
│           Shared Components Library              │
├─────────────────────────────────────────────────┤
│  - EmptyState                                   │
│  - ErrorState                                   │
│  - LoadingState                                 │
│  - BulkActionBar                                │
│  - UserCard                                     │
│  - ConfirmDialog                                │
└────────────┬────────────────────────────────────┘
             │ imported by
             │
    ┌────────┼────────┬────────┬────────┐
    │        │        │        │        │
    ▼        ▼        ▼        ▼        ▼
┌────────┐ ┌────┐ ┌────┐ ┌────┐ ┌────────┐
│Section1│ │Sec2│ │Sec3│ │...│ │Section13│
└────────┘ └────┘ └────┘ └────┘ └────────┘
```

## 🎯 Key Design Principles

### 1. Separation of Concerns
```
View (UI)              ViewModel (Logic)         API (Data)
   │                          │                      │
   │ Renders UI               │ Manages state        │ HTTP calls
   │ Handles interactions     │ Business logic       │ Data transform
   │ Display states           │ Side effects         │ Error handling
```

### 2. Single Responsibility
```
Each component does ONE thing:
- View: Presentation only
- ViewModel: State + Logic
- API Wrapper: Network calls
- Context: Global state
```

### 3. Composability
```
Small components combine to make complex UIs:

UserCard + BulkActionBar + EmptyState = NewSignupsView
```

### 4. Testability
```
Each layer can be tested independently:
- ViewModels: Unit tests (mock API)
- Views: Component tests (mock ViewModel)
- API: Integration tests (mock backend)
```

## 🚀 Performance Optimization Points

```
┌─────────────────────────────────────────────────┐
│              Performance Layer                   │
├─────────────────────────────────────────────────┤
│  1. Component Level                             │
│     - React.memo for expensive components       │
│     - useCallback for stable references         │
│     - useMemo for expensive computations        │
│                                                  │
│  2. List Level                                  │
│     - FlatList virtualization                   │
│     - keyExtractor optimization                 │
│     - getItemLayout for fixed height items      │
│                                                  │
│  3. Data Level                                  │
│     - Pagination (load 20 items at a time)      │
│     - Debouncing (search inputs)                │
│     - Caching (React Query)                     │
│                                                  │
│  4. Network Level                               │
│     - Request deduplication                     │
│     - Optimistic updates                        │
│     - Background refetch                        │
└─────────────────────────────────────────────────┘
```

## 📊 Data Flow Example: Approve User

```
1. User taps "Approve" button
         │
         ▼
2. View calls: vm.approveUser(userId)
         │
         ▼
3. ViewModel updates state: loading = true
         │
         ▼
4. View re-renders: shows loading indicator
         │
         ▼
5. ViewModel calls: adminApi.approveUsers([userId])
         │
         ▼
6. API wrapper adds auth header
         │
         ▼
7. HTTP POST to /api/admin/POST/approve-users
         │
         ▼
8. Backend processes request
         │
         ▼
9. Backend returns success response
         │
         ▼
10. API wrapper returns data to ViewModel
         │
         ▼
11. ViewModel updates state:
    - loading = false
    - removes user from list
    - clears selection
         │
         ▼
12. View re-renders: shows updated list
         │
         ▼
13. View shows success feedback (toast/alert)
```

## 🔍 Summary

This architecture provides:

✅ **Clear separation** between UI, logic, and data
✅ **Reusable components** across sections
✅ **Testable code** at every layer
✅ **Scalable structure** for adding new sections
✅ **Performance optimizations** built-in
✅ **Type safety** with TypeScript
✅ **Consistent patterns** for maintainability

---

**Next Steps**: Review REFACTOR_STRATEGY.md for implementation details.