# `@fajr/shared/user` — Implementation Guide

Shared profile, settings, and credential types for web and mobile.

## What's Shared

| Export | Description |
|--------|-------------|
| `ProfileFormValuesBase` | 11 core profile fields (extend per-platform) |
| `PasskeyCredentialDisplay` | Passkey as shown in profile UI |
| `MedicalLicenseRecord` | Base license fields |
| `MedicalLicenseStored` | Mobile: stored record with file metadata + status |
| `MedicalLicenseView` | Web: API response with signed URL |
| `PhotoUploadResult` | Upload result shape |
| `ThemeMode` | `'light' \| 'dark' \| 'system'` |
| `PatientChartViewMode` | `'tabs' \| 'dashboard'` |
| `UserSettingsBase` | Shared settings shape |
| `validateProfileBase()` | Pure TS profile validation |
| `isValidThemeMode()` | Type guard |
| `isValidPatientChartView()` | Type guard |
| Constants | `DEFAULT_THEME_MODE`, `THEME_MODE_VALUES`, `PROFILE_CONSTRAINTS`, etc. |

## Duplications Resolved

| Type | Was in Mobile | Was in Web |
|------|---------------|------------|
| `ProfileFormValues` | `useProfileViewModel.ts` (inline) | `viewModel/schema.ts` (Zod) |
| `PasskeyCredential` | `types.ts` (5 fields) | `viewModel/types.ts` (6 fields) |
| `MedicalLicense` | `types.ts` (stored record) | `viewModel/types.ts` (signed URL) |
| `ThemeMode` | inline union | `UserSettingsViewModel.ts` (inline) |
| `PatientChartViewMode` | `usePatientChartViewPreference.ts` | (used on web but not typed) |

## Platform Extensions

**Mobile** extends `ProfileFormValuesBase` with:
```ts
interface ProfileFormValues extends ProfileFormValuesBase {
  city?: string;
  isAdmin?: boolean;
  googleId?: string;
  googleEmail?: string;
  googleImage?: string;
}
```

**Web** extends via Zod schema with:
```ts
// missions field added to the Zod schema
const userProfileSchema = z.object({
  ...baseFields,
  missions: z.array(z.string()).nullable().optional(),
});
```

## Design Decisions

- **Single module** — not split into `user` + `user-utils`. Scope is small. Split later if utils grow.
- **AccountType/Gender stay in `@fajr/shared/patient`** — already imported widely. Re-exported from `@fajr/shared/user` for convenience.
- **MedicalLicense uses base + platform variants** — mobile has stored-record shape (with `fileUrl`, `status`), web has signed-URL shape. Base captures the intersection.
- **Pure TS validation** — no Zod dependency in shared. Each platform keeps its own Zod schema / form hooks.

## Zod Version Situation

- Mobile declares `zod@^3.25.0` but **never imports Zod** in `apps/mobile/src/`
- Web declares `zod@^4.3.6`, imports via `from "zod/v3"` (compat) and `from "zod"` (v4)
- Root override enforces `zod@^4.1.12` monorepo-wide
- Zod v4 ships with `zod/v3` compat — both import styles work

### Upgrading mobile's declared version

1. In `apps/mobile/package.json`, change `"zod": "^3.25.0"` to `"zod": "^4.3.6"`
2. Run `pnpm install` from root
3. That's it — no source imports to update
4. Vendored `react-native-executorch` already uses `from 'zod/v4'` — continues to work

### When mobile needs Zod

Import from `zod/v3` (the compat path web already uses) for the v3 API, or `zod` directly for v4. Both resolve to the same installed package.

## Migration Checklist

### Mobile
- [ ] `apps/mobile/src/screens/user-profile/types.ts` — re-export from `@fajr/shared/user`
- [ ] `apps/mobile/src/screens/user-profile/useProfileViewModel.ts` — import `ProfileFormValuesBase`, extend locally
- [ ] `apps/mobile/src/hooks/usePatientChartViewPreference.ts` — import `PatientChartViewMode` from shared

### Web
- [ ] `apps/web/components/user-profile/viewModel/types.ts` — import `PasskeyCredentialDisplay`, `MedicalLicenseView`
- [ ] `apps/web/components/user-profile/settings/UserSettingsViewModel.ts` — import `ThemeMode`
- [ ] `apps/web/components/user-profile/settings/view/types.tsx` — import shared types

## Verification

1. `cd packages/shared && npx tsc --noEmit` — shared module compiles
2. `cd apps/web && pnpm build` — web builds with new imports
3. `cd apps/mobile && npx rspack build` or run app — mobile resolves `@fajr/shared/user`
4. Grep for old local type definitions to confirm they're replaced
5. Run profile screen on both platforms — edit/save cycle works
