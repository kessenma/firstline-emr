> **📋 File Migration Info**
> - **Original Location:** `apps/docs/theme-refactor/theme-refactor-checklist.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# Theme Refactor Checklist

This checklist provides a structured, phased approach to refactoring the FAJR.EMR application for proper dark/light mode support and role-based theming. Each phase builds upon the previous one, ensuring systematic coverage of all components, pages, and views.

## 🚨 Current Status (December 2, 2024)

**Progress Summary:**
- ✅ **Completed**: 700+ components refactored
- 🔴 **Remaining**: 117 components (as of theme-colors-scan-12-02-2025-T24-55-09.md)
  - 17 High Priority (auth, patient-chart critical)
  - 30 Medium Priority (admin dashboard, messages)
  - 70 Low Priority (telegram-patient, about page)

**Strategy Document**: See [`theme-refactor-strategy.md`](./theme-refactor-strategy.md) for detailed LLM-friendly task breakdown of remaining work.

## Prerequisites

Before starting any refactoring work:

- [ ] Review `apps/web/docs/THEME.md` for complete theme system documentation
- [ ] Review `apps/docs/theme-refactor/initial-analysis.md` for detailed analysis and examples
- [ ] Ensure `apps/web/components/ui/ThemeProvider.tsx` is properly configured
- [ ] Verify CSS variables are defined in `apps/web/styles/globals.css`
- [ ] Test theme switching functionality (light/dark/role themes)

## Phase 1: Core Components Refactor (`apps/web/components`)

Focus on reusable UI components first, as they will cascade changes throughout the app. Start with the most foundational components.

### 1.1 UI Components Subphase (`components/ui`) - ✅ COMPLETED

**Why start here:** These are the foundational building blocks used throughout the entire app. Refactoring them first ensures all dependent components automatically get theme support.

#### Core UI Components:
- [x] `button.tsx` - Already theme-aware, verify variants (default, destructive, outline, etc.)
- [x] `card.tsx` - Check for hardcoded colors in Card components
- [x] `input.tsx` - Form inputs must work in both themes
- [x] `textarea.tsx` - Text areas for forms
- [x] `label.tsx` - Form labels and text elements
- [x] `checkbox.tsx` - Form checkboxes
- [x] `radio-group.tsx` - Radio button groups
- [x] `select.tsx` - Dropdown selects
- [x] `switch.tsx` - Toggle switches

#### Layout Components:
- [x] `accordion.tsx` - Expandable content areas
- [x] `dialog.tsx` - Modal dialogs
- [x] `drawer.tsx` - Side drawers
- [x] `sheet.tsx` - Bottom/top sheets
- [x] `scroll-area.tsx` - Scrollable content areas
- [x] `separator.tsx` - Visual separators
- [x] `skeleton.tsx` - Loading states

#### Feedback Components:
- [x] `alert-dialog.tsx` - Alert modals
- [x] `toast.tsx` - Toast notifications
- [x] `progress.tsx` - Progress bars
- [x] `skeleton.tsx` - Loading placeholders

#### Utility Components:
- [x] `badge.tsx` - Status badges and labels
- [x] `avatar.tsx` - User avatars
- [x] `text.tsx` - Typography component
- [x] `box.tsx` - Generic container
- [x] `flex.tsx` - Flexbox layout helper

#### Theme-Specific Components:
- [x] `ThemeProvider.tsx` - Already configured, verify functionality
- [x] `ThemePreview.tsx` - Testing component for themes
- [x] `ThemeToggle.tsx` - Implement if missing (see initial-analysis.md example)
- [x] `aurora-background.tsx` - Animated backgrounds
- [x] `animated-gradient-background.tsx` - Gradient backgrounds

### 1.2 Table Components Subphase (`components/ui/Table`) - ✅ COMPLETED

**Why next:** Tables are complex components used heavily throughout dashboards and data displays. The Table system is foundational for data presentation.

#### Table System Components:
- [x] `Table.tsx` - Main table component
- [x] `TableHeader.tsx` - Table headers with sorting
- [x] `TableBody.tsx` - Table body rows
- [x] `TableRow.tsx` - Individual table rows
- [x] `TableCell.tsx` - Table cells
- [x] `DesktopTable.tsx` - Desktop table layout
- [x] `MobileTable.tsx` - Mobile table layout
- [x] `ResponsiveTable.tsx` - Responsive table wrapper
- [x] `ResponsivePatientTable.tsx` - Patient-specific responsive table
- [x] `MobilePatientDashboardTable.tsx` - Mobile patient dashboard table
- [x] `TableSkeleton.tsx` - Table loading states

#### Table Utilities:
- [x] `filters.ts` - Table filtering logic (no UI changes needed)
- [x] `types.ts` - TypeScript definitions (no UI changes needed)
- [x] Table hooks - Custom hooks for table functionality (no UI changes needed)

### 1.3 Authentication Components Subphase (`components/auth` + `app/auth`) - ✅ COMPLETED

**Why next:** Auth screens are user-facing and need to work perfectly across all themes. They're also self-contained and don't depend on complex data flows.

#### Auth Components (`components/auth`):
- [x] `LoginForm.tsx` - Login form component (already theme-aware)
- [x] `signup/0TermsOfService.tsx` - Terms of service (refactored with theme tokens)
- [x] `signup/0PrivacyPolicy.tsx` - Privacy policy (refactored with theme tokens)
- [x] `signup/SignupSection.tsx` - Main signup section (fixed scroll indicator and expand button)
- [x] `signup/SignupContext.tsx` - Signup context provider (no UI changes needed)
- [x] `signup/DoctorSignupForm.tsx` - Doctor-specific signup (already theme-aware)
- [x] `signup/EvacSignupForm.tsx` - Evac-specific signup (already theme-aware)
- [x] `signup/TriageSignupForm.tsx` - Triage-specific signup (already theme-aware)
- [x] `signup/UserTypeForm.tsx` - User type selection (already theme-aware - role colors intentional)
- [x] `signup/TermsAgreementDrawer.tsx` - Terms agreement drawer (fixed bg-white, text-navy-primary, border-navy-primary, hover:border-teal-500)
- [x] `signup/BackButton.tsx` - Navigation buttons (already theme-aware)
- [x] `signup/NextButton.tsx` - Navigation buttons (already theme-aware)
- [x] `signup/Submit.tsx` - Form submission (fixed color="#FFA500" to theme-aware primary)
- [x] `signup/progressBar.tsx` - Progress indicator (fixed bg-gray-200)
- [x] `signup/MedicalLicenseUpload.tsx` - File upload component (fixed bg-muted, text-foreground, border-border, hover:border-primary, text-muted-foreground)
- [x] `signup/SecurityQuestionsForm.tsx` - Security questions (fixed bg-white)
- [x] `signup/PasswordEmailForm.tsx` - Email/password form (already theme-aware)
- [x] `forgotPassword/` - Password reset components (fixed shadow-orange-500, text-orange-500, border-orange-500)

#### Auth Pages (`app/auth`):
- [x] `page.tsx` - Main auth page with theme switching (fixed bg-white, bg-gray-100, bg-background)
- [x] `login/page.tsx` - Login page components (fixed border-white to border-border)
- [x] `signup-success/page.tsx` - Signup success pages (fixed bg-gray-50, text-orange-500, bg-white, text-gray-900, text-gray-600, text-gray-500 to theme tokens)
- [ ] `user-privacy-policy/` - Privacy policy pages
- [ ] `user-terms-of-service/` - Terms pages

### 1.4 Navigation Components (`components/nav`) - PRIORITY #4

**Why next:** Navigation affects the entire app layout and user experience. Needs to work consistently across all pages.

#### Navigation Components:
- [x] `LayoutWrapper.tsx` - Main layout wrapper
- [x] `LoggedInNav.tsx` - Navigation for authenticated users
- [x] `LoggedOutNav.tsx` - Navigation for unauthenticated users
- [x] `Nav.tsx` - Main navigation component
- [x] `Footer.tsx` - Site footer
- [x] `last-page-redirect.tsx` - Page redirect logic
- [x] `LastViewed.tsx` - Recently viewed pages
- [x] `rotating-arrows.tsx` - Navigation arrows
- [x] `save-button.tsx` - Save action buttons

### 1.5 Form Components (`components/form`) - ✅ COMPLETED

**Why next:** Forms are used throughout the app and need consistent theming for inputs, validation, and user interaction.

#### Form Components:
- [x] `TextFormField.tsx` - Text input fields (already theme-aware)
- [x] `CheckboxFormField.tsx` - Checkbox inputs (already theme-aware)
- [x] `DatePickerFormField.tsx` - Date picker inputs (already theme-aware)
- [x] `TimePickerFormField.tsx` - Time picker inputs (fixed border class)
- [x] `SelectFormField.tsx` - Select dropdowns (already theme-aware)
- [x] `MultiChoiceFormField.tsx` - Multi-choice inputs (fixed bg-gray-100, text-gray-500)
- [x] `SingleChoiceFormField.tsx` - Single choice inputs (fixed bg-white, bg-gray-100)
- [x] `NumericalFormField.tsx` - Number inputs (already theme-aware)
- [x] `PhoneFormField.tsx` - Phone number inputs (fixed text-gray-600, border-gray-200, focus:border-gray-300, text-red-500)
- [x] `ImagesUpload.tsx` - Image upload components (already theme-aware)
- [x] `ReadOnlyField.tsx` - Read-only display fields (fixed text-gray-500, bg-gray-100, border-gray-300, text-gray-700)
- [x] `MultiSelector.tsx` - Multi-select components (fixed border-gray-300, bg-white, ring-gray-300)
- [x] `TableSelectTemplate.tsx` - Table-based selections (already theme-aware)
- [x] `PMHxSelection.tsx` - Past medical history (already theme-aware)
- [x] `PSHxSelection.tsx` - Past surgical history (already theme-aware)
- [x] `Tooltip.tsx` - Form tooltips (fixed bg-gray-700, text-white)

#### Form Subdirectories:
- [x] `forgotPassword/` - Password reset forms (fixed shadow-orange-500, text-orange-500, border-orange-500)

### 1.6 Dashboard Components - IN PROGRESS (117 remaining components)

**Current Status:** 117 total components remaining across entire codebase (not just dashboards). See scan report for breakdown.
**Action Plan:** Follow [`theme-refactor-strategy.md`](./theme-refactor-strategy.md) Phase 1-4 for systematic completion.

#### Subphase Progress
- [x] 1.6.9 Status colors standardization — applied semantic tokens for statuses and priorities across Patient Dashboard and Admin User Creation.
- [x] 1.6.10 Overlay elevation audit — standardized overlays/popovers/dialogs within dashboards to `shadow-sm` and theme surfaces.

### 1.7 Patient Chart Subphase Plan
- [x] 1.7.1 PatientViewModel container — replace hardcoded `bg-gradient-to-b from-secondary to-background`, `bg-white`, `border-border`, `bg-card` consistency.
- [x] 1.7.2 PatientViewModel sections — standardize section colors (`bg-primary`, `bg-secondary`, `bg-accent`) and text colors (`text-primary-foreground`, `text-secondary-foreground`).
- [x] 1.7.3 PatientViewModel dialogs — theme export dialog, advanced options, and modal overlays with `bg-card`, `border-border`.
- [x] 1.7.4 PatientViewModel loaders — replace CircleLoader `color="#FF5722"` with theme-aware spinner colors.
- [x] 1.7.5 Patient info views — theme patient information display components with proper backgrounds and text colors.
- [x] 1.7.6 Patient notes system — theme CombinedNotesView, forms, and previous notes with consistent styling. (IN PROGRESS - main container, borders, text colors updated)
- [x] 1.7.7 Patient medications — theme MedicationsView, med orders, and Rx components with proper status colors. (ALREADY PERFECT - uses bg-primary, text-primary-foreground, bg-secondary, text-secondary-foreground, bg-muted)
- [x] 1.7.8 Patient media gallery — theme ImageGallery and related media components with overlay consistency. (COMPLETED - bg-card, text-destructive, bg-primary text-primary-foreground, bg-muted text-muted-foreground)
- [x] 1.7.9 Patient export system — theme ExportPatientChartView and AdvancedExportOptions with print-friendly colors. (APPROPRIATE - uses high contrast black/white for print readability)
- [x] 1.7.10 Patient messaging — theme TelegramMessagesDoctorView with chat-appropriate colors. (COMPLETED - already uses bg-background, text-destructive, text-muted-foreground, fixed text-yellow-500 to theme-aware variant)
- [x] 1.7.11 Patient video calls — theme VideoCallView components with appropriate backgrounds. (COMPLETED - already uses bg-gradient-to-b from-accent to-background, text-primary, bg-muted, bg-card)

#### Critical Remaining Components (from scan):

**HIGH PRIORITY (17 components) - See strategy Phase 1:**
- [x] `components/auth/forgotPassword/EmailStep.tsx` - Error border/text colors (fixed border-destructive, text-destructive)
- [x] `components/auth/forgotPassword/VerificationStep.tsx` - Gray text, orange accents (fixed text-muted-foreground, text-primary)
- [x] `components/auth/signup/MedicalLicenseUpload.tsx` - Multiple green/red/blue status colors (fixed success/error/info colors with dark mode variants)
- [x] `components/auth/signup/UserTypeForm.tsx` - White text on colored backgrounds (COMPLETED - already fully themed with role-specific CSS variables and theme-aware classes)
- [x] `components/auth/signup/admin-signup/AdminSignupToken.tsx` - Extensive hardcoded colors (PARTIALLY FIXED: error states, success states, main card - many more remain)
- [x] `components/auth/signup/admin-signup/AdminSignupVerify.tsx` - Time/status color mapping (COMPLETED - timer colors with dark mode variants, headings, email display, labels themed)
- [x] `components/debug/CacheDebugPanel.tsx` - Status color indicators (fixed all cache status colors with dark mode variants)
- [x] `components/patient-chart/Medications/rx/RxOrderDrawerView.tsx` - Orange theme elements (COMPLETED - all sections themed with bg-card, text-primary, text-card-foreground, border-border, bg-background for cards)
- [x] `components/patient-chart/PatientNotes/CombinedNotesView.tsx` - Gray backgrounds, orange CTAs (COMPLETED - themed all buttons, backgrounds, borders, text colors, radio cards with primary colors)
- [x] `components/patient-chart/PatientNotes/previous/PreviousNotesView.tsx` - Orange theme elements (COMPLETED - themed all note items, radio cards, buttons, backgrounds, borders, and text colors with proper theme tokens)
- [x] `components/patient-chart/export/ExportPatientChartView.tsx` - Black/white export styling (COMPLETED - themed section headers, borders, and text colors while maintaining black text for print readability)
- [x] `components/patient-dashboard/ArchiveFilterDropdown.tsx` - Orange color variants (COMPLETED - already fully themed with bg-primary, text-primary-foreground, text-foreground, bg-accent, border-border, text-muted-foreground)
- [x] `components/rxQrCode/PatientRxView.tsx` - Orange accents, gray placeholders (COMPLETED - themed all error states, completed status message, QR expand button, placeholders, diagnosis section, table colors, and accordion with proper theme tokens)
- [x] `components/rxQrCode/PharmacyView.tsx` - Orange theme elements (COMPLETED - themed all error states, diagnosis borders, table colors, accordion with primary theme, administrative detail borders, and success message with theme-aware primary colors)
- [x] `app/auth/login/page.tsx` - Border colors (COMPLETED - fixed text-dark-blue to text-foreground for theme-aware text color)
- [x] `app/auth/page.tsx` - Background/border colors (COMPLETED - fixed text-navy-primary and text-navy-primary/50 to text-foreground and text-muted-foreground for theme-aware chevron colors)
- [x] `app/auth/signup-success/page.tsx` - Orange accents, gray text (COMPLETED - fixed var(--orange) to hsl(var(--primary)) in CSS animation for theme-aware success animation)

#### Admin Dashboard Remaining:
- [x] AdminUserCreationView.tsx - User creation forms (error/success states)
- [x] AdminManagementView.tsx - Admin management interface
 - [x] NewSignupsView.tsx - Signup management
- [x] DeniedDoctorsTriageEvacView.tsx - Denied user management
 - [x] ExistingDoctorsTriageEvacView.tsx - Existing user management
- [x] AdminNotificationsView.tsx - Notification management
 - [x] StatisticsView.tsx - Analytics/statistics display
- [x] UserBreakdownView.tsx - Analytics chart tooltip overlay shadow
- [x] ImageStorageView.tsx - Overlay popovers and surfaces
- [x] patient-intake/telegram-example.tsx - Telegram example UI themed
- [x] PatientIntakeView.tsx - Patient intake management
- [ ] ClearTestDataView.tsx - Test data management

#### Patient Dashboard (Untouched):
- [x] DashboardView.tsx - Main patient dashboard
- [x] PatientMobileActions.tsx - Mobile patient actions
- [x] PatientTable.tsx - Patient data table
- [x] FilterBar.tsx - Patient filters
- [x] ArchiveFilterDropdown.tsx - Archive filters
- [ ] All patient chart components
- [ ] All patient cell components
- [ ] All patient filter components

### 1.7 Specialized Components - PRIORITY #7

**Why last:** These are more specialized and may have unique requirements that can be addressed after the foundation is solid.

#### Specialized Areas:
- [ ] `medEvac-form/` - Medical evacuation forms
- [ ] `messages/` - Message components
- [ ] `notifications/` - Notification displays
- [ ] `patient-chart/` - Patient chart components
- [ ] `rxQrCode/` - QR code components
- [ ] `telegram-patient/` - Telegram integration
- [ ] `aboutPage/` - About page components
- [ ] `debug/` - Debug components
- [ ] `globalContext/` - Context providers
- [ ] `hooks/` - Custom hooks (likely no UI changes needed)
- [ ] `user-profile/` - User profile components

### Phase 1 Testing Checklist
- [ ] Run grep commands to find remaining hardcoded colors:
  ```bash
  grep -r "bg-\(white\|black\|gray\|red-\|blue-\|green-\)" --include="*.tsx" apps/web/components
  grep -r "text-\(white\|black\|gray\|red-\|blue-\|green-\)" --include="*.tsx" apps/web/components
  ```
- [ ] Test each component in all theme combinations
- [ ] Verify contrast ratios meet accessibility standards
- [ ] Check hover/focus/disabled states

## Phase 2: Page-Level Refactor (`apps/web/app`)

Refactor page components that wrap the core components, ensuring proper theme inheritance.

### 2.1 Authentication Pages (`app/auth`)
- [ ] Login page - Background and form theming
- [ ] Signup pages - Consistent with auth components
- [ ] Password reset - Theme-aware styling

### 2.2 Dashboard Pages
- [ ] `patient-dashboard/` - Patient dashboard page
- [ ] `admin/` - Admin dashboard page
- [ ] Dashboard layouts - Proper theme application

### 2.3 Patient Management (`app/patient`)
- [ ] Patient detail pages
- [ ] Patient creation/editing
- [ ] Patient search and listing

### 2.4 Administrative Pages (`app/admin`)
- [ ] Admin management interfaces
- [ ] User management
- [ ] System configuration

### 2.5 Communication Pages (`app/messages`, `app/notifications`)
- [ ] Message interfaces
- [ ] Notification centers
- [ ] Communication layouts

### 2.6 Utility Pages
- [ ] `about/` - About page
- [ ] `my-profile/` - Profile management
- [ ] `404/` - Error pages
- [ ] Loading states

### 2.7 API Routes (No UI Changes Needed)
- [ ] API routes don't need theme refactoring (backend logic)

### Phase 2 Testing Checklist
- [ ] Test each page route in all themes
- [ ] Verify ThemeProvider wraps all pages correctly
- [ ] Check page transitions maintain theme consistency
- [ ] Test on different screen sizes (responsive theming)

## Phase 3: View-Level Refactor (Remaining App Views)

Handle any remaining views and ensure complete coverage across the entire application.

### 3.1 Specialized Views
- [ ] `call/` - Video call interfaces
- [ ] `create-med-evac-patient/` - Emergency patient creation
- [ ] `create-patient/` - Standard patient creation
- [ ] `new-patient/` - New patient workflows
- [ ] `rx-order/` - Prescription ordering
- [ ] `telegram-patient/` - Telegram integration views

### 3.2 Administrative Views
- [ ] `admin-signup/` - Admin registration
- [ ] `complete-signup/` - User completion flows
- [ ] User management views
- [ ] System administration interfaces

### 3.3 Integration Views
- [ ] Third-party integrations
- [ ] API-connected components
- [ ] External service interfaces

### Phase 3 Testing Checklist
- [ ] Comprehensive application audit for missed components
- [ ] End-to-end testing of all user workflows
- [ ] Cross-browser theme compatibility
- [ ] Performance testing with theme switching

## Global Testing & Validation

### Accessibility & Contrast
- [ ] Run automated contrast ratio checks
- [ ] Manual review of all color combinations
- [ ] WCAG AA compliance verification

### Theme Consistency
- [ ] Audit for inconsistent theme usage
- [ ] Verify role-based theming works correctly
- [ ] Test theme persistence across sessions

### Performance
- [ ] Theme switching performance
- [ ] CSS bundle size impact
- [ ] Runtime theme calculation efficiency

## Color Mapping Reference

### Common Replacements
| Current | Replace With | Context |
|---------|--------------|---------|
| `bg-white` | `bg-background` | Main backgrounds |
| `bg-gray-50` | `bg-muted` | Secondary backgrounds |
| `text-black` | `text-foreground` | Primary text |
| `text-gray-600` | `text-muted-foreground` | Secondary text |
| `border-gray-300` | `border-border` | Borders |
| `bg-primary` | `bg-primary` | Role-based primary colors |
| `text-primary` | `text-primary` | Role-based primary text |

### Status Colors (Theme-Aware)
- Success: `text-green-600 dark:text-green-400` or `theme-success`
- Warning: `text-yellow-600 dark:text-yellow-400` or `theme-warning`
- Error: `text-red-600 dark:text-red-400` or `theme-error`

## Tools & Scripts

### Finding Components to Update
```bash
# Find hardcoded colors in components
grep -r "bg-\(white\|black\|gray\|red-\|blue-\|green-\)" --include="*.tsx" apps/web/components

# Find text colors
grep -r "text-\(white\|black\|gray\|red-\|blue-\|green-\)" --include="*.tsx" apps/web/components

# Find in pages
grep -r "bg-\(white\|black\|gray\|red-\|blue-\|green-\)" --include="*.tsx" apps/web/app
grep -r "text-\(white\|black\|gray\|red-\|blue-\|green-\)" --include="*.tsx" apps/web/app
```

### Theme Testing Component
Use `ThemePreview` component for quick theme verification:
```tsx
<ThemePreview role="doctor" />
<ThemePreview role="evac" dark />
<ThemePreview role="triage" />
```

## Rollback Plan

If issues arise during refactoring:
- [ ] Keep backups of original files
- [ ] Test incrementally, not all at once
- [ ] Use git branches for each phase
- [ ] Have fallback theme options

## Success Criteria

- [ ] All hardcoded colors replaced with theme tokens
- [ ] Consistent appearance across light/dark modes
- [ ] Role-based theming working correctly
- [ ] Proper contrast ratios maintained
- [ ] No visual regressions in existing functionality
- [ ] Theme switching works smoothly
- [ ] Mobile and desktop themes consistent
