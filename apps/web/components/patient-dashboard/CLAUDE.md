# Web Patient Dashboard

## Architecture

- **Entry**: `app/patient-dashboard/page.tsx` — server component, prefetches patients via `fetchActivePatientsWithMessages()` (direct DB, no API overhead), passes serialized data to client
- **Client wrapper**: `PatientDashboardClientWrapper.tsx` — receives session + initial patients
- **Main view**: `DashboardView.tsx` — orchestrates table, filters, real-time updates
- **ViewModel**: `DashboardViewModel.ts` — useReducer for toast/loading states, coordinates queries + filtering + mutations
- **Store**: Zustand `useDashboardStore` — persistent filter/view state (viewMode, careTeamScope, filters, advanced toggles)

## Data Flow

```
Server prefetch (fetchActivePatientsWithMessages)
  → Client: usePatientQueries (React Query infinite scroll, cursor-based)
  → useFilteredPatients (client-side useMemo filtering)
  → PatientTable renders rows
  → SSE real-time updates invalidate React Query cache
```

### Data Fetching Layers
1. **Server prefetch**: Direct DB query + batched Telegram unread counts → fast initial paint
2. **Client infinite scroll**: `useInfiniteQuery` with cursor pagination, 20 per page, 15min stale time
3. **Real-time**: SSE via `GET /api/patient/realtime` using PostgreSQL LISTEN/NOTIFY (`pgNotificationHub`), heartbeat 30s, exponential backoff reconnect

## Filtering (3 levels)

1. **API-level**: viewMode determines endpoint (`/api/patient`, `/api/patient/archived`, `/api/patient/unassigned-specialty`)
2. **Zustand store**: viewMode, careTeamScope, showFollowUps, showUnassignedSpecialty, showConflictsOnly
3. **Client-side** (`useFilteredPatients` useMemo): priority, status, specialty, hospital, doctor, mission, careTeamScope, conflicts — no API calls, instant re-filter

**Mutual exclusion**: `showFollowUps` and `showUnassignedSpecialty` reset each other; changing `viewMode` resets both

## Patient Mutations (`usePatientMutations`)

| Action | Endpoint | Notes |
|--------|----------|-------|
| Status change | `PATCH /api/patient/{id}` | Clears/sets triagedBy based on status; "Peri-Op" triggers take-case |
| Take case | `POST /api/patient/{id}/take-case` | Adds to careTeam + patient_care_team table (dual-write) |
| Specialty change | `PATCH /api/patient/{id}/triage` | Separate notification via `send-specialty-notification.ts` |
| Archive | `PATCH /api/patient/{id}` | Status → "Post-Op / Discharged", invalidates both active + archived queries |

## Table & Columns

- `PatientTable.tsx` — responsive: desktop full table, mobile simplified + `PatientMobileActions`
- Column definitions in `utils/column-definitions.tsx`: ID, Name, Hospital, Specialty, Chief Complaint, Status, Priority, Notes, Take Case
- Inline editing for notes, priority, status, specialty (no navigation needed)
- Row highlight animation (2s) on real-time patient updates via `recentlyChangedIds`
- Translation support: auto-translates city/country/chiefComplaint if `autoTranslateLang` enabled

## Key Sub-views

- **Follow-ups** (`followUps/`): alternative view when `showFollowUps=true`, own ViewModel + table
- **Unassigned specialty**: fetches from `/api/patient/unassigned-specialty`
- **Chat modal** (`ChatThreadModal.tsx`): inline Telegram thread viewer from patient row

## Conventions

- Auth: `verifySessionFromRequest()` on API routes, `useSession()` on client
- **Chart access**: every patient on the mission is listed — the dashboard hides nothing by specialty. Opening a chart is gated instead, via `evaluateChartAccess` from `@fajr/shared/care-team` (same rule as mobile). Triage open anything; a Doctor opens charts in their specialty or where they're on the care team, otherwise `RequestChartAccessModal` offers to join. The authoritative check is in `PatientViewModel` — gating the chart itself, not the links into it, so pasted `/patient/{id}` URLs and shared patient cards are covered too
- Editing a patient records the editor on its care team server-side (`recordPatientEditor`) for Triage/Coordinator — that row is the audit trail of who triaged them. Doctors are deliberately excluded, since they can edit from the dashboard without opening the chart
- Care team scope: "My Cases" / "I'm Lead" / "All" — filters by `careTeam` array membership
- Conflict detection: `useConflictCount` hook fetches patient IDs with unresolved care team conflicts
- Shared types: `@fajr/shared/patient-dashboard` for `DashboardFilters`, view modes, care team scopes
