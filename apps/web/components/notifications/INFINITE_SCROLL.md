# Infinite Scroll Implementation

## Overview

The notifications page now implements infinite scrolling within a fixed-height ScrollArea, loading 20 notifications at a time. The total unread count is always accurate regardless of how many notifications are loaded.

---

## Key Features

### 1. **Fixed Height ScrollArea**
- Container height: `calc(100vh - 16rem)` (viewport height minus header/padding)
- Smooth scrolling with custom scrollbar
- Notifications load automatically when scrolling to bottom

### 2. **Infinite Query Pagination**
- Loads 20 notifications per page
- Automatically fetches next page when scroll reaches bottom
- Uses React Query's `useInfiniteQuery` for efficient data management

### 3. **Accurate Unread Count**
- Badge shows **total** unread count from database
- Not limited to loaded notifications
- Updates in real-time when notifications are marked as read

### 4. **Sticky Header with High Z-Index**
- Header stays visible while scrolling
- "Mark all as read" button has `z-50` to stay above nav
- Prevents UI overlap issues

---

## Implementation Details

### ScrollArea Setup

```tsx
<ScrollArea className="h-[calc(100vh-16rem)]">
  {/* Notifications list */}
  <div ref={loadMoreRef} style={{ height: 20 }} />
  {/* Loading indicator */}
</ScrollArea>
```

**Height Calculation:**
- Full viewport: `100vh`
- Minus header: `8rem`
- Minus padding: `8rem`
- Total scroll area: `100vh - 16rem`

### Infinite Query Configuration

```typescript
useInfiniteQuery({
  queryKey: ["notifications", userId],
  queryFn: fetchNotifications,
  initialPageParam: 0,
  getNextPageParam: (lastPage, pages) => {
    return lastPage.notifications.length === 20
      ? pages.length * 20
      : undefined;
  },
})
```

**How it works:**
- First load: Skip 0, limit 20
- Second page: Skip 20, limit 20
- Third page: Skip 40, limit 20
- Continues until `lastPage.notifications.length < 20`

### Intersection Observer

```typescript
const handleObserver = useCallback(
  (entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  },
  [hasNextPage, isFetchingNextPage, fetchNextPage],
);
```

**Trigger Element:**
```tsx
<div ref={loadMoreRef} style={{ height: 20 }} />
```

When this 20px div becomes visible, the next page loads automatically.

---

## API Endpoint

### Paginated Notifications

**GET** `/api/notifications/[userId]?skip=0&limit=20`

**Query Parameters:**
- `skip`: Number of notifications to skip (for pagination)
- `limit`: Number of notifications to return (default: 20)

**Response:**
```json
{
  "notifications": [
    {
      "_id": "notification-id",
      "message": "...",
      "read": false,
      "createdAt": "2025-12-25T10:47:37Z",
      // ... other fields
    }
  ]
}
```

**Pagination Logic:**
```typescript
const results = await db
  .select()
  .from(userNotifications)
  .where(eq(userNotifications.userId, userId))
  .orderBy(desc(userNotifications.createdAt))
  .limit(limit)    // 20 notifications
  .offset(skip);   // Skip already loaded
```

### Unread Count

**GET** `/api/notifications/unread-count/[userId]`

**Response:**
```json
{
  "unreadCount": 45
}
```

**Important:** This returns the **total** unread count, not just the count of loaded notifications.

---

## Sticky Header Implementation

### CSS Classes

```tsx
<div className="sticky top-0 bg-background z-50">
  {/* Header content */}
  <Button className="relative z-50">
    Mark all as read
  </Button>
</div>
```

**Z-Index Hierarchy:**
- Bottom menu: `z-50`
- Notifications header: `z-50`
- Mark all button: `z-50` (relative positioning)
- Modals: `z-[100]` (higher than everything)

**Why z-50?**
- Ensures button stays clickable above nav
- Matches z-index of bottom menu
- Prevents overlap issues

---

## User Experience

### Scrolling Behavior

```
Initial Load (20 notifications)
↓
User scrolls down
↓
Reaches bottom (loadMoreRef visible)
↓
Intersection Observer triggers
↓
fetchNextPage() called
↓
Loading spinner appears
↓
Next 20 notifications loaded
↓
Appended to list
↓
User continues scrolling...
```

### Visual Feedback

**Loading States:**
- Initial load: Skeleton loaders with overlay spinner
- Loading more: Small spinner at bottom
- No more notifications: Spinner disappears

**Scroll Position:**
- Maintains scroll position during page loads
- Smooth scrolling experience
- No jarring jumps

---

## Badge Count vs Loaded Count

### Scenario Example

**Database State:**
- Total notifications: 150
- Unread notifications: 45
- Read notifications: 105

**UI State:**
- Loaded notifications: 20 (first page)
- Badge count: **45** (from API)
- Visible unread in list: ~5-10 (depends on loaded page)

**After scrolling:**
- Loaded notifications: 60 (three pages)
- Badge count: **45** (still accurate)
- Visible unread in list: ~15-25

**Key Point:** Badge always shows total unread (45), not just loaded unread count.

---

## Performance Optimizations

### 1. Virtualization Ready
While not currently implemented, the structure supports virtual scrolling:
- Fixed container height
- Predictable item heights
- Can add `react-virtual` or similar

### 2. Query Caching
```typescript
staleTime: 0,           // Always check for updates
gcTime: 1000 * 60 * 30, // Keep in cache for 30 min
```

### 3. Optimistic Updates
Notifications marked as read update instantly:
```typescript
onMutate: async (notificationId) => {
  // Update cache immediately
  queryClient.setQueryData(...)
}
```

### 4. Efficient Fetching
- Only fetches 20 at a time
- Reuses cached pages
- Cancels ongoing requests on unmount

---

## Mobile Responsiveness

The ScrollArea adapts to different screen sizes:

```scss
// Desktop
height: calc(100vh - 16rem)  // Full space

// Mobile (example)
height: calc(100vh - 20rem)  // Account for mobile nav
```

**Considerations:**
- Touch scrolling works smoothly
- Pull-to-refresh not implemented (can be added)
- Fixed header prevents losing context

---

## Testing Checklist

- [ ] Initial 20 notifications load
- [ ] Scroll to bottom triggers next page
- [ ] Loading spinner appears during fetch
- [ ] Notifications append to list
- [ ] Scroll position maintained
- [ ] Badge shows accurate total count
- [ ] Badge updates when marking as read
- [ ] Header stays sticky while scrolling
- [ ] Button clickable (not hidden by nav)
- [ ] Smooth scrolling on mobile
- [ ] Works with keyboard navigation

---

## Debugging

### Check Loaded Pages

```javascript
// In browser console
const data = queryClient.getQueryData(["notifications", userId])
console.log("Total pages loaded:", data?.pages.length)
console.log("Total notifications:", data?.pages.flatMap(p => p.notifications).length)
```

### Check Unread Count

```javascript
const countData = queryClient.getQueryData(["unreadNotificationCount", userId])
console.log("Total unread:", countData?.unreadCount)
```

### Force Load More

```javascript
// Manually trigger next page
fetchNextPage()
```

### Check Intersection Observer

```javascript
// Verify loadMoreRef is attached
console.log("Load more ref:", loadMoreRef.current)

// Check if it's in viewport
const rect = loadMoreRef.current?.getBoundingClientRect()
console.log("In viewport:", rect?.top < window.innerHeight)
```

---

## Common Issues

### Issue 1: Infinite loop of loading

**Symptom:** Pages keep loading continuously

**Cause:** `getNextPageParam` always returns a value

**Fix:**
```typescript
getNextPageParam: (lastPage, pages) => {
  // Only return next param if we got full page
  return lastPage.notifications.length === 20
    ? pages.length * 20
    : undefined;  // Stop pagination
}
```

### Issue 2: Badge count incorrect

**Symptom:** Badge shows loaded count, not total

**Cause:** Using local count instead of API

**Fix:**
```typescript
// ❌ Wrong - only counts loaded
const count = notificationsPages.filter(n => !n.read).length

// ✅ Correct - uses API total
const { unreadCount } = useUnreadNotificationCount()
```

### Issue 3: Button hidden behind nav

**Symptom:** Can't click "Mark all as read" button

**Fix:**
```tsx
// Add sticky positioning and z-index
<div className="sticky top-0 bg-background z-50">
  <Button className="relative z-50">
```

### Issue 4: Scroll jumps on page load

**Symptom:** Scroll position resets when loading more

**Cause:** React Query default behavior

**Solution:** Already handled by `useInfiniteQuery` maintaining scroll position

---

## Future Enhancements

### 1. Virtual Scrolling
Add `@tanstack/react-virtual` for thousands of notifications:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual'

const virtualizer = useVirtualizer({
  count: allNotifications.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 100,
})
```

### 2. Pull-to-Refresh
Add mobile pull-to-refresh:
```typescript
const handlePullRefresh = async () => {
  await queryClient.invalidateQueries(["notifications", userId])
}
```

### 3. Keyboard Shortcuts
Navigate notifications with keyboard:
- `j/k`: Next/previous notification
- `Enter`: Open notification
- `a`: Mark all as read

### 4. Smart Prefetching
Prefetch next page before reaching bottom:
```typescript
const { fetchNextPage } = useInfiniteQuery({
  // ... config
})

// Prefetch when 80% scrolled
if (scrollPercentage > 80) {
  fetchNextPage()
}
```

---

## Related Files

- `apps/web/components/notifications/NotificationsView.tsx` - UI with ScrollArea
- `apps/web/components/notifications/NotificationsViewModel.ts` - Infinite query logic
- `apps/web/components/ui/scroll-area.tsx` - Radix ScrollArea component
- `apps/web/hooks/useUnreadNotificationCount.ts` - Total count hook
- `apps/web/app/api/notifications/[id]/route.ts` - Paginated API endpoint
- `apps/web/app/api/notifications/unread-count/[userId]/route.ts` - Count API

---

## Summary

The infinite scroll implementation provides:
- ✅ Smooth scrolling experience
- ✅ Efficient pagination (20 per page)
- ✅ Accurate total unread count
- ✅ Sticky header with high z-index
- ✅ Automatic loading on scroll
- ✅ Mobile-friendly
- ✅ Optimistic updates
- ✅ Proper error handling

Users can now browse through all their notifications without page reloads, while the badge always shows the accurate total unread count from the database.