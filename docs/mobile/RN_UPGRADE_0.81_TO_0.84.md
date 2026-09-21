# React Native Upgrade Plan: 0.81.1 → 0.84.0

**Date**: 2026-02-24
**Source diff**: https://github.com/react-native-community/rn-diff-purge/compare/release/0.81.1..release/0.84.0

---

## Prerequisites

- **Node.js >= 22.11.0** required (currently on v20.18.2)
  - Update `.nvmrc` and install Node 22 before proceeding
- Clean git working directory recommended

---

## 1. Package Version Bumps

### Dependencies

| Package | Current | Target |
|---------|---------|--------|
| `react` | 19.1.0 | **19.2.3** |
| `react-native` | 0.81.1 | **0.84.0** |

### Dev Dependencies

| Package | Current | Target |
|---------|---------|--------|
| `@react-native/babel-preset` | 0.81.1 | **0.84.0** |
| `@react-native/eslint-config` | 0.81.1 | **0.84.0** |
| `@react-native/gradle-plugin` | 0.81.1 | **0.84.0** |
| `@react-native/typescript-config` | 0.81.1 | **0.84.0** |
| `@types/react` | 19.2.7 | **^19.2.0** (already satisfied) |
| `react-test-renderer` | 19.1.0 | **19.2.3** |

### Engine

| Field | Current | Target |
|-------|---------|--------|
| `engines.node` | >=20 | **>= 22.11.0** |

---

## 2. Android Native Changes

### `android/app/build.gradle`
- Comment-only change: update debuggableVariants comment to mention `"debugOptimized"` variants

### `android/app/src/debug/AndroidManifest.xml`
- **DELETE this file** — cleartext traffic config moves to main manifest

### `android/app/src/main/AndroidManifest.xml`
- **Add** `android:usesCleartextTraffic="${usesCleartextTraffic}"` to `<application>` tag
- This replaces the deleted debug manifest's hardcoded `android:usesCleartextTraffic="true"`

### `android/app/src/main/java/com/fajremr/MainApplication.kt`
**Major refactor** — Replace `DefaultReactNativeHost` pattern with `DefaultReactHost.getDefaultReactHost()`.

Before:
```kotlin
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost

class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost =
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply { ... }
        override fun getJSMainModuleName(): String = "index"
        override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG
        override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCHITECTURE_ENABLED
        override val isHermesEnabled: Boolean = BuildConfig.IS_HERMES_ENABLED
      }
  override val reactHost: ReactHost
    get() = getDefaultReactHost(applicationContext, reactNativeHost)
  ...
}
```

After:
```kotlin
// Remove: ReactNativeHost, ReactPackage, DefaultReactNativeHost imports

class MainApplication : Application(), ReactApplication {
  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here
        },
    )
  }
  ...
}
```

### `android/gradle/wrapper/gradle-wrapper.properties`
- Gradle **8.14.3 → 9.0.0**

### `android/gradle/wrapper/gradle-wrapper.jar`
- Binary update — **do NOT** use `./gradlew wrapper --gradle-version=9.0.0` (it fails, see Section 6). Instead, edit `gradle-wrapper.properties` directly to point to `gradle-9.0.0-bin.zip`. The existing JAR can bootstrap Gradle 9.0.0.

### `android/gradlew`
- Copyright comment update (cosmetic)

---

## 3. iOS Native Changes

### `ios/Podfile`
- **Remove** comment line: `# https://github.com/facebook/react-native/blob/main/packages/react-native/scripts/react_native_pods.rb#L197-L202`

### `ios/FajrEMR.xcodeproj/project.pbxproj`
- **Replace** the "Bundle React Native code and images" build phase script entirely if using Re.Pack/Rock (see Section 6b for the full replacement script — the default `react-native-xcode.sh` doesn't work with Rock)
- **Update** `CODE_SIGN_IDENTITY` from legacy `"iPhone Distribution"` → `"Apple Distribution"` (see Section 6b)
- **Add** `SUPPORTED_PLATFORMS = "iphoneos iphonesimulator"` to Debug and Release build settings
- **Add** `TARGETED_DEVICE_FAMILY = "1,2"` to Debug and Release build settings

### `ios/.xcode.env` (Re.Pack/Rock projects only)
- **Add** `export PATH="$(dirname "$NODE_BINARY"):$PATH"` — ensures Node is on PATH for Rock's child processes
- **Add** `export REACT_NATIVE_PATH="${PODS_ROOT}/../../node_modules/react-native"` — needed by other build phase scripts
- These are required because we bypass `with-environment.sh` (see Section 6b)

### `ios/FajrEMR/Info.plist`
- Already has `CADisableMinimumFrameDurationOnPhone` — no change needed
- **Add** iPad-specific orientation key:
```xml
<key>UISupportedInterfaceOrientations~ipad</key>
<array>
    <string>UIInterfaceOrientationLandscapeLeft</string>
    <string>UIInterfaceOrientationLandscapeRight</string>
    <string>UIInterfaceOrientationPortrait</string>
    <string>UIInterfaceOrientationPortraitUpsideDown</string>
</array>
```
- **Remove** LandscapeLeft and LandscapeRight from phone `UISupportedInterfaceOrientations` (keep Portrait only)

---

## 4. Third-Party Native Dependencies

### CRITICAL: @callstack/repack (^5.2.0 → 5.2.3 + patch)

Re.Pack 5.2.x only officially supports RN 0.80-0.81. On RN 0.84, SWC crashes with:

```
Object rest pattern should be removed by es2018::object_rest_spread pass
```

**Fix**: Apply a patch to `@callstack/repack@5.2.3` that removes two transforms from `SWC_SUPPORTED_NORMAL_RULES` in `dist/loaders/babelSwcLoader/swc.js`:
- Remove `transform-destructuring` (causes SWC panic)
- Remove `transform-async-generator-functions` (incompatible with Hermes V1)

These transforms fall back to Babel instead. Also ensure `@babel/plugin-transform-async-generator-functions` is in Babel config.

Add to root `package.json`:
```json
{
  "pnpm": {
    "patchedDependencies": {
      "@callstack/repack@5.2.3": "patches/@callstack__repack@5.2.3.patch"
    }
  }
}
```

**Tracking**: https://github.com/callstack/repack/issues/1327

### MUST UPGRADE: react-native-reanimated (^4.1.2 → ^4.2.0)

Per the [official compatibility table](https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility/), **RN 0.84 requires Reanimated 4.2.x**. Version 4.1.x does NOT support 0.84.

### MUST UPGRADE: react-native-worklets (^0.6.1 → ^0.7.0)

Required by Reanimated 4.2.x.

### SHOULD UPGRADE: react-native-gesture-handler (^2.29.1 → ^2.30.0)

Library follows "three latest minor RN releases" policy. Version 2.30.0 added RN 0.83 support. Explicit 0.84 support may require 2.31.0 (not yet released). Bump and test.

### LOCKFILE UPDATE: react-native-screens (^4.18.0)

Version 4.21.0+ bumped testing to RN 0.84. The `^4.18.0` range allows resolution to 4.23.0. Run `pnpm update react-native-screens` to ensure lockfile resolves high enough.

### NO ACTION: Other libraries

| Library | Version | Notes |
|---------|---------|-------|
| `react-native-safe-area-context` | ^5.6.2 | Test as-is, watch for 5.7.0+ |
| `@powersync/react-native` | ^1.27.1 | No RN version requirements |
| `@notifee/react-native` | ^9.1.8 | Supports autolinking for RN 0.60+ |
| `react-native-mmkv` | ^4.1.0 | Requires RN 0.75+, satisfied |
| `@shopify/flash-list` | ^2.2.0 | No RN version ceiling |

---

## 5. tsconfig.json

No changes needed — already has `"types": ["jest", "node"]`.

---

## 6. Issues Found During Upgrade & Workarounds

### ISSUE: `react-native-worklets-core` ghost dependency
**Problem**: The project had both `react-native-worklets` (^0.6.1) AND `react-native-worklets-core` (^1.6.2). These are the same library — `react-native-worklets` is the renamed successor of `react-native-worklets-core`. Having both causes duplicate native modules.
**Fix**: Remove `react-native-worklets-core` entirely from `package.json`. Grep confirmed zero source imports of it.

### ISSUE: `settings.gradle` duplicate `includeBuild` is intentional
**Problem**: The `settings.gradle` has `includeBuild('../node_modules/@react-native/gradle-plugin')` on the last line, which appears redundant with the `pluginManagement { includeBuild(...) }` on line 1. The upgrade doc originally suggested removing it.
**Finding**: The RN 0.84 template **keeps** this duplicate. Removing it breaks the build. Both lines serve different purposes (plugin management vs. composite build inclusion).
**Fix**: Do NOT remove the last `includeBuild` line.

### ISSUE: `./gradlew wrapper --gradle-version=9.0.0` fails during project configuration
**Problem**: Running `./gradlew wrapper --gradle-version=9.0.0` downloads Gradle 9.0.0 but then fails with `Could not find com.android.tools.build:gradle:.` because it tries to configure the full project during the wrapper task. The versionless classpath dependencies in `build.gradle` can't be resolved during this task.
**Workaround**: Just edit `gradle-wrapper.properties` directly to point to `gradle-9.0.0-bin.zip`. The existing `gradle-wrapper.jar` from 8.14.3 can bootstrap Gradle 9.0.0 — it's just a downloader. Skip the `./gradlew wrapper` command entirely. A subsequent `./gradlew assembleDebug` will download Gradle 9.0.0 correctly.

### ISSUE: `@react-native/codegen` also needs bumping
**Problem**: The original plan only listed `@react-native/babel-preset`, `eslint-config`, `gradle-plugin`, and `typescript-config` for dev dep bumps. But the project also has `@react-native/codegen` pinned to 0.81.1.
**Fix**: Also bump `@react-native/codegen` from 0.81.1 to 0.84.0.

### ISSUE: `@callstack/repack-plugin-reanimated` peer dep mismatch
**Problem**: After pinning `@callstack/repack` to exact `5.2.3`, the plugin `@callstack/repack-plugin-reanimated@5.2.2` expects `@callstack/repack@5.2.2` (peer dep).
**Impact**: Warning only, non-blocking. The plugin works fine with 5.2.3.

### ISSUE: `pod install` modifies `project.pbxproj` automatically
**Problem**: Running `pod install` with RN 0.84 adds `-DRCT_REMOVE_LEGACY_ARCH=1` to `OTHER_CFLAGS` and `OTHER_CPLUSPLUSFLAGS` in the project-level build configurations. This is expected behavior from the RN 0.84 post_install hook.
**Impact**: No action needed — these are correct flags for New Architecture-only builds.

### ISSUE: MainActivity.kt also needs changes
**Problem**: The original plan only mentioned `MainApplication.kt` for Kotlin changes. But `MainActivity.kt` also needs updating — the `fabricEnabled` import and parameter must be removed since New Architecture is always-on in 0.84.
**Fix**: Remove `import ...DefaultNewArchitectureEntryPoint.fabricEnabled` and the `fabricEnabled` third argument from `DefaultReactActivityDelegate(...)`.

### ISSUE (CRITICAL): Prebuilt iOS binaries cause linker errors with third-party libs
**Problem**: RN 0.84 ships precompiled iOS xcframeworks by default. These prebuilt binaries are **missing C++ symbols** (`facebook::react::Sealable`, `ShadowNode::getDebugName`, `DebugStringConvertible`) that third-party libraries reference. Affected libs include `react-native-svg`, `@react-native-community/datetimepicker`, `react-native-gesture-handler`, and any other library using Fabric/New Architecture C++ APIs.
**Error**: `Undefined symbols for architecture arm64: "facebook::react::Sealable::Sealable()"` + linker command failed.
**Fix**: Disable prebuilt binaries by adding to the Podfile (before `platform :ios`):
```ruby
ENV['RCT_USE_PREBUILT_RNCORE'] = '0'
```
Then run `pod deintegrate && pod install` to rebuild from source.
**Tracking**: https://github.com/facebook/react-native/issues/55544, https://github.com/invertase/react-native-firebase/issues/8883
**Trade-off**: Clean builds will be slower since RN compiles from source. Incremental builds are unaffected.

### ISSUE: SWC parser rejects `@powersync/common` bundle
**Problem**: `@powersync/common/dist/bundle.mjs` contains `"use strict"` inside a function with destructured default parameters (`{ highWaterMark = 100, lowWaterMark = 1 } = {}`). This is technically invalid per the ECMAScript spec. SWC's parser strictly rejects it, while Babel tolerates it.
**Error**: `JavaScript parse error: Illegal 'use strict' directive in function with non-simple parameter list`
**Fix**: In `rspack.config.mjs`, add a separate Babel-only loader rule for `@powersync/common` and exclude it from the main `babel-swc-loader` rule:
```js
// Babel-only for @powersync/common
{
  test: /\.[cm]?[jt]sx?$/,
  include: [/node_modules[/\\]@powersync[/\\]common/],
  type: 'javascript/auto',
  use: {
    loader: 'babel-loader',
    options: { presets: ['module:@react-native/babel-preset'] },
  },
},
// Main rule — add @powersync/common to exclude
{
  test: /\.[cm]?[jt]sx?$/,
  exclude: [/node_modules[/\\]@powersync[/\\]common/],
  // ... rest of babel-swc-loader config
},
```

### ISSUE: IPHONEOS_DEPLOYMENT_TARGET mismatch between Podfile and pbxproj
**Problem**: The Podfile sets `platform :ios, '16.0'` but the pbxproj had `IPHONEOS_DEPLOYMENT_TARGET = 15.1` in all 4 build configurations. This causes linker warnings (`was built for newer 'iOS-simulator' version (16.0) than being linked (15.1)`).
**Fix**: Update all 4 `IPHONEOS_DEPLOYMENT_TARGET` entries in `project.pbxproj` from 15.1 to 16.0 to match the Podfile.

---

## 6b. Issues Found During TestFlight Deployment

These issues surfaced when building a **Release archive** with Fastlane/xcodebuild after the upgrade, but did NOT appear during dev builds.

### ISSUE: Duplicate Apple Distribution certificates cause signing failure
**Problem**: After upgrading, `xcodebuild archive` fails with `Provisioning profile "match AppStore com.fajr.emr" doesn't include signing certificate "Apple Distribution: <name>"`. This happens when the keychain has two certificates with the same name but different SHA-1 hashes. The provisioning profile embeds one certificate, but Xcode picks the other.
**Error**: `error: Provisioning profile "match AppStore com.fajr.emr" doesn't include signing certificate "Apple Distribution: Kyle Essenmacher (RHPLRY9X9P)".`
**Diagnosis**:
```bash
# List all Apple Distribution certs
security find-identity -v -p codesigning | grep "Apple Distribution"
# Check which cert is in the profile
security cms -D -i ~/Library/MobileDevice/Provisioning\ Profiles/<uuid>.mobileprovision | grep -A1 SHA
```
**Fix**: Delete the extra certificate that is NOT in the provisioning profile:
```bash
security delete-certificate -Z <SHA1_OF_WRONG_CERT> ~/Library/Keychains/login.keychain-db
```

### ISSUE: Old-style `CODE_SIGN_IDENTITY` in pbxproj
**Problem**: The pbxproj had `CODE_SIGN_IDENTITY[sdk=iphoneos*] = "iPhone Distribution"` (legacy name) instead of `"Apple Distribution"` (modern name). This can cause Xcode to resolve to the wrong certificate.
**Fix**: Update in `project.pbxproj`:
- Release: `CODE_SIGN_IDENTITY[sdk=iphoneos*]` → `"Apple Distribution"`
- Debug: `CODE_SIGN_IDENTITY[sdk=iphoneos*]` → `"Apple Development"`

### ISSUE: Xcode `react-native-xcode.sh` passes broken `--config-cmd` to Rock/Re.Pack
**Problem**: The default "Bundle React Native code and images" build phase calls `react-native-xcode.sh`, which detects `CONFIG_CMD="dummy-workaround-value"` and passes `--config-cmd dummy-workaround-value` to Rock CLI. Rock/Re.Pack doesn't understand this flag, causing the JS bundle to silently fail.
**Error**: `[CLIError: ENOENT: no such file or directory, open '.../build/generated/ios/index.bundle']` — this is a red herring; the root cause is the broken `--config-cmd` argument.
**Fix**: Replace the build phase script to call Rock CLI directly, bypassing both `react-native-xcode.sh` AND `with-environment.sh` (see below for why). In `project.pbxproj`, replace the "Bundle React Native code and images" `shellScript` with:
```bash
set -euo pipefail
NODE_BINARY=${NODE_BINARY:-$(command -v node)}
BUNDLE_OUTPUT="$BUILT_PRODUCTS_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH/main.jsbundle"
ASSETS_DEST="$BUILT_PRODUCTS_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH"
PROJECT_ROOT="${PROJECT_DIR}/.."
BUNDLE_LOG="$PROJECT_ROOT/build/generated/ios/bundle-debug.log"
if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then
  source "$PODS_ROOT/../.xcode.env"
fi
if [[ -f "$PODS_ROOT/../.xcode.env.local" ]]; then
  source "$PODS_ROOT/../.xcode.env.local"
fi
export PATH="$(dirname "$NODE_BINARY"):$PATH"
export CONFIG_CMD="dummy-workaround-value"
CLI_PATH=$("$NODE_BINARY" --print "require('path').dirname(require.resolve('rock/package.json')) + '/dist/src/bin.js'")
mkdir -p "$(dirname "$BUNDLE_OUTPUT")"
cd "$PROJECT_ROOT"
# Re.Pack requires these placeholder files to exist on startup
mkdir -p build/generated/ios
touch build/generated/ios/index.bundle build/generated/ios/index.bundle.map
echo "Bundling JS to $BUNDLE_OUTPUT"
# Call Rock directly — do NOT use with-environment.sh (it swallows output)
"$NODE_BINARY" "$CLI_PATH" bundle --platform ios --dev false \
  --entry-file index.js --bundle-output "$BUNDLE_OUTPUT" --assets-dest "$ASSETS_DEST" \
  2>&1 | tee -a "$BUNDLE_LOG"
BUNDLE_EXIT=${PIPESTATUS[0]}
if [[ $BUNDLE_EXIT -ne 0 ]] || [[ ! -f "$BUNDLE_OUTPUT" ]]; then
  echo "error: Rock bundle failed (exit $BUNDLE_EXIT). Debug log:" >&2
  cat "$BUNDLE_LOG" >&2
  echo "error: Failed to generate $BUNDLE_OUTPUT" >&2
  exit 1
fi
ls -lh "$BUNDLE_OUTPUT"
```
**Note**: This is the same approach used in the rag-bot app's custom build phase. See the `with-environment.sh` issue below for why we bypass it.

### ISSUE: Re.Pack ENOENT on `build/generated/ios/index.bundle` and `index.bundle.map`
**Problem**: Re.Pack 5.2.x tries to open `build/generated/ios/index.bundle` and `build/generated/ios/index.bundle.map` on startup (possibly for incremental compilation). If these files don't exist, it crashes immediately with `ENOENT` instead of creating them from scratch.
**Error**: `[CLIError: ENOENT: no such file or directory, open '.../build/generated/ios/index.bundle']`
**Fix**: Create empty placeholder files before running `rock bundle`:
```bash
mkdir -p build/generated/ios
touch build/generated/ios/index.bundle build/generated/ios/index.bundle.map
```
This is handled automatically in the custom Xcode build phase script above and in the Node.js deploy script.

### ISSUE: Missing `@babel/plugin-transform-async-generator-functions` in pnpm monorepo
**Problem**: The Re.Pack SWC patch (section 4) removes `transform-async-generator-functions` from `SWC_SUPPORTED_NORMAL_RULES` so it falls back to Babel. But in a pnpm monorepo, Babel can't resolve the plugin because it's not hoisted to where `@babel/core` looks for it.
**Error**: `Error: Cannot find module '@babel/plugin-transform-async-generator-functions'`
**Fix**: Explicitly add it as a dev dependency in the app's `package.json`:
```bash
pnpm add -D @babel/plugin-transform-async-generator-functions
```
This is already documented in section 4 ("ensure `@babel/plugin-transform-async-generator-functions` is in Babel config") but in a pnpm monorepo you must also install the package explicitly.

### ISSUE: `spawnSync` maxBuffer kills xcodebuild in Node.js deploy scripts
**Problem**: If you wrap Fastlane/xcodebuild in a Node.js deploy script using `spawnSync` with piped stdio, the default `maxBuffer` of 1MB is easily exceeded by xcodebuild's verbose output (60+ MB for a full archive). Node silently kills the child process when the buffer overflows.
**Symptom**: Build log is truncated at ~1MB with no error message; build appears to fail randomly during early compilation.
**Fix**: Use async `spawn` instead of `spawnSync` for the Fastlane/xcodebuild command. Stream stdout/stderr to both the console and a log file in real-time:
```javascript
const child = spawn('bash', ['-lc', fastlaneCmd], {
  cwd: ROOT,
  stdio: ['inherit', 'pipe', 'pipe'],
});
child.stdout.on('data', (data) => {
  process.stdout.write(data);   // live console output
  logStream.write(data);         // write to log file
});
child.stderr.on('data', (data) => {
  process.stderr.write(data);
  logStream.write(data);
});
```

### ISSUE: `with-environment.sh` swallows Rock CLI output in Xcode build phases
**Problem**: When calling Rock CLI through React Native's `with-environment.sh` wrapper (`"$WITH_ENVIRONMENT" "$NODE_BINARY" "$CLI_PATH" bundle ...`), the wrapper silently swallows all stdout/stderr from Rock. The bundle command runs but produces zero output — no compilation logs, no error messages, nothing. The resulting `main.jsbundle` is never created, but you get no indication why.
**Symptom**: Debug logs only show "Node found at:" from `with-environment.sh` itself, then nothing. The `2>&1 | tee` redirect captures nothing from Rock. Manual terminal runs of the exact same `rock bundle` command work perfectly.
**Root cause**: `with-environment.sh` is designed for `react-native-xcode.sh` and may exec or redirect in ways that don't pass through Rock's output when called with arbitrary commands.
**Fix**: Bypass `with-environment.sh` entirely. Since the build phase script already sources `.xcode.env` and `.xcode.env.local` to get `NODE_BINARY`, there's no need for the wrapper. Call Rock directly:
```bash
# Instead of:
"$WITH_ENVIRONMENT" "$NODE_BINARY" "$CLI_PATH" bundle ...
# Do:
"$NODE_BINARY" "$CLI_PATH" bundle ...
```
Also ensure `PATH` includes the Node binary's directory so Rock's child processes can find Node:
```bash
export PATH="$(dirname "$NODE_BINARY"):$PATH"
```

### ISSUE: `.xcode.env` missing `PATH` and `REACT_NATIVE_PATH` exports
**Problem**: The default RN 0.84 `.xcode.env` only exports `NODE_BINARY`. When bypassing `with-environment.sh` (see above), other build phase scripts may fail because `REACT_NATIVE_PATH` is undefined, and Rock's child processes can't find Node because it's not on `PATH`.
**Fix**: Update `ios/.xcode.env` to export all three variables:
```bash
export NODE_BINARY=$(command -v node)
export PATH="$(dirname "$NODE_BINARY"):$PATH"
export REACT_NATIVE_PATH="${PODS_ROOT}/../../node_modules/react-native"
```
The `.xcode.env.local` file should still override `NODE_BINARY` with the absolute path for your machine (e.g., `export NODE_BINARY=/Users/you/.nvm/versions/node/v20.18.2/bin/node`).

### ISSUE: Fastlane `rock_beta` / `rock_release` lanes need manual signing params
**Problem**: After upgrading, `xcodebuild archive` in the Fastfile fails with provisioning profile errors because it defaults to automatic signing, which doesn't match the `match` managed profiles.
**Fix**: Add explicit manual signing parameters to the `xcodebuild archive` command in the Fastfile:
```ruby
sh("cd .. && xcodebuild -workspace FajrEMR.xcworkspace -scheme FajrEMR \
  -configuration Release -destination 'generic/platform=iOS' \
  -archivePath ../.rock/cache/ios/archive/FajrEMR.xcarchive \
  CODE_SIGN_STYLE=Manual \
  'CODE_SIGN_IDENTITY=Apple Distribution' \
  'PROVISIONING_PROFILE_SPECIFIER=match AppStore com.fajr.emr' \
  DEVELOPMENT_TEAM=RHPLRY9X9P \
  archive")
```
Replace `com.fajr.emr` and team ID with your values. The key additions are `CODE_SIGN_STYLE=Manual`, `CODE_SIGN_IDENTITY`, `PROVISIONING_PROFILE_SPECIFIER`, and `DEVELOPMENT_TEAM`.

---

## 7. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Re.Pack SWC crash on RN 0.84 | **HIGH** | Apply community patch before upgrade |
| Gradle 9.0.0 breaking native deps | **MEDIUM** | Test Android build early; may need Gradle config adjustments |
| Node >= 22.11.0 requirement | **LOW** | Update `.nvmrc`, install Node 22 |
| Gesture handler missing 0.84 support | **LOW** | Bump to 2.30.0, test, watch for 2.31.0 |

---

## 8. Post-Upgrade Checklist

### Core Upgrade
- [ ] Update Node.js to >= 22.11.0 (update `.nvmrc`)
- [ ] Apply Re.Pack SWC patch (Section 4)
- [ ] Install `@babel/plugin-transform-async-generator-functions` explicitly (Section 6b)
- [ ] Bump all package versions per tables in Section 1
- [ ] Bump `@react-native/codegen` too (Section 6)
- [ ] Remove `react-native-worklets-core` if present (Section 6)
- [ ] Apply Android native changes — MainApplication.kt, MainActivity.kt, manifests, Gradle (Section 2)
- [ ] Apply iOS native changes — Podfile (`RCT_USE_PREBUILT_RNCORE=0`), pbxproj, Info.plist (Section 3)
- [ ] Update `IPHONEOS_DEPLOYMENT_TARGET` in pbxproj to match Podfile (Section 6)
- [ ] Run `pnpm install`
- [ ] `cd ios && pod deintegrate && pod install` (deintegrate needed for prebuilt binary change)

### Dev Build Verification
- [ ] Test Android build: `pnpm android`
- [ ] Test iOS build: `pnpm ios`
- [ ] Verify PowerSync connectivity
- [ ] Verify Re.Pack HMR / dev server
- [ ] Verify camera, image picker, MMKV storage
- [ ] Verify Reanimated animations (bottom sheets, transitions)
- [ ] Run full test suite

### TestFlight / Release Deployment (Re.Pack/Rock projects)
- [ ] Update `ios/.xcode.env` to export `PATH` and `REACT_NATIVE_PATH` (Section 6b)
- [ ] Update `ios/.xcode.env.local` with correct `NODE_BINARY` path for your machine
- [ ] Replace "Bundle React Native code and images" build phase script in pbxproj (Section 6b)
- [ ] Update `CODE_SIGN_IDENTITY` from `"iPhone Distribution"` → `"Apple Distribution"` in pbxproj (Section 6b)
- [ ] Check for duplicate Apple Distribution certificates in Keychain (Section 6b)
- [ ] Add manual signing params to Fastfile xcodebuild archive command (Section 6b)
- [ ] Set up Node.js deploy script with async spawn for log streaming (Section 6b)
- [ ] Create Re.Pack placeholder files (`build/generated/ios/index.bundle{,.map}`) in deploy script (Section 6b)
- [ ] Test full TestFlight deploy end-to-end
