# Navigation Dependencies

## Required Package

To complete Phase 1.4 navigation setup, you need to install the React Navigation Stack package.

## Installation

Run the following command in the `apps/mobile` directory:

```bash
npm install @react-navigation/stack
```

Or if using pnpm (recommended for this project):

```bash
pnpm add @react-navigation/stack
```

## Why This Package?

The `@react-navigation/stack` package is required for the `AdminStackNavigator` component, which manages the stack-based navigation for admin screens.

### Already Installed ✅
- `@react-navigation/native` - Core navigation
- `@react-navigation/bottom-tabs` - Tab navigation
- `react-native-gesture-handler` - Gesture support
- `react-native-safe-area-context` - Safe area handling
- `react-native-screens` - Native screen optimization

### Needs Installation ⚠️
- `@react-navigation/stack` - Stack navigation for admin screens

## Verification

After installation, verify the package is in `package.json`:

```json
{
  "dependencies": {
    "@react-navigation/stack": "^7.x.x"
  }
}
```

## Alternative: Skip Installation During Development

If you want to test the navigation structure without installing the package immediately, you can:

1. Comment out the `AdminStackNavigator` import in `MainNavigator.tsx`
2. Temporarily disable the Admin tab
3. Re-enable once the package is installed

However, for full Phase 1.4 completion, the package must be installed.

## Complete Installation Command

```bash
cd apps/mobile
pnpm add @react-navigation/stack
```

Then rebuild your app:

```bash
# iOS
pnpm run ios

# Android
pnpm run android
```

---

**Status**: Awaiting package installation
**Next Step**: Install `@react-navigation/stack` to complete Phase 1.4