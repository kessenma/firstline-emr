# Mobile Admin Dashboard

## Architecture

- **Screen entry**: `AdminDashboardScreen.tsx` — SafeAreaView wrapper, passes `initialSection` from navigation params
- **Main component**: `components/admin/AdminDashboardView.tsx` — accordion-based dashboard with search, refresh, help
- **Navigation**: `navigation/AdminStackNavigator.tsx` — stack with `AdminDashboard` and `PowerSyncTest` (dev-only) screens
- **Role gate**: `AdminStackNavigator` checks `user.isAdmin` before rendering; shows access-denied screen otherwise
- **Shared types/constants**: Import from `@fajr/shared/admin`

## Section Pattern (MVVM)

1. **ViewModel** (`viewModels/admin/use<Name>ViewModel.ts`) — useState + useCallback hooks, calls `adminApi` methods
2. **View** (`components/admin/sections/<name>/<Name>View.tsx`) — consumes ViewModel hook, handles loading/error/empty/success states
3. **Card** (`components/admin/sections/<name>/<Name>Card.tsx`) — optional per-item display component
4. **Wiring** — add to `ADMIN_SECTIONS` array and `renderSectionContent()` switch in `AdminDashboardView.tsx`

## Adding a New Section

1. Create ViewModel at `viewModels/admin/use<Name>ViewModel.ts`
2. Create View at `components/admin/sections/<name>/<Name>View.tsx`
3. Add API methods to `utils/admin/adminApi.ts`
4. Add entry to `ADMIN_SECTIONS` array in `AdminDashboardView.tsx`
5. Add case to `renderSectionContent()` switch
6. Add shared types to `packages/shared/src/admin/types.ts` if needed

## Key Files

- `contexts/AdminContext.tsx` — admin session management (30-min timeout, permissions, auto-check)
- `utils/admin/adminApi.ts` — class-based API client singleton with typed endpoints
- `components/admin/AdminAccordion.tsx` — animated accordion with badge, search highlighting
- `components/admin/AdminDashboardHeader.tsx` — search (300ms debounce), refresh, help
- `components/admin/shared/` — reusable components: LoadingState, ErrorState, EmptyState, UserCard, BulkActionBar, ConfirmDialog

## Conventions

- Always use `useThemeColors()` for colors — never hardcode
- Use `FlashList` for lists, not `FlatList`
- Handle 4 states in every view: loading, error, empty, success
- Destructive actions require confirmation dialogs
- ViewModels use `useState`/`useCallback` (no Redux/Zustand)
- API client uses token from `storageUtils.getToken()`

## Hermes Runtime Gotchas

- No `AbortSignal.timeout()` — use `AbortController` + `setTimeout`
- No `TypedArray.prototype.buffer` — use manual base64 encoding
