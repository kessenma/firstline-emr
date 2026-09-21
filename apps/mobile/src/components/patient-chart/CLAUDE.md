# Mobile Patient Chart

## Architecture

- **Entry**: `PatientChartView.tsx` — header, tab bar, bottom bar, care team/send sheets
- **State**: `PatientChartContext.tsx` — provides all patient data via `usePatientChart()` hook
- **Data**: ALL reads from PowerSync (offline-first). Writes go through API, sync back via PowerSync
- **Two modes**: Tabs (horizontal tab bar) and Dashboard (scrollable summary cards). Persisted via `usePatientChartViewPreference`

## Data Flow

```
PatientChartProvider
  → PowerSync queries (patients, notes, photos, rx, med orders, care team, conflicts)
  → useMemo transforms rows to typed interfaces
  → Context distributes to all child components
```

**PowerSync tables used**: PATIENTS, NOTES, PATIENT_MEDIA, RX_ORDERS, MED_ORDERS, PATIENT_CARE_TEAM, CARE_TEAM_CONFLICTS, USERS, MISSIONS, INTERNAL_MESSAGE_THREADS

## Tabs / Sections

| Tab | Directory | Key Details |
|-----|-----------|-------------|
| Patient Info | `patient-info/` | Editable form, PATCH `/patient/{id}` on save |
| Notes | `notes/` | FlashList, draft/published tabs, 3 note templates, voice dictation (feature-flagged) |
| Medications | `medications/` | RX + Med orders from PowerSync, creation sheets, `RxOrderDetailSheet` shares the patient link/QR. Types + helpers from `@fajr/shared/medications` (same module web uses) |
| Media | `media-gallery/` | Patient photos + Telegram media, FAB for camera/gallery upload, WiFi-only mode |
| Messaging | `messaging/` | Telegram chat UI, real-time hooks, audio player, translation support |
| Video | — | Placeholder (coming soon) |

## Dashboard Mode (`PatientChartDashboardView.tsx`)

- Summary cards for each section via `useSectionSummaries()` hook
- Cards drill down via BottomSheet (except notes which expand inline)
- **Important**: BottomSheet uses Portal which breaks React context — must re-provide `PatientChartContext.Provider` inside sheet content. See the BottomSheet section below for the general rule

## Key Components

- `PatientChartBottomBar.tsx` — absolute-positioned actions: back, refresh, view toggle, care team, send
- `CareTeamSheet.tsx` — join/leave/yield-lead, role selection based on accountType
- `RequestChartAccessSheet.tsx` — shown when a doctor opens a chart outside their specialty; joining the care team is what grants access, via `evaluateChartAccess` in `@fajr/shared/care-team`
- `SendPatientSheet.tsx` — sends patient card to internal messaging thread (reads threads from PowerSync)
- `video-call/VideoCallSheet.tsx` — the reference implementation for anything non-trivial with sheets; its comments document the failure modes collected in the BottomSheet section below
- `SectionSummaryCard.tsx` — reusable card for dashboard mode

## Notes Subsystem

- `NotesView.tsx` — main tab with published/drafts FlashList
- `NoteCreationSheet.tsx` — create/edit form
- `DraftedNoteCard.tsx` — draft-specific card with edit/publish/delete
- `voice-dictation/` — HandsFree, Guided, Smart dictation modes (gated by `VOICE_DICTATION` feature flag)
- Note templates: Subjective (SOAP), Procedure, Blank — shared via `@fajr/shared/patient-utils/note-templates`

## Conventions

- Always use `useThemeColors()` — never hardcode colors
- Use `FlashList` for lists, not `FlatList`
- Handle 4 states: loading (Skeleton), error, empty, success
- Mappers: `mapRowToPatient()`, `mapRowToNote()` convert PowerSync rows to typed interfaces
- **A column is only on-device if it appears in BOTH `sync-rules.yaml` and `powerSyncSchema.ts`.** The sync rules prune columns per table and the client schema declares them again; a column present in one but not the other is dropped silently, with no error. This is how `rx_orders` reached mobile with no `patient_rx_url`/`pharmacy_qr_code`, leaving prescriptions unshareable
- **A sync rule's client-side table name is its alias, or the unqualified source name when unaliased** — `BaseSqlDataQuery.getOutputName()` / `AvailableTable.sqlName` in `@powersync/service-sync-rules`; the schema qualifier is always stripped. So selecting from a `powersync_views` view *must* alias to the client table name: `FROM powersync_views.care_team_rx_orders AS rx_orders`. Unaliased, rows land in a table the client never declared and are discarded silently, with no error and no log. This is what kept care team conflicts off devices while their push notifications fired normally
- Care-team-scoped data uses a `powersync_views` view that denormalizes `patient_care_team.user_id` onto the row, because sync rules cannot JOIN in data queries. Views are defined in `apps/powersync-server/custom-functions/user-functions.sql` and named for their purpose — the sync rule's alias supplies the client table name
- **Never declare an `id` column in `powerSyncSchema.ts`** — PowerSync adds one and `Table.validate()` throws `custom id columns are not supported`. Most tables in that file predate this and still declare `id: column.text`. It is survivable only because `AbstractPowerSyncDatabase.updateSchema` wraps `schema.validate()` in try/catch and downgrades it to a warning ("Validations only show a warning for now. The next major release should throw an exception"). Because `Schema.validate()` is a bare loop, the first offender — `users`, the first table in the file — aborts validation for *every* table after it, so no other schema mistake is reported either. New tables should omit `id`
- A sync rule can reference a table the client never declares (`user_profile_update_requests` did): the rows sync but there is no local table, so the consuming query fails outright. Adding a rule means adding the table here too
- Care team writes are local PowerSync mutations (instant), conflict detection happens server-side on sync
- BottomSheet rules are their own section below — read it before writing a sheet

## BottomSheet

`BottomSheet.tsx` wraps gorhom's `BottomSheetModal`. Most of what follows was
learned the hard way from `video-call/VideoCallSheet.tsx`, which is the most
demanding consumer (imperatively driven, minimizable, must survive a live call).
Read that file's comments before doing anything unusual with a sheet.

### Getting one to open at all

- **A sheet that never opens, with no error:** the tell-tale is `📋 [BottomSheet] onChange` never logging even though `present()` demonstrably ran on a non-null ref. Two known causes, in order of likelihood:
  1. **`enableDynamicSizing`** — gorhom v5 defaults it to `true`, making the sheet measure children for a content-height snap point. Content starting with a `Context.Provider` or a bare `flex: 1` View measures `0`, so there's no layout to present into. `BottomSheet` now hard-sets `enableDynamicSizing={false}` since it always supplies explicit `snapPoints`; don't re-enable it
  2. **Mounting already-visible** — never `return null` above a `<BottomSheet>` based on the same state that drives its `visible` prop. Keep it mounted and toggle `visible`, like `NoteCreationSheet`/`SendPatientSheet`/`CareTeamSheet`/`RequestChartAccessSheet`. Nothing renders until the sheet is presented, so staying mounted costs nothing

### Nesting

- **Nested `BottomSheetModal`s are the problem; siblings are fine.** Several sheets mounted side by side in one screen (the dashboard has `FilterSheet`, `DashboardHelpSheet`, `RequestChartAccessSheet`, `PatientMobileActions`) work correctly. What breaks is one sheet rendered *inside* another — conditionally mount the note creation sheet instead
- A dedicated sheet beats reusing a shared `activeSection` sheet when the content must survive: the shared one swaps its contents when another section opens, which unmounts whatever was there (this is why the video call has its own)

### Context across the Portal

- **The Portal detaches the React context tree.** Anything rendered *inside* `<BottomSheet>` — including `titleAccessory` — is outside the providers its parent sits under
- The cheap fix is to call every hook in the sheet component's own body and pass plain values into the children (what `CareTeamSheet`, `SendPatientSheet` and `RequestChartAccessSheet` do). Only re-provide a context when the children genuinely need hooks — dashboard drill-downs re-provide `PatientChartContext.Provider`, and the video call bridges its session with `VideoCallSessionBridge`

### Driving a sheet imperatively (`ref`)

- **`present()` and `snapToIndex()` must not be issued in the same tick.** The modal isn't laid out until `present()` has run, so the snap is swallowed and the sheet settles wherever `present()` left it. Wrap the snap in `requestAnimationFrame`
- **Key a present-effect on an identity, not a boolean.** A `visible` boolean only fires on its false→true edge; if the underlying state stays truthy across the end of one item and the start of the next, that edge never arrives and the sheet silently never presents again. `VideoCallSheet` keys on `activeCall.sessionId` for exactly this reason
- There is a state where the sheet was dismissed without `onDismiss` firing, so the library still thinks it is presented and both `present()` and `snapToIndex()` no-op. Re-presenting must therefore also force-reset any derived state (e.g. `isMinimized`), or you get a header with an empty body

### State derived from a sheet

- **Derive "is it presented" from what the sheet actually did (`onIndexChange`), never optimistically alongside `present()`.** Setting it optimistically is how it gets stuck `true` with nothing on screen and no way back
- `onIndexChange` values: `-1` swiped away, `0` minimized pill, `1` normal, `2` full-screen. `-1` still means the underlying work is live — offer a way back in
- **`onClose`/`onDismiss` can fire from a stale closure.** Read anything you branch on through a ref, not a value captured at `useCallback` time, or you'll act on state that has already changed (this caused a second "End call?" prompt for a call that had already ended)
- If a confirm dialog on close can be declined, the decline path must put the sheet back — otherwise the work keeps running with no controls anywhere

### Content

- Default children are wrapped in `BottomSheetScrollView`. Pass `rawContent` only when the children bring their own `BottomSheetFlatList`/scroll view — and note `rawContent` passes children straight through, so a stale conditional inside renders a header and nothing else
- `startExpanded` opens at index 2 (full-screen); use it when controls would otherwise sit below the fold

## Hermes Gotchas

- No `AbortSignal.timeout()` — use `AbortController` + `setTimeout`
- No `TypedArray.prototype.buffer` — use manual base64 encoding
