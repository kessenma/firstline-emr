# Notification Indicators - Quick Reference

## 🎯 What's New

Visual indicators to distinguish read vs unread notifications + unread count badge in navigation.

---

## 📱 Visual Indicators

### Icons

| Status | Icon | Color |
|--------|------|-------|
| **Unread** | 👁️ Eye | Primary |
| **Read** | ✓ Check | Muted |

### Styling

**Unread Notifications:**
- 📍 4px primary color left border
- 🎨 Light accent background
- **Bold text**
- Primary colored icon

**Read Notifications:**
- 📍 No special border
- 🎨 Normal background
- Normal text weight
- Muted icon

---

## 🔢 Unread Count Display

### Notifications Page
- Shows in header: "🔔 X unread"
- Only visible when count > 0
- Updates in real-time when notifications clicked

### Bottom Navigation
- Badge on Bell icon
- Shows number (1-9) or "9+"
- Auto-updates every 2 minutes
- Updates immediately on click

---

## 🚀 Quick Usage

### Get Unread Count in Code

```typescript
import { useUnreadNotificationCount } from '@/hooks/useUnreadNotificationCount'

const { unreadCount, isLoading, refetch } = useUnreadNotificationCount()
```

### API Endpoint

```bash
GET /api/notifications/unread-count/[userId]

Response:
{
  "unreadCount": 5
}
```

---

## ⚡ How It Works

1. **User clicks notification** → Marked as read
2. **Queries invalidated** → Cache cleared
3. **UI updates:**
   - Icon: Eye → Check
   - Text: Bold → Normal
   - Border: Removed
   - Badge: Count decrements

---

## 🔧 Configuration

React Query settings:
- **Stale time:** 2 minutes
- **Cache time:** 10 minutes
- **Polling:** Every 2 minutes
- **Focus refetch:** Yes

---

## 🧪 Testing

```bash
# 1. Create unread notification
# 2. Check Eye icon appears
# 3. Check left border present
# 4. Check badge shows count
# 5. Click notification
# 6. Verify icon changes to Check
# 7. Verify badge decrements
```

---

## 🎨 Style Classes Reference

```tsx
// Unread
className="border-l-4 border-l-primary bg-accent/20"
<Eye className="h-5 w-5 text-primary" />

// Read
className="border-border"
<Check className="h-5 w-5 text-muted-foreground" />
```

---

## 🐛 Common Issues

### Badge not updating?
```typescript
// Force refresh
queryClient.invalidateQueries(['unreadNotificationCount', userId])
```

### Count mismatch?
```javascript
// Clear all caches
queryClient.clear()
// Then hard refresh browser
```

---

## 📁 Key Files

- `NotificationsView.tsx` - Visual indicators
- `useUnreadNotificationCount.ts` - Hook
- `unread-count/[userId]/route.ts` - API
- `bottom-menu.tsx` - Badge display

---

## 💡 Features

- ✅ Eye icon for unread
- ✅ Check icon for read  
- ✅ Left border accent
- ✅ Bold text for unread
- ✅ Unread count badge
- ✅ Auto-refresh (2 min)
- ✅ Instant updates on click
- ✅ Mobile responsive

---

## 🎯 Special Behavior

**New Signup Notifications:**
- Stay unread until clicked
- Not marked read on view
- Ensures admin reviews them

---

**For detailed documentation, see:** [READ_UNREAD_INDICATORS.md](./READ_UNREAD_INDICATORS.md)