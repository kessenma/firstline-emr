# @fajr/shared

Shared TypeScript code used by both `apps/web` (Next.js) and `apps/mobile` (React Native). Uses direct source imports — no build step required.

## Modules

| Import | What's in it |
|---|---|
| `@fajr/shared/constants` | Domain reference data: doctor specialties, languages (8 locales), countries (8 locales), country codes |
| `@fajr/shared/care-team` | Care team roles, labels, descriptions, badge colors, `getRolesForAccountType()`, `isLeadRole()` |
| `@fajr/shared/patient` | Enums (status, priority, gender, account type, baseline-ambu), note content types + type guards, entity types (CareTeamMember, Medication, RxOrder, MedOrder) |
| `@fajr/shared/patient-utils` | Pure formatting helpers, note validation/preview/templates, status/priority color maps |
| `@fajr/shared/field-mapping` | `camelToSnake`/`snakeToCamel` case conversion + object key converters |
| `@fajr/shared/theme` | Color palette, design tokens |
| `@fajr/shared/2fa` | Two-factor auth types and constants |
| `@fajr/shared/signup` | Signup form types, validation, step config (re-exports constants from `@fajr/shared/constants`) |
| `@fajr/shared/user` | Profile types (`ProfileFormValuesBase`), settings types (`ThemeMode`, `PatientChartViewMode`), credential types (`PasskeyCredentialDisplay`, `MedicalLicense*`), validation, constants |
| `@fajr/shared/legal-content` | Terms of service, privacy policy content |
| `@fajr/shared/admin` | Admin dashboard entity types, section registry (categories, IDs, metadata), permissions enum, pagination/query utils |

## Usage

```ts
// Import from specific modules — NOT from the root
import { CareTeamRole, ROLE_LABELS, getRolesForAccountType } from '@fajr/shared/care-team';
import { PatientStatus, PATIENT_PRIORITY_VALUES, sortByPriority } from '@fajr/shared/patient';
import { formatDate, getInitials, isNotePublishable } from '@fajr/shared/patient-utils';
import { DoctorSpecialtyList, LanguagesList, CountriesList } from '@fajr/shared/constants';
import { camelToSnake, keysToCamelCase } from '@fajr/shared/field-mapping';
```

## Adding a new module

1. Create `packages/shared/src/<module-name>/index.ts` with barrel exports
2. Add `"./<module-name>": "./src/<module-name>/index.ts"` to `packages/shared/package.json` exports
3. Add an alias in `apps/mobile/rspack.config.mjs` (Repack disables `exportsFields` by default):
   ```js
   '@fajr/shared/<module-name>': path.resolve(__dirname, '../../packages/shared/src/<module-name>/index.ts'),
   ```
4. No build step needed — both Next.js and Repack/Metro resolve `.ts` source directly

## Module details

### `@fajr/shared/constants`

Domain-wide reference data. Previously lived in `@fajr/shared/signup` but used across the entire app (patient forms, profiles, admin, telegram, CSV parsing).

```ts
import { DoctorSpecialtyList, DoctorSpecialties } from '@fajr/shared/constants';
import { Languages, LanguagesList, LanguagesListArabic } from '@fajr/shared/constants';
import { Countries, CountriesList, CountryCodes, CountryCodesList } from '@fajr/shared/constants';
```

All language/country enums are available in 8 locales: English, Arabic, Farsi, Pashto, Turkish, Urdu, Spanish, French.

### `@fajr/shared/care-team`

Care team role system used in the many-to-many doctor-patient relationship.

```ts
import type { CareTeamRole, CareTeamMemberJSON } from '@fajr/shared/care-team';
import {
  CARE_TEAM_ROLES,      // ['surgeon', 'assistant', 'consulting', 'triage', 'coordinator']
  ROLE_LABELS,           // { surgeon: 'Surgeon (Lead)', ... }
  ROLE_DESCRIPTIONS,     // { surgeon: 'You will be assigned as lead doctor...', ... }
  ROLE_BADGE_COLORS,     // { surgeon: { bg: '#dbeafe', text: '#1e40af' }, ... }
  getRolesForAccountType, // 'Doctor' -> ['surgeon','assistant','consulting']
  isLeadRole,            // Only 'surgeon' returns true
} from '@fajr/shared/care-team';
```

**Badge colors** are hex values (work everywhere). For Tailwind class strings on web, use the local adapter at `apps/web/lib/care-team-tailwind.ts`.

### `@fajr/shared/patient`

All patient-domain enums, note content types, and shared entity interfaces.

#### Enums

```ts
import type { PatientStatus, PatientPriority, BaselineAmbu, Gender, AccountType } from '@fajr/shared/patient';
import {
  PATIENT_STATUS_VALUES,     // ['Pre-Op / Not Cleared', ...]
  PATIENT_STATUS_COLORS,     // { 'Pre-Op / Not Cleared': '#6B7280', ... }
  PATIENT_PRIORITY_VALUES,   // ['Not Selected', 'Routine', 'Moderate', 'Urgent', 'Emergency']
  PATIENT_PRIORITY_ORDER,    // { Emergency: 0, Urgent: 1, Moderate: 2, Routine: 3, 'Not Selected': 4 }
  PATIENT_PRIORITY_COLORS,   // { Emergency: '#DC2626', ... }
  sortByPriority,            // Sort items by priority (Emergency first)
  isValidPatientStatus,
  isValidPatientPriority,
} from '@fajr/shared/patient';
```

**Priority values** match the PostgreSQL enum exactly: `Not Selected | Routine | Moderate | Urgent | Emergency`.

#### Note types

```ts
import type {
  NoteType,               // 'procedure' | 'subjective' | 'blank' | 'triage'
  ProcedureNoteContent,   // { attendingPhysician, procedureName, diagnosis, ... }
  SubjectiveNoteContent,  // { subjective, objective, assessment, plan, ... }
  BlankNoteContent,       // { noteField }
  TriageNoteContent,      // { triageDetails }
  NoteContent,            // Union of all content types
  NoteBase,               // Shared note interface (id, patientId, noteType, content, ...)
  NoteEditBase,           // Shared note edit interface
} from '@fajr/shared/patient';

import {
  isProcedureNote,   // Type guard
  isSubjectiveNote,  // Type guard
  isBlankNote,       // Type guard
  NOTE_TYPE_LABELS,  // { procedure: 'Procedure', subjective: 'SOAP', blank: 'Brief Note', triage: 'Triage' }
} from '@fajr/shared/patient';
```

#### Entity types

```ts
import type {
  CareTeamMember,    // Full care team record (with audit fields)
  CareTeamConflict,  // Conflict resolution record
  Medication,        // { diagnosis, medication, dosage, frequency, quantity }
  RxOrderBase,       // Prescription order
  MedOrderBase,      // Medication order
} from '@fajr/shared/patient';
```

### `@fajr/shared/patient-utils`

Pure utility functions with zero React/RN dependencies.

```ts
import {
  // Formatting
  formatDate,          // 'January 1, 2025'
  formatDateShort,     // '01/01/2025'
  formatDateWithTime,  // 'Jan 1, 2025, 02:30 PM'
  dobToAge,            // '1990-01-01' -> '35'
  getInitials,         // ('John', 'Doe') -> 'JD'
  getFullName,         // ('John', 'Doe') -> 'John Doe'
  truncateText,        // ('Long text...', 10) -> 'Long text...'
  formatLocation,      // ('Cairo', 'Egypt') -> 'Cairo, Egypt'
  formatSpecialties,   // (['Spine', 'Trauma']) -> '2 specialties'

  // Note utilities
  isNotePublishable,   // Validates required fields per note type
  getNotePreview,      // Extracts preview string from note content

  // Note templates
  emptyProcedureNote,  // Factory: empty ProcedureNoteContent
  emptySubjectiveNote, // Factory: empty SubjectiveNoteContent
  emptyBlankNote,      // Factory: empty BlankNoteContent

  // Color maps
  getStatusColor,      // Returns { background, text } hex pair
  getPriorityColor,    // Returns { background, text } hex pair (uses DB-canonical values)
} from '@fajr/shared/patient-utils';
```

### `@fajr/shared/user`

Profile, settings, and credential types shared across web and mobile.

#### Types

```ts
import type {
  ProfileFormValuesBase,      // Core profile fields (11 fields, extend per-platform)
  PasskeyCredentialDisplay,   // Passkey as shown in profile (not signup credential)
  MedicalLicenseRecord,       // Base license (specialty, uploadedAt, mimeType)
  MedicalLicenseStored,       // Mobile: + id, userId, fileUrl, fileName, status
  MedicalLicenseView,         // Web: + signedUrl
  MedicalLicenseStatus,       // 'pending' | 'verified' | 'rejected'
  PhotoUploadResult,          // { success, imageUrl?, error? }
  ThemeMode,                  // 'light' | 'dark' | 'system'
  PatientChartViewMode,       // 'tabs' | 'dashboard'
  UserSettingsBase,           // Shared settings shape
  AccountType,                // Re-exported from @fajr/shared/patient
  Gender,                     // Re-exported from @fajr/shared/patient
} from '@fajr/shared/user';
```

#### Constants

```ts
import {
  DEFAULT_THEME_MODE,             // 'system'
  THEME_MODE_VALUES,              // ['light', 'dark', 'system']
  THEME_MODE_LABELS,              // { light: 'Light', ... }
  DEFAULT_PATIENT_CHART_VIEW,     // 'tabs'
  PATIENT_CHART_VIEW_VALUES,      // ['tabs', 'dashboard']
  PATIENT_CHART_VIEW_LABELS,      // { tabs: 'Tabs', dashboard: 'Dashboard' }
  PROFILE_CONSTRAINTS,            // { MIN_COUNTRIES: 1, MIN_LANGUAGES: 1, MAX_SPECIALTIES: 2, ... }
  MEDICAL_LICENSE_STATUSES,       // ['pending', 'verified', 'rejected']
} from '@fajr/shared/user';
```

#### Validation

```ts
import {
  validateProfileBase,        // Pure TS validation -> { valid, errors }
  isValidThemeMode,           // Type guard
  isValidPatientChartView,    // Type guard
} from '@fajr/shared/user';
```

**Platform extensions**: Mobile extends `ProfileFormValuesBase` with `city`, `isAdmin`, `googleId`, etc. Web extends it with `missions`. Each platform keeps its own Zod schema / form hooks.

### `@fajr/shared/field-mapping`

Generic case conversion utilities for TypeScript (camelCase) to PostgreSQL (snake_case) mapping.

```ts
import {
  camelToSnake,       // 'firstName' -> 'first_name'
  snakeToCamel,       // 'first_name' -> 'firstName'
  keysToSnakeCase,    // Recursive object key conversion
  keysToCamelCase,    // Recursive object key conversion
  rowToEntity,        // Alias for keysToCamelCase
  entityToRow,        // Alias for keysToSnakeCase
  rowsToEntities,     // Array version
  entitiesToRows,     // Array version
} from '@fajr/shared/field-mapping';
```

PowerSync-specific query builders and legacy MongoDB compatibility utilities remain in `apps/mobile/src/utils/fieldMapping.ts`.

## Design principles

- **No React/RN imports** — shared code is pure TypeScript only
- **Direct source imports** — no build step, no compiled output
- **Sub-path exports** — import from specific modules, not the root
- **Hex colors** — badge/status colors are hex values (universally usable). Platform-specific adapters (e.g., Tailwind classes) live in the consuming app
- **DB-canonical values** — enums match PostgreSQL schema exactly
- **Backward compatibility** — `@fajr/shared/signup` still re-exports constants for existing consumers
