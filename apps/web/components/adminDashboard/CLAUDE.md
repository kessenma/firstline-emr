# Web Admin Dashboard

## Architecture

- **Entry point**: `AdminDashboardView.tsx` — wraps content in `ToastContext > QueryClientProvider > AdminConfigProvider`
- **Section registry**: `sectionRegistry.ts` — single source of truth for all sections (id, title, icon, category, component)
- **View modes**: Grid (card tiles → inline detail) and List (accordion). Both support search filtering
- **Shared types/constants**: Import from `@fajr/shared/admin` (`AdminSectionId`, `AdminSectionCategory`, `CATEGORY_LABELS`, `CATEGORY_ORDER`)

## Section Pattern

Every section follows the View + ViewModel pattern:

1. **View** (`sections/<name>/<Name>View.tsx`) — accepts `{ isDialog?: boolean }`, renders UI from ViewModel
2. **ViewModel** (`sections/<name>/<Name>ViewModel.ts`) — custom hook with React Query for data, mutations, and local state
3. **Registration** — add to `sections` array in `sectionRegistry.ts` with id, title, icon, category, and lazy component

## Adding a New Section

1. Create `sections/<name>/<Name>View.tsx` accepting `{ isDialog?: boolean }`
2. Create `sections/<name>/<Name>ViewModel.ts` using React Query + `useSession()` for auth
3. Register in `sectionRegistry.ts` — no layout changes needed
4. Add API routes under `app/api/admin/GET/` and/or `app/api/admin/POST/`
5. Add shared types to `packages/shared/src/admin/types.ts` if introducing new entities

## Contexts

- `AdminConfigContext` — passes server-side config (e.g. `analyticsPassphrase`) to sections
- `AdminSectionNavContext` — manages `activeSection` state for grid view navigation
- `SpecialtyDataContext` — shared React Query data for specialty statistics

## Conventions

- API routes: `app/api/admin/GET/<name>/route.ts` or `app/api/admin/POST/<name>/route.ts`
- All API routes verify admin session: `verifySessionFromRequest(request)` → check `session.isAdmin`
- Auth header: `Authorization: Bearer ${session?.user.token}`
- Toast feedback: `useToast()` → `setToast()` for user notifications
- Session expiry: views detect 401 responses and show `SessionExpiredModal`
- Categories: `userManagement`, `notifications`, `clinicalOperations`, `patientIntake`, `missions`, `analyticsStatistics`, `systemTools`, `feedback`

## Shared Components

- `shared/ExpandableSection.tsx` — accordion wrapper with animated height (list view)
- `shared/AdminSectionNav.tsx` — floating panel navigator grouped by category
- `shared/adminCreatedUsers.tsx` / `PendingAdminCreatedUsers.tsx` — reusable user tables
