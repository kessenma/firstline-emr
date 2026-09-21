# Message Caching System

## Overview

The message caching system improves performance by storing fetched messages and media URLs in memory, reducing unnecessary API calls when reopening chat modals within a short time period.

## Features

- **Message Caching**: Stores complete message threads with 5-minute TTL
- **Media Blob Caching**: Downloads and caches actual image/audio data as blobs with 30-minute TTL
- **Instant Image Loading**: No network requests needed for cached images
- **Automatic Cleanup**: Periodically removes expired cache entries and revokes blob URLs
- **Smart Invalidation**: Invalidates cache when new messages are sent or received
- **Memory Management**: Properly cleans up blob URLs to prevent memory leaks

## Cache TTL (Time To Live)

- **Messages**: 5 minutes - Balance between freshness and performance
- **Media Blobs**: 30 minutes - Longer TTL since downloading and storing image data is expensive

Note: While signed URLs from object storage expire after 30 seconds, we cache the actual image **data** as blob URLs, which remain valid in browser memory until explicitly revoked or the page is closed.

## How It Works

### Message Loading Flow

1. **First Load**: 
   - Check cache for chat ID
   - If not found or expired, fetch from API
   - Store in cache with timestamp
   - Return messages to UI

2. **Subsequent Loads** (within TTL):
   - Check cache for chat ID
   - If found and valid, return cached data immediately
   - No API call needed

3. **Force Refresh**:
   - Can pass `forceRefresh: true` to bypass cache
   - Used when receiving real-time updates

### Media Blob Flow

1. **First Fetch**:
   - Check cache for media URL
   - If not found or expired:
     - Request signed URL from API
     - Download the actual image/audio data
     - Create blob URL from the data
     - Store blob URL in cache
   - Return blob URL to UI

2. **Subsequent Fetches** (within TTL):
   - Return cached blob URL immediately
   - **No network requests** - Image loads instantly from memory
   - No API call to your backend
   - No request to object storage

### Cache Invalidation

Cache is automatically invalidated when:

1. **New Message Sent**: When user sends text, image, or audio
2. **Real-time Update**: When SSE/polling detects new messages
3. **Connection Error**: When real-time connection fails
4. **Manual Refresh**: When reconnecting after disconnect

## API

### messageCache

Singleton instance providing caching functionality.

#### Methods

##### `getMessages(chatId: string): MessageCacheData | null`
Get cached messages for a chat. Returns `null` if not found or expired.

##### `setMessages(chatId: string, data: MessageCacheData): void`
Store messages in cache with current timestamp.

##### `getMedia(mediaUrl: string): string | null`
Get cached media URL. Returns `null` if not found or expired.

##### `setMedia(mediaUrl: string, signedUrl: string, isObjectUrl: boolean): void`
Store media URL in cache. Set `isObjectUrl: true` for blob URLs.

##### `invalidateMessages(chatId: string): void`
Remove cached messages for a specific chat.

##### `invalidateMedia(mediaUrl: string): void`
Remove cached media URL and cleanup blob URL if applicable.

##### `clearAll(): void`
Clear all caches (messages and media).

##### `cleanup(): void`
Remove all expired entries. Called automatically every 5 minutes.

##### `getStats(): object`
Get cache statistics including entry counts and oldest entry ages.

## Usage Examples

### Using Cached Messages

```typescript
// In useMessageLoading hook
const loadMessages = useCallback(async (forceRefresh: boolean = false) => {
  // Check cache first
  if (!forceRefresh) {
    const cached = messageCache.getMessages(telegramChatId);
    if (cached) {
      setMessages(cached.messages);
      return cached.messages;
    }
  }
  
  // Fetch from API if not cached
  const messages = await fetchFromAPI();
  
  // Store in cache
  messageCache.setMessages(telegramChatId, {
    messages,
    threadInfo
  });
  
  return messages;
}, [telegramChatId]);
```

### Using Cached Media

```typescript
// In useMediaManager hook
const fetchAndCacheMedia = async (mediaUrl: string) => {
  // Check cache first
  const cachedBlobUrl = messageCache.getMedia(mediaUrl);
  if (cachedBlobUrl) {
    console.log('Using cached blob URL - instant load!');
    return cachedBlobUrl;
  }
  
  // Fetch signed URL from API
  const signedUrl = await fetchSignedUrlFromAPI(mediaUrl);
  
  // Download the actual image data
  const imageResponse = await fetch(signedUrl);
  const imageBlob = await imageResponse.blob();
  
  // Create blob URL (stays in browser memory)
  const blobUrl = URL.createObjectURL(imageBlob);
  
  // Store blob URL in cache
  messageCache.setMedia(mediaUrl, blobUrl, true);
  
  return blobUrl;
};
```

### Invalidating Cache

```typescript
// When sending a new message
const sendMessage = async () => {
  // ... send message logic
  
  // Invalidate cache
  messageCache.invalidateMessages(telegramChatId);
};

// When receiving real-time update
onUpdate: (update) => {
  if (update.operation === 'INSERT' || update.operation === 'UPDATE') {
    messageCache.invalidateMessages(telegramChatId);
    loadMessages(true); // Force refresh
  }
}
```

## Performance Benefits

### Before Caching
- Modal open: API call for messages (~500ms) + API calls for each image (~200ms each) + Object storage fetches (~300ms each per image)
- Close and reopen: Same delays repeated every time
- Example: 10 images = 500ms + (10 × 200ms) + (10 × 300ms) = 5.5 seconds loading time

### After Caching (Blob Strategy)
- **First open**: 500ms + (10 × 200ms) + (10 × 300ms) = 5.5 seconds (downloads and caches image data)
- **Reopen within 5 min**: Instant messages + instant images = **~50ms total**
- **Reopen within 30 min**: 500ms for messages + instant images from cache = **~550ms total**
- Example with 10 images reopened quickly: **~50ms vs 5.5 seconds = 99% faster!**

### Estimated Improvements
- **90-99% reduction** in load time for reopened chats (images load instantly from memory)
- **Zero network requests** for cached media - no calls to object storage
- **Reduced server load** by avoiding redundant API calls for signed URLs
- **Better UX** with instant chat display and instant image rendering when reopening
- **Works even with expired signed URLs** - cached blobs remain valid in memory

## Memory Considerations

### Message Data
- Each message: ~500 bytes
- Average chat: 50 messages × 500 bytes = 25 KB

### Media Blob Data
- Small image (compressed): ~50-100 KB
- Medium image (compressed): ~100-300 KB
- Large image (compressed): ~300-500 KB
- Audio message: ~50-200 KB

**Example Chat with 10 medium images**:
- Messages: 25 KB
- Images: 10 × 200 KB = 2 MB
- **Total**: ~2 MB per chat

**For 10 active chats**: ~20 MB

This is reasonable for modern browsers (which typically use 200-500 MB per tab). The 30-minute TTL ensures old data is cleaned up automatically.

### Memory Management
- Blob URLs are automatically revoked when cache expires
- Cleanup runs every 5 minutes to free memory
- All blobs are cleaned on page unload
- Browser's garbage collector handles blob data cleanup after URL is revoked

## Automatic Cleanup

The cache automatically cleans up:

1. **Expired Entries**: Removed every 5 minutes via setInterval
2. **Blob URLs**: Explicitly revoked when entry is invalidated or expires
3. **On Page Unload**: All blob URLs are revoked before page closes
4. **On Replacement**: Old blob URLs are revoked when new data is cached for same key
5. **Component Unmount**: useMediaManager revokes its blob URLs when unmounting

This multi-layered cleanup strategy prevents memory leaks even in edge cases.

## Best Practices

1. **Always invalidate cache** when data changes (new messages, updates)
2. **Use forceRefresh** when real-time updates are detected
3. **Don't cache indefinitely** - TTL prevents stale data
4. **Clean up blob URLs** - Prevent memory leaks
5. **Monitor cache stats** - Use `getStats()` for debugging

## Debugging

Enable cache logging by checking console for messages starting with `[MessageCache]`:

```
[MessageCache] Cache hit for chat 12345
[MessageCache] Caching messages for chat 12345
[MessageCache] Media cache hit for path/to/image.jpg
[MessageCache] Invalidating messages for chat 12345
[MessageCache] Cleanup complete. Messages: 5, Media: 23
```

## Future Enhancements

Potential improvements:

1. **IndexedDB Persistence**: Store blobs across page reloads (with expiry tracking)
2. **Configurable TTL**: Allow different TTL per user preference
3. **Cache Size Limits**: Implement LRU eviction when memory limit reached (e.g., max 50 MB)
4. **Offline Support**: Queue messages when offline, send when back online
5. **Partial Updates**: Update only new messages instead of full reload
6. **Progressive Loading**: Load low-res thumbnails first, then full images
7. **Compression**: Compress cached blobs to reduce memory usage

## Technical Details

### Why Blob URLs?

Instead of caching just the signed URL (which expires in 30 seconds), we:

1. Fetch the actual image data from object storage
2. Store it as a Blob in JavaScript memory
3. Create a `blob:` URL that points to this in-memory data
4. Use this blob URL in `<img>` tags

**Benefits**:
- Image data stays in browser memory even after signed URL expires
- No network requests needed to redisplay the image
- Instant loading on subsequent modal opens
- Works offline (for cached images)

**Trade-offs**:
- Higher memory usage (~2 MB per chat vs ~27 KB for URL-only caching)
- Acceptable for modern browsers and worth it for the UX improvement