# Admin Dashboard Theme Upgrade Checklist

## Goals
- Normalize styling across admin views using theme CSS variables and token classes.
- Centralize role/brand theming via `ThemeProvider` with admin/neutral fallbacks.
- Remove hard-coded colors; use `bg-card`, `text-foreground`, `bg-primary`, `bg-accent`, `border-border`.
- Keep charts and special cases using `useThemeTokens()` when raw values are required.

## References
- Theme variables and role/brand classes: `apps/web/styles/globals.css:305–401`
- Theme provider and token hook: `apps/web/components/ui/ThemeProvider.tsx:52–58`, `apps/web/components/ui/ThemeProvider.tsx:73–91`
- Admin dashboard tiles: `apps/web/components/adminDashboard/AdminDashboardView.tsx:54–66`
- Skeleton component: `apps/web/components/ui/skeleton.tsx`

## Phase 0: Baseline and Fallbacks
- Wrap `apps/web/app/admin/page.tsx` in `ThemeProvider`.
- Add `role-admin` and `brand-admin` in `styles/globals.css` that set `--primary` and `--accent` for neutral admin theme.
- Replace stacked loaders with `Skeleton` on the admin page.
- Acceptance: Admin views render under `ThemeProvider`; loading uses `Skeleton`.

## Phase 1: Common Layout and Containers
- Standardize each view to use `Card` layout: `bg-card`, `text-foreground`, `border-border`.
- Use consistent spacing: outer `container mx-auto px-4 py-8`, inner `space-y-6/8`.
- Normalize headers: `CardHeader`, `CardTitle`, `CardDescription`.
- Button tokens: `bg-primary text-primary-foreground`, `variant="secondary"` or `variant="outline"`.
- Acceptance: Views share a consistent card layout and spacing.

Progress (completed):
- `ExpandableSection.tsx` switched to tokenized `Card` container.
- `NewSignupsView.tsx` table colors normalized to tokens.
- `DeniedDoctorsTriageEvacView.tsx` table colors normalized to tokens.
  - Edits at: `apps/web/components/adminDashboard/sections/ExpandableSection.tsx`, `apps/web/components/adminDashboard/sections/NewSignupsView.tsx`, `apps/web/components/adminDashboard/sections/DeniedDoctorsTriageEvacView.tsx`.

## Phase 2: Color Token Normalization
- Replace raw color utilities (e.g., `bg-orange-900`, `text-dark-blue`, `bg-blue-50`) with token classes:
  - Surfaces: `bg-card`, `bg-background`
  - Text: `text-foreground`, `text-muted-foreground`
  - Accents: `bg-accent text-accent-foreground`
  - Primary: `bg-primary text-primary-foreground`
  - Borders: `border border-border`
- Acceptance: No hard-coded brand colors remain except semantic badges.

Progress (completed):
- Admin header/search normalized to tokens in `AdminDashboardView.tsx` (title, search icon, refresh button).
- Notifications views standardized:
  - `CentralNotificationsView.tsx`, `AdminUserNotificationsView.tsx` chips and loaders to tokens.
  - `AdminUserNotificationsTable.tsx`, `CentralNotificationsTable.tsx`, `PreviousNotificationsTable.tsx` tables to tokens.
- Existing users views normalized:
  - `ExistingDoctorsTriageEvacView.tsx` table, dialogs, loaders to tokens.
  - `UserEditLogsView.tsx` container, badges, borders, text to tokens.
- Admin management normalized:
  - `AdminManagementView.tsx` headers, inputs, table to tokens.
- Patient intake normalized:
  - `PatientIntakeView.tsx` text and info icons to tokens.
  - `telegram-example.tsx` link and header buttons to `text-primary`.
- Charts views headers/descriptions normalized:
  - `DoctorSpecialtySpreadView.tsx`, `PatientSpecialtySpreadView.tsx`, `SpecialtySpreadComparisonView.tsx`.
- Medical orders standardized:
  - `MedOrdersView.tsx` table, borders, loaders to tokens; separators use `border-border`.
- Misc dialogs and modals:
  - `MedicalLicenseModal.tsx` muted text and backgrounds to tokens.

## Phase 3: Tables and Lists
- Standardize table props in:
  - `NewSignupsView.tsx`, `DeniedDoctorsTriageEvacView.tsx`, `AdminUserNotificationsTable.tsx`, `CentralNotificationsTable.tsx`, `PreviousNotificationsTable.tsx`
- Normalize header, hover, sticky behaviors using token classes.
- Acceptance: All tables share uniform style.

Progress (completed):
- Header text uses `text-muted-foreground`; hover uses `bg-muted text-foreground`; sticky headers enabled.
- Updated files:
  - `apps/web/components/adminDashboard/sections/NewSignupsView.tsx`
  - `apps/web/components/adminDashboard/sections/DeniedDoctorsTriageEvacView.tsx`
  - `apps/web/components/adminDashboard/sections/notifications/AdminUserNotificationsTable.tsx`
  - `apps/web/components/adminDashboard/sections/notifications/CentralNotificationsTable.tsx`
  - `apps/web/components/adminDashboard/sections/notifications/PreviousNotificationsTable.tsx`
  - Mobile cards/borders normalized in `apps/web/components/ui/Table/MobileTable.tsx` (lists)

## Phase 4: Forms and Inputs
- Normalize inputs, labels, and buttons to tokens and consistent spacing.
- Acceptance: Forms match card layout and feel.

## Phase 5: Charts and Visualizations
- Use `useThemeTokens()` for libraries requiring raw values (e.g., Recharts fills/strokes):
  - `DoctorSpecialtySpreadView.tsx`, `PatientSpecialtySpreadView.tsx`, `SpecialtySpreadComparisonView.tsx`
- Acceptance: Chart colors are derived from theme tokens.

## Phase 6: Notifications and Badges
- Align badge variants with tokens:
  - default/info → `default`
  - destructive → `destructive`
  - accent badges → `bg-accent text-accent-foreground`
- Acceptance: Badge semantics consistent.

## Phase 7: Dashboard Entry Tiles
- Normalize tiles in `AdminDashboardView.tsx:54–66` to tokenized styles:
  - Replace `bg-*` and `text-*` raw colors with tokens; optionally use `bg-accent` for highlights.
- Acceptance: Entry tiles match overall theme.

## Phase 8: ThemeProvider Extensions
- Extend `ThemeProvider` to support:
  - Props: `mode` = `'user' | 'admin' | 'neutral'`
  - Overrides: `roleOverride`, `brandOverride`
  - Optional theme-preview accordion (reuse `ThemePreview`) for admin pages.
- Acceptance: Admin pages can enforce consistent theme regardless of session.

## Phase 9: Clean-Up and Verification
- Remove residual raw color utilities and consolidate wrappers.
- Run `npm run lint` and `npm run check-types`; fix issues in changed files.
- Acceptance: Clean lint/typecheck for updated modules.

## Views to Normalize (Scope)
- Entry and page:
  - `apps/web/app/admin/page.tsx`
  - `apps/web/components/adminDashboard/AdminDashboardView.tsx:54–66`
- Sections:
  - `AdminManagementView.tsx`
  - `ChangeAccountTypeView.tsx`
  - `DeniedDoctorsTriageEvacView.tsx`
  - `ForgotPasswordView.tsx`
  - `MedOrdersView.tsx`
  - `NewSignupsView.tsx`
  - `UserBreakdownView.tsx`
  - `ExpandableSection.tsx`
  - `ClearTestDataView.tsx`
  - `user-creation/AdminUserCreationContext.tsx`
  - `user-creation/AdminUserCreationView.tsx`
  - `staistics/views/DoctorSpecialtySpreadView.tsx`
  - `staistics/views/PatientSpecialtySpreadView.tsx`
  - `staistics/views/SpecialtySpreadComparisonView.tsx`
  - `staistics/views/StatisticsView.tsx`
  - `staistics/SpecialtySpreadComparisonViewWrapper.tsx`
  - `patient-intake/PatientIntakeView.tsx`
  - `patient-intake/telegram-example.tsx`
  - `notifications/AdminUserNotificationsTable.tsx`
  - `notifications/AdminUserNotificationsView.tsx`
  - `notifications/CentralNotificationsTable.tsx`
  - `notifications/CentralNotificationsView.tsx`
  - `notifications/PreviousNotificationsTable.tsx`
  - `notifications/AdminNotificationsViewModel.tsx`
  - `analytics/AnalyticsView.tsx`
  - `existing-users/ExistingDoctorsTriageEvacView.tsx`
  - `existing-users/UserEditLogsView.tsx`
  - `image-storage/ImageStorageView.tsx`

## Notes
- Prefer Tailwind token classes over raw colors for maintainability and dark-mode/role/brand adaptability.
- Use `useThemeTokens()` only when a library needs JS values; otherwise rely on classes.
