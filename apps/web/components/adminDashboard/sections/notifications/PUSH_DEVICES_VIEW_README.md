# Admin Push Devices Management View

## Overview

The **Admin Push Devices Management View** provides a comprehensive interface for managing all registered push notification devices across your application. This view is part of the Admin Dashboard's Notifications section and allows administrators to monitor, filter, and manage device registrations.

## Features

### 📊 Statistics Dashboard

Four key metric cards display:
- **Total Devices**: All registered devices (active + inactive)
- **Active Devices**: Currently active devices that can receive notifications
- **iOS / Android**: Platform distribution breakdown
- **Inactive Devices**: Logged out or invalid devices

### 🔍 Search and Filtering

**Search Bar**:
- Search by user name
- Search by user email
- Search by device model (e.g., "iPhone 13 Pro")
- Search by device ID
- Search by token (partial match)

**Filters**:
- **Platform**: All, iOS, or Android
- **Status**: All, Active, or Inactive
- **Environment**: All, Production, or Development

### 📋 Device Table

Displays all devices with the following columns:

1. **User**: User's full name and email
2. **Device**: Device model (e.g., "iPhone 13 Pro") and device ID
3. **Platform**: iOS/Android badge + dev/prod environment badge
4. **App Version**: App version and build number
5. **Status**: Active (green) or Inactive (gray) badge
6. **Last Seen**: Last registration timestamp
7. **Actions**: Deactivate, Reactivate, or Delete buttons

### ⚡ Actions

**For Active Devices**:
- **Deactivate** (X icon): Marks device as inactive (soft delete)

**For Inactive Devices**:
- **Reactivate** (↻ icon): Marks device as active again
- **Delete** (🗑️ icon): Permanently removes device from database

All actions require confirmation and update the list automatically.

## File Structure

```
apps/web/
├── components/
│   └── adminDashboard/
│       └── sections/
│           └── notifications/
│               ├── AdminPushDevicesView.tsx          # Main component
│               └── AdminNotificationsView.tsx        # Parent component
└── app/
    └── api/
        └── admin/
            └── push-devices/
                ├── route.ts                          # GET all devices
                └── [id]/
                    └── route.ts                      # PATCH/DELETE device
```

## API Endpoints

### GET `/api/admin/push-devices`

Fetches all devices with user information and statistics.

**Response**:
```json
{
  "devices": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "userEmail": "john@example.com",
      "platform": "ios",
      "token": "device_token_here",
      "environment": "prod",
      "isActive": true,
      "lastSeenAt": "2026-01-11T10:30:00Z",
      "deviceId": "iPhone-12345",
      "deviceModel": "iPhone 13 Pro",
      "appVersion": "1.2.3",
      "buildNumber": "42",
      "createdAt": "2026-01-01T00:00:00Z",
      "updatedAt": "2026-01-11T10:30:00Z"
    }
  ],
  "stats": {
    "totalDevices": 150,
    "activeDevices": 120,
    "inactiveDevices": 30,
    "iosDevices": 80,
    "androidDevices": 40,
    "devEnvironment": 10,
    "prodEnvironment": 110
  }
}
```

### PATCH `/api/admin/push-devices/[id]`

Deactivates or reactivates a device.

**Request**:
```json
{
  "action": "deactivate" | "reactivate"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Device deactivated successfully",
  "device": { /* updated device object */ }
}
```

### DELETE `/api/admin/push-devices/[id]`

Permanently deletes a device.

**Response**:
```json
{
  "success": true,
  "message": "Device deleted successfully",
  "device": { /* deleted device object */ }
}
```

## Authentication & Authorization

All endpoints require:
1. **Valid session**: User must be logged in
2. **Admin role**: User's `accountType` must be `"Evac"`

Non-admin users receive a `403 Forbidden` response.

## Usage

### Accessing the View

1. Navigate to Admin Dashboard
2. Go to "Notifications" section
3. Expand "Push Devices Management" accordion

### Common Tasks

**View All Active iOS Devices**:
1. Set Platform filter to "iOS"
2. Set Status filter to "Active"

**Find Stale Devices**:
1. Sort by "Last Seen" column (oldest first)
2. Review devices not seen recently
3. Consider deactivating or deleting old devices

**Search for User's Devices**:
1. Type user's name or email in search bar
2. View all their registered devices
3. Check device models and versions

**Clean Up Invalid Devices**:
1. Set Status filter to "Inactive"
2. Review inactive devices
3. Delete devices inactive for 90+ days

**Monitor App Versions**:
1. Review "App Version" column
2. Identify users on old versions
3. Plan upgrade communications

## Data Flow

```
┌─────────────────────┐
│  Mobile App         │
│  - Registers token  │
│  - Sends metadata   │
└──────────┬──────────┘
           │ POST /api/user/device-token
           ▼
┌─────────────────────┐
│  Database           │
│  push_devices table │
└──────────┬──────────┘
           │ Admin queries
           ▼
┌─────────────────────┐
│  Admin API          │
│  /api/admin/push-   │
│  devices            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Admin UI           │
│  Table + Filters    │
└─────────────────────┘
```

## Best Practices

### For Administrators

1. **Regular Cleanup**:
   - Review inactive devices monthly
   - Delete devices inactive for 90+ days
   - Monitor for duplicate devices

2. **Monitor Device Health**:
   - Check active device count trends
   - Watch for unusual platform distribution
   - Track dev vs prod environment usage

3. **User Support**:
   - Use search to quickly find user's devices
   - Help troubleshoot notification issues
   - Verify device registration

4. **Security**:
   - Monitor for suspicious device registrations
   - Check for unusually high device counts per user
   - Review device models for anomalies

### Database Maintenance

Run periodic cleanup queries:

```sql
-- Mark stale devices as inactive (not seen in 60 days)
UPDATE push_devices
SET is_active = false, updated_at = NOW()
WHERE is_active = true
  AND last_seen_at < NOW() - INTERVAL '60 days';

-- Delete old inactive devices (inactive for 90+ days)
DELETE FROM push_devices
WHERE is_active = false
  AND updated_at < NOW() - INTERVAL '90 days';
```

## Troubleshooting

### No Devices Showing

**Possible causes**:
- No devices have registered yet
- All devices filtered out by current filters
- API error (check browser console)

**Solutions**:
1. Reset all filters to "All"
2. Clear search query
3. Click "Refresh" button
4. Check browser console for errors

### Device Not Receiving Notifications

**Admin can verify**:
1. Search for user's email
2. Check if device is **Active**
3. Verify **Platform** and **Environment** match app
4. Check **Last Seen** is recent
5. Review **Token** (ensure not blank)

**Actions**:
- If inactive: Ask user to log in again
- If environment mismatch: Check APNs certificate
- If old last seen: Device may need reinstall

### User Has Multiple Devices

This is normal! Users can have:
- Multiple physical devices (phone + tablet)
- Same device with dev + prod builds
- Old devices that need cleanup

**Review**:
- Check device models to identify duplicates
- Verify last seen dates
- Deactivate or delete old devices

## Performance Considerations

- **Table renders up to 1000 devices efficiently**
- **Filters applied client-side** for instant response
- **Auto-refresh disabled by default** to reduce server load
- **Indexes on database** ensure fast queries

## Future Enhancements

Potential improvements:
- [ ] Bulk actions (deactivate/delete multiple)
- [ ] Export devices to CSV
- [ ] Device activity timeline
- [ ] Push notification test button
- [ ] Device location tracking (if available)
- [ ] Per-device notification logs
- [ ] User notification preferences editor

## Related Documentation

- **Push Devices Implementation**: See `PUSH_DEVICES_IMPLEMENTATION_SUMMARY.md`
- **Migration Guide**: See `apps/web/db/migrations/PUSH_DEVICES_MIGRATION_GUIDE.md`
- **API Documentation**: See `apps/web/app/api/user/device-token/route.ts`
- **Database Schema**: See `apps/web/db/schema/pushDevices.ts`

## Support

For issues or questions:
1. Check the main Push Devices documentation
2. Review API endpoint logs
3. Verify database constraints and indexes
4. Contact backend team for assistance

---

**Last Updated**: 2026-01-11  
**Version**: 1.0  
**Author**: Kyle Essenmacher