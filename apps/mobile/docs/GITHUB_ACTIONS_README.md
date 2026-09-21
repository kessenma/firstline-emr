# GitHub Actions iOS Deployment

Automated iOS deployment to TestFlight and App Store using GitHub Actions on macOS runners.

## 📚 Documentation

This directory contains comprehensive guides for setting up and using GitHub Actions for iOS deployment:

### 🚀 Getting Started

1. **[Add Secrets Walkthrough](./ADD_SECRETS_WALKTHROUGH.md)** ⭐ START HERE
   - Step-by-step guide with screenshots
   - How to find each required value
   - How to add secrets to GitHub
   - Complete setup checklist

2. **[Deployment Setup Guide](./GITHUB_ACTIONS_DEPLOYMENT_SETUP.md)**
   - Detailed explanation of all secrets
   - Prerequisites and requirements
   - Running deployments
   - Troubleshooting common issues
   - Security best practices

3. **[Quick Reference](./GITHUB_ACTIONS_QUICK_REFERENCE.md)**
   - Cheat sheet for daily use
   - Quick command reference
   - Common issues & fixes
   - Recommended workflows

## 🎯 What This Does

The GitHub Actions workflow automates your iOS deployment process:

- ✅ Builds your iOS app on macOS runners
- ✅ Manages code signing with Fastlane Match
- ✅ Handles version and build number bumping
- ✅ Uploads to TestFlight or App Store Connect
- ✅ Provides detailed logs and artifacts
- ✅ No local Mac environment issues!

## 🏃 Quick Start (5 Minutes)

### 1. Add Required Secrets

Follow [ADD_SECRETS_WALKTHROUGH.md](./ADD_SECRETS_WALKTHROUGH.md) to add these 9 secrets to your GitHub repository:

```
✓ APP_STORE_CONNECT_API_KEY_ID
✓ APP_STORE_CONNECT_ISSUER_ID
✓ APP_STORE_CONNECT_API_KEY_CONTENT
✓ APPLE_ID
✓ TEAM_ID
✓ APP_IDENTIFIER
✓ MATCH_PASSWORD
✓ MATCH_GIT_URL
✓ MATCH_GIT_PRIVATE_KEY
```

### 2. Run Your First Deployment

**Via GitHub UI:**
1. Go to **Actions** tab → **Deploy iOS**
2. Click **Run workflow**
3. Select `testflight` and click **Run workflow**

**Via GitHub CLI:**
```bash
gh workflow run deploy-ios.yml \
  -f deployment_type=testflight \
  -f bump_version=false
```

### 3. Monitor Progress

- Watch real-time logs in the Actions tab
- Download build artifacts if needed
- Check App Store Connect for your build

## 🔄 Workflow Options

| Option | Values | Default | Description |
|--------|--------|---------|-------------|
| `deployment_type` | `testflight`, `appstore` | `testflight` | Where to deploy your build |
| `bump_version` | `true`, `false` | `false` | Increment version number |
| `version_bump_type` | `patch`, `minor`, `major` | `patch` | Which version component to bump |

## 📱 Available NPM Scripts

### GitHub Actions (CI/CD)
```bash
pnpm run deploy:ios:rock-beta-github            # Build + TestFlight
pnpm run deploy:ios:rock-release-github         # Build + App Store
pnpm run deploy:ios:upload-testflight-github    # Upload existing IPA to TestFlight
pnpm run deploy:ios:upload-appstore-github      # Upload existing IPA to App Store
```

### Local Development (Your Mac)
```bash
pnpm run deploy:ios:rock-beta          # Build + TestFlight (with rbenv)
pnpm run deploy:ios:rock-release       # Build + App Store (with rbenv)
pnpm run deploy:ios:upload-testflight  # Upload existing IPA to TestFlight
pnpm run deploy:ios:upload-appstore    # Upload existing IPA to App Store
```

## 🎨 Workflow Features

- **Automatic Dependency Management**: Installs Ruby, Node, CocoaPods, etc.
- **Code Signing**: Uses Fastlane Match for certificate management
- **Version Control**: Manages version numbers via `ios-version.json`
- **Build Artifacts**: Saves logs for debugging
- **Security**: Cleans up sensitive files after deployment
- **Timeout Protection**: 60-minute timeout prevents hanging builds
- **Detailed Summaries**: Shows version and build info in workflow summary

## 📊 Monitoring Your Deployments

### GitHub Actions
- **Live Logs**: Expand each step to see real-time output
- **Artifacts**: Download build logs from the bottom of workflow page
- **Summary**: View deployment details in the summary section

### App Store Connect
- **TestFlight**: https://appstoreconnect.apple.com/ → TestFlight
- **App Store**: https://appstoreconnect.apple.com/ → App Store

## 🐛 Common Issues

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| "Authentication failed" | Wrong API credentials | Verify `APP_STORE_CONNECT_*` secrets |
| "Code signing error" | Match configuration issue | Check `MATCH_PASSWORD` and SSH key |
| "Bundle not found" | Wrong app identifier | Verify `APP_IDENTIFIER` matches exactly |
| "Clone failed" | SSH key access issue | Ensure public key added to Match repo |
| Build timeout | Slow build or hanging | Check for infinite loops or slow steps |

See [GITHUB_ACTIONS_DEPLOYMENT_SETUP.md](./GITHUB_ACTIONS_DEPLOYMENT_SETUP.md#troubleshooting) for detailed troubleshooting.

## 🔒 Security

- All secrets are encrypted by GitHub
- Private keys never appear in logs
- Sensitive files are cleaned up after deployment
- SSH keys are specific to CI/CD (isolated from personal keys)
- API keys use minimal required permissions

## 💡 Best Practices

### Recommended Deployment Flow

```bash
# 1. Feature development → Deploy to TestFlight for testing
gh workflow run deploy-ios.yml \
  -f deployment_type=testflight \
  -f bump_version=true \
  -f version_bump_type=minor

# 2. Test on TestFlight with internal testers

# 3. After approval → Deploy to App Store
gh workflow run deploy-ios.yml \
  -f deployment_type=appstore \
  -f bump_version=false
```

### Version Numbering Strategy

- **Patch** (1.0.0 → 1.0.1): Bug fixes
- **Minor** (1.0.0 → 1.1.0): New features
- **Major** (1.0.0 → 2.0.0): Breaking changes
- **Build only**: Leave `bump_version` unchecked

### Testing

Always test with TestFlight first:
```bash
# Test build (no version change)
gh workflow run deploy-ios.yml -f deployment_type=testflight -f bump_version=false
```

## 🤝 Comparison: Local vs GitHub Actions

| Aspect | Local (Mac) | GitHub Actions |
|--------|-------------|----------------|
| Environment | Your Mac setup | Clean macOS runner |
| Ruby version | Managed by rbenv | Specified in workflow |
| Dependencies | Must install manually | Automated installation |
| Consistency | Varies by machine | Identical every time |
| Requires Mac | ✅ Yes | ❌ No (runs on GitHub) |
| Setup complexity | Medium | High (one-time) |
| Daily use | Simple | Very simple |

## 📚 Additional Resources

- **Fastlane**: https://docs.fastlane.tools/
- **GitHub Actions**: https://docs.github.com/en/actions
- **App Store Connect API**: https://developer.apple.com/app-store-connect/api/
- **Fastlane Match**: https://docs.fastlane.tools/actions/match/

## 🆘 Need Help?

1. **Start with**: [ADD_SECRETS_WALKTHROUGH.md](./ADD_SECRETS_WALKTHROUGH.md)
2. **Check logs**: GitHub Actions → Your workflow run → Expand failed step
3. **Test locally**: Run the `-github` scripts on your Mac
4. **Verify secrets**: Double-check all 9 secrets are correct
5. **Match certificates**: Run `cd ios && bundle exec fastlane match appstore --readonly`

## 🎯 Next Steps

1. ✅ Complete [ADD_SECRETS_WALKTHROUGH.md](./ADD_SECRETS_WALKTHROUGH.md)
2. ✅ Run your first test deployment
3. ✅ Bookmark [GITHUB_ACTIONS_QUICK_REFERENCE.md](./GITHUB_ACTIONS_QUICK_REFERENCE.md)
4. ✅ Set up automatic deployments (optional)
5. ✅ Share credentials with your team securely

---

## 🎉 Success!

Once configured, deploying is as simple as:
1. Click **Actions** → **Deploy iOS** → **Run workflow**
2. Choose your options
3. Click **Run workflow**
4. ☕ Grab coffee while GitHub handles the rest!

No more environment issues, no more manual setup, just reliable deployments every time! 🚀