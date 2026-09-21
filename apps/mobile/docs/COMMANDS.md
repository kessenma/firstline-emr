# Quick Command Reference

## Development

### Start Dev Server
```bash
pnpm start
```

### Run iOS App
```bash
pnpm ios
```

### Run Android App
```bash
pnpm android
```

### Install Dependencies
```bash
pnpm install
```

## Ruby/CocoaPods

### Check Ruby Version
```bash
ruby --version
# Should show: ruby 3.3.6
```

### Install Ruby Gems
```bash
bundle install
```

### Install CocoaPods Dependencies
```bash
cd ios
bundle exec pod install
cd ..
```

### Clean CocoaPods
```bash
cd ios
rm -rf Pods Podfile.lock
bundle exec pod install
cd ..
```

## Android

### Clean Build
```bash
cd android
./gradlew clean
cd ..
```

### Build Debug APK
```bash
cd android
./gradlew assembleDebug
cd ..
```

## Troubleshooting

### Reset Everything
```bash
# Clean iOS
cd ios
rm -rf Pods Podfile.lock build
cd ..

# Clean Android
cd android
rm -rf build app/build .gradle
./gradlew clean
cd ..

# Reinstall dependencies
pnpm install
bundle install
cd ios && bundle exec pod install && cd ..
```

### Check if Dev Server is Running
```bash
lsof -i :8081
```

### Kill Dev Server
```bash
lsof -ti :8081 | xargs kill -9
```

## Database Operations

### Delete Database (for testing)
```typescript
await databaseService?.deleteDatabase();
```

### Reinitialize Database
```typescript
await databaseService?.initializeDatabase();
```

## Useful Checks

### List Available iOS Simulators
```bash
xcrun simctl list devices available
```

### List Android Emulators
```bash
emulator -list-avds
```

### Check Node Version
```bash
node --version
# Should be >= 20
```

### Check Java Version (for Android)
```bash
java -version
# Should be 17 for React Native
```

## Git

### Check Current Branch
```bash
git branch
```

### View Changed Files
```bash
git status
```

### Add All Changes
```bash
git add .
```

### Commit Changes
```bash
git commit -m "Your message"
```

## Quick Fixes

### Ruby version wrong?
```bash
rbenv local 3.3.6
bundle install
```

### CocoaPods fails?
```bash
cd ios
rm -rf Pods Podfile.lock
bundle exec pod install
cd ..
```

### Metro bundler issues?
```bash
pnpm start --reset-cache
```

### Android build fails?
```bash
cd android
./gradlew clean
cd ..
```
