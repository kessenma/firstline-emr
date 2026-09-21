# Notification Toast Debugging Guide

## Quick Reference

This guide helps you debug and test the notification toast system that prevents duplicate toasts on page refresh.

---

## 🚀 Quick Commands

### In Browser Console

```javascript
// Show all stored notification IDs
debugNotifications.logShown()

// Get count
debugNotifications.count()

// Clear all history (to test again)
debugNotifications.clearAll()

// Check if specific ID was shown
debugNotifications.hasBeenShown("notification_id_here")

// Get full debug info
debugNotifications.info()

// Reset for testing
debugNotifications.resetForTesting()
```

### Direct localStorage Access

```javascript
// View raw data
localStorage.getItem('shownNotifications')

// Clear all
localStorage.removeItem('shownNotifications')

// Manual set (for testing)
localStorage.setItem('shownNotifications', JSON.stringify(['id1', 'id2']))
```

---

## 🔍 Common Issues & Solutions

### Issue: Toast appears on every page refresh

**Symptoms:**
- Same notification shows repeatedly
- Even after page reload

**Possible Causes:**

1. **localStorage is disabled/unavailable**
   ```javascript
   // Check if localStorage works
   try {
     localStorage.setItem('test', 'test')
     localStorage.removeItem('test')
     console.log('✅ localStorage is working')
   } catch (e) {
     console.error('❌ localStorage error:', e)
   }
   ```

2. **Notification ID is changing**
   - Check if notification `_id` is consistent
   - Look in Network tab for API response

3. **Browser in incognito/private mode**
   - localStorage may be cleared on tab close

**Solution:**
```javascript
// Manually mark as shown for testing
debugNotifications.markAsShown("YOUR_NOTIFICATION_ID")
```

---

### Issue: Toast doesn't appear at all

**Symptoms:**
- No toast shows up even for new notifications
- New unread notifications not triggering toast

**Debug Steps:**

1. **Check if notification is unread**
   ```javascript
   // In browser console, fetch latest notification
   fetch('/api/notifications/YOUR_USER_ID?limit=1')
     .then(r => r.json())
     .then(d => {
       console.log('Latest notification:', d.notifications[0])
       console.log('Is read?', d.notifications[0].read)
     })
   ```

2. **Check if already marked as shown**
   ```javascript
   debugNotifications.hasBeenShown("NOTIFICATION_ID")
   ```

3. **Check component is mounted**
   - Look for `NotificationToast` in React DevTools

**Solution:**
```javascript
// Clear history and try again
debugNotifications.resetForTesting()
// Then trigger a new notification
```

---

## 🧪 Testing Scenarios

### Scenario 1: Test First-Time Notification

```javascript
// 1. Clear history
debugNotifications.clearAll()

// 2. Create a test notification (via admin or API)
// 3. Refresh page
// 4. Toast should appear

// 5. Refresh again
// 6. Toast should NOT appear
```

### Scenario 2: Test Multiple Notifications

```javascript
// 1. Clear history
debugNotifications.clearAll()

// 2. Create notification A
// 3. See toast A appear
// 4. Click toast or wait for it to disappear

// 5. Create notification B (newer)
// 6. Refresh page
// 7. Toast B should appear (only B, not A)
```

### Scenario 3: Test Storage Limit

```javascript
// Simulate 150 notifications (limit is 100)
for (let i = 0; i < 150; i++) {
  debugNotifications.markAsShown(`test-notification-${i}`)
}

// Check count (should be 100, not 150)
debugNotifications.count()
// Expected: 100

// Check which ones are stored (should be last 100)
debugNotifications.logShown()
// Expected: test-notification-50 through test-notification-149
```

### Scenario 4: Test Cross-Tab Behavior

```javascript
// Tab 1: Show notification
// Tab 2: Refresh
// Expected: Notification already marked as shown in Tab 2

// Note: Changes in Tab 1 persist to Tab 2 because
// they share the same localStorage
```

---

## 📊 Monitoring in Production

### Check Toast State

```javascript
// Get quick status
debugNotifications.info()

// Output:
// {
//   count: 45,
//   ids: ['abc123', 'def456', ...]
// }
```

### Watch for Issues

Add to your error monitoring:

```typescript
try {
  markNotificationAsShown(id)
} catch (error) {
  // Report to error tracking (e.g., Sentry)
  console.error('Failed to persist notification:', error)
}
```

---

## 🛠️ Manual Testing Workflow

### Complete Test Flow

1. **Setup**
   ```javascript
   debugNotifications.resetForTesting()
   ```

2. **Trigger Notification**
   - Create a new user signup (as admin)
   - Or use API to create notification

3. **Verify Toast Appears**
   - Should see toast in top-right
   - Should auto-hide after 5 seconds

4. **Test Persistence**
   ```javascript
   // Check it was saved
   debugNotifications.info()
   ```

5. **Refresh Page**
   - Toast should NOT appear again

6. **Verify in Storage**
   ```javascript
   debugNotifications.logShown()
   // Should include your notification ID
   ```

7. **Clean Up**
   ```javascript
   debugNotifications.clearAll()
   ```

---

## 📝 Logging Tips

### Enable Detailed Logging

Add to `NotificationToast.tsx`:

```typescript
useEffect(() => {
  // ... existing code ...
  
  const latest = notifications[0]
  console.log('[Toast Debug]', {
    notificationId: latest._id,
    isRead: latest.read,
    hasBeenShown: hasNotificationBeenShown(latest._id),
    willShow: !latest.read && !hasNotificationBeenShown(latest._id)
  })
}, [userId])
```

### Monitor API Calls

```javascript
// In Network tab, filter by:
// /api/notifications/

// Watch for:
// - Fetch frequency (should be every 2 minutes)
// - Response data (check _id, read status)
```

---

## 🔧 Advanced Debugging

### Inspect Component State

Using React DevTools:

1. Find `NotificationToast` component
2. Look at hooks:
   - `latestNotification` - Current notification object
   - `showToast` - Boolean, should be `true` when visible
3. Check effects are running

### Trace Notification Flow

```typescript
// Add console.logs to trace the flow:

// 1. API fetch
console.log('[1] Fetched notifications:', notifications)

// 2. Check conditions
console.log('[2] Checking:', {
  isRead: latest.read,
  beenShown: hasNotificationBeenShown(latest._id)
})

// 3. Show toast
console.log('[3] Showing toast for:', latest._id)

// 4. Mark as shown
console.log('[4] Marking as shown:', latest._id)
```

### Test localStorage Edge Cases

```javascript
// Test quota exceeded
try {
  const huge = 'x'.repeat(10000000)
  localStorage.setItem('test', huge)
} catch (e) {
  console.log('Storage quota:', e)
}

// Test disabled localStorage
const isAvailable = (() => {
  try {
    const test = '__test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
})()
console.log('localStorage available:', isAvailable)
```

---

## 📚 Related Documentation

- [TOAST_PERSISTENCE_README.md](./TOAST_PERSISTENCE_README.md) - Technical implementation details
- [CACHING_README.md](../../../app/notifications/CACHING_README.md) - Query caching setup
- [notificationStorage.ts](../../lib/notificationStorage.ts) - Storage utility functions
- [debugNotifications.ts](../../lib/debugNotifications.ts) - Debug utility source

---

## ⚠️ Known Limitations

1. **Per-Browser Storage**
   - localStorage is per-browser
   - Same notification will show once per browser/device
   - This is intended behavior

2. **Storage Limit**
   - Only last 100 notification IDs stored
   - Older IDs automatically removed
   - Very old notifications may show again (rare)

3. **Incognito Mode**
   - localStorage may be cleared on tab/window close
   - Notifications may reappear after closing incognito window

4. **Cross-Device**
   - Not synced across devices
   - Each device tracks independently

---

## 🆘 Emergency Reset

If something goes wrong:

```javascript
// Nuclear option - clear everything
localStorage.clear()

// Or just notifications
localStorage.removeItem('shownNotifications')

// Then refresh page
location.reload()
```

---

## 📞 Support

If issues persist:

1. Check browser console for errors
2. Verify API endpoints are working
3. Test in different browser/incognito
4. Check React DevTools for component state
5. Review Network tab for API calls

**Common Error Messages:**

- `"Error fetching notifications"` - API issue
- `"Error saving shown notification"` - localStorage issue
- `"Error reading shown notifications"` - localStorage corruption

For localStorage issues, try:
```javascript
debugNotifications.clearAll()
```
