# Profile Update Request Notifications

This document describes the notification system integrated with the Profile Update Requests feature.

## Overview

When users request profile updates or when admins approve/deny requests, automated notifications are sent to keep all parties informed.

## Notification Types

### 1. Profile Update Request Notification (to Admins)
**Triggered when**: A user submits a profile update request

**Recipients**: All admin users

**Notification Details**:
- **Type**: `profile_update_request`
- **Message**: `{userName} ({userEmail}) has requested to update their {fieldName} to: {value}`
- **Subject**: `Profile Update Request - {fieldName}`
- **Redirect**: `/admin-dashboard?section=profileUpdateRequests&requestId={requestId}`
- **Methods**: `['in-app', 'email']`

**Example**:
```
John Doe (john@example.com) has requested to update their Doctor Specialty to: Neurology
```

### 2. Profile Update Approved Notification (to User)
**Triggered when**: An admin approves a profile update request

**Recipients**: The user who made the request

**Notification Details**:
- **Type**: `profile_update_approved`
- **Message**: `Your request to update your {fieldName} to "{value}" has been approved by {adminName}.`
- **Subject**: `Profile Update Approved - {fieldName}`
- **Redirect**: `/my-profile`
- **Methods**: `['in-app', 'email']`

**Example**:
```
Your request to update your Doctor Specialty to "Neurology" has been approved by Admin User.
Note: Your credentials have been verified.
```

### 3. Profile Update Denied Notification (to User)
**Triggered when**: An admin denies a profile update request

**Recipients**: The user who made the request

**Notification Details**:
- **Type**: `profile_update_denied`
- **Message**: `Your request to update your {fieldName} to "{value}" has been denied by {adminName}.`
- **Subject**: `Profile Update Denied - {fieldName}`
- **Redirect**: `/my-profile`
- **Methods**: `['in-app', 'email']`

**Example**:
```
Your request to update your Doctor Specialty to "Neurology" has been denied by Admin User.
Reason: Insufficient documentation provided.
```

## Database Schema Updates

### Updated `userNotifications` Table

The `userNotifications` table now includes fields from the original Mongoose model:

```typescript
{
  id: uuid (PK)
  userId: uuid (FK → users.id)
  notificationId: uuid (FK → notifications.id)
  read: boolean (default: false)
  readAt: timestamp
  dismissed: boolean (default: false)
  dismissedAt: timestamp
  methods: text[] (default: ['in-app']) // NEW
  emailAddress: varchar(255) // NEW
  createdAt: timestamp
}
```

### New Notification Types Enum

Added to `notificationTypeEnum`:
- `profile_update_approved`
- `profile_update_denied`
- `profile_update_request`

### New Notification Methods Enum

```typescript
export const notificationMethodEnum = pgEnum("notification_method", [
  "in-app",
  "email",
]);
```

## Implementation

### Notification Service Functions

Located in: `apps/web/lib/notifications/profileUpdateNotifications.ts`

#### 1. `notifyAdminsOfProfileUpdateRequest(params)`

Sends notifications to all admins when a user creates a profile update request.

**Parameters**:
```typescript
{
  userId: string;
  userEmail: string;
  userName: string;
  fieldName: string;
  requestedValue: any;
  requestId: string;
}
```

**Process**:
1. Fetches all admin user IDs from `admins` table
2. Creates a central notification record
3. Creates individual `userNotifications` for each admin
4. Creates `notificationRecipients` records
5. Sets email addresses for potential email delivery

#### 2. `notifyUserOfProfileUpdateResponse(params)`

Sends notification to user when their request is approved or denied.

**Parameters**:
```typescript
{
  userId: string;
  fieldName: string;
  requestedValue: any;
  status: 'approved' | 'denied';
  reviewedByName: string;
  reviewNotes?: string;
  requestId: string;
}
```

**Process**:
1. Fetches user details
2. Creates appropriate message based on status
3. Includes review notes if provided
4. Creates notification and user notification records
5. Sets up for both in-app and email delivery

#### 3. `markProfileUpdateNotificationAsRead(notificationId, userId)`

Marks a notification as read for a specific user.

#### 4. `getUnreadProfileUpdateNotifications(userId)`

Retrieves all unread profile update notifications for a user.

## API Integration

### User Request Creation
**Endpoint**: `POST /api/profile-update-requests`

After creating the request:
```typescript
await notifyAdminsOfProfileUpdateRequest({
  userId: session.user.id,
  userEmail: user.email,
  userName: `${user.firstName} ${user.lastName}`,
  fieldName: fieldName,
  requestedValue: requestedValue,
  requestId: newRequest.id,
});
```

### Admin Approval/Denial
**Endpoint**: `PATCH /api/admin/profile-update-requests/[requestId]`

After updating the request status:
```typescript
await notifyUserOfProfileUpdateResponse({
  userId: updateRequest.userId,
  fieldName: updateRequest.fieldName,
  requestedValue: updateRequest.requestedValue,
  status: newStatus,
  reviewedByName: `${adminUser.firstName} ${adminUser.lastName}`,
  reviewNotes: reviewNotes,
  requestId: params.requestId,
});
```

## Error Handling

All notification calls are wrapped in try-catch blocks to ensure that notification failures don't break the main request flow:

```typescript
try {
  await notifyAdminsOfProfileUpdateRequest(params);
} catch (notificationError) {
  console.error("Error sending admin notification:", notificationError);
  // Don't fail the request if notification fails
}
```

This ensures that:
- Profile update requests are always created
- Approvals/denials always process
- Notifications are best-effort delivery

## Migration Required

After implementing these changes, you need to update the database schema:

```bash
# Generate migration
npm run db:generate

# Apply migration
npm run db:migrate
```

### Migration Will Add:
1. New `methods` column to `userNotifications` table (text array)
2. New `emailAddress` column to `userNotifications` table (varchar)
3. New enum values to `notification_type`:
   - `profile_update_approved`
   - `profile_update_denied`
   - `profile_update_request`
4. New `notification_method` enum type

## Usage Examples

### For Users

When a user sees a profile update notification:

```typescript
// In notification display component
import { getUnreadProfileUpdateNotifications } from '@/lib/notifications/profileUpdateNotifications';

const notifications = await getUnreadProfileUpdateNotifications(userId);

// Display notifications
notifications.map(notification => (
  <NotificationItem
    key={notification.id}
    message={notification.notification.message}
    type={notification.notification.type}
    onClick={() => markProfileUpdateNotificationAsRead(notification.notificationId, userId)}
  />
));
```

### For Admins

Admins receive in-app notifications with a link directly to the pending request:

**Redirect URL**: `/admin-dashboard?section=profileUpdateRequests&requestId={requestId}`

This opens the admin dashboard with the Profile Update Requests section expanded and optionally scrolls to the specific request.

## Email Integration (Future Enhancement)

The notification system is designed to support email delivery:

1. Each `userNotification` has a `methods` array that can include `'email'`
2. The `emailAddress` field stores the recipient's email
3. A background job/service can process notifications with `email` method
4. Email templates can be created for each notification type

### Example Email Processing:
```typescript
// Pseudo-code for future email service
const unsentEmailNotifications = await getNotificationsWithMethod('email', false);

for (const notification of unsentEmailNotifications) {
  await sendEmail({
    to: notification.emailAddress,
    subject: notification.notification.subject,
    body: notification.notification.message,
  });
  
  await markNotificationEmailSent(notification.id);
}
```

## Testing

### Test User Notification Flow
1. As a user, create a profile update request
2. As an admin, check for new notification in admin dashboard
3. Verify notification contains correct information
4. Click notification to navigate to request
5. Approve the request
6. As the user, verify approval notification received
7. Check that profile was updated

### Test Admin Notification Flow
1. Create multiple admin accounts
2. As a user, submit a profile update request
3. Verify all admins receive the notification
4. Have one admin approve the request
5. Verify user receives approval notification
6. Check that other admins can see the request is now approved

### Test Error Scenarios
1. Submit request with invalid data (should fail without creating notification)
2. Approve request with database error (should log error but not crash)
3. Deny request when notification service is down (should still deny request)

## Monitoring

### Key Metrics to Track
- Number of profile update request notifications sent
- Number of approval/denial notifications sent
- Notification delivery success rate
- Average time from request to admin notification view
- Average time from approval to user notification view

### Logging
All notification operations are logged:
```typescript
console.log(`Created profile update request notification for ${adminUserIds.length} admins`);
console.log(`Created profile update ${status} notification for user ${userId}`);
console.error('Error creating admin notification for profile update request:', error);
```

## Security Considerations

1. **Authorization**: Only admins can trigger user notifications through approvals
2. **Data Privacy**: Notifications only show necessary information
3. **User Isolation**: Users can only see their own notifications
4. **Admin Notifications**: Only sent to verified admin users
5. **SQL Injection**: Protected by Drizzle ORM parameterized queries
6. **XSS Prevention**: All notification content is sanitized when displayed

## Troubleshooting

### Notifications Not Being Created
1. Check database connection
2. Verify `admins` table has entries
3. Check console logs for errors
4. Verify notification service is imported correctly

### Admins Not Receiving Notifications
1. Verify user has entry in `admins` table
2. Check `userNotifications` table for created records
3. Verify notification display component is fetching notifications
4. Check for errors in browser console

### User Not Receiving Approval/Denial Notification
1. Verify request was actually approved/denied
2. Check `notifications` table for created record
3. Check `userNotifications` table for user's record
4. Verify user ID matches in both request and notification

### Notification Links Not Working
1. Check `redirectTo` field in notification
2. Verify URL format matches your routing structure
3. Test navigation manually with the URL
4. Check for any route guards or middleware blocking access

## Future Enhancements

1. **Email Delivery**: Implement actual email sending service
2. **Push Notifications**: Add web push notification support
3. **Notification Preferences**: Let users choose notification methods
4. **Batch Notifications**: Group multiple updates into digest emails
5. **Rich Notifications**: Add more formatting and actions to notifications
6. **Notification History**: Archive and search past notifications
7. **Read Receipts**: Track when notifications are viewed
8. **Reminder Notifications**: Remind admins of pending requests after X days

## Related Documentation

- [Profile Update Requests System](./PROFILE_UPDATE_REQUESTS_README.md)
- [Database Schema](./apps/web/db/schema/notifications.ts)
- [Notification Service](./apps/web/lib/notifications/profileUpdateNotifications.ts)
- [Integration Guide](./PROFILE_UPDATE_REQUESTS_INTEGRATION.md)