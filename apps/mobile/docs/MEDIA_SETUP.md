# Media Support for Messages

This document explains the media support (images and audio) in the mobile app's messaging feature.

## Features Implemented

### ✅ Image Messages
- **Automatic Loading**: Images in messages are automatically fetched with signed URLs from S3
- **Loading States**: Shows loading indicator while image is being fetched
- **Display**: Images display inline within message bubbles
- **Captions**: Supports text captions alongside images
- **Responsive**: Images are scaled to fit within message bubbles (200x200 default)

### ✅ Audio Messages
- **Visual Indicator**: Shows waveform visualization (placeholder) and play button
- **Placeholder Player**: Currently shows a tap-to-play indicator
- **Loading States**: Shows loading indicator while audio URL is being fetched

### 📦 Components Created

1. **`src/hooks/useMediaManager.ts`**
   - Automatically fetches signed URLs for media messages
   - Handles images, audio, and file types
   - Updates messages state when signed URLs are received
   - Caches URLs to prevent duplicate fetches

2. **`src/components/AudioPlayer.tsx`**
   - Simple audio player placeholder component
   - Visual waveform representation
   - Ready for audio playback implementation

3. **`src/types/messages.ts`**
   - Shared TypeScript types for messages
   - Includes media-related fields (mediaUrl, signedUrl, type)

## How It Works

### Media URL Flow

```
1. Message loaded with mediaUrl (S3 path)
   ↓
2. useMediaManager detects media message
   ↓
3. Calls /api/internal-messages/get-media
   ↓
4. Receives signed URL (1 hour expiry)
   ↓
5. Updates message.signedUrl
   ↓
6. Image/Audio component displays media
```

### API Endpoint Used

**GET** `/api/internal-messages/get-media?filePath=<S3_PATH>`

Returns:
```json
{
  "signedUrl": "https://s3-endpoint.com/bucket/path?signature=..."
}
```

## Media Types Supported

- ✅ **Images** (`message.type === 'image'`)
  - Displays inline with Image component
  - Shows loading spinner while fetching signed URL
  - Supports captions

- ⚠️ **Audio** (`message.type === 'audio'`)
  - Shows placeholder player with waveform
  - Currently logs to console when tapped
  - **Needs audio library for playback**

- 🔜 **Files** (`message.type === 'file'`)
  - Supported by useMediaManager
  - Not yet rendered in UI

## Audio Playback Setup

The app uses `react-native-sound` for audio playback - a lightweight native module without Expo dependencies.

### Installation

1. **Install the package:**
   ```bash
   cd apps/mobile
   npm install react-native-sound
   ```

2. **For iOS, install pods:**
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **For Android:**
   - No additional setup needed - auto-linking handles it

4. **Rebuild the app:**
   ```bash
   # iOS
   npm run ios

   # Android
   npm run android
   ```

### Features

- ✅ Play/Pause audio
- ✅ Progress tracking with waveform visualization
- ✅ Duration display
- ✅ Background playback support (iOS)
- ✅ No Expo required

### Component Already Implemented

The `AudioPlayer` component in `src/components/AudioPlayer.tsx` is fully functional with:
- Play/pause toggle
- Real-time progress tracking
- Waveform visualization that updates with playback
- Time display (current/total)
- Loading states
- Error handling

## Testing Media Messages

### Testing with Internal Messages

1. Log into the app
2. Navigate to a message thread
3. Messages with images/audio should:
   - Show "Loading image..." or "Loading audio..." initially
   - Then display the media once signed URL is fetched

### Creating Test Messages

You can create messages with media from the web app:
- Images: Use the image upload button in message input
- Audio: Use the voice recording button
- The mobile app will automatically fetch and display these

## Troubleshooting

### Images Not Loading

**Problem**: Images show "Loading image..." indefinitely

**Solutions**:
- Check network connection
- Verify API endpoint is accessible
- Check browser console for S3 signature errors
- Ensure S3 credentials are configured in environment variables

### Audio Not Playing

**Problem**: Audio shows but doesn't play or errors occur

**Solutions**:
- Ensure `react-native-sound` is installed: `npm install react-native-sound`
- iOS: Run `cd ios && pod install && cd ..`
- Rebuild the app completely
- Check that audio URL is accessible (signed URL not expired)
- iOS: Check that silence mode is off
- Android: Check audio permissions in AndroidManifest.xml

### TypeScript Errors

**Problem**: Cannot find module '../hooks/useMediaManager'

**Solution**: This is usually a temporary TypeScript server issue. Try:
- Restart TypeScript server in your IDE
- Run `npm install` in apps/mobile
- Restart the development server

## File Structure

```
apps/mobile/src/
├── components/
│   └── AudioPlayer.tsx          # Audio player component
├── hooks/
│   ├── useMessages.ts           # Fetches message threads
│   └── useMediaManager.ts       # Fetches signed URLs for media
├── screens/
│   ├── MessagesScreen.tsx       # Message thread list
│   └── ThreadDetailScreen.tsx   # Individual thread view
└── types/
    └── messages.ts              # Shared TypeScript types
```

## Future Enhancements

- [x] Full audio playback with play/pause - ✅ Implemented
- [x] Progress tracking - ✅ Implemented
- [ ] Seekable progress bar (tap to skip)
- [ ] Real audio waveform generation (not random)
- [ ] File download support
- [ ] Video message support
- [ ] Image zoom/lightbox view
- [ ] Media caching for offline viewing
- [ ] Thumbnail generation for images
- [ ] Audio recording for sending messages

## Related Files

- **Web Implementation**: `apps/web/components/messages/`
  - `InternalMessageList.tsx` - How web displays media
  - `AudioNotePlayer.tsx` - Full audio player implementation
  - `useInternalMediaManager.ts` - Web version of media manager

- **API**: `apps/web/app/api/internal-messages/get-media/route.ts`
  - Generates signed S3 URLs
  - 1 hour expiry
  - Requires authentication