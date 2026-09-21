# Mobile Patient Dashboard

## Architecture

- **Entry**: `PatientDashboardScreen.tsx` → `PatientDashboardScreenView.tsx` (view) + `usePatientDashboardViewModel.ts` (logic)
- **Data**: ALL reads from PowerSync (offline-first) via `usePatientsWithMessages()`. Writes go to PowerSync locally, sync to server
- **Device-adaptive**: mobile cards (`MobilePatientDashboardTable` with FlashList) vs tablet spreadsheet (`TabletPatientTable` with sortable columns)
- **Shared types**: `@fajr/shared/patient-dashboard` for `DashboardFilters`, constants, defaults

## Data Flow

```
usePatientDashboardViewModel
  ├─ usePatientsWithMessages()  → patients + unread Telegram counts (PowerSync)
  ├─ useMissions()              → mission list + derived hospital options (PowerSync)
  ├─ useFollowUpPatientIds()    → Set of patient IDs with follow-ups (PowerSync)
  └─ useConflictPatientIds()    → Set of patient IDs with care team conflicts (PowerSync)
       ↓
  SQL-level filters (status, priority, specialty, hospital, missionIds)
       ↓
  Client-side filters (search, careTeamScope, followUps, unassigned, conflicts, viewMode)
       ↓
  filteredPatients → View renders
```

## Filtering (2 levels)

1. **SQL-level** (PowerSync query in `usePatients`): status, priority, specialty, hospital, missionIds
2. **Client-side** (ViewModel): search (name/complaint/ID), careTeamScope, showFollowUps, showUnassignedSpecialty, showConflictsOnly, viewMode='active' excludes discharged

**Mutual exclusion**: `showFollowUps` and `showUnassignedSpecialty` reset each other; changing `viewMode` resets both

## Mutations (all PowerSync local writes)

- `updatePatientStatus()` — updates status field
- `updatePatientPriority()` — updates priority field
- `updatePatientHospital()` — updates hospital field
- `updatePatientNotes()` — updates dashboard_notes field
- `takeCaseOffline()` — inserts into `patient_care_team` table AND updates `patients.doctor` JSON + status (dual-write)

## View Components

### Mobile (`MobilePatientDashboardTable.tsx`)
- Card-based FlashList with avatar, status/priority badges, chief complaint highlight, 2-column details grid, unread indicator, action buttons
- Active patient highlighting (orange border)

### Tablet (`TabletPatientTable.tsx`)
- 11 sortable columns, frozen "Patient" column, horizontal scroll
- Cell tap routes to action sheets: status→status sheet, priority→priority sheet, specialty→specialty sheet, triage_note→notes sheet, name→patient chart

### Shared
- `PatientMobileActions.tsx` — bottom sheets for status, priority, specialty, notes, take-case (role-based business rules per accountType)
- `FilterSheet.tsx` — view mode, care team scope, missions, clinical filters (priority/status/specialty/hospital), advanced toggles
- `DashboardHelpSheet.tsx` — explains visibility/access rules; copy comes from `@fajr/shared/patient-dashboard` so it cannot drift from web

## Chart access

Every patient on the mission is visible here — nothing is filtered out by
specialty. Opening a chart is gated instead:

- All three entry points (card tap, tablet name-cell tap, and the chat shortcut) go through `guardChart()`, which calls `useChartAccess()` → `evaluateChartAccess` from `@fajr/shared/care-team`. The web app applies the identical rule
- Triage/Admin open any chart with no prompt. A Doctor opens charts in their specialty or where they're already on the care team; anything else raises `RequestChartAccessSheet`
- Joining from that sheet is a local PowerSync write, so it works offline and syncs to `POST /api/patient/care-team` later
- Triage are never prompted — they're recorded on the care team server-side when they edit a patient's specialty/status/priority (`recordPatientEditor`)

## Key Hooks

- `usePatients.ts` — `usePatientsWithMessages()` (main query), `mapRowToPatient()` (row mapper), 30s refetch interval
- `useFollowUpPatientIds.ts` — Set of patient IDs from `patient_follow_ups` table
- `useConflictPatientIds.ts` — Set of patient IDs from `care_team_conflicts` where status='unresolved'
- `useMissions.ts` — missions list, derives available hospitals
- `useSyncStatus()` — monitors isConnected/isDownloading/isUploading for sync banner

## Conventions

- Always use `useThemeColors()` — never hardcode colors
- Use `FlashList` for patient list, not `FlatList`
- Device detection: `useDeviceType()` for mobile vs tablet rendering
- Navigation: `navigation.navigate('PatientChart', { patientId, initialTab? })` to open patient chart
- Sync banner: shows download/upload/connecting status when `isSyncing`
- Business rules in `PatientMobileActions`: role-based restrictions on status/priority/specialty changes
