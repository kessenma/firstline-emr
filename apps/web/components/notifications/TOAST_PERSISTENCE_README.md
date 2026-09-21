# Notification Toast Persistence Fix

## Problem

Previously, the notification toast would appear **on every page refresh**, even if it had already been shown to the user. This was because the component was tracking shown notifications in component state, which gets reset on every page load.

## Solution

We now persist the list of shown notification IDs in `localStorage`, so the browser remembers which notifications have already been displayed as toasts across page refreshes and browser sessions.

## How It Works

### 1. localStorage Tracking

When a notification toast is shown, its ID is saved to `localStorage` under the key `"shownNotifications"`:

```typescript
// Before showing toast
if (!latest.read && !hasNotificationBeenShown(latest._id)) {
  setLatestNotification(latest);
  markNotificationAsShown(latest._id); // Saves to localStorage
  setShowToast(true);
}
```

### 2. Check Before Displaying

Every time notifications are fetched, we check if the notification has already been shown:

```typescript
if (!latest.read && !hasNotificationBeenShown(latest._id)) {
  // Only show if it's unread AND hasn't been shown before
  setShowToast(true);
}
```

### 3. Storage Limit

To prevent unbounded growth of localStorage, we only keep the last **100 notification IDs**:

```typescript
const MAX_STORED_NOTIFICATIONS = 100;
const array = Array.from(shown).slice(-MAX_STORED_NOTIFICATIONS);
```

## Utility Functions

All localStorage operations are centralized in `apps/web/lib/notificationStorage.ts`:

### Available Functions

- **`hasNotificationBeenShown(id)`** - Check if a notification has been shown
- **`markNotificationAsShown(id)`** - Mark a notification as shown
- **`getShownNotifications()`** - Get all shown notification IDs
- **`clearShownNotifications()`** - Clear the entire history
- **`removeShownNotifications(ids[])`** - Remove specific IDs
- **`getShownNotificationsCount()`** - Get count of stored notifications

### Usage Example

```typescript
import { 
  hasNotificationBeenShown, 
  markNotificationAsShown,
  clearShownNotifications 
} from "@/lib/notificationStorage";

// Check if notification was shown
if (!hasNotificationBeenShown(notificationId)) {
  showToast();
  markNotificationAsShown(notificationId);
}

// Clear history (for debugging)
clearShownNotifications();
```

## Testing

### Verify the Fix

1. **Receive a notification** (e.g., new signup)
2. **See the toast appear** once
3. **Refresh the page** multiple times
4. **Expected**: Toast should NOT appear again

### Clear History (for testing)

Open browser console and run:

```javascript
localStorage.removeItem('shownNotifications');
```

Or use the utility function in your code:

```typescript
import { clearShownNotifications } from "@/lib/notificationStorage";
clearShownNotifications();
```

## Edge Cases Handled

### 1. Storage Limit
- Only keeps last 100 notification IDs to prevent localStorage bloat
- Older notification IDs are automatically removed

### 2. localStorage Errors
- All localStorage operations are wrapped in try-catch
- Falls back gracefully if localStorage is unavailable (e.g., in incognito mode)

### 3. Server-Side Rendering
- All localStorage operations check `typeof window !== "undefined"`
- Safe to use in Next.js app router

### 4. Multiple Browser Sessions
- Each browser maintains its own localStorage
- Same notification won't show repeatedly in the same browser
- Will show once per browser/device (intended behavior)

## Behavior

### When Toast Appears

A notification toast will appear when:
- ✅ The notification is **unread**
- ✅ The notification ID is **not in shown history**
- ✅ The notification is the **latest** one

### When Toast Won't Appear

A notification toast will NOT appear when:
- ❌ The notification has been marked as read
- ❌ The notification ID is in the shown history
- ❌ Page is not visible (background tab)

## Related Files

- `apps/web/components/notifications/NotificationToast.tsx` - Toast component
- `apps/web/lib/notificationStorage.ts` - Storage utility functions
- `apps/web/components/notifications/NotificationsView.tsx` - Full notifications view

## Future Improvements

Possible enhancements:

1. **Time-based expiry**: Clear shown IDs older than X days
2. **User preference**: Allow users to opt-in/out of toast notifications
3. **Per-notification-type settings**: Different behavior for different notification types
4. **Sync across tabs**: Use `localStorage` events to sync across browser tabs