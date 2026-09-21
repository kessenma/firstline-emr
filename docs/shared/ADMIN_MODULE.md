# @fajr/shared/admin

Shared types, constants, and utilities for the admin dashboard across web and mobile.

## What's shared

### Entity types (`types.ts`)
User management: `AdminUser`, `AdminUserSummary`, `AdminUserDetail`, `ForgotPasswordUser`
Notifications: `CentralNotification`, `UserNotification`, `AdminNotification`
Clinical: `MedOrderItem`, `ConflictUser`, `CareTeamConflictItem`
Intake: `PatientIntakeConfig`
Missions: `MissionMember`, `MissionRequestRow`, `MissionOption`
Statistics: `UserCountStatistics`, `ActivityMetrics`, `SpecialtyBreakdownItem`, `StatisticsData`
Feedback: `FeedbackItem`, `FeedbackAttachment`, `SyncDiagnostics`
Storage: `StorageStats`, `StorageImage`
Profile: `ProfileUpdateRequest`, `ReviewAction`
Utilities: `PaginationParams`, `DateRange`

### Constants (`constants.ts`)
- `AdminSectionCategory` — 8 category strings
- `AdminSectionId` — 20 canonical section IDs (kebab-case)
- `ADMIN_SECTIONS` — section metadata array (id, title, subtitle, category)
- `ADMIN_CATEGORY_LABELS` / `ADMIN_CATEGORY_ORDER`
- `AdminPermission` enum
- `DEFAULT_PAGE_SIZE`, `DEFAULT_PAGE`
- `PROFILE_UPDATE_FIELD_LABELS`

### Utils (`utils.ts`)
- `buildQueryParams()` — URL query string builder
- `validatePagination()` — clamp page/limit to valid values
- `formatFullName()` — "First Last" with null handling
- `isValidEmail()` — basic email regex
- `isValidAdminSectionId()` — type guard
- `getSectionsByCategory()` — group sections by category

## What stays platform-specific

### Web only
- `SectionDefinition` — has `LucideIcon` + `React.ComponentType`
- `sections` array in `sectionRegistry.ts` — ties IDs to icons + components
- React Query response wrappers
- View model hooks (`use*ViewModel`)
- Inline `_id`-based types (CentralNotification, UserNotification, PatientIntake, ForgotPassword — legacy MongoDB IDs, will be migrated to `id` separately)

### Mobile only
- Response/request envelopes (in `types/admin.ts`) — `NewUsersResponse`, `MedOrdersResponse`, etc.
- `adminApi.ts` API client singleton
- `AdminContext.tsx` session management (re-exports `AdminPermission` from shared)
- `normalizeAdmin()` — snake_case-to-camelCase row mapper
- Section config in `AdminDashboardView.tsx` (uses camelCase IDs, different icon library)

## Platform extension pattern

Mobile uses `ExistingUserSummary` as an alias for `AdminUserSummary`:
```ts
// apps/mobile/src/types/admin.ts
import type { AdminUserSummary } from '@fajr/shared/admin';
export type ExistingUserSummary = AdminUserSummary;
```

Web keeps `SectionCategory` as a deprecated alias:
```ts
// apps/web/components/adminDashboard/sectionRegistry.ts
import type { AdminSectionCategory } from '@fajr/shared/admin';
export type SectionCategory = AdminSectionCategory;
```

## Section ID mapping

Web uses kebab-case (canonical), mobile uses camelCase. Not yet unified — mobile section IDs are defined locally in `AdminDashboardView.tsx`.

| Shared ID | Mobile ID |
|-----------|-----------|
| `create-user` | `createUser` |
| `new-signups` | `newSignups` |
| `existing-users` | `existing` |
| `denied-users` | `denied` |
| `profile-update-requests` | `profileUpdateRequests` |
| `admin-management` | `addAdmin` |
| `password-reset` | `pwReset` |
| `notifications` | `notifications` |
| `missions-management` | `missions` |
| `medical-orders` | `medOrder` |
| `statistics` | `statistics` |
| `clear-test-data` | `clearTestData` |
| `telegram-bot-settings` | `patientIntake` |
| `image-storage` | `imageStorage` |
| `analytics-dashboard` | `analytics` |
| `translation-service` | `translationService` |
| `user-feedback` | `userFeedback` |
| `powersync-service` | `powerSyncService` |
| `care-team-conflicts` | _(missing on mobile)_ |
| `mission-join-requests` | _(missing on mobile)_ |

## Web `_id` migration note

Several web view models still use `_id` (MongoDB legacy) instead of `id`:
- `CentralNotificationsViewModel.ts`
- `AdminUserNotificationsViewModel.ts`
- `PatientIntakeViewModel.ts`
- `ForgotPasswordViewModel.ts`
- `ExistingDoctorsTriageEvacViewModel.ts`

These can't use the shared types until the web API routes return `id`. This is tracked as separate tech debt.
