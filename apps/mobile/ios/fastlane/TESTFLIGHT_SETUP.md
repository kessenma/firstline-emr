# TestFlight Deployment Setup Guide

This guide will help you set up automated TestFlight deployment for the Fajr EMR mobile app.

## Prerequisites

1. **Apple Developer Account**: You need an active Apple Developer Program membership
2. **App Store Connect Access**: Access to App Store Connect with the appropriate role
3. **Ruby**: Version specified in `.ruby-version` file
4. **Bundler**: Install with `gem install bundler`
5. **Node.js**: For running version bump scripts
6. **Xcode**: Latest stable version

## Initial Setup

### 1. Install Dependencies

```bash
# Install Ruby gems (including Fastlane)
bundle install

# Install Node modules (if not already done)
npm install

# Install CocoaPods dependencies
cd ios && pod install && cd ..
```

### 2. Configure App Store Connect API Key

The recommended approach is to use App Store Connect API Keys for automation (especially for CI/CD).

1. Go to [App Store Connect](https://appstoreconnect.apple.com/access/api)
2. Click "Keys" under "Integrations"
3. Click the "+" button to create a new key
4. Give it a name (e.g., "Fastlane Deploy Key")
5. Select "Developer" or "Admin" role
6. Download the API Key file (e.g., `AuthKey_9Q42867745.p8`)
7. Save the **Key ID** and **Issuer ID**

### 3. Configure Environment Variables

```bash
# Copy the template
cp ios/fastlane/.env.template ios/fastlane/.env

# Edit the .env file with your values
# IMPORTANT: Never commit this file!
```

Edit `ios/fastlane/.env` with your actual values:

```env
APPLE_ID=your-apple-id@example.com
TEAM_ID=YOUR_TEAM_ID
ITUNES_CONNECT_TEAM_ID=YOUR_TEAM_ID

APP_STORE_CONNECT_API_KEY_ID=YOUR_KEY_ID
APP_STORE_CONNECT_ISSUER_ID=YOUR_ISSUER_ID
APP_STORE_CONNECT_API_PRIVATE_KEY_PATH=./AuthKey_XXXXXXXXXX.p8

APP_IDENTIFIER=com.fajr.emr

SKIP_WAITING_FOR_BUILD_PROCESSING=true
DISTRIBUTE_EXTERNAL=false
NOTIFY_EXTERNAL_TESTERS=false
```

### 4. Place API Key File

Move your downloaded API Key file to `ios/fastlane/`:

```bash
mv ~/Downloads/AuthKey_XXXXXXXXXX.p8 ios/fastlane/
```

Update the path in `.env` if needed.

### 5. Update Bundle Identifier

Make sure your app's bundle identifier matches what you've configured:

1. Open `ios/FajrEMR.xcworkspace` in Xcode
2. Select the FajrEMR target
3. Update the Bundle Identifier to match your `.env` file (e.g., `com.fajr.emr`)
4. Also update in `ios/fastlane/Appfile` if needed

### 6. Initialize Version Tracking

```bash
node scripts/bump-ios-version.js init
```

This creates an `ios-version.json` file to track your app version.

## Usage

### Deploy to TestFlight (Recommended)

This is the simplest way to deploy. It uses Rock to build and Fastlane to upload:

```bash
npm run deploy:ios:upload-testflight
```

This command will:
1. Show current version info
2. Build the app with Rock
3. Upload to TestFlight
4. Provide a link to App Store Connect

### Alternative: Manual Build + Upload

```bash
# Step 1: Build with Rock
rock build:ios --configuration Release --destination generic/platform=iOS

# Step 2: Upload to TestFlight
npm run deploy:ios:upload-testflight
```

### Version Management

```bash
# Show current version
node scripts/bump-ios-version.js current

# Bump patch version (1.0.0 -> 1.0.1)
node scripts/bump-ios-version.js bump patch

# Bump minor version (1.0.1 -> 1.1.0)
node scripts/bump-ios-version.js bump minor

# Bump major version (1.1.0 -> 2.0.0)
node scripts/bump-ios-version.js bump major
```

Note: Build number is automatically incremented with each version bump.

### Full Deploy with Version Bump

```bash
# Automatically bump version and deploy
npm run deploy:ios:rock-beta
```

## Available NPM Scripts

### Deployment Scripts

- `npm run deploy:ios:upload-testflight` - Upload pre-built IPA to TestFlight
- `npm run deploy:ios:rock-beta` - Build with Rock and upload to TestFlight
- `npm run deploy:ios:build` - Build app with Fastlane only (manual signing)
- `npm run deploy:ios:beta` - Build and upload with Fastlane (not using Rock)

### Version Management

- `npm run deploy:ios:bump-build` - Increment build number
- `npm run deploy:ios:bump-patch` - Increment patch version
- `npm run version:ios` - Show current version

## Environment Variables Reference

### Required

- `APP_STORE_CONNECT_API_KEY_ID`: Your App Store Connect API Key ID
- `APP_STORE_CONNECT_ISSUER_ID`: Your App Store Connect Issuer ID
- `APP_STORE_CONNECT_API_PRIVATE_KEY_PATH`: Path to your .p8 API key file
- `TEAM_ID`: Your Apple Developer Team ID
- `APP_IDENTIFIER`: Your app's bundle identifier

### Optional

- `APPLE_ID`: Your Apple ID email (for non-API authentication)
- `SKIP_WAITING_FOR_BUILD_PROCESSING`: Skip waiting for Apple to process build (default: true)
- `DISTRIBUTE_EXTERNAL`: Automatically distribute to external testers (default: false)
- `NOTIFY_EXTERNAL_TESTERS`: Send notification to external testers (default: false)
- `BUMP_MARKETING_VERSION`: Set to '1' to bump marketing version
- `BUMP_MARKETING_VERSION_BUMP_TYPE`: 'patch', 'minor', or 'major'

## Troubleshooting

### "IPA not found" Error

Make sure you've built the app first:

```bash
rock build:ios --configuration Release --destination generic/platform=iOS
```

The IPA should be at: `.rock/cache/ios/export/FajrEMR.ipa`

### "API key file not found" Error

1. Check that the .p8 file exists in `ios/fastlane/`
2. Verify the path in `ios/fastlane/.env` is correct
3. The path should be relative to the `ios/fastlane/` directory

### Ruby Version Issues

```bash
# Check your Ruby version
ruby -v

# Install the required version (using rbenv)
rbenv install $(cat .ruby-version)
rbenv local $(cat .ruby-version)

# Or using mise
mise install ruby@$(cat .ruby-version)
mise use ruby@$(cat .ruby-version)
```

### Bundle Install Fails

```bash
# Try with force
bundle install --force

# Or skip during deployment
SKIP_BUNDLE_INSTALL=1 npm run deploy:ios:upload-testflight
```

### CocoaPods `Encoding::CompatibilityError` / fastlane UTF-8 warning

Symptoms — `pod install` aborts with:

```
Unicode Normalization not appropriate for ASCII-8BIT (Encoding::CompatibilityError)
```

or every fastlane run prints `WARNING: fastlane requires your locale to be set to UTF-8`.

Cause: `LANG` is empty. macOS populates `LANG` only from Terminal.app's "Set locale
environment variables on startup" preference — it is **not** set by the OS itself. So
the value depends on how the deploy was launched (terminal vs. VS Code task vs. cron)
and on each machine's shell config. `bash -lc`, which `scripts/deploy-testflight.js`
uses to invoke fastlane, reads `~/.bash_profile` → `~/.bash_login` → `~/.profile` — it
never reads your zsh config, so setting `LANG` only in `.zshrc` is not enough.

The repo now pins it in two places so the build behaves the same everywhere:
`scripts/deploy-testflight.js` and `scripts/ensure-ios-deps.sh`. If you hit this from a
command those don't cover, set it for your shell:

```bash
# ~/.zshenv (zsh, all contexts) and/or ~/.profile (what `bash -lc` reads)
export LANG="${LANG:-en_US.UTF-8}"
export LC_ALL="${LC_ALL:-en_US.UTF-8}"
```

Verify with `bash -lc 'echo "[$LANG]"'` — an empty result means it is still unset.

### Code Signing Issues

1. Make sure you have the correct certificates and provisioning profiles
1. Make sure your Bundle ID (e.g., `com.fajr.emr`) matches in:
   - Xcode project settings
   - `ios/fastlane/Appfile`
   - `ios/fastlane/.env`
3. You may need to update the `PROVISIONING_PROFILE_SPECIFIER` in the Fastfile

## Deploying From a Second Machine

Most of what a deploy needs is either in the repo or already on the machine. Only a
short list is genuinely per-machine, and none of it is in git — so a fresh Mac needs
these copied over by hand (AirDrop, 1Password, etc.):

| Item | Where | Why it is not in git |
|---|---|---|
| `AuthKey_<KEY_ID>.p8` | `ios/fastlane/` | gitignored (`**/fastlane/*.p8`) |
| `.env` | `ios/fastlane/` | gitignored — key ID, issuer ID, team ID |
| `.match.env` | `ios/fastlane/` | gitignored — holds `MATCH_PASSWORD` |
| Distribution cert + private key | login keychain | installed by `pnpm fastlane:sync` |
| `match AppStore com.fajr.emr` profile | `~/Library/MobileDevice/Provisioning Profiles` | installed by `pnpm fastlane:sync` |

Machine-specific values inside `.match.env` — `KEYCHAIN_NAME` and `KEYCHAIN_PASSWORD`
are that machine's **login keychain** password. Copying `.match.env` verbatim from
another Mac leaves the wrong password there, and `pnpm fastlane:sync` will fail at
`security unlock-keychain` before it does anything useful. Update it after copying.

`rock_beta` and `rock_release` do not call `match` or `unlock_keychain`, so if the cert
and profile are already installed and unexpired you can deploy without running
`fastlane:sync` at all — and the stale keychain password will not matter.

Also confirm before the first deploy on a new machine:

- **Xcode is a release build, not a beta.** App Store Connect rejects binaries built
  with a developer-preview Xcode. Check with `xcodebuild -version`.
- **Locale is UTF-8** — see the troubleshooting entry above.
- **Node is installed at the `.nvmrc` version** — run `nvm install` once. You do *not*
  need to `nvm use` before deploying, and you do not need to change your global nvm
  default: `scripts/deploy-testflight.js` switches to the pinned version for the
  processes it spawns. That switch cannot escape those child processes, so your shell
  and every other project on the machine keep whatever node they were using — nothing
  is modified and nothing needs restoring afterwards. If the pinned version isn't
  installed, the deploy stops before building with instructions rather than failing
  halfway through. Ruby must match `.ruby-version`.
- **Build number is ahead of TestFlight.** The lane bumps from `ios-version.json`, which
  is committed — if your checkout is behind `main`, the bumped number may already exist
  on TestFlight and Apple will reject the upload as a duplicate.

## CI/CD Integration

For GitHub Actions or other CI/CD platforms:

1. Store secrets as environment variables:
   - `APP_STORE_CONNECT_API_KEY_ID`
   - `APP_STORE_CONNECT_ISSUER_ID`
   - `APP_STORE_CONNECT_API_KEY_CONTENT` (base64 encoded .p8 file)
   - `TEAM_ID`

2. In your CI script, decode and save the API key:

```bash
echo "$APP_STORE_CONNECT_API_KEY_CONTENT" | base64 -d > ios/fastlane/AuthKey.p8
export APP_STORE_CONNECT_API_PRIVATE_KEY_PATH=./AuthKey.p8
```

3. Run the deployment:

```bash
npm run deploy:ios:rock-beta
```

## Next Steps

1. Test the deployment process in a development environment
2. Set up external testers in App Store Connect
3. Configure automatic distribution if desired
4. Set up CI/CD pipeline for automated deployments

## Resources

- [Fastlane Documentation](https://docs.fastlane.tools/)
- [App Store Connect API](https://developer.apple.com/app-store-connect/api/)
- [TestFlight Beta Testing](https://developer.apple.com/testflight/)
- [Rock Documentation](https://rock-docs.callstack.com/)

## Support

If you encounter issues:

1. Check the build logs in `build-logs/` directory
2. Review Fastlane logs for detailed error messages
3. Ensure all prerequisites are properly installed
4. Verify your App Store Connect API credentials