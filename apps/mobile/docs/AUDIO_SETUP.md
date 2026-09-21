# Audio Playback Setup for Mobile App

Quick setup guide for audio message handling in the mobile app.

## Current Status

⚠️ **Audio playback currently uses a placeholder implementation**

The app will show audio messages with a waveform visualization, but tapping them will:
- Open the audio file in the device's default audio player (browser/music app)
- This works without any external dependencies
- No installation required!

## Future: Full Audio Playback (Optional)

If you want in-app audio playback with play/pause controls, you can install `react-native-sound`:

### Quick Install (Optional)

```bash
cd apps/mobile
npm install react-native-sound
```

### iOS Setup

```bash
cd ios
pod install
cd ..
npm run ios
```

### Android Setup

```bash
npm run android
```

## Why react-native-sound? (If you choose to install it)

- ✅ **No Expo required** - Pure native module
- ✅ **Lightweight** - ~50KB
- ✅ **Battle-tested** - Used by thousands of apps
- ✅ **Simple API** - Easy to use
- ✅ **Cross-platform** - iOS & Android
- ✅ **Background playback** - Works in background (iOS)

## Troubleshooting

### iOS: "Module not found"
```bash
cd ios
rm -rf Pods Podfile.lock
pod install
cd ..
npm run ios
```

### Android: Build errors
```bash
cd android
./gradlew clean
cd ..
npm run android
```

### Audio not playing on iOS
- Check that device is not in silent mode
- Ensure audio URL is valid and accessible
- Check console for error messages

### Audio not playing on Android
- Verify internet permissions in `AndroidManifest.xml`
- Check audio URL is HTTPS (HTTP may be blocked)

## How It Works (Current Implementation)

1. User taps audio message
2. `AudioPlayer` component gets signed URL
3. Opens audio in device's default player
4. User listens to audio outside the app

## How It Works (With react-native-sound installed)

1. User taps audio message
2. `AudioPlayer` component loads audio from signed URL
3. `react-native-sound` handles native playback
4. Progress updates every 100ms
5. Waveform visualization shows progress
6. Time displays current position / total duration

## Component Usage

The `AudioPlayer` component is already integrated in `ThreadDetailScreen.tsx`:

```tsx
{message.type === 'audio' && message.signedUrl ? (
  <AudioPlayer audioUrl={message.signedUrl} isSelf={message.isSelf} />
) : null}
```

## Current Features (Without Installation)

- ✅ Audio message display
- ✅ Waveform visualization
- ✅ Opens in external player
- ✅ No dependencies required
- ✅ Works immediately

## Future Features (With react-native-sound)

To enable these features, install react-native-sound:

- ⏸️ Play/Pause toggle
- ⏸️ Real-time progress tracking
- ⏸️ Animated waveform visualization
- ⏸️ Duration display (current/total)
- ⏸️ In-app playback
- ⏸️ Auto-stop at end

## Testing

### Current Behavior (No Installation)

1. Open a thread with audio messages
2. Tap the play button ▶️
3. Device's default player opens
4. Audio plays in external app

### Future Behavior (With react-native-sound)

1. Open a thread with audio messages
2. Tap the play button ▶️
3. Audio plays in-app with progress
4. Waveform bars animate as audio plays
5. Tap pause ⏸ to stop
6. Timer shows current position / total duration

## Next Steps

After installation, audio messages will automatically play when you tap the play button. No configuration needed!