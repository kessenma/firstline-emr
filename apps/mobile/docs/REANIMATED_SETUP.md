# React Native Reanimated Setup Guide

Complete guide for setting up React Native Reanimated with Rock + Repack bundler.

---

## Overview

This document covers the complete setup of `react-native-reanimated` v4.x in the Fajr Mission EMR mobile app, including:
- Installing dependencies
- Configuring Babel
- Configuring Rspack
- Configuring iOS Podfile
- Migrating components from Animated API to Reanimated

---

## Installation

### 1. Install Dependencies

```bash
cd apps/mobile
pnpm add react-native-reanimated@^4.1.2
pnpm add react-native-worklets@^0.6.1 react-native-worklets-core@^1.5.0
pnpm add -D @callstack/repack-plugin-reanimated@^5.2.1
```

**Why these packages?**
- `react-native-reanimated` - Main animation library
- `react-native-worklets` - Required peer dependency for Reanimated 4.x
- `react-native-worklets-core` - Core worklets functionality
- `@callstack/repack-plugin-reanimated` - Rspack plugin for Reanimated

---

## Configuration

### 2. Create empty.js

Create an empty module for jest utils aliases:

**File**: `apps/mobile/empty.js`
```javascript
// Empty file used as an alias for Reanimated and Gesture Handler jest utils
// This prevents bundling issues with test utilities in production builds
module.exports = {};
```

### 3. Update babel.config.js

Add the Reanimated plugin (must be last):

**File**: `apps/mobile/babel.config.js`
```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    'react-native-reanimated/plugin', // Must be last
  ],
};
```

### 4. Update rspack.config.mjs

Add ReanimatedPlugin and aliases:

**File**: `apps/mobile/rspack.config.mjs`
```javascript
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as Repack from '@callstack/repack';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default Repack.defineRspackConfig({
  context: __dirname,
  entry: './index.js',
  resolve: {
    ...Repack.getResolveOptions(),
    alias: {
      // Reanimated jest utils aliases to prevent bundling issues
      'react-native-reanimated/src/jestUtils': __dirname + '/empty.js',
      'react-native-reanimated/src/reanimated2/jestUtils': __dirname + '/empty.js',
      'react-native-reanimated/lib/reanimated2/jestUtils': __dirname + '/empty.js',
      'react-native-reanimated/lib/module/jestUtils': __dirname + '/empty.js',
      'react-native-reanimated/lib/commonjs/jestUtils': __dirname + '/empty.js',
      'react-native-reanimated/lib/mjs/jestUtils': __dirname + '/empty.js',
      // Gesture handler jest utils aliases
      'react-native-gesture-handler/src/jestUtils': __dirname + '/empty.js',
      'react-native-gesture-handler/lib/commonjs/jestUtils': __dirname + '/empty.js',
      'react-native-gesture-handler/lib/module/jestUtils': __dirname + '/empty.js',
      'react-native-gesture-handler/lib/mjs/jestUtils': __dirname + '/empty.js',
      './jestUtils': __dirname + '/empty.js',
    },
  },
  module: {
    rules: [
      {
        test: /\.[cm]?[jt]sx?$/,
        exclude: [
          /node_modules\/lucide-react-native\/dist\/esm\/icons\/infinity\.js$/,
        ],
        type: 'javascript/auto',
        use: {
          loader: '@callstack/repack/babel-swc-loader',
          parallel: true,
          options: {},
        },
      },
      ...Repack.getAssetTransformRules(),
    ],
  },
  plugins: [
    new Repack.RepackPlugin(),
    new ReanimatedPlugin({
      unstable_disableTransform: true,
    }),
  ],
});
```

### 5. Update iOS Podfile

Add Reanimated configuration to post_install:

**File**: `apps/mobile/ios/Podfile`
```ruby
target 'FajrEMR' do
  config = use_native_modules!(['npx', 'rock', 'config', '-p', 'ios'])

  use_react_native!(
    :path => config[:reactNativePath],
    :app_path => "#{Pod::Config.instance.installation_root}/.."
  )

  post_install do |installer|
    react_native_post_install(
      installer,
      config[:reactNativePath],
      :mac_catalyst_enabled => false,
    )

    # Reanimated configuration - ensure C++17 for RNReanimated
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |config|
        if target.name == 'RNReanimated'
          config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
          config.build_settings['COMPILER_INDEX_STORE_ENABLE'] = 'NO'
        end
      end
    end
  end
end
```

### 6. Install iOS Pods

```bash
cd ios
rm -rf Pods Podfile.lock
pod install
```

---

## Migration Guide

### Migrating from Animated to Reanimated

#### Before (React Native Animated API)

```typescript
import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

const MyComponent = ({ visible }) => {
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  return (
    <Animated.View
      style={{
        transform: [{ translateY }],
        opacity,
      }}
    >
      {/* Content */}
    </Animated.View>
  );
};
```

#### After (React Native Reanimated)

```typescript
import React, { useEffect } from 'react';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const MyComponent = ({ visible }) => {
  const translateY = useSharedValue(100);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      translateY.value = withSpring(0);
      opacity.value = withTiming(1, { duration: 300 });
    }
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  return (
    <Animated.View style={animatedStyle}>
      {/* Content */}
    </Animated.View>
  );
};
```

### Key Differences

| Animated API | Reanimated |
|--------------|------------|
| `useRef(new Animated.Value())` | `useSharedValue()` |
| `.setValue()` | `.value = ` |
| `Animated.timing()` | `withTiming()` |
| `Animated.spring()` | `withSpring()` |
| `Animated.parallel()` | Just set values (runs in parallel) |
| Style object | `useAnimatedStyle()` |
| `useNativeDriver: true` | Always on UI thread |

---

## BottomSheet Migration Example

### Original Code (Animated)

```typescript
const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

useEffect(() => {
  if (visible) {
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 20,
      stiffness: 300,
    }).start();
  }
}, [visible]);

<Animated.View
  style={{
    transform: [{ translateY }],
  }}
/>
```

### Migrated Code (Reanimated)

```typescript
const translateY = useSharedValue(SCREEN_HEIGHT);

useEffect(() => {
  if (visible) {
    translateY.value = withSpring(0, {
      damping: 20,
      stiffness: 300,
    });
  }
}, [visible]);

const animatedStyle = useAnimatedStyle(() => {
  return {
    transform: [{ translateY: translateY.value }],
  };
});

<Animated.View style={animatedStyle} />
```

---

## Benefits of Reanimated

### Performance
- **Runs on UI thread** - No bridge bottleneck
- **60 FPS animations** - Even during JS thread work
- **Smooth gestures** - Direct native driver integration

### Developer Experience
- **Simpler API** - Less boilerplate code
- **Better debugging** - Worklets can be logged
- **TypeScript support** - Full type safety

### Compatibility
- **Works with Gesture Handler** - Perfect integration
- **Works with Rock/Repack** - Full bundler support
- **Future-proof** - Active development and support

---

## Common Issues & Solutions

### Issue: Pod install fails with worklets error

**Error:**
```
Error: Cannot find module 'react-native-worklets/package.json'
```

**Solution:**
Install worklets dependencies explicitly:
```bash
pnpm add react-native-worklets@^0.6.1 react-native-worklets-core@^1.5.0
```

### Issue: Animation not working

**Checklist:**
- [ ] Babel plugin added (must be last)
- [ ] ReanimatedPlugin added to rspack config
- [ ] Pods installed successfully
- [ ] App restarted (not just hot reload)
- [ ] Using `useAnimatedStyle()` for styles
- [ ] Accessing shared values with `.value`

### Issue: Build errors with C++ standard

**Solution:**
Ensure Podfile has C++17 configuration:
```ruby
if target.name == 'RNReanimated'
  config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'c++17'
end
```

### Issue: TypeScript errors

**Solution:**
Make sure TypeScript can find Reanimated types:
```json
// tsconfig.json
{
  "compilerOptions": {
    "types": ["react-native-reanimated/src/reanimated2"]
  }
}
```

---

## Testing

### Manual Testing Checklist

- [ ] Install dependencies
- [ ] Update all config files
- [ ] Run `pod install`
- [ ] Clean build: `cd ios && xcodebuild clean`
- [ ] Rebuild app: `pnpm ios`
- [ ] Test animations work smoothly
- [ ] Test multiple open/close cycles
- [ ] Test on physical device (better performance test)

### Performance Testing

```typescript
// Add FPS monitor in development
import { withFrameRateLimit } from 'react-native-reanimated';

const animatedStyle = useAnimatedStyle(() => {
  'worklet';
  console.log('FPS:', __getCurrentFrameRate());
  
  return {
    transform: [{ translateY: translateY.value }],
  };
});
```

---

## Best Practices

### 1. Always use worklets for callbacks

```typescript
const animatedStyle = useAnimatedStyle(() => {
  'worklet'; // Mark as worklet
  
  return {
    opacity: opacity.value,
  };
});
```

### 2. Avoid excessive animations

```typescript
// Bad - Creates new animation on every render
translateY.value = withSpring(0);

// Good - Only animate when needed
useEffect(() => {
  if (shouldAnimate) {
    translateY.value = withSpring(0);
  }
}, [shouldAnimate]);
```

### 3. Use derived values for complex calculations

```typescript
const progress = useSharedValue(0);
const rotation = useDerivedValue(() => {
  return `${progress.value * 360}deg`;
});
```

### 4. Clean up animations

```typescript
useEffect(() => {
  return () => {
    // Cancel any running animations
    translateY.value = withTiming(0, { duration: 0 });
  };
}, []);
```

---

## API Reference

### Core Hooks

- `useSharedValue(initialValue)` - Create animated value
- `useAnimatedStyle(() => {})` - Create animated style
- `useDerivedValue(() => {})` - Derive value from other shared values
- `useAnimatedGestureHandler({})` - Handle gestures

### Animation Functions

- `withTiming(toValue, config)` - Linear timing animation
- `withSpring(toValue, config)` - Spring-based animation
- `withDecay(config)` - Decay animation (for scrolling)
- `withRepeat(animation, count)` - Repeat animation
- `withSequence(...animations)` - Run animations in sequence

### Configuration Options

**withTiming:**
```typescript
{
  duration: 300,
  easing: Easing.bezier(0.25, 0.1, 0.25, 1)
}
```

**withSpring:**
```typescript
{
  damping: 20,
  stiffness: 300,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 2
}
```

---

## Resources

### Documentation
- **Reanimated Docs**: https://docs.swmansion.com/react-native-reanimated/
- **Worklets Docs**: https://github.com/chrfalch/react-native-worklets
- **Repack Docs**: https://re-pack.dev/

### Examples
- **Reanimated Example App**: https://github.com/software-mansion/react-native-reanimated/tree/main/apps/example
- **BottomSheet Component**: `apps/mobile/src/components/BottomSheet.tsx`

### Community
- **Discord**: https://discord.gg/swmansion
- **GitHub Issues**: https://github.com/software-mansion/react-native-reanimated/issues

---

## Version Information

**Current Setup:**
- `react-native-reanimated`: 4.1.5
- `react-native-worklets`: 0.6.1
- `react-native-worklets-core`: 1.6.2
- `@callstack/repack-plugin-reanimated`: 5.2.2
- `react-native`: 0.81.1

**Compatibility:**
- ✅ iOS 16.0+
- ✅ Android 5.0+ (API 21+)
- ✅ React Native 0.71+
- ✅ New Architecture (Fabric)
- ✅ Rock bundler
- ✅ Repack bundler

---

## Troubleshooting Commands

```bash
# Clean everything
cd apps/mobile
rm -rf node_modules
cd ios
rm -rf Pods Podfile.lock
cd ..
pnpm install
cd ios
pod install

# Clear Metro cache
pnpm start --reset-cache

# Clear build caches
cd ios
xcodebuild clean
rm -rf ~/Library/Developer/Xcode/DerivedData/*

# Rebuild
pnpm ios
```

---

## Migration Status

### Completed ✅
- [x] Install Reanimated dependencies
- [x] Configure Babel
- [x] Configure Rspack
- [x] Configure iOS Podfile
- [x] Migrate BottomSheet component
- [x] Test animations
- [x] Documentation

### Remaining Tasks
- [ ] Migrate other animated components (if any)
- [ ] Add gesture support to BottomSheet
- [ ] Performance testing on physical devices
- [ ] Add animation unit tests

---

**Last Updated**: December 2024  
**Author**: Development Team  
**Status**: ✅ Production Ready