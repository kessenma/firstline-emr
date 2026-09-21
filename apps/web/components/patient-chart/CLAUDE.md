# Web Patient Chart

## Architecture

- **Entry**: `app/patient/[id]/page.tsx` → `PatientViewModel.tsx` (main orchestrator)
- **State**: `PatientViewModelContext.tsx` — React Context providing all patient data to child sections
- **Data fetch**: `fetchPatientData()` on mount calls `GET /api/patient/{id}`, which returns an explicit column projection of the patients row plus `photos`. Notes and medication orders are fetched in parallel from their own endpoints: `GET /api/patient/{id}/notes/doctor-notes`, `GET /api/patient/{id}/medications/rx-order`, `GET .../med-order`
  - **Caution**: the patient GET returns *only* patients columns + photos. Anything living in its own table needs its own endpoint. `fetchPatientData` historically read `data.patient.notes` and `data.patient.rxOrders`, neither of which that route ever returned — so the Notes section rendered empty and prescriptions shared an `undefined` link, both silently
- **Layout**: Collapsible accordion sections (not tabs). All sections loaded eagerly

## Sections

| Section | Files | Key Features |
|---------|-------|--------------|
| Patient Info | `patient-info/` | Editable form (React Hook Form + Zod), PATCH on save |
| Notes | `PatientNotes/` | 3 templates (Subjective/Procedure/Blank), draft→publish workflow, ICD-10 & CPT search. Note shape, content types and `isSubjectiveNote`/`isProcedureNote`/… guards all come from `@fajr/shared/patient` — never re-declare them locally |
| Medications | `Medications/` | RX orders (with QR), Med orders, drawer for creation. Types + helpers come from `@fajr/shared/medications` — shared with mobile |
| Care Team | `care-team/` | CareTeamSection (inline) + CareTeamModal (dialog), role-based join/leave/yield-lead |
| Media | `media-gallery/` | Patient photos + Telegram media, full-screen viewer |
| Messaging | `telegram-messages/` | Real-time Telegram chat, audio recorder, message caching |
| Video | `videocall/` | LiveKit integration, scheduled calls |
| Export | `export/` | PDF export (full or anonymous), section/field selector, react-to-print |

## Section Pattern

- **View** (`*View.tsx`) — UI component reading from context or its own ViewModel
- **ViewModel** (`*ViewModel.ts`) — business logic as class or hook, uses React Query or fetch
- Both read patient data from `PatientViewModelContext`; writes go through API routes

## Key API Routes

- `GET/PATCH /api/patient/{id}` — patient data CRUD (patients columns + photos only)
- `GET/POST /api/patient/{id}/notes/doctor-notes` — list (published + drafts, split on `draft`) / create note
- `PATCH/DELETE /api/patient/drafts/{id}` — draft management
- `POST /api/patient/{id}/medications/rx-order` and `med-order` — create orders
- `GET/POST/PATCH/DELETE /api/patient/care-team` — care team CRUD
- `POST /api/patient/{id}/take-case` — join care team as role
- `GET /api/patient/{id}/export?mode={full|anon}` — export data

## Conventions

- Auth: `verifySessionFromRequest()` → `Authorization: Bearer ${session?.user.token}`
- Toast: `useToast()` → `setToast()` for user feedback
- Optimistic updates: `addRxOrder()`/`addMedOrder()` add to context state immediately
- Forms: React Hook Form + Zod validation
- Session expiry: detect 401 → show `SessionExpiredModal`
- Shared utils: `@fajr/shared` — `patient-utils/` (formatting, note-utils, status-colors), `patient/` (note types + guards), `care-team/` (role labels/descriptions), `medications/` (RxOrder/MedOrder types, sorting, date formatting, prescription share message)
- **Drizzle rows are pinned to the shared types** by `db/schema/shared-types.contract.ts` — a type-only file that fails `tsc` if a column drifts from what mobile reads over PowerSync. Update the shared type (and PowerSync schema + sync rules) rather than loosening the assertion
- Timestamps on shared types are `Date | string`: a `Date` from Drizzle server-side, an ISO string over JSON on web, SQLite text on mobile. Read them via `formatDate`/`toDate`, never string ops
- **Colour tokens come in pairs.** `bg-primary`+`text-primary-foreground`, `bg-card`+`text-card-foreground`, `bg-background`+`text-foreground`. `--primary` and `--background` invert between light and dark, so overriding one half of a pair (e.g. `text-primary-foreground` on a component whose default is `bg-background`) renders same-on-same in *both* themes. When a component already styles its own states (Button variants, RadioCard's `data-[state=checked]`), pass layout classes only
