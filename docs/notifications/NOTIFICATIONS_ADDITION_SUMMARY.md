# Notifications Addition - Summary

## What Was Added

Automated notification system integrated with the Profile Update Requests feature to keep users and admins informed of request status changes.

## 🎯 Overview

When users request profile updates or admins approve/deny requests, the system now automatically sends notifications to keep all parties informed.

## 📬 Notification Types

### 1. Admin Notification - Profile Update Request
**Triggered**: When a user submits a profile update request
**Recipients**: All admin users
**Contains**: User details, field being changed, requested value
**Action**: Links directly to the pending request in admin dashboard

### 2. User Notification - Request Approved
**Triggered**: When an admin approves the request
**Recipients**: The requesting user
**Contains**: Approval confirmation, admin name, optional notes
**Action**: Links to user's profile page

### 3. User Notification - Request Denied
**Triggered**: When an admin denies the request
**Recipients**: The requesting user
**Contains**: Denial notice, admin name, reason (if provided)
**Action**: Links to user's profile page

## 🗄️ Database Changes

### Updated Schema: `notifications.ts`

**Added to `notificationTypeEnum`:**
- `profile_update_approved`
- `profile_update_denied`
- `profile_update_request`

**New Enum: `notificationMethodEnum`**
```typescript
['in-app', 'email']
```

**Updated `userNotifications` Table:**
- Added `methods` field: `text[]` (array of delivery methods)
- Added `emailAddress` field: `varchar(255)` (for email notifications)

These fields were missing from the SQL migration but present in the original Mongoose model.

## 📁 New Files Created

### 1. Notification Service
**Location**: `apps/web/lib/notifications/profileUpdateNotifications.ts`

**Functions:**
- `notifyAdminsOfProfileUpdateRequest()` - Sends notification to all admins
- `notifyUserOfProfileUpdateResponse()` - Sends notification to user on approval/denial
- `markProfileUpdateNotificationAsRead()` - Marks notification as read
- `getUnreadProfileUpdateNotifications()` - Fetches unread notifications

### 2. Documentation
**Location**: `PROFILE_UPDATE_NOTIFICATIONS.md`

Complete guide covering:
- Notification types and structure
- Database schema changes
- Implementation details
- API integration
- Testing procedures
- Troubleshooting
- Future enhancements (email delivery)

## 🔌 API Integration

### User Request Creation
**Endpoint**: `POST /api/profile-update-requests`

**Added**: Notification call after request creation
```typescript
await notifyAdminsOfProfileUpdateRequest({
  userId, userEmail, userName,
  fieldName, requestedValue, requestId
});
```

### Admin Approval/Denial
**Endpoint**: `PATCH /api/admin/profile-update-requests/[requestId]`

**Added**: Notification call after status update
```typescript
await notifyUserOfProfileUpdateResponse({
  userId, fieldName, requestedValue,
  status, reviewedByName, reviewNotes, requestId
});
```

## 🛡️ Error Handling

All notification calls are wrapped in try-catch blocks:
```typescript
try {
  await notifyAdmins(...);
} catch (notificationError) {
  console.error("Error sending notification:", notificationError);
  // Don't fail the main request
}
```

**Ensures**:
- Profile requests always complete
- Approvals/denials always process
- Notifications are best-effort delivery
- System remains resilient to notification failures

## 📊 Notification Flow

### User Submits Request
```
User submits request
    ↓
Request created in database
    ↓
Notification created for all admins
    ↓
UserNotifications created for each admin
    ↓
Admins see notification in their dashboard
```

### Admin Approves/Denies
```
Admin takes action (approve/deny)
    ↓
Request status updated
    ↓
Profile updated (if approved)
    ↓
Notification created for user
    ↓
UserNotification created
    ↓
User sees notification
```

## 🔧 Migration Required

After implementing these changes, run:

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

**Migration will:**
1. Add `methods` column to `userNotifications` (text array)
2. Add `emailAddress` column to `userNotifications` (varchar)
3. Add new values to `notification_type` enum
4. Create new `notification_method` enum

## ✅ What's Complete

- ✅ Database schema updates
- ✅ Notification service functions
- ✅ API integration (user endpoint)
- ✅ API integration (admin endpoint)
- ✅ Error handling and resilience
- ✅ Complete documentation
- ✅ Updated implementation checklist
- ✅ Updated master index

## ⏳ What You Need to Do

### 1. Run Database Migration
```bash
cd fajr-medflow-emr
npm run db:generate
npm run db:migrate
```

### 2. Verify Schema Changes
```sql
-- Check userNotifications has new columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_notifications';

-- Check new notification types
SELECT unnest(enum_range(NULL::notification_type));
```

### 3. Test Notification Flow

**Test 1: User Request → Admin Notification**
- Submit profile update request as user
- Verify admin receives notification
- Check notification contains correct info
- Click notification link → should go to request

**Test 2: Admin Approval → User Notification**
- Approve request as admin
- Verify user receives notification
- Check notification shows approval + admin name
- Verify profile was updated

**Test 3: Admin Denial → User Notification**
- Deny request as admin (with notes)
- Verify user receives notification
- Check notification shows denial + reason
- Verify profile was NOT updated

### 4. Integrate with Your Notification UI

If you have existing notification display components:
```typescript
import { getUnreadProfileUpdateNotifications } from '@/lib/notifications/profileUpdateNotifications';

const notifications = await getUnreadProfileUpdateNotifications(userId);
```

Display notifications in your existing notification center/bell icon component.

## 🎨 UI Considerations

### For Users
Users should see notifications in:
- Notification center/dropdown
- Badge count on notification icon
- Toast/snackbar on new notification (optional)

### For Admins
Admins should see notifications in:
- Admin dashboard notification area
- Clickable to navigate to specific request
- Count of pending profile update requests

## 🔮 Future Enhancements

### Email Delivery (Not Yet Implemented)
The notification system is **prepared** for email delivery:
- Each notification has `methods: ['in-app', 'email']`
- Each has `emailAddress` field populated
- A background service can process email notifications

**To implement email:**
1. Set up email service (SendGrid, AWS SES, etc.)
2. Create email templates for each notification type
3. Build background job to process email notifications
4. Mark notifications as sent after delivery

### Other Enhancements
- Push notifications (web push)
- SMS notifications
- Notification preferences per user
- Digest emails (daily/weekly summary)
- Notification history/archive
- Read receipts
- Reminder notifications for pending requests

## 🐛 Troubleshooting

### Notifications Not Being Created
1. Check console logs for errors
2. Verify database connection
3. Check `admins` table has admin users
4. Verify notification service is imported correctly

### Admins Not Receiving Notifications
1. Verify user has entry in `admins` table
2. Check `userNotifications` table for records
3. Verify your notification display component fetches data
4. Check React Query cache is invalidating

### Links Not Working
1. Check `redirectTo` URLs in notifications
2. Verify routing matches your app structure
3. Test URLs manually
4. Check for route guards blocking access

## 📚 Documentation

**Main Guides:**
- [PROFILE_UPDATE_NOTIFICATIONS.md](./PROFILE_UPDATE_NOTIFICATIONS.md) - Complete notification guide
- [PROFILE_UPDATE_REQUESTS_README.md](./PROFILE_UPDATE_REQUESTS_README.md) - Main system docs (updated)
- [IMPLEMENTATION_CHECKLIST.md](./IMPLEMENTATION_CHECKLIST.md) - Checklist (updated with notifications)
- [PROFILE_UPDATE_REQUESTS_INDEX.md](./PROFILE_UPDATE_REQUESTS_INDEX.md) - Master index (updated)

## 🎉 Benefits

✅ **Immediate Awareness**: Admins instantly know about new requests
✅ **User Transparency**: Users know when their request is approved/denied
✅ **Reduced Manual Checking**: No need to constantly check dashboard
✅ **Better Communication**: Optional review notes provide context
✅ **Audit Trail**: All notifications logged in database
✅ **Scalable**: Easy to add more notification types
✅ **Resilient**: Notification failures don't break main flow
✅ **Future-Ready**: Prepared for email/SMS delivery

## 🔐 Security

- Only admins receive request notifications
- Users only see their own approval/denial notifications
- All notifications use authenticated API calls
- SQL injection prevented via Drizzle ORM
- XSS prevented via React sanitization
- No sensitive data exposed in notifications

## 📊 Database Tables Involved

```
notifications (central notification records)
    ↓
userNotifications (per-user delivery records)
    ↓
notificationRecipients (intended recipients list)
    ↓
Linked to: users, admins tables
```

## ⚡ Quick Commands

```bash
# Generate and run migration
npm run db:generate && npm run db:migrate

# Check userNotifications schema
psql -d your_db -c "\d user_notifications"

# View notification types
psql -d your_db -c "SELECT unnest(enum_range(NULL::notification_type));"

# Test notification creation (in your app)
curl -X POST /api/profile-update-requests \
  -H "Authorization: Bearer TOKEN" \
  -d '{"fieldName":"doctorSpecialty","requestedValue":["Neurology"]}'
```

## 🎯 Success Criteria

You'll know it's working when:
- ✅ User submits request → All admins get notification
- ✅ Admin clicks notification → Goes to specific request
- ✅ Admin approves → User gets notification with "approved"
- ✅ Admin denies → User gets notification with reason
- ✅ Notifications appear in notification center
- ✅ Notification count updates correctly
- ✅ No errors in console logs

---

**Status**: ✅ Complete and ready to migrate
**Version**: 1.0.0
**Added**: Profile Update Request Notifications
**Integration Time**: ~30 minutes (migration + testing)