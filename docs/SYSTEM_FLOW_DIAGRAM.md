# Profile Update Requests System - Flow Diagrams

Visual representations of the system flows and interactions.

## 🔄 Complete System Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         USER INITIATES PROFILE CHANGE                        │
└─────────────────────────────────────────────────────────────────────────────┘
                                       ↓
                         ┌─────────────────────────┐
                         │   Is field admin-gated? │
                         │  (doctorSpecialty or    │
                         │     accountType?)       │
                         └─────────────────────────┘
                                       ↓
                    ┌──────────────────┴──────────────────┐
                    ↓ NO                                   ↓ YES
        ┌───────────────────────┐          ┌──────────────────────────┐
        │   Update immediately  │          │  Check for pending       │
        │   Save to database    │          │  request on this field   │
        │   Show success toast  │          └──────────────────────────┘
        └───────────────────────┘                         ↓
                                              ┌────────────┴────────────┐
                                              ↓ Exists                  ↓ None
                                  ┌────────────────────┐    ┌─────────────────────┐
                                  │  Show error toast: │    │ Show warning modal  │
                                  │  "Request already  │    │ with ShieldAlert    │
                                  │   pending"         │    │                     │
                                  └────────────────────┘    └─────────────────────┘
                                                                        ↓
                                                            ┌───────────────────────┐
                                                            │ Display:              │
                                                            │ - Current value       │
                                                            │ - Requested value     │
                                                            │ - Approval notice     │
                                                            └───────────────────────┘
                                                                        ↓
                                                        ┌───────────────┴───────────────┐
                                                        ↓ Cancel                        ↓ Confirm
                                                ┌───────────┐              ┌─────────────────────────┐
                                                │   Close   │              │  POST /api/profile-     │
                                                │   Modal   │              │  update-requests        │
                                                └───────────┘              └─────────────────────────┘
                                                                                      ↓
                                                                          ┌─────────────────────────┐
                                                                          │ Create request record:  │
                                                                          │ - userId                │
                                                                          │ - fieldName             │
                                                                          │ - currentValue          │
                                                                          │ - requestedValue        │
                                                                          │ - status: 'pending'     │
                                                                          └─────────────────────────┘
                                                                                      ↓
                                                                          ┌─────────────────────────┐
                                                                          │ Show success toast      │
                                                                          │ Refresh queries         │
                                                                          │ Close modal             │
                                                                          └─────────────────────────┘
                                                                                      ↓
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              USER SEES PENDING STATUS                                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                      ↓
                                                                    ┌──────────────────────────────┐
                                                                    │ Profile form displays:       │
                                                                    │ - Current value (unchanged)  │
                                                                    │ - 🛡️ ShieldAlert icon       │
                                                                    │   (animated, pulsing)        │
                                                                    │ - "Pending Approval" badge   │
                                                                    │ - Tooltip with details       │
                                                                    └──────────────────────────────┘
                                                                                      ↓
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN REVIEWS REQUEST                                               │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                                                      ↓
                                                                    ┌──────────────────────────────┐
                                                                    │ Admin opens dashboard        │
                                                                    │ Navigates to "Profile        │
                                                                    │ Update Requests" section     │
                                                                    └──────────────────────────────┘
                                                                                      ↓
                                                                    ┌──────────────────────────────┐
                                                                    │ GET /api/admin/profile-      │
                                                                    │ update-requests?status=      │
                                                                    │ pending                      │
                                                                    └──────────────────────────────┘
                                                                                      ↓
                                                                    ┌──────────────────────────────┐
                                                                    │ Display all pending requests │
                                                                    │ - Statistics cards           │
                                                                    │ - Searchable table           │
                                                                    │ - Filter options             │
                                                                    └──────────────────────────────┘
                                                                                      ↓
                                                                    ┌──────────────────────────────┐
                                                                    │ Admin clicks Approve or Deny │
                                                                    └──────────────────────────────┘
                                                                                      ↓
                                                                    ┌──────────────────────────────┐
                                                                    │ Review dialog opens:         │
                                                                    │ - User details               │
                                                                    │ - Change details             │
                                                                    │ - Optional notes field       │
                                                                    └──────────────────────────────┘
                                                                                      ↓
                                                        ┌───────────────────────────┴──────────────────────────┐
                                                        ↓ APPROVE                                               ↓ DENY
                                    ┌────────────────────────────────┐                    ┌──────────────────────────┐
                                    │ PATCH /api/admin/profile-      │                    │ PATCH /api/admin/profile-│
                                    │ update-requests/[id]           │                    │ update-requests/[id]     │
                                    │ { action: "approve" }          │                    │ { action: "deny" }       │
                                    └────────────────────────────────┘                    └──────────────────────────┘
                                                    ↓                                                    ↓
                                    ┌────────────────────────────────┐                    ┌──────────────────────────┐
                                    │ Database Transaction:          │                    │ Update request:          │
                                    │ 1. Update request status       │                    │ - status: 'denied'       │
                                    │    → 'approved'                │                    │ - reviewedBy             │
                                    │ 2. Update user profile field   │                    │ - reviewedByEmail        │
                                    │    with requested value        │                    │ - reviewedByName         │
                                    │ 3. Create profile log entry    │                    │ - reviewedAt             │
                                    │    for audit trail             │                    │ - reviewNotes            │
                                    │ 4. Record admin details        │                    └──────────────────────────┘
                                    └────────────────────────────────┘                                   ↓
                                                    ↓                                         ┌──────────────────────────┐
                                    ┌────────────────────────────────┐                       │ Profile NOT updated      │
                                    │ Success!                       │                       │ User keeps current value │
                                    │ - User profile updated         │                       └──────────────────────────┘
                                    │ - Request marked approved      │
                                    │ - Audit log created            │
                                    └────────────────────────────────┘
                                                    ↓
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                              USER SEES RESULT                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                    ↓
                                    ┌────────────────────────────────┐
                                    │ React Query auto-refreshes     │
                                    │ User sees updated profile      │
                                    │ ShieldAlert icon disappears    │
                                    │ New value displayed            │
                                    └────────────────────────────────┘
```

## 🎯 Component Interaction Diagram

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              USER PROFILE FORM                                    │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                     useProfileUpdateRequests Hook                           │  │
│  │  ┌──────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ - requests: ProfileUpdateRequest[]                                    │  │  │
│  │  │ - hasPendingRequest(fieldName): boolean                              │  │  │
│  │  │ - getPendingRequestByField(fieldName): ProfileUpdateRequest | undefined│ │  │
│  │  │ - createRequest(params): Promise<result>                             │  │  │
│  │  │ - isCreating: boolean                                                │  │  │
│  │  └──────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────┬────────────────────────────────────────────┘  │
│                                    ↓                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                         Field Change Handler                                 │  │
│  │                                                                              │  │
│  │  handleFieldChange(fieldName, value) {                                      │  │
│  │    if (isAdminGatedField(fieldName)) {                                      │  │
│  │      if (hasPendingRequest(fieldName)) {                                    │  │
│  │        → Show "Request already pending" error                              │  │
│  │      } else {                                                               │  │
│  │        → Show AdminApprovalWarningModal                                    │  │
│  │      }                                                                      │  │
│  │    } else {                                                                 │  │
│  │      → Update field immediately                                            │  │
│  │    }                                                                        │  │
│  │  }                                                                          │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                    ↓                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                    AdminApprovalWarningModal                                 │  │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Props:                                                                 │  │  │
│  │  │ - isOpen: boolean                                                     │  │  │
│  │  │ - onClose: () => void                                                 │  │  │
│  │  │ - onConfirm: () => void                                               │  │  │
│  │  │ - fieldName: string                                                   │  │  │
│  │  │ - currentValue: any                                                   │  │  │
│  │  │ - requestedValue: any                                                 │  │  │
│  │  │ - isLoading: boolean                                                  │  │  │
│  │  │                                                                        │  │  │
│  │  │ Displays:                                                             │  │  │
│  │  │ - 🛡️ ShieldAlert icon                                                │  │  │
│  │  │ - "Admin Approval Required" title                                    │  │  │
│  │  │ - Current vs Requested comparison                                    │  │  │
│  │  │ - Warning about pending status                                       │  │  │
│  │  │ - Cancel and Submit buttons                                          │  │  │
│  │  └───────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────┬───────────────────────────────────────────┘  │
│                                    ↓ (User confirms)                              │
│                       POST /api/profile-update-requests                           │
│                                    ↓                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                      PendingChangeIndicator                                  │  │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Rendered when: hasPendingRequest(fieldName) === true                  │  │  │
│  │  │                                                                        │  │  │
│  │  │ Displays:                                                             │  │  │
│  │  │ - 🛡️ ShieldAlert icon (animated, pulsing)                            │  │  │
│  │  │ - "Pending Approval" badge (amber)                                   │  │  │
│  │  │ - Tooltip on hover:                                                  │  │  │
│  │  │   • "Change Pending Admin Approval"                                 │  │  │
│  │  │   • Requested value                                                 │  │  │
│  │  │   • Timestamp                                                       │  │  │
│  │  │   • "Current value will remain..." note                            │  │  │
│  │  └───────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────────┐
│                           ADMIN DASHBOARD                                         │
│  ┌────────────────────────────────────────────────────────────────────────────┐  │
│  │                  ProfileUpdateRequestsViewModel                             │  │
│  │  ┌──────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ - requests: ProfileUpdateRequest[]                                    │  │  │
│  │  │ - requestsByStatus: { pending[], approved[], denied[] }              │  │  │
│  │  │ - searchTerm: string                                                 │  │  │
│  │  │ - filterStatus: 'all' | 'pending' | 'approved' | 'denied'          │  │  │
│  │  │ - handleApprove(id, notes?): void                                   │  │  │
│  │  │ - handleDeny(id, notes?): void                                      │  │  │
│  │  │ - handleDelete(id): void                                            │  │  │
│  │  │ - formatValue(value): string                                        │  │  │
│  │  │ - getFieldDisplayName(field): string                                │  │  │
│  │  └──────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────┬────────────────────────────────────────────┘  │
│                                    ↓                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │                    ProfileUpdateRequestsView                                 │  │
│  │                                                                              │  │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Statistics Cards:                                                      │  │  │
│  │  │ ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                │  │  │
│  │  │ │ Pending: 5   │  │ Approved: 12 │  │ Denied: 2    │                │  │  │
│  │  │ │ 🕐          │  │ ✓           │  │ ✗           │                │  │  │
│  │  │ └──────────────┘  └──────────────┘  └──────────────┘                │  │  │
│  │  └───────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                              │  │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Filters:                                                               │  │  │
│  │  │ [ Search: ______________ ] [ Status: Pending ▼ ]                      │  │  │
│  │  └───────────────────────────────────────────────────────────────────────┘  │  │
│  │                                                                              │  │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │  │
│  │  │ Requests Table:                                                        │  │  │
│  │  │ ┌──────┬───────┬─────────┬───────────┬────────┬──────────┬─────────┐ │  │  │
│  │  │ │ User │ Field │ Current │ Requested │ Status │   Date   │ Actions │ │  │  │
│  │  │ ├──────┼───────┼─────────┼───────────┼────────┼──────────┼─────────┤ │  │  │
│  │  │ │ John │ Spec. │  Card.  │   Neuro.  │ 🕐Pend │ 12/01/24 │ ✓  ✗   │ │  │  │
│  │  │ └──────┴───────┴─────────┴───────────┴────────┴──────────┴─────────┘ │  │  │
│  │  └───────────────────────────────────────────────────────────────────────┘  │  │
│  │                                    ↓ (Admin clicks approve/deny)             │  │
│  │  ┌───────────────────────────────────────────────────────────────────────┐  │  │
│  │  │                      Review Dialog                                     │  │  │
│  │  │  ┌─────────────────────────────────────────────────────────────────┐  │  │  │
│  │  │  │ ✓ Approve Profile Update Request                                │  │  │  │
│  │  │  ├─────────────────────────────────────────────────────────────────┤  │  │  │
│  │  │  │ User: John Doe (john@example.com)                               │  │  │  │
│  │  │  │ Requested: Dec 1, 2024                                          │  │  │  │
│  │  │  │                                                                 │  │  │  │
│  │  │  │ Change: Doctor Specialty                                        │  │  │  │
│  │  │  │ Cardiology  →  Neurology                                       │  │  │  │
│  │  │  │                                                                 │  │  │  │
│  │  │  │ Review Notes (optional):                                        │  │  │  │
│  │  │  │ [________________________________]                              │  │  │  │
│  │  │  │                                                                 │  │  │  │
│  │  │  │ ⚠️ Approving will update the user's profile immediately        │  │  │  │
│  │  │  │                                                                 │  │  │  │
│  │  │  │                          [Cancel]  [Confirm Approval]          │  │  │  │
│  │  │  └─────────────────────────────────────────────────────────────────┘  │  │  │
│  │  └───────────────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────┬───────────────────────────────────────────┘  │
│                                    ↓                                               │
│                   PATCH /api/admin/profile-update-requests/[id]                   │
│                                    ↓                                               │
│              Database Transaction + Profile Update + Audit Log                    │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## 📊 Data Flow Diagram

```
┌───────────────┐         ┌──────────────┐         ┌──────────────┐
│   Frontend    │         │   API Layer  │         │   Database   │
│  (React UI)   │         │  (Next.js)   │         │ (PostgreSQL) │
└───────┬───────┘         └──────┬───────┘         └──────┬───────┘
        │                        │                        │
        │ 1. Create Request      │                        │
        ├───────────────────────>│                        │
        │                        │ 2. Validate            │
        │                        │    - Auth check        │
        │                        │    - Field check       │
        │                        │    - Duplicate check   │
        │                        │                        │
        │                        │ 3. INSERT              │
        │                        ├───────────────────────>│
        │                        │                        │
        │                        │ 4. Created Record      │
        │                        │<───────────────────────┤
        │ 5. Success Response    │                        │
        │<───────────────────────┤                        │
        │                        │                        │
        │ 6. Refetch Requests    │                        │
        ├───────────────────────>│                        │
        │                        │ 7. SELECT              │
        │                        ├───────────────────────>│
        │                        │                        │
        │                        │ 8. Requests            │
        │                        │<───────────────────────┤
        │ 9. Display Pending     │                        │
        │<───────────────────────┤                        │
        │                        │                        │
        │                        │                        │
        │ ADMIN SIDE:            │                        │
        │                        │                        │
        │ 10. Approve Request    │                        │
        ├───────────────────────>│                        │
        │                        │ 11. Verify Admin       │
        │                        │                        │
        │                        │ 12. BEGIN TRANSACTION  │
        │                        ├───────────────────────>│
        │                        │                        │
        │                        │ 13. UPDATE request     │
        │                        │     SET status=        │
        │                        │     'approved'         │
        │                        ├───────────────────────>│
        │                        │                        │
        │                        │ 14. UPDATE users       │
        │                        │     SET field=value    │
        │                        ├───────────────────────>│
        │                        │                        │
        │                        │ 15. INSERT log         │
        │                        ├───────────────────────>│
        │                        │                        │
        │                        │ 16. COMMIT             │
        │                        ├───────────────────────>│
        │                        │                        │
        │                        │ 17. Success            │
        │                        │<───────────────────────┤
        │ 18. Success Response   │                        │
        │<───────────────────────┤                        │
        │                        │                        │
        │ 19. Auto-refetch       │                        │
        ├───────────────────────>│                        │
        │                        │ 20. SELECT user        │
        │                        ├───────────────────────>│
        │                        │                        │
        │                        │ 21. Updated Profile    │
        │                        │<───────────────────────┤
        │ 22. Display Updated    │                        │
        │<───────────────────────┤                        │
        │                        │                        │
```

## 🔐 Security Flow

```
┌──────────────────────────────────────────────────────────────┐
│                     Request Arrives                           │
└────────────────────────┬─────────────────────────────────────┘
                         ↓
              ┌──────────────────────┐
              │ NextAuth Middleware  │
              │ Check session exists │
              └──────────┬───────────┘
                         ↓
              ┌──────────────────────┐
              │ Session valid?       │
              └──────────┬───────────┘
                         ↓
          ┌──────────────┴──────────────┐
          ↓ NO                           ↓ YES
┌─────────────────┐          ┌───────────────────────┐
│ Return 401      │          │ Extract user ID       │
│ Unauthorized    │          │ from session          │
└─────────────────┘          └───────────┬───────────┘
                                         ↓
                             ┌───────────────────────┐
                             │ Is admin endpoint?    │
                             └───────────┬───────────┘
                                         ↓
                          ┌──────────────┴──────────────┐
                          ↓ NO                          ↓ YES
              ┌───────────────────────┐    ┌────────────────────────┐
              │ User endpoint         │    │ Query admins table     │
              │ Verify user owns      │    │ WHERE userId = session │
              │ requested resource    │    └────────────┬───────────┘
              └───────────┬───────────┘                 ↓
                          ↓                  ┌────────────────────────┐
              ┌───────────────────────┐      │ Admin record exists?   │
              │ Authorized?           │      └────────────┬───────────┘
              └───────────┬───────────┘                   ↓
                          ↓              ┌────────────────┴──────────────┐
          ┌───────────────┴───────────┐  ↓ NO                            ↓ YES
          ↓ NO                         ↓ YES       ┌───────────┐    ┌──────────────┐
┌─────────────────┐      ┌────────────────────┐   │ Return 403│    │ Proceed with │
│ Return 403      │      │ Process request    │   │ Forbidden │    │ admin request│
│ Forbidden       │      │ Apply business     │   └───────────┘    └──────────────┘
└─────────────────┘      │ logic              │
                         │ Return response    │
                         └────────────────────┘
```

## 🗄️ Database Relationships

```
┌─────────────────────────────────────────────────────────────────┐
│                            users                                 │
├─────────────────────────────────────────────────────────────────┤
│ id (PK)                                                          │
│ email                                                            │
│ firstName                                                        │
│ lastName                                                         │
│ accountType                                                      │
│ doctorSpecialty []                                              │
│ ...                                                             │
└───────────────┬──────────────────────────────┬──────────────────┘
                │                              │
                │ One-to-Many                  │ One-to-Many
                │                              │
                ↓                              ↓
┌──────────────────────────────────┐  ┌──────────────────────────────────┐
│ user_profile_update_requests     │  │     userProfileLogs              │
├──────────────────────────────────┤  ├──────────────────────────────────┤
│ id (PK)                          │  │ id (PK)                          │
│ userId (FK → users.id)           │  │ userId (FK → users.id)           │
│ fieldName                        │  │ changedBy (FK → users.id)        │
│ currentValue                     │  │ fieldName                        │
│ requestedValue                   │  │ oldValue                         │
│ status                           │  │ newValue                         │
│ reviewedBy (FK → users.id)       │  │ changeReason                     │
│ reviewedByEmail                  │  │ createdAt                        │
│ reviewedByName                   │  │ ...                              │
│ reviewedAt                       │  └──────────────────────────────────┘
│ reviewNotes                      │           ↑
│ requestedAt                      │           │
│ createdAt                        │           │ Created on approval
│ updatedAt                        │           │
└──────────────────────────────────┘           │
                │                              │
                │ Many-to-One (reviewer)       │
                ↓                              │
┌──────────────────────────────────┐           │
│           admins                 │           │
├──────────────────────────────────┤           │
│ id (PK)                          │           │
│ userId (FK → users.id)           │───────────┘
│ ...                              │
└──────────────────────────────────┘
```

## 🎨 State Management Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      React Query Cache                            │
└────────────────────────────┬─────────────────────────────────────┘
                             ↓
         ┌───────────────────────────────────────────┐
         │  Query: ['profileUpdateRequests', userId] │
         │  - Fetches user's requests                │
         │  - Caches results                         │
         │  - Auto-refetches on invalidation         │
         └───────────────┬───────────────────────────┘
                         ↓
         ┌───────────────────────────────────────────┐
         │         Component State                    │
         │  ┌─────────────────────────────────────┐  │
         │  │ showModal: boolean                  │  │
         │  │ pendingChange: {                    │  │
         │  │   fieldName,                        │  │
         │  │   currentValue,                     │  │
         │  │   requestedValue                    │  │
         │  │ }                                   │  │
         │  └─────────────────────────────────────┘  │
         └───────────────┬───────────────────────────┘
                         ↓
         ┌───────────────────────────────────────────┐
         │      Derived State (useMemo)              │
         │  ┌─────────────────────────────────────┐  │
         │  │ hasPendingSpecialty: boolean        │  │
         │  │ hasPendingAccountType: boolean      │  │
         │  │ specialtyRequest: Request | null    │  │
         │  │ accountTypeRequest: Request | null  │  │
         │  └─────────────────────────────────────┘  │
         └───────────────┬───────────────────────────┘
                         ↓
         ┌───────────────────────────────────────────┐
         │          Mutations                         │
         │  ┌─────────────────────────────────────┐  │
         │  │ createRequest.mutate()              │  │
         │  │  - Optimistic update (optional)     │  │
         │  │  - API call                         │  │
         │  │  - On success: invalidateQueries()  │  │
         │  │  - On error: rollback + show toast  │  │
         │  └─────────────────────────────────────┘  │
         └───────────────────────────────────────────┘
```

---

**Legend:**
- `→` = Direct flow
- `↓` = Next step
- `├` = Branch/Fork
- `[Component]` = UI Component
- `{state}` = State object
- `PK` = Primary Key
- `FK` = Foreign Key