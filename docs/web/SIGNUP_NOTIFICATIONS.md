# Signup Notification System

## Overview

The signup notification system automatically notifies all admins via in-app notifications when a new user signs up to the platform. This helps admins stay informed about new user registrations that require approval.

## How It Works

### 1. User Signup Flow

When a new user signs up through the signup form:

1. **User Account Creation** (`/api/auth/signup`)
   - Creates new user in the database
   - Sets `authorized: null` (pending approval) for non-first users
   - First user is automatically authorized and becomes admin

2. **Notification Trigger**
   - If the user is NOT the first user, `notifyAdminsOfNewSignup()` is called
   - This function is in `/lib/notification-helpers.ts`

3. **Admin Notification Creation**
   - Fetches all admin user IDs from the `admins` table
   - Creates a notification with:
     - **Type**: `new_user_signup`
     - **Message**: `"New {accountType} signup: {firstName} {lastName} ({email})"`
     - **Subject**: `"New {accountType} User Registration"`
     - **Redirect URL**: `/admin/new-signups`
   - Creates individual `userNotifications` records for each admin
   - Increments unread notification count for each admin

### 2. Admin Dashboard

Admins can view new signups in two places:

#### A. Notification Bell (Real-time)

Location: Top navigation bar (available on all pages)

Features:
- Shows unread notification count as a badge
- Dropdown displays last 5 notifications
- Auto-refreshes every 2 minutes
- Marks notifications as read when clicked
- Clicking a new signup notification redirects to `/admin/new-signups`

Component: `/components/notifications/NotificationBell.tsx`

#### B. New Signups Section

Location: Admin Dashboard → New Signups

Features:
- Lists all users with `authorized: null`
- Displays user information (name, email, account type, specialty, etc.)
- Bulk approve/deny functionality
- Medical license viewing (for doctors)
- Infinite scroll pagination

Components:
- `/components/adminDashboard/sections/NewSignupsView.tsx`
- `/components/adminDashboard/sections/NewSignupsViewModel.ts`

## Database Schema

### Notifications Table

```sql
notifications
- id (uuid, primary key)
- sourceId (uuid) -- User ID who signed up
- message (text) -- Notification message
- type (enum) -- 'new_user_signup'
- subject (varchar) -- Email subject if needed
- patientId (uuid) -- Not used for signups
- redirectTo (varchar) -- URL to redirect to: '/admin/new-signups'
- createdAt (timestamp)
```

### User Notifications Table (Junction)

```sql
user_notifications
- id (uuid, primary key)
- userId (uuid, foreign key) -- Admin who receives notification
- notificationId (uuid, foreign key) -- References notifications table
- read (boolean, default: false)
- readAt (timestamp)
- dismissed (boolean, default: false)
- dismissedAt (timestamp)
- methods (text array) -- ['in-app']
- emailAddress (varchar)
- createdAt (timestamp)
```

### Notification Recipients Table

```sql
notification_recipients
- id (uuid, primary key)
- notificationId (uuid, foreign key)
- userId (uuid, foreign key) -- Admin who should receive notification
- createdAt (timestamp)
```

## API Endpoints

### Fetch User Notifications
**GET** `/api/notifications/{userId}`

Query Parameters:
- `limit` (number, default: 20)
- `skip` (number, default: 0)

Returns notifications for a specific user, ordered by most recent.

### Mark Notification as Read
**PATCH** `/api/notifications/mark-read/{notificationId}`

Marks a notification as read for the current user and decrements their unread count.

### Create Notification (Admin Only)
**POST** `/api/admin/POST/notifications`

Body:
```json
{
  "message": "string",
  "type": "new_user_signup",
  "subject": "string",
  "patientId": "string (optional)",
  "redirectTo": "string (optional)",
  "recipients": ["userId1", "userId2"]
}
```

## Key Files

### Backend
- `/app/api/auth/signup/route.ts` - User signup endpoint
- `/lib/notification-helpers.ts` - Notification utility functions
- `/utils/notifications.ts` - Additional notification utilities
- `/db/schema/notifications.ts` - Notification database schema

### Frontend
- `/components/notifications/NotificationBell.tsx` - Notification bell UI
- `/components/adminDashboard/sections/NewSignupsView.tsx` - Admin new signups view
- `/components/adminDashboard/sections/NewSignupsViewModel.ts` - View model for new signups

## Notification Types

The system supports the following notification types (enum):
- `message` - General messages
- `alert` - Important alerts
- `profile_update_approved` - Profile update approved
- `profile_update_denied` - Profile update denied
- `profile_update_request` - Profile update request
- `patient_update` - Patient record updated
- `system_notification` - System notifications
- `new_user_signup` - New user signup (NEW)

## Features

### For Admins
1. **Real-time Notifications**: Receive instant in-app notifications when users sign up
2. **Notification Bell**: Quick access to recent notifications
3. **Unread Badge**: Visual indicator of unread notifications
4. **Auto-refresh**: Notifications refresh every 2 minutes
5. **Quick Navigation**: Click notification to go directly to new signups page
6. **Centralized View**: See all pending user approvals in one place

### For Users
1. **Automatic Process**: No action needed from users
2. **Welcome Email**: Users receive a welcome email upon signup
3. **Status Tracking**: Users can see their approval status in their profile

## Migration Notes (MongoDB → SQL)

The following changes were made during the MongoDB to SQL migration:

### Field Name Changes
- `_id` → `id` (user IDs, notification IDs)
- MongoDB ObjectId → PostgreSQL UUID

### Updated Components
1. `NewSignupsViewModel.ts` - Changed `User` interface from `_id` to `id`
2. `NewSignupsView.tsx` - Updated all `user._id` references to `user.id`
3. `NotificationBell.tsx` - Updated `notification._id` to `notification.id`

### Backward Compatibility
The `getUserNotifications()` function returns both `_id` and `id` fields for backward compatibility during the transition period.

## Testing

### Manual Testing Steps

1. **Create a new user**:
   - Go to signup page
   - Fill in all required fields
   - Submit signup form

2. **Verify notification**:
   - Log in as an admin
   - Check the notification bell in the top navigation
   - Should see a badge with unread count
   - Click the bell to see the new signup notification

3. **Check New Signups page**:
   - Navigate to Admin Dashboard → New Signups
   - Verify the new user appears in the list
   - Check user details are correct

4. **Test notification click**:
   - Click the notification in the bell dropdown
   - Should navigate to `/admin/new-signups`
   - Notification should be marked as read
   - Unread badge should decrement

### Troubleshooting

**Notifications not appearing?**
- Check browser console for errors
- Verify admin user exists in `admins` table
- Check `notifications` and `user_notifications` tables
- Review server logs for errors during signup

**Notification bell not updating?**
- Refresh the page manually
- Check the auto-refresh interval (2 minutes)
- Verify session is valid

**New users not appearing in list?**
- Verify `authorized` field is `null` for new users
- Check the `/api/admin/GET/new-users` endpoint
- Ensure admin has proper permissions

## Future Enhancements

Possible improvements to the notification system:

1. **Email Notifications**: Send email notifications to admins (in addition to in-app)
2. **Notification Settings**: Allow admins to customize notification preferences
3. **Push Notifications**: Add browser push notifications
4. **Notification Filtering**: Filter by notification type
5. **Batch Actions**: Approve/deny directly from notifications
6. **Real-time Updates**: Use WebSockets for instant notifications
7. **Notification History**: Archive and search old notifications
8. **Notification Templates**: Customizable notification messages

## Security Considerations

1. **Admin-Only Access**: Only users with admin privileges can access notification endpoints
2. **Session Verification**: All API calls verify user session/token
3. **User Isolation**: Users can only see their own notifications
4. **Input Validation**: All notification data is validated before storage
5. **SQL Injection Prevention**: Using parameterized queries via Drizzle ORM

## Performance

- **Indexes**: Database indexes on `userId`, `notificationId`, and `read` status
- **Pagination**: Notifications are paginated to prevent loading issues
- **Caching**: Consider implementing caching for frequently accessed data
- **Cleanup**: Old notifications can be cleaned up using `deleteOldNotifications()`

---

Last Updated: 2024