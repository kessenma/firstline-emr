# Native app identity migration

Everything in this document is **deferred**. The Firstline rebrand changed the
app's display name, icons and in-app copy, but deliberately left the native
*identity* alone: the bundle identifier, the Xcode project and target names, and
the Android package directory. They travel together — one `pod install`, one
clean build, one App Store submission — so they are done as a single push rather
than piecemeal.

## Why the bundle ID could not just be renamed

A published app's bundle identifier can never be changed. A new one is a new App
Store listing: existing installs do not update, and ratings, reviews and
TestFlight testers do not carry over. On Google Play, `applicationId` is
permanently fixed once published.

The decision taken was to ship the rebranded app as a **new listing**, and to do
that as its own piece of work.

## Already done, so this push is configuration not refactoring

`apps/notifications-server/pusher.go` no longer hardcodes the APNs topic. It
reads `APNS_BUNDLE_TOPIC`, defaulting to `com.fajr.emr`. Set that env var at
switchover; no code change is needed on the push path.

## The change set

### 1. Bundle identifier → `care.firstline.emr`

| File | Where |
|---|---|
| `apps/mobile/ios/FajrEMR.xcodeproj/project.pbxproj` | `PRODUCT_BUNDLE_IDENTIFIER`, Debug + Release |
| `apps/mobile/android/app/build.gradle` | `namespace`, `applicationId` |
| `apps/mobile/ios/fastlane/Appfile` | `app_identifier` |
| `apps/mobile/ios/fastlane/Matchfile` | `app_identifier` |
| `apps/mobile/ios/fastlane/Fastfile` | `app_identifier` fallback |
| `apps/mobile/ios/ExportOptions.plist` | `provisioningProfiles` key |
| `apps/mobile/src/components/DeviceRegistration.tsx` | hardcoded `bundleId === 'com.fajr.emr'` assertion |

### 2. Project, target, scheme and `PRODUCT_NAME`

The most mechanical and most invasive part: ~45 sites in `project.pbxproj`, plus
`ios/Podfile` (`target 'FajrEMR'` must match the Xcode target exactly or
`pod install` fails), `ios/FajrEMR.xcworkspace/contents.xcworkspacedata`, the
`.xcscheme` **filename**, `android/settings.gradle` (`rootProject.name`), and the
`ios/FajrEMR/` directory itself. Around 70 further references live in
`apps/mobile/scripts/*` and `ios/fastlane/Fastfile`.

Requires `pod deintegrate && pod install` and a full clean build.

### 3. Android package directory

Move `android/app/src/main/java/com/fajremr/` and update the `package`
declaration in `MainActivity.kt` and `MainApplication.kt`.

### 4. React Native root component — all three, atomically

A mismatch here is an instant white screen on launch:

- `apps/mobile/index.js` — `AppRegistry.registerComponent('FajrEMR', …)`
- `apps/mobile/ios/FajrEMR/AppDelegate.swift` — `withModuleName: "FajrEMR"`
- `android/app/src/main/java/com/fajremr/MainActivity.kt` — `getMainComponentName()`

### 5. Universal links and passkeys

`apps/web/public/.well-known/apple-app-site-association` contains
`RHPLRY9X9P.com.fajr.emr`. It must byte-match the new bundle ID, deployed
**before** the app ships, or universal links and WebAuthn both break. The domain
half has already moved to `firstline.care`; only the identifier is outstanding.

Entitlements (`FajrEMR.entitlements`, `FajrEMR.Release.entitlements`) already
point `webcredentials` at `firstline.care`.

### 6. On-device identifiers — safe to rename *here specifically*

Because the rebranded app is a new listing, every install is a fresh install.
There is no existing on-device state to migrate, so these can simply be renamed:

- `src/services/EncryptionKeyManager.ts` — keychain service `fajr-emr-sqlcipher`
- `src/services/powersync/dbFiles.ts` — `fajr-emr-enc.db`, `fajr-emr.db`
- `src/config/index.ts` — AsyncStorage prefix `@fajr_emr:` (5 keys)
- `src/contexts/AdminContext.tsx` — `@fajr_emr:admin_*` (3 keys)

Renaming them *without* the new listing would log every existing user out and
orphan their encrypted local database, which is why they were left alone.

### 7. Signing

Signing is `CODE_SIGN_STYLE = Manual`, so profile names are hardcoded
(`"match Development com.fajr.emr"`, `"match AppStore com.fajr.emr"` in
`project.pbxproj`, and `DISTRIBUTION_PROFILE_NAME` in `Fastfile`). Regenerate
with `fastlane match` for the new identifier.

### 8. Server side at switchover

- Set `APNS_BUNDLE_TOPIC=care.firstline.emr`
- Existing rows in `push_devices` hold tokens issued against the old topic and
  will no longer deliver. Plan a re-registration path, or accept that users
  re-register on first launch of the new app.
- Set `APP_STORE_URL` so the signup email links the new listing
  (`apps/web/utils/emails/user-signup.ts` still defaults to the old one).

## Known pre-existing issues to fix in the same push

- `project.pbxproj` — the **Debug** configuration points at
  `FajrEMR.Release.entitlements`, so debug builds carry
  `aps-environment: production` and development-token APNs pushes fail.
- `firstlinemission://` was declared in `MainNavigator.tsx` but registered in neither
  native project (no `CFBundleURLTypes`, no `android:scheme`), so it has never
  resolved. The scheme string has been rebranded; making it actually work is
  separate.
