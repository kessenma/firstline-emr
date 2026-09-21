# Lint Remediation Plan (`apps/mobile`)

## Root cause

The `lint` script in `package.json` read `"es lint ."` — a typo. Every invocation
died with `sh: es: command not found` **before ESLint ever loaded a rule**, so
`turbo run lint` had been reporting a red herring rather than real findings. The
backlog below accumulated behind that broken command.

Two fixes made the linter actually run:

| File | Change |
|------|--------|
| `package.json` | `"es lint ."` → `"eslint ."` |
| `.eslintrc.js` | Added `ignorePatterns` for `vendor/`, `ios/`, `android/`, `.ct2-build/`, `.rock/` |

The `ignorePatterns` addition was required, not cosmetic: `vendor/react-native-executorch`
is a vendored third-party package carrying its own `.eslintrc.js` that references
`@cspell/eslint-plugin`, a plugin we don't install. ESLint hard-failed on it. That
vendored tree is not our code and should not be linted.

### Every finding in this document is from `apps/mobile` — because mobile is the only package that lints

This is a selection effect, not a verdict on mobile's code quality.

| Package | Lint script | Size |
|---------|-------------|------|
| `apps/web` | `echo '⚠️ skipped' && exit 0` | 936 files, 138k lines |
| `apps/mobile` | `eslint .` | 454 files, 115k lines |
| `packages/shared` | *(none — turbo skips it)* | 59 files, 3.3k lines |

Web is the **larger** codebase and contributes zero findings because its script
unconditionally exits 0. Its `.eslintrc.json` (`extends: next/core-web-vitals`) is
legacy format while the resolved ESLint is **9.39.1**, which ignores eslintrc by
default. Running it in compat mode (`ESLINT_USE_FLAT_CONFIG=false`) also fails —
`eslint-config-next@16` is flat-config-only and throws on eslintrc serialization.
The migration is real, not a stalling excuse.

**Measured backlog** (throwaway flat config wrapping `eslint-config-next`'s own
flat export; nothing written into `apps/web`): **67 errors, 33 warnings across 75
files.**

```
40 err  react-hooks/set-state-in-effect      6 err  react-hooks/immutability
 8 err  react-hooks/static-components        4 err  react-hooks/refs
 4 err  react/no-unescaped-entities          4 err  react-hooks/preserve-manual-memoization
 0 err  react-hooks/exhaustive-deps (24 warn)
```

Plus 2 now-stale `eslint-disable` directives for `exhaustive-deps`.

**The two numbers are not comparable — the configs enforce different rules.**
Both packages resolve `eslint-plugin-react-hooks@7.0.1`, but:

- `@react-native/eslint-config` enables only the classic `rules-of-hooks` and
  `exhaustive-deps`, plus hygiene rules (`no-unused-vars`, `no-inline-styles`,
  `no-bitwise`, `no-shadow`).
- `next/core-web-vitals` enables the full react-hooks v7 suite
  (`set-state-in-effect`, `immutability`, `purity`, `refs`, …) and Next rules, but
  **not** `no-unused-vars`.

So mobile's 164 unused-vars are invisible to web's config, and web's 40
`set-state-in-effect` errors are invisible to mobile's. Each package is unlinted
along the axis the other one checks. Mobile is not the messy one — it is the
*measured* one.

Worth noting `set-state-in-effect` flags unconditional `setState` inside
`useEffect`, the classic render-loop shape — the same failure mode this document
warns about for Tier 3. Those 40 are probably the highest-value findings in the
monorepo right now.

## Status

| | Errors | Warnings |
|---|-------:|---------:|
| Baseline (once the linter actually ran) | 246 | 324 |
| After Tier 1 + Tier 2 | **67** | **314** |

All 67 remaining errors are `react-hooks/exhaustive-deps` (Tier 3). Typecheck is
unchanged throughout at the same 11 pre-existing errors in
`admin/sections/backup/` — no type regressions introduced.

**Jest cannot verify any of this.** All 6 suites fail at startup with
`SyntaxError: Cannot use import statement outside a module`, thrown from inside
`react-native/jest/setup.js` — a transform-config problem, not a source problem.
Confirmed pre-existing by stashing the entire change set and re-running: identical
failure, 0 tests executed. So this work is verified by ESLint + `tsc` only, and
**the changes have not been exercised on a device.** Worth a smoke test of login,
logout (the MainNavigator fix), signup, and the patient chart before shipping.
Repairing the Jest config is its own task and a prerequisite for trusting Tier 3.

## Baseline detail

570 problems: **246 errors, 324 warnings**, across 109 files.

| Rule | Errors | Warnings | Tier |
|------|-------:|---------:|------|
| `@typescript-eslint/no-unused-vars` | 164 | 0 | 2 |
| `react-hooks/exhaustive-deps` | 67 | 0 | 3 |
| `react-hooks/rules-of-hooks` | 14 | 0 | **1** |
| `no-unreachable` | 1 | 0 | 2 |
| `react-native/no-inline-styles` | 0 | 213 | 4 |
| `no-bitwise` | 0 | 31 | 4 |
| `no-void` | 0 | 24 | 4 |
| `@typescript-eslint/no-shadow` | 0 | 20 | 4 |
| `react/no-unstable-nested-components` | 0 | 17 | 4 |
| `no-catch-shadow` | 0 | 10 | 4 |
| `radix` | 0 | 5 | 4 |
| `no-useless-escape` | 0 | 2 | 4 |
| `no-unused-vars` (base) | 0 | 1 | 4 |
| `no-undef-init` | 0 | 1 | 4 |

Concentration by area (errors):

```
57  src/components/admin          9  src/viewModels/admin
30  src/components/patient-chart  8  src/screens/signup
24  src/components/ui             6  src/services/api
10  src/navigation/MainNavigator  6  src/hooks/powersync
```

---

## Tier 1 — Real bugs (`rules-of-hooks`, 14 errors)

**These are not style violations.** Calling hooks conditionally breaks React's
hook ordering invariant; when the condition flips, React throws
`Rendered fewer hooks than expected` and the component tree crashes.

### 1a. `src/navigation/MainNavigator.tsx` — 10 violations, highest severity

```tsx
const { notifyOfflineSave } = useConnectionToasts();

if (!user || !user.id) {
  return null;          // ← early return
}

useEffect(...)          // ← 10 hooks below the return
```

`user` going falsy is not hypothetical — **that is exactly what logout does.**
The first render after logout runs fewer hooks than the previous render and
crashes the navigator.

Fix: move the `if (!user || !user.id) return null` guard below every hook call.
The hooks must be unconditional; only the returned JSX may be conditional. Note
`useSafeUnreadCount(isReady ? user.id : undefined)` already tolerates
`undefined`, so this is safe — but audit each hook body for `user.id`
dereferences and use optional chaining where needed.

### 1b. Conditional `useToast` / `useThemeColors` — 3 files, 1 each

- `src/screens/HomeScreen.tsx:56` — `useThemeColors`
- `src/screens/LoginScreen.tsx:100` — `useToast`
- `src/screens/signup/SignupScreen.tsx:66` — `useToast`

Same class of bug, smaller blast radius. Hoist the hook call above the branch.

### 1c. `src/components/patient-chart/media-gallery/ExpandableFAB.tsx:74`

`useAnimatedStyle` is called inside a plain function `makeRowStyle`, which is
neither a component nor a hook. Reanimated's `useAnimatedStyle` registers state
on the calling component, so calling it from a loop/helper produces a variable
number of hooks per render.

Fix: either rename to `useRowStyle` **and** call it unconditionally at the top
level, or restructure so each row is its own component that calls the hook once.
A rename alone is not sufficient if it is still called from a loop.

- [x] **1a MainNavigator** — moved the `!user` guard below all ten hooks; changed
      `useSafeUnreadCount(isReady ? user.id : ...)` to `user?.id`, since that call
      now runs before the guard. The `user` reads at lines 200/210/268 sit inside
      the final JSX return, which is still below the guard, so they were untouched.
- [x] **1b HomeScreen / LoginScreen / SignupScreen** — `HomeScreen` was a straight
      hoist of `useThemeColors` above the early return. Login/Signup wrapped
      `useToast()` in a `try`/`catch` to tolerate a missing provider; replaced with
      a new non-throwing `useOptionalToast()` export in `src/hooks/useToast.tsx`.
      (That try/catch was stable in practice — `useToast` calls `useContext`
      *before* it throws — but it reads as a conditional hook and is fragile.)
- [x] **1c ExpandableFAB** — `makeRowStyle` was a plain helper calling
      `useAnimatedStyle`. Promoted to a module-level `useRowStyle(progress, index)`
      custom hook taking the shared value as a parameter, called three times
      unconditionally at the top level.

**Verified:** `rules-of-hooks` count is 0. Typecheck clean — the only `tsc` errors
in the package are 11 pre-existing ones in `admin/sections/backup/BackupView.tsx`
and `PassphraseModal.tsx`, in files untouched by this work.

---

## Tier 2 — Mechanical, low risk (165 errors)

### 2a. `@typescript-eslint/no-unused-vars` — 164

| Subtype | Count | Fix |
|---------|------:|-----|
| Unused imports & declarations | 108 | Delete the import/declaration |
| Assigned but never used | 27 | Delete, or verify the call has a needed side effect |
| Unused function args | 24 | Prefix `_` (config allows `/^_/u`) |
| Unused array destructure slots | 5 | Prefix `_`, or drop trailing slots |

**Underscore-prefixing does not work for unused `catch` bindings.**
`@react-native/eslint-config` sets only `argsIgnorePattern` and
`destructuredArrayIgnorePattern` — it does **not** set `caughtErrorsIgnorePattern`,
and typescript-eslint v8 defaults `caughtErrors` to `"all"`. So `catch (_error)`
still errors. Use optional catch binding instead — `catch {` — which is ES2019 and
supported by Hermes. Applies only where the body never reads the error.

Tell the two cases apart by the message text: a genuine unused *arg* carries the
`Allowed unused args must match /^_/u` suffix; an unused catch binding is a bare
`'error' is defined but never used.`

Mostly safe deletion. Two cautions:

1. **Do not blind-delete "assigned but never used".** `const x = doThing()`
   where `doThing()` mutates state is a side effect; only the binding is unused.
   Drop the binding, keep the call.
2. **Do not delete unused React imports** without checking the JSX transform. If
   any file still relies on the classic runtime, removing `import React` breaks
   it at runtime, not compile time.

### 2b. `no-unreachable` — 1

`src/services/MessageCacheService.ts:70` — `getLastCacheTime()` unconditionally
returns `null` inside a `try`, making the `catch` dead. It is a documented stub
("In a real implementation, you would query the database"). Benign. Either
implement it or drop the vestigial `try`/`catch`.

- [x] **2a unused vars** — all 164 fixed across ~90 files.
- [x] **2b unreachable code** — removed the vestigial `try`/`catch` in
      `MessageCacheService.getLastCacheTime()`; behavior and signature unchanged.

Notable deletions beyond a literal reading of the rules, worth a look on review:

- `hooks/powersync/usePowerSync.tsx` — deleted the 32-line `initializePowerSync`.
  It was dead: a strict subset of the adjacent `initialize` (which additionally
  honors an `initConfig` override and rethrows), and `initialize` is the one on
  the context value. Its `// called by useEffect` comment was stale — that effect
  is gone, since init now runs from `AuthContext` after login. No callers repo-wide.
- `messaging/hooks/useTelegramMessageLoading.ts` — deleted an unreferenced local
  `parseJson<T>()` helper.
- `admin/sections/notifications/NotificationsView.tsx` — deleted an unreferenced
  local `AdminNotification` interface.
- `PatientListExample.tsx` / `useDataSizeEstimate.ts` — deleted two unused local
  type declarations.

**Rule 2 was initially too literal and left dead statements behind.** "Keep the
call, drop the binding" is right for hooks and anything side-effecting, but wrong
for *pure* expressions — it converts `const x = arr.find(...)` into a dangling
`arr.find(...)`, which lints clean only because `no-unused-expressions` is off.
Three such cases were cleaned up afterward:

- `form/PhoneInputField.tsx` — a discarded `CountryCodesWithNames.find(...)`.
  Possibly unfinished wiring: the picker renders the raw `countryCode`, never a
  country name. Left as-is; flagging in case the display was meant to be richer.
- `services/TokenStorage.ts` — an `if/else` whose only bodies computed
  `Math.floor(...)` values for commented-out `console.log`s. Removed the whole
  block; `needsRefresh` is returned immediately after either way.
- `viewModels/admin/usePatientIntakeViewModel.ts` — a discarded
  `axios.isAxiosError(...)` ternary.

By contrast `BaseApiService.ts:279`'s bare `await response.text();` **must stay** —
it drains the response body stream.

Hook calls whose results went unused were reduced to bare calls (`useAuth();`,
`useThemeColors();`, `usePowerSync();`, `useNavigation();`) rather than deleted,
preserving hook count and order.

---

## Tier 3 — Requires judgment (`exhaustive-deps`, 67 errors, 39 files)

**Do not bulk-apply.** This rule's suggested fix is frequently wrong in ways that
are invisible to the linter and expensive at runtime. Adding a function or object
to a dep array when that value is re-created every render turns a mount-once
`useEffect` into an every-render effect — in this codebase that means **infinite
refetch loops** against the API and PowerSync.

Each site needs one of these deliberate resolutions:

1. Wrap the dependency in `useCallback`/`useMemo`, then add it — the usual
   correct fix.
2. Hoist a value that never needs to be reactive out of the component.
3. Use a ref for values read-but-not-reacted-to.
4. Keep the narrow dep array and add an `eslint-disable-next-line` **with a
   comment explaining why** — legitimate for genuine run-on-mount effects.

Highest-count files, likely the most tangled:

```
5  src/screens/messages/threads/useThreadDetailViewModel.ts
4  src/components/NavigationBar.tsx
4  src/components/patient-chart/notes/NoteCreationSheet.tsx
4  src/contexts/AdminContext.tsx
3  src/components/BottomSheet.tsx
3  src/components/navigation/TabletNavigation.tsx
3  src/viewModels/admin/useBackupViewModel.ts
```

`src/hooks/powersync/usePowerSyncQuery.ts` (2) deserves particular care — it
backs the offline patient chart, so a dependency change there can trigger
re-subscription storms across every consuming screen.

Recommended order: leaf components first, shared hooks and contexts last, testing
on device between batches. `AdminContext` and `usePowerSyncQuery` are the two
highest-fanout files here.

- [ ] 3a leaf components
- [ ] 3b view models
- [ ] 3c shared hooks & contexts (`AdminContext`, `usePowerSyncQuery`)

---

## Tier 4 — Warnings (324, non-blocking)

Not currently failing the build. Address opportunistically, or silence by
decision — but decide deliberately rather than letting them accrete.

- **`react-native/no-inline-styles` (213)** — by far the bulk. Inline styles cost
  a new object per render. Worth migrating to `StyleSheet.create` in hot list
  rows; low value in static screens. Reasonable to downgrade to `off` if the team
  doesn't intend to enforce it, rather than carry 213 permanent warnings.
- **`no-bitwise` (31)** — often intentional (flags, hashing). Consider disabling
  the rule or scoping `eslint-disable` to the files that legitimately use it.
- **`no-void` (24)** — commonly the `void somePromise()` floating-promise idiom.
  If that's deliberate here, turn the rule off.
- **`no-shadow` / `no-catch-shadow` (30)** — nearly all are nested `catch (error)`
  shadowing an outer `error`. Rename inner bindings (`err`, `fetchError`).
  `no-catch-shadow` is an IE8-era rule and is safe to disable outright.
- **`react/no-unstable-nested-components` (17)** — real perf issue: components
  defined during render remount their whole subtree each pass. Worth fixing.
- **`radix` (5)** — add the explicit `10` to `parseInt`. Trivial, and guards a
  real edge case.

---

## Execution order

1. **Tier 1** — ship alone, small and reviewable. Fixes a live logout crash.
2. **Tier 2** — mechanical; large diff but near-zero behavioral risk.
3. Re-baseline; confirm errors drop to ~67.
4. **Tier 3** — batched by area, exercised on device between batches.
5. **Tier 4** — triage: fix, or consciously disable rules the team won't enforce.

Re-run the count at any point with:

```sh
pnpm --filter mobile lint
```

## Verification status

Counts are from a real ESLint 8.57.1 run over `apps/mobile`. Tier 1 findings were
read in source and confirmed. Tier 3 sites have **not** been individually opened —
counts and file locations are from the linter, but the correct per-site fix is
still to be determined case by case.
