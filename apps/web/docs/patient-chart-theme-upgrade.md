# Patient Chart Theme Upgrade Checklist

## Goals
- Normalize styling across patient chart views using theme CSS variables and token classes.
- Centralize role/brand theming via `ThemeProvider` with doctor/evac/triage fallbacks.
- Remove hard-coded colors; use `bg-card`, `text-foreground`, `bg-primary`, `bg-accent`, `border-border`.
- Keep charts and special cases using `useThemeTokens()` when raw values are required.

## References
- Theme variables and role/brand classes: `apps/web/styles/globals.css:305–401`
- Theme provider and token hook: `apps/web/components/ui/ThemeProvider.tsx:52–58`, `apps/web/components/ui/ThemeProvider.tsx:73–91`
- ThemePreview component: `apps/web/components/ui/ThemePreview.tsx`
- Patient chart page: `apps/web/app/patient/[id]/page.tsx`

## Phase 0: Baseline and Fallbacks
- Wrap `apps/web/app/patient/[id]/page.tsx` in `ThemeProvider`.
- Add role-specific classes in `styles/globals.css` that set `--primary` and `--accent` for doctor/evac/triage themes.
- Replace stacked loaders with `Skeleton` on the patient page.
- Add `ThemePreview` component to patient chart page for theme testing.
- Acceptance: Patient chart renders under `ThemeProvider`; loading uses `Skeleton`; theme preview available.

Progress (completed):
- ✅ Wrapped `apps/web/app/patient/[id]/page.tsx` in `ThemeProvider`
- ✅ Added `ThemePreview` component to patient chart page for theme testing
- ⏳ Replace stacked loaders with `Skeleton` (existing StackedLoader still in use)

## Phase 1: Main Layout and Containers
- Standardize patient chart sections to use `Card` layout: `bg-card`, `text-foreground`, `border-border`.
- Use consistent spacing: outer `container mx-auto px-4 py-8`, inner `space-y-6/8`.
- Normalize section headers: consistent styling with token classes.
- Button tokens: `bg-primary text-primary-foreground`, `variant="secondary"` or `variant="outline"`.
- Acceptance: All sections share a consistent card layout and spacing.

Progress (completed):
- ✅ Updated `PatientViewModel.tsx` section containers from `bg-white` to `bg-card border border-border`
- ✅ Updated section headers to use theme tokens (`bg-card`, `text-primary`, `bg-primary`)
- ✅ Updated export button to use `bg-primary text-primary-foreground`
- ⏳ Need to update remaining buttons and form elements in other components

## Phase 2: Color Token Normalization
- Replace raw color utilities (e.g., `bg-orange-950`, `text-orange-500`, `bg-gray-50`, `text-white`) with token classes:
  - Surfaces: `bg-card`, `bg-background`
  - Text: `text-foreground`, `text-muted-foreground`
  - Accents: `bg-accent text-accent-foreground`
  - Primary: `bg-primary text-primary-foreground`
  - Borders: `border border-border`
- Acceptance: No hard-coded brand colors remain except semantic badges.

Progress (completed):
- ✅ `PatientViewModel.tsx`: 
  - Section headers: `bg-orange-50` → `bg-card border border-border`, `text-orange-500` → `text-primary`
  - Medications section: `bg-orange-950` → `bg-primary`, `text-white` → `text-primary-foreground`
  - Messaging section: `bg-dark-blue` → `bg-secondary`, `text-white` → `text-secondary-foreground`
  - Video section: `bg-orange-300` → `bg-accent`, `text-orange-950` → `text-accent-foreground`
  - Export dialog: `bg-orange-600` → `bg-primary`, `text-orange-700` → `text-primary`
  - Dialog elements: `text-gray-600` → `text-muted-foreground`, `border-gray-300` → `border-border`
- ⏳ `MedicationsView.tsx` backgrounds and text colors
- ⏳ `CombinedNotesView.tsx` backgrounds and text colors
- ⏳ `PatientInfoView.tsx` card backgrounds
- ✅ `ImageGallery.tsx` already partially normalized

## Phase 3: Component-Specific Theming
- Standardize form inputs, labels, and buttons within patient info to tokens and consistent spacing.
- Normalize medication order displays and prescription cards.
- Standardize note templates and previous notes views.
- Acceptance: All interactive components match card layout and feel.

Progress (completed):
- ✅ `PatientInfoView.tsx`: Updated card backgrounds from `bg-orange-50` to `bg-card`
- ✅ `MedicationsView.tsx`: 
  - Converted entire component from hard-coded orange theme to theme tokens
  - Loading state: `bg-orange-950 text-white` → `bg-primary text-primary-foreground`
  - Main container: `bg-orange-950` → `bg-primary`
  - Borders: `border-white` → `border-primary-foreground`
  - Text colors: `text-white` → `text-primary-foreground`
  - Buttons: `bg-white text-orange-950` → `bg-primary-foreground text-primary`
  - RadioCard items: `border-white bg-white text-orange-950` → `border-primary-foreground bg-primary-foreground text-primary`
  - Medication cards: `bg-gray-100` → `bg-muted`
  - Bottom section: `bg-orange-950` → `bg-primary`
- ⏳ `CombinedNotesView.tsx` note templates and previous notes views

## Phase 4: Messaging and Communication
- Normalize Telegram messages view styling to token classes.
- Standardize video call interface colors.
- Ensure media gallery components use consistent theming.
- Acceptance: Communication components are fully themed.

Progress (completed):
- ✅ `TelegramMessagesDoctorView.tsx`: Updated CircleLoader color from `#FF5722` to `hsl(var(--primary))`
- ✅ `TelegramMessagesView.tsx`: Updated error/warning colors to `text-destructive`, `text-muted-foreground`
- ✅ `VideoCallView.tsx`: Complete theme conversion from hard-coded orange colors:
  - Background: `bg-linear-to-b from-orange-300 to-white` → `bg-gradient-to-b from-accent to-background`
  - Titles: `text-orange-950` → `text-primary`
  - Descriptions: `text-orange-800` → `text-primary/80`
  - Schedule card: `text-orange-800` → `text-primary`
  - Link container: `bg-gray-100` → `bg-muted`
  - Video interface: `bg-white` → `bg-card`, `text-orange-900` → `text-primary`
- ✅ `VideoCallInterface.tsx`: Updated loading text and backgrounds:
  - Loading text: `text-gray-600` → `text-muted-foreground`
  - Container: `bg-gray-100` → `bg-muted`
  - Participant list: `bg-white` → `bg-card`, `text-orange-900` → `text-primary`, `text-gray-700` → `text-foreground`
- ✅ `ImageGallery.tsx` already partially normalized (from Phase 2)

## Phase 5: Export and Special Views
- Update export PDF styling to use theme tokens where possible.
- Ensure advanced export options use consistent theming.
- Acceptance: Export functionality maintains visual consistency.

Progress (completed):
- ✅ `ExportPatientChartView.tsx`: Updated PDF export styling for better print compatibility:
  - Section headers: `text-orange-700` → `text-gray-800` (removed brand color)
  - Header title: `text-dark-blue` → `text-gray-900` (neutral professional color)
  - Border styling: `border-gray-300` → `border-gray-400` (improved contrast for print)
  - Maintained readable text colors for PDF compatibility
- ✅ `AdvancedExportOptions.tsx`: Already using proper UI components with consistent theming

## Phase 6: ThemeProvider Extensions
- Extend `ThemeProvider` to support patient chart specific overrides if needed.
- Add patient role theming (doctor/evac/triage viewing patient data).
- Acceptance: Patient charts can enforce consistent theme based on viewer role.

Progress (completed):
- ✅ `ThemeProvider` already supports patient chart specific overrides with props:
  - `mode` prop for different contexts (user/admin/neutral)
  - `roleOverride` and `brandOverride` for custom theming
  - `showThemePreview` with role and dark mode options
  - Patient charts automatically adapt to viewer role (Doctor/Evac/Triage)

## Phase 7: Clean-Up and Verification
- Remove residual raw color utilities and consolidate wrappers.
- Run `npm run lint` and `npm run check-types`; fix issues in changed files.
- Acceptance: Clean lint/typecheck for updated modules.

Progress (completed):
- ✅ Ran `npm run lint`: No new linting errors introduced by theme changes
  - Found 11 existing warnings (mostly React hooks dependencies, unrelated to theme changes)
  - One warning about using `<img>` instead of Next.js `<Image />` (unrelated to theme changes)
- ✅ Ran `npm run check-types`: TypeScript compilation successful with no errors
- ✅ Theme changes did not introduce any new linting or type errors
- ⏳ Some remaining hard-coded colors may exist in unexamined components (CombinedNotesView.tsx, etc.)

## Views to Normalize (Scope)
- Main layout:
  - `apps/web/app/patient/[id]/page.tsx`
  - `apps/web/components/patient-chart/PatientViewModel.tsx`
- Patient info:
  - `apps/web/components/patient-chart/patient-info/PatientInfoView.tsx`
- Medications:
  - `apps/web/components/patient-chart/Medications/MedicationsView.tsx`
  - `apps/web/components/patient-chart/Medications/med/MedOrderView.tsx`
  - `apps/web/components/patient-chart/Medications/rx/RXOrderView.tsx`
  - `apps/web/components/patient-chart/Medications/rx/RxOrderDrawerView.tsx`
- Notes:
  - `apps/web/components/patient-chart/PatientNotes/CombinedNotesView.tsx`
  - `apps/web/components/patient-chart/PatientNotes/forms/ProcedureNoteView.tsx`
  - `apps/web/components/patient-chart/PatientNotes/forms/SubjectiveNoteView.tsx`
  - `apps/web/components/patient-chart/PatientNotes/forms/BlankNoteView.tsx`
  - `apps/web/components/patient-chart/PatientNotes/previous/PreviousNotesView.tsx`
- Media:
  - `apps/web/components/patient-chart/media-gallery/ImageGallery.tsx`
  - `apps/web/components/patient-chart/media-gallery/PatientImageGalleryView.tsx`
  - `apps/web/components/patient-chart/media-gallery/TelegramMessagesGalleryView.tsx`
- Communication:
  - `apps/web/components/patient-chart/telegram-messages/TelegramMessagesDoctorView.tsx`
  - `apps/web/components/patient-chart/telegram-messages/TelegramMessagesView.tsx`
  - `apps/web/components/patient-chart/videocall/VideoCallView.tsx`
  - `apps/web/components/patient-chart/videocall/VideoCallInterface.tsx`
- Export:
  - `apps/web/components/patient-chart/export/ExportPatientChartView.tsx`
  - `apps/web/components/patient-chart/export/AdvancedExportOptions.tsx`

## Notes
- Prefer Tailwind token classes over raw colors for maintainability and dark-mode/role/brand adaptability.
- Use `useThemeTokens()` only when a library needs JS values; otherwise rely on classes.
- Patient charts are viewed by doctors, evac, and triage users, so theming should adapt based on viewer role.
