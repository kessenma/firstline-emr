# Deployment Guide for Fajr EMR Mobile App

## Fastlane Match Setup (Code Signing)

### Prerequisites

1. **Ruby environment**: Use rbenv with the version specified in `.ruby-version`
2. **Bundler**: Install with `gem install bundler`
3. **Access to Fajr-mobile-certs repository**: `git@github-work:YOUR_ORG/YOUR_CERTS_REPO.git`

### Initial Setup

#### 1. Configure Environment Variables

Copy the template and fill in your values:

```bash
cp ios/fastlane/.match.env.template ios/fastlane/.match.env
```

Edit `ios/fastlane/.match.env` with your actual values:

```bash
export MATCH_GIT_URL=git@github-work:YOUR_ORG/YOUR_CERTS_REPO.git
export APPLE_ID='your-apple-id@example.com'
export TEAM_ID='YOUR_TEAM_ID'
export APP_IDENTIFIER='com.fajr.emr'
export KEYCHAIN_NAME='login.keychain'
export KEYCHAIN_PASSWORD='your-keychain-password'
export MATCH_PASSWORD='your-match-encryption-password'

# App Store Connect API
export APP_STORE_CONNECT_API_KEY_ID='YOUR_KEY_ID'
export APP_STORE_CONNECT_ISSUER_ID='YOUR_ISSUER_ID'
export APP_STORE_CONNECT_API_PRIVATE_KEY_PATH='./AuthKey_XXXXX.p8'
```

**Important**: Add `ios/fastlane/.match.env` to your `.gitignore` (it should already be there)

#### 2. Generate FASTLANE_SESSION (First Time Only)

This is needed for Apple 2FA authentication:

```bash
npm run fastlane:init-session
```

Follow the prompts to authenticate with your Apple ID and 2FA code. The session will be saved to `ios/fastlane/.fastlane_session`.

#### 3. Generate Certificates and Provisioning Profiles

For initial setup (creates new certificates):

```bash
npm run fastlane:setup
```

This will:
- Generate App Store and Development certificates
- Create provisioning profiles
- Encrypt everything with your `MATCH_PASSWORD`
- Push to the `Fajr-mobile-certs` repository

#### 4. Sync Certificates on New Machines

On a new machine or for team members (readonly mode):

```bash
npm run fastlane:sync
```

This downloads existing certificates without creating new ones.

### Available Fastlane Commands

#### Fastlane Match (Code Signing)

```bash
# Initialize Apple session (first time / when expired)
npm run fastlane:init-session

# Setup certificates (creates new ones)
npm run fastlane:setup

# Sync certificates (readonly, for new machines)
npm run fastlane:sync
```

#### Build & Deploy

```bash
# Build locally
npm run deploy:ios:build

# Build and upload to TestFlight
npm run deploy:ios:beta

# Upload existing IPA to TestFlight
npm run deploy:ios:upload-testflight

# Upload to App Store Connect
npm run deploy:ios:upload-appstore

# Build with Rock and upload to TestFlight (end-to-end)
npm run deploy:ios:rock-beta

# Build with Rock and upload to App Store (end-to-end)
npm run deploy:ios:rock-release
```

#### Version Management

```bash
# Show current version
npm run version:ios

# Bump patch version (e.g., 1.0.0 -> 1.0.1)
npm run version:ios:bump

# Bump minor version (e.g., 1.0.0 -> 1.1.0)
npm run version:ios:bump:minor

# Bump major version (e.g., 1.0.0 -> 2.0.0)
npm run version:ios:bump:major

# Bump build number only
npm run deploy:ios:bump-build
```

#### Clean

```bash
# Clean fastlane build artifacts
npm run deploy:ios:clean
```

### Troubleshooting

#### "Git repository not found"

Ensure:
- The `Fajr-mobile-certs` repository exists on GitHub
- You have SSH access: `ssh -T git@github-work`
- Your git remote is correctly configured for the work account

#### "Decryption failed"

Ensure:
- The `MATCH_PASSWORD` in `.match.env` is correct
- You're using the same password that was used during initial setup

#### "No matching provisioning profiles found"

Run the setup again to generate profiles:
```bash
npm run fastlane:setup
```

#### Certificate/Profile not found in Xcode

1. Sync certificates: `npm run fastlane:sync`
2. In Xcode, go to **Signing & Capabilities**
3. Select the correct provisioning profile (e.g., "match AppStore com.fajr.emr")

#### Session expired

Re-generate the FASTLANE_SESSION:
```bash
npm run fastlane:init-session
```

### Security Best Practices

1. **Never commit** `.match.env` or `.fastlane_session` files
2. **Store** `MATCH_PASSWORD` securely (e.g., 1Password, LastPass)
3. **Use readonly mode** in CI/CD: `npm run fastlane:sync`
4. **Rotate credentials** regularly
5. **Keep** `Fajr-mobile-certs` repository private

### Resources

- [Fastlane Match Documentation](https://docs.fastlane.tools/actions/match/)
- [Fajr-mobile-certs Repository](https://github.com/YOUR_ORG/YOUR_CERTS_REPO)
- [Code Signing Guide](https://codesigning.guide/)

---

# Deployment Guide for Fajr EMR Mobile App (Continued)

This guide covers the complete deployment process for the Fajr EMR mobile application to TestFlight and the App Store.

## Quick Start

If you've already completed setup, deploying to TestFlight is simple:

```bash
npm run deploy:ios:upload-testflight
```

For first-time setup, follow the detailed instructions below.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Deployment Commands](#deployment-commands)
4. [Version Management](#version-management)
5. [CI/CD Integration](#cicd-integration)
6. [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

- **macOS**: Required for iOS development
- **Xcode**: Latest stable version
- **Ruby**: Version specified in `.ruby-version` (use rbenv or mise)
- **Bundler**: `gem install bundler`
- **Node.js**: v20 or higher
- **CocoaPods**: Installed via Bundler

### Required Accounts & Access

- **Apple Developer Program** membership ($99/year)
- **App Store Connect** access with appropriate permissions
- Access to your team's certificates and provisioning profiles

## Initial Setup

### Step 1: Install Dependencies

```bash
# Install Node dependencies
npm install

# Install Ruby gems (including Fastlane)
bundle install

# Install CocoaPods dependencies
cd ios && pod install && cd ..
```

### Step 2: Configure App Store Connect API

#### Generate API Key

1. Go to [App Store Connect API Keys](https://appstoreconnect.apple.com/access/api)
2. Click **"Keys"** under the Integrations section
3. Click the **"+"** button to create a new key
4. Give it a descriptive name (e.g., "Fastlane Deploy Key")
5. Select **"Admin"** or **"App Manager"** role
6. Click **"Generate"**
7. **Download the API Key file** (e.g., `AuthKey_9Q42867745.p8`)
   - ⚠️ You can only download this once!
8. Note the **Key ID** and **Issuer ID** shown on the page

#### Store API Key

```bash
# Move the downloaded API key to the fastlane directory
mv ~/Downloads/AuthKey_XXXXXXXXXX.p8 ios/fastlane/

# Verify it's there
ls -la ios/fastlane/*.p8
```

### Step 3: Configure Environment Variables

```bash
# Copy the template
cp ios/fastlane/.env.template ios/fastlane/.env

# Edit with your values
nano ios/fastlane/.env  # or use your preferred editor
```

**Update these values in `ios/fastlane/.env`:**

```env
# Your Apple Developer Account email
APPLE_ID=your-email@example.com

# Your Team ID (find it at https://developer.apple.com/account)
TEAM_ID=XXXXXXXXXX

# App Store Connect API credentials
APP_STORE_CONNECT_API_KEY_ID=YOUR_KEY_ID_HERE
APP_STORE_CONNECT_ISSUER_ID=YOUR_ISSUER_ID_HERE
APP_STORE_CONNECT_API_PRIVATE_KEY_PATH=./AuthKey_XXXXXXXXXX.p8

# Your app's bundle identifier
APP_IDENTIFIER=com.fajr.emr

# TestFlight settings
SKIP_WAITING_FOR_BUILD_PROCESSING=true
DISTRIBUTE_EXTERNAL=false
NOTIFY_EXTERNAL_TESTERS=false
```

**Finding your Team ID:**
- Go to [Apple Developer Account](https://developer.apple.com/account)
- Click "Membership" in the sidebar
- Your Team ID is listed there

### Step 4: Update Bundle Identifier

Ensure your app uses the correct bundle identifier:

1. Open Xcode: `open ios/FajrEMR.xcworkspace`
2. Select the **FajrEMR** target in the project navigator
3. Go to the **Signing & Capabilities** tab
4. Update **Bundle Identifier** to match your `.env` file
5. Verify your team is selected under **Team**

### Step 5: Initialize Version Tracking

```bash
# Initialize version tracking
node scripts/bump-ios-version.js init

# Verify version was created
node scripts/bump-ios-version.js current
```

### Step 6: Test Your Setup

```bash
# Check if all dependencies are installed
./scripts/ensure-ios-deps.sh

# Verify Fastlane can authenticate
cd ios && bundle exec fastlane ios test && cd ..
```

## Deployment Commands

### TestFlight Deployment (Recommended)

The simplest way to deploy to TestFlight:

```bash
# Build with Rock and upload to TestFlight
npm run deploy:ios:upload-testflight
```

This command:
1. Shows current app version and build number
2. Checks for pre-built IPA from Rock
3. Uploads to TestFlight via Fastlane
4. Provides link to App Store Connect

### Full Build and Deploy

If you need to build fresh before uploading:

```bash
# Build with Rock first
rock build:ios --configuration Release --destination generic/platform=iOS

# Then upload to TestFlight
npm run deploy:ios:upload-testflight
```

### Automated Build + Deploy

For a fully automated build and deploy:

```bash
# This will bump version, build, and upload in one command
npm run deploy:ios:rock-beta
```

### App Store Deployment

For production releases to the App Store:

```bash
# Build and upload to App Store Connect
npm run deploy:ios:rock-release
```

After upload, you'll need to:
1. Go to [App Store Connect](https://appstoreconnect.apple.com/)
2. Fill in required metadata and screenshots
3. Submit for review

## Version Management

### View Current Version

```bash
npm run version:ios
```

Output example:
```
📱 App Version: 1.0.0
🔢 Build Number: 1
📋 Full Version: 1.0.0 (1)
```

### Bump Versions

```bash
# Bump patch version: 1.0.0 -> 1.0.1 (and increment build)
npm run version:ios:bump

# Bump minor version: 1.0.1 -> 1.1.0 (and increment build)
npm run version:ios:bump:minor

# Bump major version: 1.1.0 -> 2.0.0 (and increment build)
npm run version:ios:bump:major
```

**Note:** Build number automatically increments with each version bump.

### Using Fastlane Lanes Directly

```bash
cd ios

# Bump only build number
bundle exec fastlane bump_build

# Bump patch version
bundle exec fastlane bump_version_patch

# Bump minor version
bundle exec fastlane bump_version_minor

# Bump major version
bundle exec fastlane bump_version_major
```

## Available NPM Scripts

### Main Deployment Scripts

| Command | Description |
|---------|-------------|
| `npm run deploy:ios:upload-testflight` | Upload pre-built IPA to TestFlight |
| `npm run deploy:ios:rock-beta` | Full build + TestFlight upload |
| `npm run deploy:ios:rock-release` | Full build + App Store upload |

### Build Scripts

| Command | Description |
|---------|-------------|
| `npm run deploy:ios:build` | Build with Fastlane (manual signing) |
| `npm run deploy:ios:beta` | Build and upload with Fastlane |

### Version Scripts

| Command | Description |
|---------|-------------|
| `npm run version:ios` | Show current version |
| `npm run version:ios:bump` | Bump patch version |
| `npm run version:ios:bump:minor` | Bump minor version |
| `npm run version:ios:bump:major` | Bump major version |
| `npm run deploy:ios:bump-build` | Increment build number only |
| `npm run deploy:ios:bump-patch` | Same as version:ios:bump |

### Utility Scripts

| Command | Description |
|---------|-------------|
| `npm run deploy:ios:clean` | Clean build artifacts |

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/deploy-ios.yml`:

```yaml
name: Deploy iOS to TestFlight

on:
  push:
    branches:
      - main
  workflow_dispatch:

jobs:
  deploy:
    runs-on: macos-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.4.2'
          bundler-cache: true
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: |
          npm install
          cd ios && pod install && cd ..
      
      - name: Decode API Key
        run: |
          echo "${{ secrets.APP_STORE_CONNECT_API_KEY }}" | base64 -d > ios/fastlane/AuthKey.p8
      
      - name: Build and Deploy to TestFlight
        env:
          APP_STORE_CONNECT_API_KEY_ID: ${{ secrets.APP_STORE_CONNECT_API_KEY_ID }}
          APP_STORE_CONNECT_ISSUER_ID: ${{ secrets.APP_STORE_CONNECT_ISSUER_ID }}
          APP_STORE_CONNECT_API_PRIVATE_KEY_PATH: ./AuthKey.p8
          TEAM_ID: ${{ secrets.TEAM_ID }}
          SKIP_WAITING_FOR_BUILD_PROCESSING: true
        run: npm run deploy:ios:rock-beta
```

### Required GitHub Secrets

Add these secrets to your GitHub repository:

- `APP_STORE_CONNECT_API_KEY`: Base64 encoded .p8 file
  ```bash
  base64 < ios/fastlane/AuthKey_XXXXXXXXXX.p8 | pbcopy
  ```
- `APP_STORE_CONNECT_API_KEY_ID`: Your API Key ID
- `APP_STORE_CONNECT_ISSUER_ID`: Your Issuer ID
- `TEAM_ID`: Your Apple Developer Team ID

## Troubleshooting

### Common Issues

#### 1. "IPA not found" Error

**Solution:**
```bash
# Make sure to build first
rock build:ios --configuration Release --destination generic/platform=iOS

# Verify IPA exists
ls -la .rock/cache/ios/export/FajrEMR.ipa
```

#### 2. "API key file not found"

**Solution:**
```bash
# Check if file exists
ls -la ios/fastlane/*.p8

# Verify path in .env is correct (should be relative)
cat ios/fastlane/.env | grep KEY_PATH
```

#### 3. Ruby Version Mismatch

**Solution:**
```bash
# Install correct Ruby version
rbenv install $(cat .ruby-version)
rbenv local $(cat .ruby-version)

# Or with mise
mise install ruby@$(cat .ruby-version)
mise use ruby@$(cat .ruby-version)

# Verify
ruby -v
```

#### 4. Code Signing Issues

**Solution:**
1. Open Xcode and ensure your team is selected
2. Go to Signing & Capabilities
3. Enable "Automatically manage signing"
4. Or configure manual signing with proper provisioning profiles

#### 5. Bundle Install Fails

**Solution:**
```bash
# Try with force
bundle install --force

# Or skip during deployment
SKIP_BUNDLE_INSTALL=1 npm run deploy:ios:upload-testflight
```

#### 6. CocoaPods Issues

**Solution:**
```bash
# Clean and reinstall
cd ios
rm -rf Pods Podfile.lock
pod install --repo-update
cd ..
```

### Getting Help

1. Check build logs in `build-logs/` directory
2. Review Fastlane output for detailed error messages
3. Verify all environment variables are set correctly
4. Check [Fastlane Documentation](https://docs.fastlane.tools/)

## Best Practices

### Version Numbering

- **Major** (X.0.0): Breaking changes or major new features
- **Minor** (1.X.0): New features, backward compatible
- **Patch** (1.0.X): Bug fixes and minor improvements
- **Build**: Automatically incremented with each deployment

### TestFlight Testing

1. Start with internal testing (your team)
2. Add external testers gradually
3. Use TestFlight's feedback features
4. Monitor crash reports in App Store Connect

### Release Checklist

- [ ] All tests passing
- [ ] Version number updated appropriately
- [ ] Release notes prepared
- [ ] Screenshots updated (if needed)
- [ ] Privacy policy reviewed
- [ ] App metadata current in App Store Connect
- [ ] Build tested on multiple devices/iOS versions
- [ ] All critical bugs resolved

## Security Notes

⚠️ **Never commit these files:**
- `ios/fastlane/.env`
- `ios/fastlane/*.p8` (API key files)
- `ios/fastlane/.fastlane_session`

✅ **Safe to commit:**
- `ios/fastlane/.env.template`
- `ios/fastlane/Fastfile`
- `ios/fastlane/Appfile`
- `ios-version.json`

## Resources

- [Fastlane Documentation](https://docs.fastlane.tools/)
- [App Store Connect Help](https://help.apple.com/app-store-connect/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)
- [Rock Documentation](https://rock-docs.callstack.com/)
- [React Native iOS Guide](https://reactnative.dev/docs/running-on-device)

## Support

For deployment issues specific to this project, check:
- `ios/fastlane/TESTFLIGHT_SETUP.md` - Detailed setup guide
- Build logs in `build-logs/` directory
- Fastlane logs for detailed error information

For general questions:
- Fastlane Slack: [fastlane.tools](https://fastlane.tools/)
- React Native Community
- Stack Overflow (tag: fastlane, react-native)