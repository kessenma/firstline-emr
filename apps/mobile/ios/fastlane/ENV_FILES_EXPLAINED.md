# Environment Files Explained

This directory uses **two separate environment files** for different purposes:

## 📄 File 1: `.env` (App Store Connect API)

**Purpose**: Used by Fastlane for automated uploads to TestFlight and App Store Connect

**Used by**: 
- `Fastfile` lanes (beta, release, upload_rock_testflight, etc.)
- Any Fastlane action that interacts with App Store Connect

**Contains**:
```bash
APP_STORE_CONNECT_API_KEY_ID=YOUR_KEY_ID
APP_STORE_CONNECT_ISSUER_ID=YOUR_ISSUER_ID
APP_STORE_CONNECT_API_PRIVATE_KEY_PATH=./AuthKey_XXXXX.p8
DEVELOPER_TEAM_ID=YOUR_TEAM_ID
APP_IDENTIFIER=com.fajr.emr
SKIP_WAITING_FOR_BUILD_PROCESSING=true
DISTRIBUTE_EXTERNAL=false
NOTIFY_EXTERNAL_TESTERS=false
```

**How to configure**:
1. Get API key from: https://appstoreconnect.apple.com/access/api
2. Download the `.p8` file and place it in this directory
3. Fill in the values in `.env`

## 📄 File 2: `.match.env` (Match/Certificate Management)

**Purpose**: Used by bash scripts for certificate management with Fastlane Match

**Used by**:
- `scripts/fastlane-session.sh`
- `scripts/fastlane-match-setup.sh`
- `scripts/fastlane-match-readonly.sh`

**Contains** (with `export` statements for bash):
```bash
export MATCH_GIT_URL=git@github-work:YOUR_ORG/YOUR_CERTS_REPO.git
export APPLE_ID='you@example.com'
export TEAM_ID='YOUR_TEAM_ID'
export APP_IDENTIFIER='com.fajr.emr'
export KEYCHAIN_NAME='login.keychain'
export KEYCHAIN_PASSWORD='your-keychain-password'
export FASTLANE_SESSION="$(cat ios/fastlane/.fastlane_session)"
export MATCH_KEYCHAIN_NAME="$KEYCHAIN_NAME"
export MATCH_KEYCHAIN_PASSWORD="$KEYCHAIN_PASSWORD"
```

**How to configure**:
1. Copy template: `cp .match.env.template .match.env`
2. Fill in:
   - `TEAM_ID`: Your Apple Developer Team ID
   - `KEYCHAIN_PASSWORD`: Your Mac login password
3. Generate FASTLANE_SESSION: `npm run fastlane:init-session`

## 🔄 Why Two Files?

1. **`.env`** is loaded automatically by Fastlane using the `dotenv` gem
2. **`.match.env`** is sourced by bash scripts using `source` command

They serve different purposes in the workflow:
- `.env` → Direct Fastlane operations (deploy, upload, etc.)
- `.match.env` → Certificate management operations (match setup/sync)

## 🔒 Security

Both files are **gitignored** and contain sensitive information:
- ❌ Never commit these files to git
- ✅ Share securely with team members (1Password, encrypted channels)
- ✅ Fastlane Match will prompt for encryption password when needed

## 📚 Templates

- `.env.template` - Template for `.env` (may already exist)
- `.match.env.template` - Template for `.match.env`

Copy and customize these templates to create your actual config files.
