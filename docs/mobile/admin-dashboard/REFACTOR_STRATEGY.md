# Admin Dashboard Mobile Refactor Strategy

## Overview
This document outlines a phased approach to implementing an Admin Dashboard in the mobile app, mirroring the web implementation's architecture using View + ViewModel pattern with expandable Accordions.

## Architecture Pattern

### View + ViewModel Structure
Each admin section will follow this pattern:
- **View**: React Native component handling UI/presentation
- **ViewModel**: Custom hook managing state, business logic, and API calls
- **Accordion**: Expandable sections for organizing content

### Reference Implementation
- Web: `apps/web/components/adminDashboard/AdminDashboardView.tsx`
- Mobile Accordion: `apps/mobile/src/components/ui/Accordion.tsx`
- Web Sections: `apps/web/components/adminDashboard/sections/`

---

## Phase 1: Foundation Setup
**Goal**: Establish core infrastructure and utilities

### Step 1.1: Create Directory Structure
```
apps/mobile/src/
├── screens/
│   └── admin/
│       ├── AdminDashboardScreen.tsx
│       └── sections/
├── components/
│   └── admin/
│       ├── AdminDashboardView.tsx
│       └── sections/
│           ├── createUser/
│           ├── newSignups/
│           ├── existingUsers/
│           ├── deniedUsers/
│           ├── adminManagement/
│           ├── passwordReset/
│           ├── notifications/
│           ├── medOrders/
│           ├── statistics/
│           ├── clearTestData/
│           ├── patientIntake/
│           ├── imageStorage/
│           └── analytics/
├── viewModels/
│   └── admin/
│       ├── useNewSignupsViewModel.ts
│       ├── useAdminManagementViewModel.ts
│       ├── useExistingUsersViewModel.ts
│       └── [other viewModels]
```

**Files to Create**:
- `apps/mobile/src/screens/admin/AdminDashboardScreen.tsx`
- `apps/mobile/src/components/admin/AdminDashboardView.tsx`
- `apps/mobile/src/viewModels/admin/` directory

**Deliverables**:
- [ ] Directory structure created
- [ ] Basic screen navigation configured
- [ ] Admin route added to navigation

---

### Step 1.2: Create Shared Admin Utilities
**Goal**: Set up reusable utilities for admin operations

**Files to Create**:
- `apps/mobile/src/utils/admin/adminApi.ts` - API wrapper for admin endpoints
- `apps/mobile/src/utils/admin/adminHelpers.ts` - Helper functions
- `apps/mobile/src/types/admin.ts` - TypeScript interfaces for admin data

**Example Structure** (`adminApi.ts`):
```typescript
import { apiClient } from '../apiClient';

export const adminApi = {
  getNewSignups: (page: number) => apiClient.get(`/api/admin/GET/new-users?page=${page}`),
  approveUsers: (userIds: string[]) => apiClient.post('/api/admin/POST/approve-users', { userIds }),
  denyUsers: (userIds: string[]) => apiClient.post('/api/admin/POST/deny-users', { userIds }),
  // ... other methods
};
```

**Deliverables**:
- [ ] Admin API utilities created
- [ ] Type definitions established
- [ ] Helper functions implemented

---

### Step 1.3: Create Admin Context/Provider
**Goal**: Manage global admin state and authentication

**Files to Create**:
- `apps/mobile/src/contexts/AdminContext.tsx`

**Features**:
- Admin session management
- Global admin state
- Permission checking
- Refresh management

**Deliverables**:
- [ ] AdminContext created
- [ ] Provider wraps admin screens
- [ ] Auth checks implemented

---

## Phase 2: Core Components
**Goal**: Build reusable admin-specific components

### Step 2.1: Admin Accordion Wrapper
**Goal**: Create admin-themed accordion component

**Files to Create**:
- `apps/mobile/src/components/admin/AdminAccordion.tsx`

**Features**:
- Extends base Accordion component
- Admin-specific styling
- Icon support (lucide-react-native)
- Search highlighting
- Disabled states

**Deliverables**:
- [ ] AdminAccordion component created
- [ ] Styling matches admin theme
- [ ] Icons integrated

---

### Step 2.2: Admin Dashboard Shell
**Goal**: Create main dashboard container

**Files to Create**:
- `apps/mobile/src/components/admin/AdminDashboardView.tsx`
- `apps/mobile/src/components/admin/AdminDashboardHeader.tsx`

**Features**:
- Search functionality
- Refresh all sections
- Help dialog
- Section filtering
- Loading states

**Reference**: `apps/web/components/adminDashboard/AdminDashboardView.tsx`

**Deliverables**:
- [ ] Dashboard shell created
- [ ] Header with search implemented
- [ ] Refresh functionality working
- [ ] Help modal created

---

### Step 2.3: Shared Section Components
**Goal**: Create reusable components for sections

**Files to Create**:
- `apps/mobile/src/components/admin/shared/EmptyState.tsx`
- `apps/mobile/src/components/admin/shared/ErrorState.tsx`
- `apps/mobile/src/components/admin/shared/LoadingState.tsx`
- `apps/mobile/src/components/admin/shared/BulkActionBar.tsx`
- `apps/mobile/src/components/admin/shared/UserCard.tsx`

**Deliverables**:
- [ ] All shared components created
- [ ] Components are reusable
- [ ] Proper error handling

---

## Phase 3: Section Implementation (Priority Order)
**Goal**: Implement sections one by one, starting with most critical

### Step 3.1: New Signups Section
**Priority**: HIGH - Core admin functionality

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/useNewSignupsViewModel.ts`
2. `apps/mobile/src/components/admin/sections/newSignups/NewSignupsView.tsx`
3. `apps/mobile/src/components/admin/sections/newSignups/NewSignupCard.tsx`

**ViewModel Features**:
```typescript
export function useNewSignupsViewModel() {
  // State
  const [newSignups, setNewSignups] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Actions
  const fetchNewSignups = async () => { /* ... */ };
  const handleApprove = async (userIds: string[]) => { /* ... */ };
  const handleDeny = async (userIds: string[]) => { /* ... */ };
  const handleBulkAction = async (action: string) => { /* ... */ };
  
  return {
    // State
    newSignups,
    selectedUsers,
    isLoading,
    // Actions
    fetchNewSignups,
    handleApprove,
    handleDeny,
    handleBulkAction,
    // Utilities
    toggleSelection,
    selectAll,
  };
}
```

**View Features**:
- List of pending users
- Checkbox selection
- Approve/Deny actions
- Bulk operations
- Pull-to-refresh
- Infinite scroll

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Card component created
- [ ] Actions working (approve/deny)
- [ ] Bulk operations working

---

### Step 3.2: Existing Users Section
**Priority**: HIGH

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/useExistingUsersViewModel.ts`
2. `apps/mobile/src/components/admin/sections/existingUsers/ExistingUsersView.tsx`
3. `apps/mobile/src/components/admin/sections/existingUsers/UserDetailsModal.tsx`

**Features**:
- List approved users
- Search/filter by type (Doctor/Triage/Evac)
- View user details
- Change account status
- Edit user permissions

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Details modal created
- [ ] Filtering working
- [ ] Edit functionality working

---

### Step 3.3: Admin Management Section
**Priority**: HIGH

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/useAdminManagementViewModel.ts`
2. `apps/mobile/src/components/admin/sections/adminManagement/AdminManagementView.tsx`
3. `apps/mobile/src/components/admin/sections/adminManagement/AddAdminModal.tsx`

**Features**:
- List current admins
- Search users to add as admin
- Add/remove admin privileges
- Confirm dangerous operations

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Add admin modal created
- [ ] Remove admin functionality
- [ ] Confirmation dialogs

---

### Step 3.4: Password Reset Section
**Priority**: MEDIUM

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/usePasswordResetViewModel.ts`
2. `apps/mobile/src/components/admin/sections/passwordReset/PasswordResetView.tsx`

**Features**:
- Search for user by email
- Initiate password reset
- View reset history

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Search functionality
- [ ] Reset action working

---

### Step 3.5: Denied Users Section
**Priority**: MEDIUM

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/useDeniedUsersViewModel.ts`
2. `apps/mobile/src/components/admin/sections/deniedUsers/DeniedUsersView.tsx`

**Features**:
- List denied users
- Reinstate users
- View denial reason
- Permanent delete

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Reinstate functionality
- [ ] Delete functionality

---

### Step 3.6: Create User Section
**Priority**: MEDIUM

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/useUserCreationViewModel.ts`
2. `apps/mobile/src/components/admin/sections/createUser/CreateUserView.tsx`
3. `apps/mobile/src/components/admin/sections/createUser/CreateUserForm.tsx`

**Features**:
- Form to create Doctor/Triage/Evac users
- Field validation
- Specialty selection (for doctors)
- Country assignment
- Success/error feedback

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Form component with validation
- [ ] User creation working

---

### Step 3.7: Notifications Section
**Priority**: MEDIUM

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/useNotificationsViewModel.ts`
2. `apps/mobile/src/components/admin/sections/notifications/NotificationsView.tsx`
3. `apps/mobile/src/components/admin/sections/notifications/SendNotificationModal.tsx`

**Features**:
- Send system-wide notifications
- Target specific user types
- View notification history
- Schedule notifications

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Send modal created
- [ ] History view working

---

### Step 3.8: Medical Orders Section
**Priority**: MEDIUM

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/useMedOrdersViewModel.ts`
2. `apps/mobile/src/components/admin/sections/medOrders/MedOrdersView.tsx`
3. `apps/mobile/src/components/admin/sections/medOrders/OrderDetailsModal.tsx`

**Features**:
- View all medical orders
- Filter by status
- Order details view
- Export functionality

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Details modal created
- [ ] Filtering working

---

### Step 3.9: Statistics Section
**Priority**: LOW

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/useStatisticsViewModel.ts`
2. `apps/mobile/src/components/admin/sections/statistics/StatisticsView.tsx`

**Features**:
- User statistics charts (use react-native-chart-kit or victory-native)
- Specialty breakdown
- Activity metrics
- Export data

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Charts rendering
- [ ] Data export working

---

### Step 3.10: Analytics Dashboard Section
**Priority**: LOW

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/useAnalyticsViewModel.ts`
2. `apps/mobile/src/components/admin/sections/analytics/AnalyticsView.tsx`

**Features**:
- User engagement metrics
- System performance
- Usage patterns
- Time-based filtering

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Metrics display working
- [ ] Filtering implemented

---

### Step 3.11: Patient Intake (Telegram Bot) Section
**Priority**: LOW

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/usePatientIntakeViewModel.ts`
2. `apps/mobile/src/components/admin/sections/patientIntake/PatientIntakeView.tsx`

**Features**:
- Configure telegram bot settings
- View intake statistics
- Manage bot responses

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Settings management working

---

### Step 3.12: Image Storage Section
**Priority**: LOW

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/useImageStorageViewModel.ts`
2. `apps/mobile/src/components/admin/sections/imageStorage/ImageStorageView.tsx`

**Features**:
- View storage usage
- Browse uploaded images
- Delete old images
- Storage statistics

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Image browsing working
- [ ] Delete functionality

---

### Step 3.13: Clear Test Data Section
**Priority**: LOW - Development Tool

**Files to Create**:
1. `apps/mobile/src/viewModels/admin/useClearTestDataViewModel.ts`
2. `apps/mobile/src/components/admin/sections/clearTestData/ClearTestDataView.tsx`

**Features**:
- Select data types to clear
- Confirmation dialogs
- Progress feedback
- Only available in dev/staging

**Deliverables**:
- [ ] ViewModel implemented
- [ ] View component created
- [ ] Clear actions working
- [ ] Environment checks in place

---

## Phase 4: Polish & Optimization
**Goal**: Enhance UX and performance

### Step 4.1: Performance Optimization
**Tasks**:
- [ ] Implement React.memo for expensive components
- [ ] Add virtualization for long lists (FlashList)
- [ ] Optimize re-renders
- [ ] Add request debouncing
- [ ] Implement proper loading states
- [ ] Add skeleton loaders

---

### Step 4.2: Error Handling & Validation
**Tasks**:
- [ ] Comprehensive error boundaries
- [ ] User-friendly error messages
- [ ] Form validation
- [ ] Network error recovery
- [ ] Session expiration handling
- [ ] Retry mechanisms

---

### Step 4.3: Accessibility
**Tasks**:
- [ ] Add accessibility labels
- [ ] Screen reader support
- [ ] Keyboard navigation
- [ ] Color contrast compliance
- [ ] Touch target sizes
- [ ] Haptic feedback

---

### Step 4.4: Testing
**Tasks**:
- [ ] Unit tests for ViewModels
- [ ] Component tests for Views
- [ ] Integration tests for critical flows
- [ ] E2E tests for admin workflows
- [ ] Mock API responses
- [ ] Test error scenarios

---

## Phase 5: Documentation & Deployment
**Goal**: Document and deploy

### Step 5.1: Documentation
**Files to Create**:
- `docs/mobile/admin-dashboard/ADMIN_GUIDE.md` - User guide
- `docs/mobile/admin-dashboard/DEVELOPMENT.md` - Developer guide
- `docs/mobile/admin-dashboard/API.md` - API documentation

**Tasks**:
- [ ] Document each section
- [ ] Add code examples
- [ ] Create troubleshooting guide
- [ ] Document permissions model

---

### Step 5.2: Deployment Preparation
**Tasks**:
- [ ] Feature flags for gradual rollout
- [ ] Analytics tracking
- [ ] Error monitoring (Sentry, etc.)
- [ ] Performance monitoring
- [ ] Admin user training materials

---

## Implementation Guidelines

### ViewModel Best Practices
```typescript
// 1. Use custom hooks prefixed with 'use'
export function useNewSignupsViewModel() {
  // 2. Group related state
  const [data, setData] = useState({
    users: [],
    loading: false,
    error: null,
  });
  
  // 3. Memoize expensive computations
  const filteredUsers = useMemo(() => {
    return data.users.filter(/* ... */);
  }, [data.users]);
  
  // 4. Use useCallback for functions passed to child components
  const handleApprove = useCallback(async (userId: string) => {
    // Implementation
  }, [/* dependencies */]);
  
  // 5. Return a clear API
  return {
    // Data
    users: data.users,
    isLoading: data.loading,
    error: data.error,
    // Computed
    filteredUsers,
    // Actions
    handleApprove,
    handleDeny,
    refresh,
  };
}
```

### View Component Best Practices
```typescript
export function NewSignupsView() {
  // 1. Use the ViewModel
  const viewModel = useNewSignupsViewModel();
  
  // 2. Handle loading states
  if (viewModel.isLoading) {
    return <LoadingState />;
  }
  
  // 3. Handle error states
  if (viewModel.error) {
    return <ErrorState error={viewModel.error} onRetry={viewModel.refresh} />;
  }
  
  // 4. Render main content
  return (
    <View>
      {/* Content */}
    </View>
  );
}
```

### File Naming Conventions
- Views: `[SectionName]View.tsx`
- ViewModels: `use[SectionName]ViewModel.ts`
- Sub-components: `[ComponentName].tsx`
- Types: `[section].types.ts`

### Import Structure
```typescript
// 1. React & React Native
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

// 2. Third-party libraries
import { useQuery } from '@tanstack/react-query';

// 3. Components
import { Accordion, AccordionItem } from '@/components/ui/Accordion';

// 4. ViewModels & Hooks
import { useNewSignupsViewModel } from '@/viewModels/admin/useNewSignupsViewModel';

// 5. Utils & Types
import { adminApi } from '@/utils/admin/adminApi';
import type { User } from '@/types/admin';

// 6. Styles
import { styles } from './NewSignupsView.styles';
```

---

## Dependencies to Add

### Required Libraries
```json
{
  "@tanstack/react-query": "^5.x.x",
  "lucide-react-native": "^0.x.x",
  "react-native-chart-kit": "^6.x.x" // For statistics
}
```

### Optional Libraries
```json
{
  "@shopify/flash-list": "^1.x.x", // Better list performance
  "react-native-reanimated": "^3.x.x", // Smooth animations
  "zustand": "^4.x.x" // If global state is needed
}
```

---

## Risk Mitigation

### Potential Challenges
1. **Large Data Sets**: Use pagination and virtualization
2. **Complex State**: Keep ViewModels focused and single-purpose
3. **Network Issues**: Implement retry logic and offline indicators
4. **Performance**: Profile regularly, use React DevTools
5. **Security**: Validate admin permissions on every action

---

## Success Metrics
- [ ] All 13 sections implemented
- [ ] Test coverage > 80%
- [ ] No critical bugs
- [ ] Performance: < 100ms for section opens
- [ ] Accessibility score > 90%
- [ ] Admin user satisfaction > 4/5

---

## Timeline Estimate (for LLM-assisted development)

- **Phase 1**: 2-3 sessions (Foundation)
- **Phase 2**: 2-3 sessions (Core Components)
- **Phase 3**: 13-20 sessions (1-2 per section)
- **Phase 4**: 3-4 sessions (Polish)
- **Phase 5**: 2-3 sessions (Documentation)

**Total**: ~22-33 sessions

---

## Next Steps

1. Review this strategy document
2. Set up Phase 1.1 (Directory Structure)
3. Begin with highest priority sections (New Signups, Existing Users)
4. Iterate and refine as you learn

---

## Notes for LLM Assistants

When implementing each phase:
1. **Read context**: Review related web implementation files
2. **Create ViewModel first**: Establish data flow and actions
3. **Build View second**: Focus on UI/UX
4. **Test thoroughly**: Verify all actions work
5. **Document**: Add inline comments and update this doc
6. **Refactor**: Clean up before moving to next section

Each section should be **self-contained** and **independently testable**.