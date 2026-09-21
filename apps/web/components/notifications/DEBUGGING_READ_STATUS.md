# Debugging Notification Read Status Issues

## Problem
Notifications not showing as read (Check icon) after clicking, and badge count not updating in bottom menu.

---

## Quick Diagnosis

### 1. Check Browser Console

When you click a notification, you should see these logs:

```
[NotificationViewModel] Notification clicked: { id: "xxx", read: false, message: "..." }
[NotificationViewModel] Marking as read...
[NotificationViewModel] Marking notification as read: xxx
[NotificationViewModel] Invalidating queries for userId: xxx
[NotificationViewModel] Queries invalidated, UI should update
```

**If you DON'T see these logs:**
- The click handler isn't being triggered
- Check that `onClick` is properly attached to the notification div

**If logs stop partway:**
- Check for errors in console
- Check network tab for failed API calls

---

### 2. Check Network Tab

When clicking a notification, you should see:

1. **PATCH** request to `/api/notifications/[notificationId]`
   - Should return status 200
   - Response: `{ success: true }`

2. **GET** request to `/api/notifications/unread-count/[userId]`
   - Should return updated count
   - Response: `{ unreadCount: X }`

**If PATCH fails:**
- Check server logs for errors
- Verify notification ID is valid
- Check authentication

**If GET unread-count fails:**
- Check API endpoint is running
- Verify userId is correct

---

### 3. Check React Query DevTools

If you have React Query DevTools enabled:

1. Open DevTools
2. Look for queries:
   - `["notifications", userId]`
   - `["unreadNotificationCount", userId]`

3. After clicking notification:
   - Both queries should show "fetching" status
   - Data should update
   - Timestamp should change

**If queries don't refetch:**
- Invalidation might not be working
- Check console for errors
- Try manual refetch in DevTools

---

## Common Issues & Fixes

### Issue 1: Notification stays unread after click

**Symptoms:**
- Eye icon doesn't change to Check
- Left border remains
- Text stays bold

**Possible Causes:**

#### A. API Call Failing
```javascript
// Check network tab for errors
// Common: 401 Unauthorized, 404 Not Found, 500 Server Error
```

**Fix:**
- Check server logs
- Verify authentication
- Check notification ID is valid UUID

#### B. Optimistic Update Not Working
```javascript
// In NotificationsViewModel.ts, check onMutate function
// Should see the notification update immediately in UI
```

**Fix:**
- Check browser console for errors in onMutate
- Verify notification._id matches the clicked notification

#### C. Query Not Invalidating
```javascript
// Should see "Queries invalidated" log
// If not, invalidateQueries might be failing
```

**Fix:**
```typescript
// Force refetch manually
queryClient.refetchQueries({
  queryKey: ["notifications", userId]
})
```

---

### Issue 2: Badge count not updating

**Symptoms:**
- Notification marked as read (Check icon shows)
- Badge in bottom menu still shows old count

**Possible Causes:**

#### A. Unread Count Query Not Invalidating
```javascript
// Check console for:
// "[NotificationViewModel] Invalidating queries for userId: xxx"
```

**Fix:**
- Verify userId is defined
- Check unread count API is working
- Force refetch:
```typescript
queryClient.refetchQueries({
  queryKey: ["unreadNotificationCount", userId]
})
```

#### B. staleTime Too High
```typescript
// In useUnreadNotificationCount.ts, should be:
staleTime: 0  // NOT 1000 * 60 * 2
```

**Fix:**
- Update staleTime to 0
- Restart dev server

#### C. Hook Not Updating
```javascript
// In bottom-menu.tsx, verify:
const { unreadCount: unreadNotificationCount } = useUnreadNotificationCount()
```

**Fix:**
- Check hook is imported correctly
- Verify session.user.id exists
- Add console.log to see current value

---

### Issue 3: Updates work but revert after refresh

**Symptoms:**
- Notification shows as read
- After page refresh, shows as unread again

**Cause:**
Database not being updated properly

**Fix:**

1. Check API endpoint:
```typescript
// apps/web/app/api/notifications/[id]/route.ts
// PATCH handler should update database
```

2. Verify database:
```sql
SELECT * FROM user_notifications 
WHERE notification_id = 'xxx' AND user_id = 'xxx';
-- Check 'read' column is true
```

3. Check server logs for database errors

---

## Manual Testing Steps

### Step 1: Clear Everything
```javascript
// In browser console:
localStorage.clear()
sessionStorage.clear()
queryClient.clear()

// Then hard refresh (Cmd+Shift+R or Ctrl+Shift+R)
```

### Step 2: Load Notifications Page
1. Navigate to `/notifications`
2. Check notifications load
3. Verify unread shows Eye icon
4. Verify read shows Check icon

### Step 3: Click Unread Notification
1. Find notification with Eye icon
2. Click it
3. **Immediately** check:
   - Icon changes to Check? ✓
   - Left border removed? ✓
   - Text becomes lighter? ✓
   - Badge decrements? ✓

### Step 4: Verify Persistence
1. Navigate to another page
2. Come back to notifications
3. Check notification is still marked as read
4. Badge should still show updated count

### Step 5: Hard Refresh
1. Press Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)
2. Notification should still be read
3. Badge should still show correct count

---

## Debug Commands

### Check Current State
```javascript
// Get current notifications data
queryClient.getQueryData(["notifications", userId])

// Get current unread count
queryClient.getQueryData(["unreadNotificationCount", userId])

// Check if queries are fetching
queryClient.isFetching(["notifications", userId])
queryClient.isFetching(["unreadNotificationCount", userId])
```

### Force Refetch
```javascript
// Refetch notifications
await queryClient.refetchQueries({
  queryKey: ["notifications", userId]
})

// Refetch unread count
await queryClient.refetchQueries({
  queryKey: ["unreadNotificationCount", userId]
})

// Refetch everything
await queryClient.refetchQueries()
```

### Clear Specific Cache
```javascript
// Clear notifications cache
queryClient.removeQueries({
  queryKey: ["notifications", userId]
})

// Clear unread count cache
queryClient.removeQueries({
  queryKey: ["unreadNotificationCount", userId]
})
```

### Invalidate Without Refetch
```javascript
// Mark as stale (will refetch on next mount)
await queryClient.invalidateQueries({
  queryKey: ["notifications", userId],
  refetchType: "none"
})
```

---

## API Testing

### Test Mark as Read
```bash
# Replace [notificationId] and [token] with real values
curl -X PATCH http://localhost:3000/api/notifications/[notificationId] \
  -H "Authorization: Bearer [token]" \
  -H "Cookie: next-auth.session-token=[token]"

# Should return: { "success": true }
```

### Test Get Unread Count
```bash
curl -X GET http://localhost:3000/api/notifications/unread-count/[userId] \
  -H "Authorization: Bearer [token]" \
  -H "Cookie: next-auth.session-token=[token]"

# Should return: { "unreadCount": N }
```

### Test Get Notifications
```bash
curl -X GET "http://localhost:3000/api/notifications/[userId]?limit=20&skip=0" \
  -H "Authorization: Bearer [token]" \
  -H "Cookie: next-auth.session-token=[token]"

# Should return: { "notifications": [...] }
# Check each notification's "read" field
```

---

## Database Verification

### Check Notification Status
```sql
-- Find specific notification
SELECT 
  un.*,
  n.message,
  n.type
FROM user_notifications un
JOIN notifications n ON un.notification_id = n.id
WHERE un.user_id = 'YOUR_USER_ID'
ORDER BY n.created_at DESC
LIMIT 10;

-- Should see read=true for clicked notifications
```

### Count Unread
```sql
SELECT COUNT(*) as unread_count
FROM user_notifications
WHERE user_id = 'YOUR_USER_ID' AND read = false;

-- Compare with badge count in UI
```

### Update Manually (for testing)
```sql
-- Mark notification as read
UPDATE user_notifications
SET read = true
WHERE notification_id = 'NOTIFICATION_ID' AND user_id = 'USER_ID';

-- Mark as unread (for testing)
UPDATE user_notifications
SET read = false
WHERE notification_id = 'NOTIFICATION_ID' AND user_id = 'USER_ID';
```

---

## Configuration Check

### NotificationsViewModel.ts
```typescript
// Should have:
staleTime: 0  // Allow immediate updates
refetchOnMount: false  // Don't refetch unnecessarily
refetchOnWindowFocus: false  // Don't refetch on focus

// onSettled should invalidate both queries
onSettled: async () => {
  await queryClient.invalidateQueries({ queryKey: ["notifications", userId] })
  await queryClient.invalidateQueries({ queryKey: ["unreadNotificationCount", userId] })
}
```

### useUnreadNotificationCount.ts
```typescript
// Should have:
staleTime: 0  // Always fetch fresh data
refetchOnWindowFocus: true  // Update on tab focus
refetchInterval: 1000 * 60 * 2  // Poll every 2 min
```

---

## Logging Setup

### Enable Detailed Logging

Add to NotificationsView.tsx:
```typescript
useEffect(() => {
  console.log("[NotificationsView] Notifications:", notificationsPages)
  console.log("[NotificationsView] Unread count:", unreadCount)
}, [notificationsPages, unreadCount])
```

Add to BottomMenu.tsx:
```typescript
useEffect(() => {
  console.log("[BottomMenu] Unread notification count:", unreadNotificationCount)
}, [unreadNotificationCount])
```

### Watch for Changes
```typescript
// In NotificationsViewModel
const allNotifications = data?.pages.flatMap(...) ?? []

useEffect(() => {
  console.log("[NotificationViewModel] Notifications updated:", 
    allNotifications.length, "total,",
    allNotifications.filter(n => !n.read).length, "unread"
  )
}, [allNotifications])
```

---

## React Query Logs

### Enable React Query Logging
```typescript
// In Providers.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ... existing options
    },
  },
  logger: {
    log: console.log,
    warn: console.warn,
    error: console.error,
  },
})
```

### Enable DevTools
```typescript
// In Providers.tsx, uncomment:
import { ReactQueryDevtools } from "@tanstack/react-query-devtools"

// Add at bottom of component:
<ReactQueryDevtools initialIsOpen={false} />
```

---

## Performance Check

### Measure Update Time
```javascript
// In browser console before clicking notification
console.time('notification-update')

// Click notification

// When update completes, run:
console.timeEnd('notification-update')

// Should be < 500ms for good UX
```

### Check Query Staleness
```javascript
// Check if queries are stale
const notifQuery = queryClient.getQueryState(["notifications", userId])
console.log("Notifications stale?", notifQuery?.isStale)

const countQuery = queryClient.getQueryState(["unreadNotificationCount", userId])
console.log("Count stale?", countQuery?.isStale)

// Both should be true (staleTime: 0)
```

---

## Emergency Fixes

### Nuclear Option - Clear Everything
```javascript
// Clear all React Query cache
queryClient.clear()

// Clear local storage
localStorage.clear()

// Clear session storage
sessionStorage.clear()

// Hard reload
window.location.reload(true)
```

### Force Sync from Database
```javascript
// Bypass cache completely
const response = await fetch(`/api/notifications/${userId}?t=${Date.now()}`, {
  cache: 'no-store'
})
const data = await response.json()
console.log("Fresh from API:", data)
```

### Manual UI Update (temporary fix)
```typescript
// In NotificationsViewModel, after marking as read:
markAsReadMutation.mutate(notification._id, {
  onSuccess: () => {
    // Force immediate UI update
    window.location.reload()
  }
})
// NOT RECOMMENDED - but works as last resort
```

---

## Get Help

If none of these solutions work:

1. **Export debug info:**
```javascript
const debugInfo = {
  userId: session?.user?.id,
  notificationCount: notificationsPages.length,
  unreadCount: unreadCount,
  queries: {
    notifications: queryClient.getQueryState(["notifications", userId]),
    unreadCount: queryClient.getQueryState(["unreadNotificationCount", userId])
  }
}
console.log("Debug info:", JSON.stringify(debugInfo, null, 2))
```

2. **Check browser/version:**
   - Some older browsers don't support all React Query features
   - Try in latest Chrome/Firefox

3. **Check network conditions:**
   - Slow network might cause race conditions
   - Try with network throttling disabled

4. **Check for conflicting code:**
   - Search for other places marking notifications as read
   - Check for duplicate query keys

---

## Success Criteria

When everything works correctly:

- ✅ Click notification → icon changes immediately (Eye → Check)
- ✅ Badge count decrements immediately
- ✅ Left border disappears
- ✅ Text becomes lighter
- ✅ Changes persist after navigation
- ✅ Changes persist after page refresh
- ✅ Console shows all expected logs
- ✅ Network tab shows successful API calls
- ✅ Database shows read=true

If all boxes checked, system is working correctly! 🎉