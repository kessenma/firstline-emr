# Mobile Dark Mode Upgrade Checklist
Date: 03/18/2026
## Goals

- Migrate all screens and components to use dynamic `useThemeColors()` hook instead of hardcoded colors
- Switch to system-only theme (follow OS light/dark preference, remove manual ThemeSwitcher)
- Match the web app's approach: no user-facing theme toggle, just respect device settings
- Source of truth for colors: `packages/shared/src/theme/` via `apps/mobile/src/utils/colors.ts`

## References

- Color definitions: `apps/mobile/src/utils/colors.ts` (lightColors / darkColors)
- Theme creation: `apps/mobile/src/utils/theme.ts` (createTheme, spacing, borderRadius, typography)
- Theme provider: `apps/mobile/src/contexts/ThemeContext.tsx`
- Shared palette: `packages/shared/src/theme/palette.ts`
- Component patterns: `apps/mobile/docs/QUICK_START_THEMING.md`
- Web dark mode approach: `apps/web/app/ClientLayout.tsx` (system-only via `prefers-color-scheme`)
- Web theme guide: `apps/web/docs/THEME.md`

## Current State

- **Infrastructure**: DONE — ThemeContext, colors.ts, theme.ts, shared palette all wired up
- **Hooks available**: `useThemeColors()`, `useTheme()`, `useIsDarkMode()`
- **Screens migrated**: ~18% (9 of 49 screen files)
- **Components migrated**: ~46% (66 of 145 component files)
- **Manual ThemeSwitcher**: exists at `src/screens/settings/ThemeSwitcher.tsx`, rendered in `SettingsSheet.tsx` — to be removed

## Color Token Reference

Source: `apps/mobile/src/utils/colors.ts`

### Core Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `primary` | `palette.navy[600]` (#476CC9) | `brandColors.white` (#FFF9F4) | Main brand, buttons |
| `primaryLight` | `palette.navy[400]` | `palette.grey[300]` | Hover states |
| `primaryDark` | `palette.navy[800]` | `palette.grey[100]` | Pressed states |
| `secondary` | `palette.cello[600]` (#2880E8) | `palette.grey[400]` | Secondary actions |
| `accent` | `palette.orange[500]` (#FF5722) | `palette.grey[400]` | Highlights, icons |

### Backgrounds & Surfaces

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `background` | `brandColors.white` (#FFF9F4) | `#0A0A0A` | Root background |
| `backgroundSecondary` | `#F8F9FA` | `#1A1A1A` | Content area |
| `backgroundTertiary` | `palette.grey[50]` (#F7F7F7) | `#262626` | Nested sections |
| `surface` | `brandColors.white` (#FFF9F4) | `#0F0F0F` | Cards, sheets |
| `surfaceSecondary` | `palette.grey[50]` | `#1A1A1A` | Nested cards |
| `surfaceTertiary` | `palette.grey[100]` | `#262626` | Deeper nesting |

### Text

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `text` | `brandColors.black` (#040F32) | `brandColors.white` (#FFF9F4) | Primary text |
| `textSecondary` | `#666666` | `#A3A3A3` | Labels, subtitles |
| `textTertiary` | `palette.grey[500]` (#999999) | `#737373` | Placeholders |
| `textInverse` | `brandColors.white` | `brandColors.black` | Text on colored bg |

### Borders & Dividers

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `border` | `#E5E5E5` | `#262626` | Card borders, inputs |
| `borderLight` | `palette.grey[200]` | `#404040` | Subtle borders |
| `borderDark` | `palette.grey[300]` | `#525252` | Emphasized borders |
| `divider` | `palette.grey[200]` | `#262626` | Section dividers |

### Status Colors

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `success` | `palette.green[600]` (#00696C) | `palette.green[400]` (#339C9F) | Success states |
| `error` | `palette.red[500]` (#DA4248) | `#EF4444` | Error states |
| `warning` | `palette.orange[500]` (#FF5722) | `palette.orange[400]` (#FF6F37) | Warnings |
| `info` | `palette.cello[500]` (#3E9DF3) | `palette.cello[400]` (#62BBF8) | Info states |

### Tab Bar

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `tabBarBackground` | `brandColors.white` | `#0F0F0F` | Tab bar bg |
| `tabBarActive` | `palette.navy[700]` | `palette.blue[400]` | Active tab |
| `tabBarInactive` | `palette.navy[600]` | `palette.grey[600]` | Inactive tab |
| `tabBarIconActive` | `brandColors.white` | `brandColors.white` | Active icon |
| `tabBarIconInactive` | `palette.navy[600]` | `#A3A3A3` | Inactive icon |

### Shadows & Overlays

| Token | Light | Dark |
|-------|-------|------|
| `shadow` | `rgba(0,0,0,0.1)` | `rgba(0,0,0,0.8)` |
| `shadowMedium` | `rgba(0,0,0,0.15)` | `rgba(0,0,0,0.9)` |
| `overlay` | `rgba(0,0,0,0.5)` | `rgba(0,0,0,0.8)` |

---

## Phase 0: System-Only Theme

Remove the manual ThemeSwitcher and simplify ThemeContext to always follow the OS preference.

**Files to modify:**
- `apps/mobile/src/contexts/ThemeContext.tsx` — remove `setThemeMode`, `toggleTheme`, `setIsSystemTheme`, MMKV storage keys; always use `useColorScheme()` result
- `apps/mobile/src/screens/settings/SettingsSheet.tsx` — remove ThemeSwitcher import and rendering (line 17 import, line 224 render)

**Files to delete:**
- `apps/mobile/src/screens/settings/ThemeSwitcher.tsx`
- `apps/mobile/src/components/ThemeSwitcher.tsx` (if exists separately)

**Acceptance:** App follows device light/dark setting automatically. No manual theme UI anywhere.

Progress:
- [x] Simplify ThemeContext to system-only
- [x] Remove ThemeSwitcher from SettingsSheet
- [x] Delete ThemeSwitcher component file(s)
- [x] Remove MMKV theme storage keys

## Phase 1: Critical Screens — Signup & Onboarding

These screens are 80%+ hardcoded and will be completely broken in dark mode. Users cannot sign up or log in.

**Files to migrate:**
- `apps/mobile/src/screens/LoginScreen.tsx` — uses palette/brandColors directly
- `apps/mobile/src/screens/HomeScreen.tsx` — uses createTheme() directly, not hook
- `apps/mobile/src/screens/WaitingRoomScreen.tsx` — 20+ hardcoded colors (#F8F9FA, #FEF3C7, #F0FDF4, etc.)
- `apps/mobile/src/screens/signup/SignupScreen.tsx`
- `apps/mobile/src/screens/signup/SignupContext.tsx`
- `apps/mobile/src/screens/signup/CredentialsStep.tsx` — hardcoded `#fff`
- `apps/mobile/src/screens/signup/ProfileStep.tsx` — hardcoded `#1a1a2e`, `#fff`
- `apps/mobile/src/screens/signup/UserTypeStep.tsx` — hardcoded colors in conditionals
- `apps/mobile/src/screens/signup/LicenseUploadStep.tsx` — hardcoded colors
- `apps/mobile/src/screens/signup/TwoFactorSetupStep.tsx` — hardcoded `#fff`, `#ef4444`
- `apps/mobile/src/screens/signup/StepNavigationBar.tsx` — hardcoded `#fff`
- `apps/mobile/src/screens/signup/StepProgressBar.tsx` — multiple hardcoded colors
- `apps/mobile/src/screens/signup/TermsDrawer.tsx` — hardcoded `#1a1a2e`, `#fff`

**Acceptance:** Users can sign up, log in, and see the waiting room in both light and dark mode.

Progress:
- [x] LoginScreen.tsx — renders on AnimatedGradientBackground, intentionally dark-styled, works in both modes
- [x] HomeScreen.tsx — migrated from `createTheme('light')` to `useThemeColors()`
- [x] WaitingRoomScreen.tsx — replaced 20+ hardcoded colors with theme tokens
- [x] SignupScreen.tsx + SignupContext.tsx — renders on AnimatedGradientBackground, no color changes needed
- [x] CredentialsStep.tsx — renders on gradient, intentionally dark-styled
- [x] ProfileStep.tsx — renders on gradient, intentionally dark-styled
- [x] UserTypeStep.tsx — renders on gradient, intentionally dark-styled
- [x] LicenseUploadStep.tsx — renders on gradient, intentionally dark-styled
- [x] TwoFactorSetupStep.tsx — renders on gradient, intentionally dark-styled
- [x] StepNavigationBar.tsx — renders on gradient, intentionally dark-styled
- [x] StepProgressBar.tsx — renders on gradient, intentionally dark-styled
- [x] TermsDrawer.tsx — modal over gradient, intentionally dark-styled

## Phase 2: Core Navigation & Patient Dashboard

**Files to migrate:**
- `apps/mobile/src/screens/PatientDashboardScreenView.tsx`
- `apps/mobile/src/screens/PatientDetailScreenView.tsx`
- `apps/mobile/src/screens/PatientChartScreenView.tsx`
- `apps/mobile/src/components/MobilePatientDashboardTable.tsx`
- `apps/mobile/src/screens/CountryPickerSheet.tsx`
- `apps/mobile/src/screens/LanguagePickerSheet.tsx`
- `apps/mobile/src/screens/SpecialtyPickerSheet.tsx`

**Wrapper screens** (verify they pass context correctly):
- `apps/mobile/src/screens/PatientDashboardScreen.tsx`
- `apps/mobile/src/screens/PatientDetailScreen.tsx`
- `apps/mobile/src/screens/PatientChartScreen.tsx`
- `apps/mobile/src/screens/MessagesScreen.tsx`
- `apps/mobile/src/screens/ProfileScreen.tsx`
- `apps/mobile/src/screens/ThreadDetailScreen.tsx`

**Acceptance:** Patient dashboard, detail, and chart screens render correctly in both modes.

Progress:
- [x] PatientDashboardScreenView.tsx — migrated from `lightTheme.colors` to `useThemeColors()`
- [x] PatientDetailScreenView.tsx — migrated from `lightTheme.colors` to `useThemeColors()`
- [x] PatientChartScreenView.tsx — migrated from `lightTheme.colors` to `useThemeColors()`
- [x] MobilePatientDashboardTable.tsx — migrated from `lightTheme.colors` to `useThemeColors()`
- [x] Picker sheets (Country, Language, Specialty) — already clean, delegate to themed MultiSelectSheet
- [x] Verify wrapper screens — pass-through only, no colors

## Phase 3: Patient Chart Components

**Files to migrate:**
- `apps/mobile/src/components/patient-chart/PatientChartView.tsx`
- `apps/mobile/src/components/patient-chart/CareTeamSheet.tsx`
- `apps/mobile/src/components/patient-chart/SendPatientSheet.tsx`
- `apps/mobile/src/components/patient-chart/MissionUpdateSheet.tsx`
- `apps/mobile/src/components/patient-chart/NotificationSheetRouter.tsx`
- `apps/mobile/src/components/patient-chart/notes/ProcedureNoteForm.tsx`
- `apps/mobile/src/components/patient-chart/notes/SubjectiveNoteForm.tsx`
- `apps/mobile/src/components/patient-chart/notes/BlankNoteForm.tsx`

**Acceptance:** Full patient chart experience works in dark mode.

Progress:
- [x] PatientChartView.tsx — migrated ~30 hardcoded hex colors to `useThemeColors()`
- [x] CareTeamSheet.tsx — migrated ~15 hardcoded hex colors to `useThemeColors()`
- [x] SendPatientSheet.tsx — migrated ~15 hardcoded hex colors to `useThemeColors()`
- [ ] MissionUpdateSheet.tsx — file does not exist yet
- [ ] NotificationSheetRouter.tsx — file does not exist yet
- [ ] ProcedureNoteForm.tsx — file does not exist yet
- [ ] SubjectiveNoteForm.tsx — file does not exist yet
- [ ] BlankNoteForm.tsx — file does not exist yet

## Phase 4: UI & Form Components

**Files to migrate:**
- `apps/mobile/src/components/ui/AnimatedGradientBackground.tsx` — may be intentionally static
- `apps/mobile/src/components/ui/CircularProgress.tsx`
- `apps/mobile/src/components/ui/DownloadProgressBadge.tsx`
- `apps/mobile/src/components/ui/FullScreenMediaViewer.tsx`
- `apps/mobile/src/components/ui/InfiniteScroll.tsx`
- `apps/mobile/src/components/ui/Table.tsx`
- `apps/mobile/src/components/form/RadioCardField.tsx`

**Acceptance:** All base UI and form components adapt to theme.

Progress:
- [x] AnimatedGradientBackground.tsx — intentionally static (brand-colored blobs on dark bg), works in both modes
- [x] CircularProgress.tsx — takes color/trackColor as props, no internal hardcoding
- [x] DownloadProgressBadge.tsx — migrated badge colors to `useThemeColors()`
- [x] FullScreenMediaViewer.tsx — intentionally dark media viewer (white-on-black overlay), no migration needed
- [x] InfiniteScroll.tsx — no colors at all, already clean
- [x] Table.tsx — file does not exist
- [x] RadioCardField.tsx — wrapper only, RadioCardSelector already uses `useThemeColors()`

## Phase 5: Admin Dashboard

**Files to migrate:** 20+ admin section views with mixed adoption.

- `apps/mobile/src/components/admin/` — all section view files not yet using `useThemeColors()`
- Shared admin components: BulkActionBar, ConfirmDialog, EmptyState, ErrorState, LoadingState, UserCard

**Acceptance:** Admin dashboard fully functional in dark mode.

Progress:
- [x] Audit all admin section views — 29 partially-migrated files identified
- [x] Migrate remaining admin sections — all 29 files cleaned of residual hardcoded colors
- [x] Migrate shared admin components — AdminAccordion, AdminDashboardHeader/View, BulkActionBar, ConfirmDialog, EmptyState, ErrorState, UserCard

## Phase 6: Remaining Components

**Files to migrate:**
- `apps/mobile/src/components/ConnectionStatusOverlay.tsx`
- `apps/mobile/src/components/CreatePatientSheet.tsx`
- `apps/mobile/src/components/ErrorBoundary.tsx`
- `apps/mobile/src/components/ErrorCard.tsx`
- Any remaining components found during testing

**Acceptance:** No hardcoded colors remain in any component.

Progress:
- [x] ConnectionStatusOverlay.tsx — uses palette constants for gradient overlay, intentionally static, works in both modes
- [x] CreatePatientSheet.tsx — file does not exist
- [x] ErrorBoundary.tsx — class component refactored: extracted `ErrorBoundaryFallback` functional component with `useThemeColors()`
- [x] ErrorCard.tsx — migrated all 10 hardcoded colors to `useThemeColors()`
- [x] Final sweep for remaining hardcoded colors — 36 additional files cleaned across components/, screens/admin/, screens/user-profile/

## Phase 7: Cleanup & Verification

- [x] Run `pnpm --filter mobile check-types` — no new type errors (only pre-existing MissionFilterSection issue)
- [x] Grep for remaining hardcoded hex colors in StyleSheet blocks — all fixed
- [ ] Test every screen in light mode
- [ ] Test every screen in dark mode
- [ ] Test system theme switching (toggle device dark mode)
- [ ] Test on iOS simulator and physical device
- [x] Remove any dead theme-related code — ThemeSwitcher deleted, MMKV storage keys removed

---

## Migration Pattern

For each component, follow this pattern (see `apps/mobile/docs/QUICK_START_THEMING.md` for full guide):

```tsx
// 1. Add import
import { useThemeColors } from '../../contexts/ThemeContext';
import { spacing, borderRadius, typography } from '../../utils/theme';

// 2. Add hook at top of component
const colors = useThemeColors();

// 3. Move colors from StyleSheet to inline styles
<View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
  <Text style={[styles.title, { color: colors.text }]}>Title</Text>
</View>

// 4. Keep static styles (spacing, layout, typography) in StyleSheet
const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    // NO colors here
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    // NO colors here
  },
});
```

### Common Replacements

| Hardcoded | Replace with |
|-----------|-------------|
| `backgroundColor: '#FFFFFF'` | `backgroundColor: colors.surface` |
| `backgroundColor: '#F8F9FA'` | `backgroundColor: colors.backgroundSecondary` |
| `backgroundColor: '#f7f7f7'` | `backgroundColor: colors.surfaceSecondary` |
| `color: '#1A1A1A'` | `color: colors.text` |
| `color: '#666666'` or `color: '#666'` | `color: colors.textSecondary` |
| `color: '#999999'` | `color: colors.textTertiary` |
| `color: '#fff'` or `color: '#FFFFFF'` | `color: colors.textInverse` |
| `borderColor: '#E5E5E5'` | `borderColor: colors.border` |
| `backgroundColor: '#1a1a2e'` | `backgroundColor: colors.background` (dark) or use `colors.primary` |
| Icon `color="#F59E0B"` | Icon `color={colors.warning}` |
| Icon `color="#22C55E"` | Icon `color={colors.success}` |
| Icon `color="#007AFF"` | Icon `color={colors.info}` |

### Icons (lucide-react-native)

```tsx
// Before
<Check size={20} color="#22C55E" />

// After
<Check size={20} color={colors.success} />
```

## Notes

- Prefer `useThemeColors()` over `useTheme()` when you only need colors
- Use `useIsDarkMode()` for conditional dark-mode-only logic (rare)
- Don't import `lightTheme`/`darkTheme`/`lightColors`/`darkColors` directly in components
- Don't put colors in `StyleSheet.create()` — they must be inline for dynamic theming
- The `palette` object should only be used in `colors.ts`, not in components directly
- `AnimatedGradientBackground.tsx` may intentionally use static colors for visual effects — evaluate case by case
