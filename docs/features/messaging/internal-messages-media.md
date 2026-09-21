> **📋 File Migration Info**
> - **Original Location:** `apps/docs/INTERNAL_MESSAGES_MEDIA_SETUP.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# Internal Messages Media Functionality Setup

## Overview

This document describes the image and audio note functionality added to the internal messaging system. The implementation follows the same pattern as the Telegram messages system, using on-premises object storage (DigitalOcean Spaces or compatible S3 service).

## Features Added

### 1. Image Attachments
- Users can upload images to internal message threads
- Images are stored in object storage with signed URLs for secure access
- Maximum file size: 5MB
- Supported formats: All standard image types (JPEG, PNG, GIF, etc.)

### 2. Audio Notes
- Users can record audio messages directly in the chat interface
- Audio is recorded in WebM format (browser-native)
- Maximum recording duration: 60 seconds with countdown timer
- Audio files are stored in object storage

## Architecture

### API Routes

#### 1. Upload Photo
**Path:** `/api/internal-messages/[id]/upload-photo`
- Uploads image file to object storage
- Generates signed URL for secure access
- Stores file in `{env}/internal-messages/{threadId}/` folder
- Returns: `{ filePath, signedUrl }`

#### 2. Upload Audio
**Path:** `/api/internal-messages/[id]/upload-audio`
- Uploads audio file to object storage
- Generates signed URL for secure access
- Stores file in `{env}/internal-messages-audio/{threadId}/` folder
- Returns: `{ filePath, signedUrl }`

#### 3. Get Media
**Path:** `/api/internal-messages/get-media?filePath={filePath}`
- Retrieves signed URL for a stored media file
- Used to refresh expired URLs
- Requires authentication
- Returns: `{ signedUrl }`

#### 4. Updated Message Endpoint
**Path:** `/api/internal-messages/[id]` (POST)
- Now accepts `type` and `mediaUrl` fields
- Supports message types: `text`, `image`, `audio`
- Validates media URLs for media message types

### Database Schema

The `InternalMessageThread` model already supported media fields:

```typescript
interface IMessage {
    text: string;
    sender: string;
    senderId: mongoose.Types.ObjectId | string;
    timestamp: Date;
    type: 'text' | 'image' | 'video' | 'file' | 'reply' | 'forward' | 'audio';
    mediaUrl: string;  // Stores object storage file path
    // ... other fields
}
```

### Frontend Components

#### 1. InternalMessageInput
**Path:** `apps/web/components/messages/InternalMessageInput.tsx`

Features:
- Expandable options menu (Plus button)
- Image upload button
- Audio recording button with visual feedback
- Recording timer (60 second countdown)
- Auto-stop when timer expires

#### 2. InternalMessageList (Updated)
**Path:** `apps/web/components/messages/InternalMessageList.tsx`

Features:
- Renders image messages with Next.js Image component
- Renders audio messages with HTML5 audio player
- Loading indicators for media being fetched
- Supports multiple audio formats (WebM, OGG, MP3)

#### 3. useMediaHandling Hook
**Path:** `apps/web/components/messages/useMediaHandling.ts`

Provides:
- `getSignedUrl(filePath)` - Fetches signed URL for media
- `sendImage(file)` - Uploads and sends image message
- `sendAudioMessage(blob, duration)` - Uploads and sends audio message

#### 4. InternalMessagesViewModel (Updated)
**Path:** `apps/web/components/messages/InternalMessagesViewModel.ts`

Updates:
- Integrates `useMediaHandling` hook
- Processes messages to fetch signed URLs for media on load
- Exports `sendImage` and `sendAudioMessage` functions

## Usage Flow

### Sending an Image

1. User clicks Plus button to expand options
2. User clicks Image button
3. File picker opens
4. User selects image (validated for 5MB max size)
5. Image uploads to object storage → signed URL generated
6. Message created with type="image" and mediaUrl set
7. Image appears in chat immediately using signed URL

### Recording Audio

1. User clicks Plus button to expand options
2. User clicks Microphone button
3. Browser requests microphone permission
4. Recording starts, timer counts down from 60 seconds
5. User clicks Stop button (or timer expires)
6. Audio blob processed and uploaded to object storage
7. Message created with type="audio" and mediaUrl set
8. Audio player appears in chat with signed URL

### Loading Messages with Media

1. Messages fetched from API
2. For each message with type="image" or type="audio":
   - `getSignedUrl()` called with the mediaUrl
   - Signed URL retrieved and cached
3. Messages rendered with signed URLs
4. URLs automatically refresh when needed (1 hour expiry)

## Object Storage Structure

```
{bucket}/
├── dev/                                    # Development environment
│   ├── internal-messages/
│   │   └── {threadId}/
│   │       └── {timestamp}-{senderInfo}-{filename}.jpg
│   └── internal-messages-audio/
│       └── {threadId}/
│           └── {timestamp}-{senderInfo}-{filename}.webm
└── prod/                                   # Production environment
    ├── internal-messages/
    │   └── {threadId}/
    │       └── {timestamp}-{senderInfo}-{filename}.jpg
    └── internal-messages-audio/
        └── {threadId}/
            └── {timestamp}-{senderInfo}-{filename}.webm
```

## Environment Variables Required

Ensure these are set in your `.env.local`:

```bash
OBJECT_STORAGE_ENDPOINT=your-endpoint.digitaloceanspaces.com
OBJECT_STORAGE_REGION=fra1
OBJECT_STORAGE_KEY=your-access-key
OBJECT_STORAGE_SECRET=your-secret-key
OBJECT_STORAGE_BUCKET=your-bucket-name
NODE_ENV=development  # or production
```

## Security Considerations

1. **Authentication Required**: All API endpoints validate user session
2. **Participant Verification**: Users must be thread participants to send media
3. **Private ACL**: All uploaded files use `ACL: "private"`
4. **Signed URLs**: Temporary access (1 hour expiry) prevents unauthorized access
5. **File Size Limits**: Images limited to 5MB to prevent abuse

## Testing Checklist

- [ ] Upload image to internal message thread
- [ ] View uploaded image in message list
- [ ] Record audio note (full 60 seconds)
- [ ] Record audio note (stop before timer)
- [ ] Play audio note in browser
- [ ] Load thread with existing media messages
- [ ] Test with expired signed URLs (after 1 hour)
- [ ] Test permission denied (non-participant)
- [ ] Test file size validation (>5MB image)
- [ ] Test microphone permission denied

## Known Limitations

1. Audio format is browser-dependent (WebM on most browsers)
2. No video support yet (can be added using same pattern)
3. No file preview before sending
4. No edit/delete for media messages
5. No image compression (stores original file)

## Future Enhancements

- [ ] Image compression before upload
- [ ] Video message support
- [ ] File attachment support (PDFs, documents)
- [ ] Media gallery view
- [ ] Download media option
- [ ] Delete media functionality
- [ ] Image preview before sending
- [ ] Audio waveform visualization
- [ ] Voice-to-text transcription for audio notes

## Related Files

### API Routes
- `apps/web/app/api/internal-messages/[id]/upload-photo/route.ts`
- `apps/web/app/api/internal-messages/[id]/upload-audio/route.ts`
- `apps/web/app/api/internal-messages/get-media/route.ts`
- `apps/web/app/api/internal-messages/[id]/route.ts` (updated)

### Components
- `apps/web/components/messages/InternalMessageInput.tsx`
- `apps/web/components/messages/InternalMessageList.tsx`
- `apps/web/components/messages/InternalMessagesView.tsx` (updated)
- `apps/web/components/messages/InternalMessagesViewModel.ts` (updated)
- `apps/web/components/messages/useMediaHandling.ts`
- `apps/web/components/messages/ChatThreadView.tsx` (updated)

### Models
- `apps/web/models/internalMessageThread.ts` (no changes needed)

## Troubleshooting

### Images not displaying
1. Check browser console for 403 errors (signed URL expired)
2. Verify OBJECT_STORAGE_* environment variables
3. Check object storage bucket permissions
4. Verify user is authenticated

### Audio not recording
1. Check microphone permissions in browser
2. Verify HTTPS connection (required for getUserMedia)
3. Check browser compatibility (WebM support)
4. Look for console errors

### Upload fails
1. Check file size (<5MB for images)
2. Verify object storage credentials
3. Check network connection
4. Verify user is thread participant

## Comparison with Telegram Messages

The internal messages media implementation mirrors the Telegram messages pattern:

| Feature | Telegram Messages | Internal Messages |
|---------|------------------|-------------------|
| Image Upload | ✅ | ✅ |
| Audio Recording | ✅ | ✅ |
| Object Storage | ✅ DigitalOcean Spaces | ✅ Same |
| Signed URLs | ✅ | ✅ |
| Audio Conversion | ✅ (Opus) | ❌ (WebM native) |
| Image Encryption | ✅ (Optional) | ❌ |
| Max Recording Time | 60 seconds | 60 seconds |
| File Size Limit | 5MB | 5MB |

## Summary

The internal messages system now supports rich media communication between staff members, matching the functionality available in patient-facing Telegram messages. The implementation uses the same secure, scalable object storage infrastructure with proper authentication and authorization controls.