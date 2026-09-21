# App Store Connect API Key Setup

## Overview
To upload builds to TestFlight or the App Store, you need an **App Store Connect API Key**. This is a `.p8` file that authenticates Fastlane with Apple's services.

---

## Getting Your API Key

### 1. Log in to App Store Connect
Visit: [https://appstoreconnect.apple.com/access/api](https://appstoreconnect.apple.com/access/api)

### 2. Generate a New Key (if you don't have one)

1. Click the **"+"** button to create a new key
2. Name it (e.g., "Fastlane CI/CD")
3. Select **"Admin"** or **"App Manager"** access level
4. Click **"Generate"**

### 3. Download the Key

⚠️ **IMPORTANT**: You can only download this key **once**! Keep it secure!

1. Click **"Download API Key"**
2. Save the file (it will be named something like `AuthKey_9Q42867745.p8`)
3. Note the following information from the page:
   - **Key ID** (e.g., `9Q42867745`)
   - **Issuer ID** (a UUID, e.g., `69a6de8e-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

---

## Installation

### 1. Place the API Key File

Copy your downloaded `.p8` file to:
```
apps/mobile/ios/fastlane/
```

Example:
```bash
cp ~/Downloads/AuthKey_9Q42867745.p8 apps/mobile/ios/fastlane/
```

### 2. Update the `.env` File

Edit `apps/mobile/ios/fastlane/.env` and set these values:

```bash
# Key ID from the .p8 filename
APP_STORE_CONNECT_API_KEY_ID=9Q42867745

# Issuer ID from App Store Connect
APP_STORE_CONNECT_ISSUER_ID=69a6de8e-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Path to the .p8 file (relative to fastlane directory)
APP_STORE_CONNECT_API_PRIVATE_KEY_PATH=./AuthKey_9Q42867745.p8
```

### 3. Secure the File

**CRITICAL**: The `.p8` file is a secret! Never commit it to git.

Verify it's in `.gitignore`:
```bash
cd apps/mobile/ios/fastlane
git check-ignore AuthKey_*.p8
# Should output: AuthKey_*.p8
```

---

## Verification

Test that Fastlane can access the key:

```bash
cd apps/mobile
pnpm run deploy:ios:upload-testflight
```

If configured correctly, Fastlane will upload your pre-built IPA to TestFlight.

---

## Troubleshooting

### Error: "API key file not found"
- Verify the file exists: `ls ios/fastlane/AuthKey_*.p8`
- Check the path in `.env` matches your actual filename

### Error: "Invalid API Key"
- Verify your `APP_STORE_CONNECT_ISSUER_ID` is correct
- Make sure the key hasn't been revoked in App Store Connect

### Error: "Insufficient permissions"
- The API key must have **Admin** or **App Manager** role
- Check in App Store Connect under Users and Access > Keys

---

## Security Best Practices

1. **Never commit** the `.p8` file to git
2. Store a backup copy in a secure password manager
3. Share with team members through secure channels only
4. If compromised, revoke the key in App Store Connect and generate a new one
5. Use different keys for CI/CD vs. local development if possible

---

## Team Onboarding

When a new team member needs to upload builds:

1. Share the `.p8` file through a secure channel (1Password, LastPass, etc.)
2. Share the `.env` configuration values
3. Have them place the file in `apps/mobile/ios/fastlane/`
4. Have them update their local `.env` file
5. Test with: `pnpm run fastlane:init-session`

---

## References

- [App Store Connect API Documentation](https://developer.apple.com/documentation/appstoreconnectapi)
- [Fastlane API Key Documentation](https://docs.fastlane.tools/app-store-connect-api/)
- [Creating API Keys (Apple)](https://developer.apple.com/documentation/appstoreconnectapi/creating_api_keys_for_app_store_connect_api)