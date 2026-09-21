> **📋 File Migration Info**
> - **Original Location:** `apps/docs/INTERNAL_MESSAGES_OPTIMISTIC_UI.md`
> - **Moved Date:** 2025-12-08
> - **Moved By:** migrate-markdown-docs.sh

---

# Internal Messages - Optimistic UI for Media Sending

## Overview

This document describes the optimistic UI implementation for sending images and audio notes in the internal messaging system. The update ensures that when sending media, previous messages remain visible with a "Sending..." indicator at the bottom, matching the UX of sending text messages.

## Problem Statement

**Before:** When sending an image or audio note, the entire message list would show a skeleton loader, hiding all previous messages until the upload completed.

**After:** When sending media, previous messages remain visible, and an optimistic message appears at the bottom showing the upload progress.

## Changes Made

### 1. Updated `InternalMessagesViewModel.ts`

**Change:** Pass `setIsSending` instead of `setIsLoading` to the media handling hook.

```typescript
// Before
const { getSignedUrl, sendImage, sendAudioMessage } = useMediaHandling(
  resolvedId || threadId,
  setMessages,
  setIsLoading, // ❌ Triggered skeleton loader
);

// After
const { getSignedUrl, sendImage, sendAudioMessage } = useMediaHandling(
  resolvedId || threadId,
  setMessages,
  setIsSending, // ✅ Shows optimistic UI
);
```

**Impact:** Media sending now uses the same state management as text messages.

### 2. Updated `useMediaHandling.ts`

**Key Changes:**

#### A. Optimistic Image Upload

```typescript
const sendImage = useCallback(async (file: File) => {
  // 1. Add optimistic message immediately
  const optimisticMessageId = `temp-${Date.now()}`;
  setMessages((prevMessages) => [
    ...prevMessages,
    {
      _id: optimisticMessageId,
      text: "Uploading image...",
      sender: "You",
      senderId: "temp",
      timestamp: new Date(),
      isSelf: true,
      type: "image",
      mediaUrl: "",
      signedUrl: undefined,
    },
  ]);

  setIsLoading(true); // Only for disabling buttons

  try {
    // ... upload logic ...

    // 2. Replace optimistic message with real message
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg._id === optimisticMessageId
          ? {
              _id: data._id,
              text: data.text || "Image sent",
              sender: data.sender,
              senderId: data.senderId,
              timestamp: new Date(data.timestamp),
              isSelf: true,
              type: "image",
              mediaUrl: filePath,
              signedUrl: signedDisplayUrl,
            }
          : msg,
      ),
    );
  } catch (error) {
    // 3. Remove optimistic message on error
    setMessages((prevMessages) =>
      prevMessages.filter((msg) => msg._id !== optimisticMessageId),
    );
  } finally {
    setIsLoading(false);
  }
}, [threadId, getSignedUrl, setMessages, setIsLoading]);
```

#### B. Optimistic Audio Upload

```typescript
const sendAudioMessage = useCallback(async (blob: Blob, duration: number) => {
  // 1. Add optimistic message immediately
  const optimisticMessageId = `temp-${Date.now()}`;
  setMessages((prevMessages) => [
    ...prevMessages,
    {
      _id: optimisticMessageId,
      text: `Recording audio (${Math.round(duration)}s)...`,
      sender: "You",
      senderId: "temp",
      timestamp: new Date(),
      isSelf: true,
      type: "audio",
      mediaUrl: "",
      signedUrl: undefined,
    },
  ]);

  setIsLoading(true);

  try {
    // ... upload logic ...

    // 2. Replace optimistic message with real message
    setMessages((prevMessages) =>
      prevMessages.map((msg) =>
        msg._id === optimisticMessageId
          ? {
              _id: data._id,
              text: data.text || "Audio sent",
              sender: data.sender,
              senderId: data.senderId,
              timestamp: new Date(data.timestamp),
              isSelf: true,
              type: "audio",
              mediaUrl: filePath,
              signedUrl: signedUrl,
            }
          : msg,
      ),
    );
  } catch (error) {
    // 3. Remove optimistic message on error
    setMessages((prevMessages) =>
      prevMessages.filter((msg) => msg._id !== optimisticMessageId),
    );
  } finally {
    setIsLoading(false);
  }
}, [threadId, setMessages, setIsLoading]);
```

**Key Features:**
- Generates temporary ID for optimistic message
- Shows "Uploading..." text while sending
- Replaces temp message with real message on success
- Removes temp message on error

### 3. Updated `InternalMessageList.tsx`

**Change:** Show message text in loading state instead of generic "Loading..." text.

```typescript
{message.type === "image" ? (
  <div>
    {message.signedUrl ? (
      <Image ... />
    ) : (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">
          {message.text || "Uploading image..."} {/* ✅ Shows custom text */}
        </span>
      </div>
    )}
  </div>
) : message.type === "audio" ? (
  <div>
    {message.signedUrl ? (
      <audio controls ... />
    ) : (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">
          {message.text || "Uploading audio..."} {/* ✅ Shows custom text */}
        </span>
      </div>
    )}
  </div>
) : (
  // ... text message ...
)}
```

**Impact:** Users see meaningful feedback like "Uploading image..." or "Recording audio (5s)..."

### 4. Updated `InternalMessageInput.tsx`

**Change:** Removed `disabled={isLoading}` from the text input, only disable media buttons.

```typescript
// Before
<AutoExpandingInput
  placeholder="Type your message..."
  value={newMessage}
  onChange={(e) => setNewMessage(e.target.value)}
  minRows={1}
  maxRows={5}
  className="grow"
  disabled={isLoading} // ❌ Disabled whole input
/>

// After
<AutoExpandingInput
  placeholder="Type your message..."
  value={newMessage}
  onChange={(e) => setNewMessage(e.target.value)}
  minRows={1}
  maxRows={5}
  className="grow"
  // ✅ Input stays enabled
/>

// Media buttons are disabled individually
<Button
  type="button"
  size="icon"
  variant="outline"
  onClick={() => document.getElementById("internal-image-upload")?.click()}
  disabled={isLoading} // ✅ Only disable when sending
  className="rounded-full h-10 w-10"
>
  <Image className="h-4 w-4" />
</Button>
```

**Impact:** Users can still type messages while media is uploading.

## User Experience Flow

### Sending an Image

1. **User clicks Image button** → File picker opens
2. **User selects image** → Optimistic message appears immediately
   - Shows: "Uploading image..." with spinner
   - All previous messages remain visible
3. **Upload completes** → Optimistic message replaced with actual image
4. **On error** → Optimistic message removed, error shown

### Sending Audio

1. **User clicks Mic button** → Recording starts
2. **User clicks Stop** → Optimistic message appears immediately
   - Shows: "Recording audio (5s)..." with spinner
   - All previous messages remain visible
3. **Upload completes** → Optimistic message replaced with audio player
4. **On error** → Optimistic message removed, error shown

### Sending Text (For Comparison)

1. **User types message and clicks Send**
2. **Optimistic message appears** → Shows "Sending..." indicator
3. **Send completes** → Indicator replaced with timestamp
4. **All three types now behave consistently** ✅

## State Management

| State | Purpose | Triggers |
|-------|---------|----------|
| `isLoading` | Loading messages from server | Initial fetch, revalidation |
| `isSending` | Sending any type of message | Text, image, or audio send |
| `isRevalidating` | Background refresh | Stale cache revalidation |

**Key Point:** Media sending now uses `isSending` (not `isLoading`), preventing skeleton loader from showing.

## Visual Indicators

### Loading States
- **Loading messages:** Skeleton loader (initial load only)
- **Sending text:** "Sending..." bubble at bottom
- **Sending image:** "Uploading image..." bubble with spinner
- **Sending audio:** "Recording audio (Xs)..." bubble with spinner

### Button States
- **While sending media:**
  - Image button: Disabled
  - Audio button: Disabled
  - Send button: Enabled (can send text)
  - Text input: Enabled (can type)

## Error Handling

### Image Upload Error
```typescript
catch (error) {
  console.error("Error sending image:", error);
  // Remove optimistic message
  setMessages((prevMessages) =>
    prevMessages.filter((msg) => msg._id !== optimisticMessageId),
  );
}
```

### Audio Upload Error
```typescript
catch (error) {
  console.error("Error sending audio message:", error);
  // Remove optimistic message
  setMessages((prevMessages) =>
    prevMessages.filter((msg) => msg._id !== optimisticMessageId),
  );
}
```

**User sees:**
- Optimistic message disappears
- Console error (for debugging)
- Can retry upload

## Benefits

✅ **Better UX:** Users see their chat history while media uploads  
✅ **Consistent:** All message types (text, image, audio) behave the same  
✅ **Responsive:** Immediate feedback when sending media  
✅ **Clear Status:** Shows exactly what's happening ("Uploading image...")  
✅ **Error Recovery:** Failed uploads are cleanly removed  
✅ **Non-blocking:** Can continue using the app while media uploads  

## Technical Notes

### Temporary IDs
- Format: `temp-${Date.now()}`
- Used only during upload
- Replaced with real MongoDB ObjectId on success
- Removed on error

### Message Replacement Strategy
```typescript
// Replace optimistic message
setMessages((prevMessages) =>
  prevMessages.map((msg) =>
    msg._id === optimisticMessageId
      ? realMessage  // Replace temp with real
      : msg           // Keep others unchanged
  ),
);
```

### Why Not `push()`?
Using `map()` instead of `push()` ensures:
1. Optimistic message doesn't duplicate if already replaced
2. Maintains message order
3. Atomic update (prevents race conditions)

## Comparison: Before vs After

### Before (❌ Poor UX)
```
User clicks Send Image
  ↓
Entire message list hidden
  ↓
Skeleton loader shows
  ↓
Upload completes
  ↓
Messages reappear with new image
```

### After (✅ Good UX)
```
User clicks Send Image
  ↓
"Uploading image..." appears at bottom
  ↓
All previous messages still visible
  ↓
Upload completes
  ↓
"Uploading image..." → Actual image
```

## Testing Scenarios

- [ ] Send image - verify no skeleton loader
- [ ] Send audio - verify no skeleton loader
- [ ] Send text while image uploads
- [ ] Cancel image upload (close browser)
- [ ] Network error during upload
- [ ] Large image (slow upload)
- [ ] Multiple media messages in quick succession
- [ ] Send message immediately after media

## Future Enhancements

- [ ] Progress bar for large uploads
- [ ] Cancel upload button
- [ ] Retry failed uploads
- [ ] Queue multiple media uploads
- [ ] Show upload percentage
- [ ] Compress images before upload
- [ ] Preview media before sending

## Summary

The optimistic UI update brings the internal messages media functionality in line with modern chat UX patterns. Users now see immediate feedback when sending media, with all previous messages remaining visible during uploads. This creates a smoother, more responsive experience that matches the behavior of sending text messages.