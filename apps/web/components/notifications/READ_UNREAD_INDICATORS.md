# Read/Unread Notification Indicators

## Overview

The notification system now includes visual indicators to distinguish between read and unread notifications, plus an unread count badge in the navigation menu.

---

## Visual Features

### 1. Icons

- **Unread notifications**: Eye icon (`<Eye />`) in primary color
- **Read notifications**: Check icon (`<Check />`) in muted color

### 2. Styling Differences

**Unread Notifications:**
- Left border: 4px primary color accent
- Background: Subtle accent background (`bg-accent/20`)
- Text: Bold font weight, foreground color
- Icon: Primary color

**Read Notifications:**
- No special border
- No background tint
- Text: Normal font weight, muted foreground color
- Icon: Muted foreground color

### 3. Unread Count Badge

**In Notifications Page Header:**
- Shows count of unread notifications
- Eye icon with primary color
- Format: "X unread"
- Only visible when there are unread notifications

**In Bottom Navigation Menu:**
- Small badge on Bell icon
- Shows unread count (max: "9+")
- Red accent background
- Auto-updates every 2 minutes
- Updates immediately when notifications are marked as read

---

## Implementation Details

### API Endpoint

**GET** `/api/notifications/unread-count/[userId]`

Returns:
```json
{
  "unreadCount": 5
}
```

Features:
- ✅ Authentication required
- ✅ Users can only view their own count (or admins can view any)
- ✅ UUID validation
- ✅ Real-time count from database

### React Query Hook

**`useUnreadNotificationCount()`**

```typescript
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount'

const { unreadCount, isLoading, error, refetch } = useUnreadNotificationCount()
```

**Features:**
- Auto-refetches every 2 minutes
- Refetches when window regains focus
- Caches for performance
- Automatically invalidated when notifications are marked as read

**Configuration:**
```typescript
staleTime: 1000 * 60 * 2,     // Fresh for 2 minutes
gcTime: 1000 * 60 * 10,       // Cache for 10 minutes
refetchOnWindowFocus: true,    // Refetch on tab focus
refetchInterval: 1000 * 60 * 2 // Poll every 2 minutes
```

---

## Component Changes

### NotificationsView.tsx

**Visual Structure:**
```
┌─────────────────────────────────────────┐
│ Your Notifications    [Eye] 3 unread   │
├─────────────────────────────────────────┤
│ [Eye]  New signup notification          │ ← Unread (bold, left border)
│        moetest@m28k.com                 │
│        12/25/2025, 10:47:37 PM          │
├─────────────────────────────────────────┤
│ [Check] Patient update                  │ ← Read (muted, no border)
│         John Doe updated                │
│         12/24/2025, 3:22:15 PM          │
└─────────────────────────────────────────┘
```

**Key Features:**
- Icon changes based on read status
- Text weight and color change
- Left border accent for unread
- Header shows total unread count
- Count updates when notifications are clicked

### BottomMenu.tsx

**Before:**
```typescript
// Manual fetching with useEffect
const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
useEffect(() => { /* fetch logic */ }, [])
```

**After:**
```typescript
// Clean hook usage
const { unreadCount: unreadNotificationCount } = useUnreadNotificationCount()
```

**Badge Display:**
- Shows on Bell icon when count > 0
- Format: Number (1-9) or "9+" for 10+
- Position: Top-right corner of icon
- Color: Accent background with accent-foreground text

---

## Behavior

### Marking as Read

When a notification is clicked:
1. **Mutation triggered** - `markNotificationAsRead()`
2. **Queries invalidated:**
   - `["notifications", userId]` - Updates notification list
   - `["unreadNotificationCount", userId]` - Updates badge count
3. **UI updates:**
   - Icon changes from Eye → Check
   - Text becomes lighter/muted
   - Left border removed
   - Badge count decrements
   - Header count updates

### Special Case: New Signups

New signup notifications remain unread until clicked, even if viewed:
```typescript
if (notification.type === "new_user_signup") {
  // Only mark as read on click, not on view
  handleNotificationClick(notification, () => {
    setIsSignupsModalOpen(true)
  })
}
```

This ensures admins must actively review signups before they're marked as read.

---

## Usage Examples

### Get Unread Count in Component

```typescript
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount'

function MyComponent() {
  const { unreadCount, isLoading } = useUnreadNotificationCount()
  
  if (isLoading) return <Spinner />
  
  return (
    <div>
      You have {unreadCount} unread notifications
    </div>
  )
}
```

### Manually Refresh Count

```typescript
const { unreadCount, refetch } = useUnreadNotificationCount()

// After performing an action that might change count
await markNotificationAsRead(id)
refetch() // Force immediate refresh
```

### Check Count Without Rendering

```typescript
import { useQueryClient } from '@tanstack/react-query'

const queryClient = useQueryClient()
const data = queryClient.getQueryData(['unreadNotificationCount', userId])
console.log('Current unread count:', data?.unreadCount)
```

---

## Styling Reference

### Unread Notification Classes

```tsx
className={`
  p-4 
  border-b 
  cursor-pointer 
  hover:bg-muted/50 
  transition-colors 
  bg-accent/20              // Light background
  border-l-4               // Thick left border
  border-l-primary         // Primary color
  border-b-border          // Normal bottom border
`}
```

### Read Notification Classes

```tsx
className={`
  p-4 
  border-b 
  border-border           // Normal border
  cursor-pointer 
  hover:bg-muted/50 
  transition-colors
`}
```

### Icon Styling

```tsx
// Unread
<Eye className="h-5 w-5 text-primary" />

// Read
<Check className="h-5 w-5 text-muted-foreground" />
```

### Text Styling

```tsx
// Unread
<p className="text-lg font-semibold text-foreground">

// Read
<p className="text-lg font-normal text-muted-foreground">
```

---

## Testing

### Manual Testing

1. **Create unread notifications**
   - Create a new signup or send a notification
   - Verify Eye icon appears
   - Verify left border is present
   - Verify text is bold

2. **Check badge**
   - Look at bottom navigation Bell icon
   - Should show number badge
   - Should match count in header

3. **Mark as read**
   - Click notification
   - Icon should change to Check
   - Border should disappear
   - Text should become lighter
   - Badge should decrement

4. **Test refresh**
   - Navigate away and back
   - Badge should persist
   - Refresh page
   - Badge should still be correct

### Automated Testing Ideas

```typescript
describe('Notification Indicators', () => {
  it('shows Eye icon for unread notifications', () => {
    // Test unread styling
  })
  
  it('shows Check icon for read notifications', () => {
    // Test read styling
  })
  
  it('displays correct unread count in badge', () => {
    // Test badge count
  })
  
  it('updates badge when notification is marked as read', () => {
    // Test invalidation
  })
})
```

---

## Troubleshooting

### Badge not updating

**Problem:** Badge shows old count after marking notification as read

**Solution:**
```typescript
// Ensure invalidation is happening
queryClient.invalidateQueries({
  queryKey: ['unreadNotificationCount', userId]
})
```

### Count mismatch

**Problem:** Badge count doesn't match actual unread notifications

**Solution:**
1. Check database directly:
   ```sql
   SELECT COUNT(*) FROM user_notifications 
   WHERE user_id = 'xxx' AND read = false;
   ```
2. Clear React Query cache:
   ```javascript
   queryClient.clear()
   ```
3. Hard refresh browser

### Icons not showing

**Problem:** Eye/Check icons not rendering

**Solution:**
1. Verify lucide-react is installed:
   ```bash
   npm list lucide-react
   ```
2. Check import:
   ```typescript
   import { Check, Eye } from "lucide-react"
   ```

---

## Performance Considerations

### Query Optimization

- **Stale time**: 2 minutes prevents excessive refetching
- **Cache time**: 10 minutes keeps data available
- **Polling**: Every 2 minutes for background updates
- **Focus refetch**: Updates when user returns to tab

### Database Query

```typescript
// Efficient count query
await db
  .select()
  .from(userNotifications)
  .where(
    and(
      eq(userNotifications.userId, userId),
      eq(userNotifications.read, false)
    )
  )
```

Consider adding index for better performance:
```sql
CREATE INDEX idx_user_notifications_unread 
ON user_notifications(user_id, read) 
WHERE read = false;
```

---

## Related Files

- `apps/web/components/notifications/NotificationsView.tsx` - Main notification view with icons
- `apps/web/hooks/useUnreadNotificationCount.ts` - React Query hook
- `apps/web/app/api/notifications/unread-count/[userId]/route.ts` - API endpoint
- `apps/web/components/ui/bottom-menu.tsx` - Navigation with badge
- `apps/web/components/notifications/NotificationsViewModel.ts` - Query invalidation logic

---

## Future Enhancements

Possible improvements:
1. **Mark all as read** button
2. **Filter by read/unread**
3. **Notification grouping** by type
4. **Real-time updates** via WebSocket
5. **Push notifications** for mobile
6. **Notification preferences** per user
7. **Snooze functionality**
8. **Priority levels** with different colors

---

## Summary

The read/unread indicator system provides:
- ✅ Clear visual distinction between read/unread
- ✅ Unread count badge in navigation
- ✅ Auto-updating counts via React Query
- ✅ Efficient database queries
- ✅ Proper cache invalidation
- ✅ Accessible icons (Eye/Check)
- ✅ Mobile-friendly design
- ✅ Performance optimized

Users can now easily identify which notifications they haven't reviewed and see at a glance how many unread items they have.