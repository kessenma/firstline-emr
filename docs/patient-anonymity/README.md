# Patient Name Anonymity

## Overview

Patient names are anonymized across the entire app UI to protect patient privacy. Instead of displaying full names (e.g., "John Smith"), the app shows initials in the format **"J.S."** (first initial dot, last initial dot).

This is a **client-side only** change. API responses and the database continue to store and return full names. Patient search still works on full names server-side.

## Format

| Input | Output |
|-------|--------|
| firstName: "John", lastName: "Smith" | J.S. |
| firstName: "John", lastName: null | J. |
| firstName: null, lastName: "Smith" | S. |
| firstName: null, lastName: null | N/A |

## Utility Function

All anonymization goes through a single shared utility:

```typescript
// packages/shared/src/patient-utils/formatting.ts
import { getAnonymizedName } from '@fajr/shared/patient-utils';

getAnonymizedName("John", "Smith"); // "J.S."
```

This lives alongside existing utilities like `getFullName()` and `getInitials()`.

## Where Anonymization is Applied

### Mobile (`apps/mobile/`)

- **Patient Dashboard** — `MobilePatientDashboardTable.tsx` card names, `tabletTableColumns.ts` table cells
- **Patient Chart Header** — via `PatientChartContext.tsx` (`patientName` field), cascades to `PatientChartView.tsx` header and `TelegramHeader.tsx`
- **Messaging** — `PatientCardMessage.tsx`, `PatientSearchModal.tsx`, `PatientDetailBottomSheet.tsx`
- **View Models** — `PatientInfoViewModel.ts` `getPrimaryDetails().patientName`

### Web (`apps/web/`)

- **Patient Dashboard** — `PatientNameCell.tsx`, `column-definitions.tsx`
- **Patient Chart** — `PatientInfoViewModel.ts` `getPrimaryDetails().patientName`, `PatientViewModel.tsx` care team modal
- **Telegram Messaging** — `TelegramHeader.tsx` patient name display
- **Chat/Messaging** — `ChatThreadModal.tsx` title, `PatientCardMessage.tsx`, `PatientDetailSheet.tsx`
- **Notifications** — `UnassignedSpecialtyPatientModal.tsx`

## Where Full Names are Intentionally Kept

- **Patient Info / Demographics View** (both web and mobile) — clinicians need full names for clinical workflows and editing
- **Patient Chart Export** (`ExportPatientChartView.tsx`) — clinical documents require full identifying information
- **Doctor/Staff names** — only patient names are anonymized, not team member names
- **API responses and database** — unchanged; anonymization is display-only
