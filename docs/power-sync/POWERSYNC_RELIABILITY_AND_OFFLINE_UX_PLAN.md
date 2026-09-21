# PowerSync Reliability & Offline UX Improvements

## Problem
The PowerSync client can overwhelm the server during rapid reconnections (hot reloads, rapid Reconnect taps, network flapping). The offline UX needs to be more visible and consistent without being intrusive.

---

## Phase 1: Connection Stability (prevent server overload)

### 1.1 Add `isReconnecting` guard to `PowerSyncService.reconnect()`
**File:** `apps/mobile/src/services/powersync/PowerSyncService.ts`

- Add `private isReconnecting = false` field
- Guard `reconnect()` to return early if already reconnecting or connected
- Prevents duplicate `db.connect()` calls from concurrent callers

### 1.2 Add exponential backoff to `reconnect()`
**File:** `apps/mobile/src/services/powersync/PowerSyncService.ts`

- Add `private reconnectAttempts = 0` field
- Before connecting, wait `min(1000 * 2^attempts, 30000)ms` if attempts > 0
- Reset to 0 on success, increment on failure

### 1.3 Debounce the Reconnect button in SyncStatusSheet
**File:** `apps/mobile/src/screens/user-profile/components/SyncStatusSheet.tsx`

- Add `isReconnecting` local state
- Disable button + show spinner while reconnecting
- Show inline error text if reconnect fails (not silent)

### 1.4 Debounce `SyncNetworkController.handleNetworkChange`
**File:** `apps/mobile/src/services/powersync/SyncNetworkController.ts`

- Add 500ms debounce to `handleNetworkChange` — rapid NetInfo events (WiFi toggling, hot reload) won't spam connect/disconnect

---

## Phase 2: Dev Simulator Resilience

### 2.1 Connection cooldown after disconnect
**File:** `apps/mobile/src/services/powersync/PowerSyncService.ts`

- Track `lastDisconnectTime` timestamp
- In `reconnect()`, enforce minimum 2s gap after disconnect before new connection
- Prevents the rapid connect/disconnect/connect cycle during hot reloads

### 2.2 Handle stale singleton on hot reload
**File:** `apps/mobile/src/services/powersync/PowerSyncService.ts`

- In `initialize()`, if `isInitialized === true` but `db.connected === false` (hot reload killed JS but native SQLite handle survived), do a clean reconnect instead of returning early
- Makes the "refresh and it works again" pattern automatic

---

## Phase 3: Upload Resilience

### 3.1 Per-table error isolation in `uploadData()`
**File:** `apps/mobile/src/services/powersync/PowerSyncService.ts`

- Wrap each `processTableChanges()` call in try/catch
- Log failures but continue processing other tables
- Only skip `batch.complete()` if ALL tables fail
- Prevents a single API 500 from blocking all sync

### 3.2 Per-record error tolerance
**File:** `apps/mobile/src/services/powersync/PowerSyncService.ts`

- In the inner loop over individual changes, catch errors per-record
- Continue processing remaining records
- Throw only if > 50% of batch fails

---

## Phase 4: Offline UX — Non-Intrusive Status Indicators

### 4.1 Create a `ConnectionStatusOverlay` component
**File:** `apps/mobile/src/components/ConnectionStatusOverlay.tsx` (new)

A subtle full-width gradient overlay at the very top of the screen (behind the status bar area) that communicates connection state through color:

- **Online/Connected:** Faint green gradient fading from `rgba(34, 197, 94, 0.08)` at top → transparent over ~60px. Barely noticeable — just a gentle green wash behind the status bar.
- **Offline/Disconnected:** Faint red gradient fading from `rgba(239, 68, 68, 0.10)` at top → transparent over ~60px. Subtle but clearly different from the green state.
- **Connecting/Syncing:** Faint amber gradient, same pattern.

Implementation:
- Use `react-native-svg` (already installed) with `<Defs><LinearGradient>` + `<Rect>` to render the gradient (no new dependencies needed)
- Positioned `absolute`, `top: 0`, `left: 0`, `right: 0`, `pointerEvents: 'none'` so it doesn't interfere with touch
- Animated color transition using Reanimated's `useAnimatedProps` or interpolateColor for smooth fading between states
- Uses `useSyncConnection()` to get connection state

### 4.2 Mount `ConnectionStatusOverlay` in `MainNavigator`
**File:** `apps/mobile/src/navigation/MainNavigator.tsx`

- Add `<ConnectionStatusOverlay />` as a sibling to the `<NavigationContainer>`, positioned above it via absolute positioning
- Only renders when PowerSync is initialized (not during initial boot/loading)
- Doesn't push content or change layout — purely a visual overlay

### 4.3 Toast notifications for connection state transitions
**File:** `apps/mobile/src/hooks/useConnectionToasts.ts` (new)

A hook that watches sync status and fires toasts on meaningful transitions:

- **Goes offline:** `toast({ title: 'You are offline', description: 'Changes will be saved locally', variant: 'default', duration: 4000 })`
- **Comes back online:** `toast({ title: 'Back online', description: 'Syncing your changes...', variant: 'success', duration: 3000 })`
- **Sync complete after reconnect:** `toast({ title: 'All changes synced', variant: 'success', duration: 2000 })`
- **Offline mutation:** `toast({ title: 'Saved locally', description: 'Will sync when connected', variant: 'info', duration: 2000 })` — for this one, we expose a `notifyOfflineSave()` function that screens can call after a successful local write while offline

Guards:
- Debounce transitions by 3s to avoid toast spam during flapping
- Don't show "offline" toast during initial app boot (before first sync)
- Don't show "back online" if offline duration was < 5s (transient blip)
- Track previous state with `useRef` to only fire on actual transitions

### 4.4 Mount `useConnectionToasts` in the app
**File:** `apps/mobile/src/navigation/MainNavigator.tsx`

- Call `useConnectionToasts()` inside MainNavigator (it's inside both `ToastProvider` and `PowerSyncProvider`, so it has access to both)

### 4.5 Update TelegramMessagingView to use shared pattern
**File:** `apps/mobile/src/components/patient-chart/messaging/TelegramMessagingView.tsx`

- Keep the existing inline offline banner (it has context-specific info like "X items queued" and the messaging-specific subtext)
- But also call `notifyOfflineSave()` from `useConnectionToasts` when a message is queued while offline, so the user gets the toast confirmation too

---

## Phase 5: Polish

### 5.1 Add pending changes count to SyncStatusSheet
**File:** `apps/mobile/src/screens/user-profile/components/SyncStatusSheet.tsx`

- Show "X changes pending upload" below the status banner
- Poll `getPendingChangesCount()` every 5s
- Gives doctors confidence their offline notes are saved

### 5.2 Consolidate useSyncStatus polling (lower priority)
**File:** `apps/mobile/src/hooks/powersync/useSyncStatus.ts`

- Refactor `useSyncConnection`, `useSyncProgress`, `useSyncErrors` to share a single polling source via React context
- Reduces duplicate `getSyncStatus()` calls and re-renders

---

## Implementation Order

1. **Phase 1** (1.1–1.4) — prevents the server crash, highest priority
2. **Phase 2** (2.1–2.2) — makes dev workflow smoother
3. **Phase 4** (4.1–4.5) — the visible UX improvements (gradient + toasts)
4. **Phase 3** (3.1–3.2) — upload resilience
5. **Phase 5** (5.1–5.2) — polish

Total files touched: ~7 (3 modified services/hooks, 1 modified navigator, 1 modified sheet, 2 new files)
