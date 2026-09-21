# Push Notifications Service Migration Guide

## Overview

The push notifications system has been migrated from direct gorush integration to use the new notifications-server microservice with the `push_devices` table.

## What Changed

### Old Architecture (Deprecated)
```
Web App → Gorush (direct) → APNs/FCM
          ↑
    userSettings table
    (iosDeviceToken, androidDeviceToken arrays)
```

### New Architecture (Current)
```
Web App → Notifications Server → Gorush → APNs/FCM
                ↑
          push_devices table
          (relational device management)
```

## Breaking Changes

### 1. Database Schema

**Old (`userSettings` table):**
- `ios_device_token` - text array
- `android_device_token` - text array

**New (`push_devices` table):**
- Separate row per device
- Device metadata (model, app version, etc.)
- Active/inactive status
- Last seen timestamp
- Environment (dev/prod) support

### 2. Service Configuration

**Old:**
```typescript
// Environment variable
GORUSH_URL=http://gorush:8088

// Service instantiation
const service = new PushNotificationService("http://gorush:8088");
```

**New:**
```typescript
// Environment variables (priority order)
NOTIFICATIONS_SERVER_URL=http://notifications-server:8080
NEXT_PUBLIC_NOTIFICATIONS_SERVER_URL=http://localhost:8080

// Service instantiation (auto-detects URL)
const service = new PushNotificationService();
```

### 3. API Methods

#### sendNotification (Deprecated)

**Old Usage:**
```typescript
await pushNotificationService.sendNotification(
  {
    ios: ['token1', 'token2'],
    android: ['token3', 'token4'],
  },
  {
    title: 'Test',
    body: 'Test notification',
  }
);
```

**New (Still works but deprecated):**
```typescript
// This method now logs a deprecation warning
// Use sendNotificationToUser instead
```

#### sendNotificationToUser (Preferred)

**Old Implementation:**
```typescript
// Queried userSettings.iosDeviceToken and androidDeviceToken
// Sent directly to gorush
```

**New Implementation:**
```typescript
// Sends user_id to notifications-server
// Server queries push_devices table
// Server handles gorush communication
await pushNotificationService.sendNotificationToUser(
  'user-uuid',
  {
    title: 'Test',
    body: 'Test notification',
    data: { type: 'test' }
  }
);
```

#### sendNotificationToUsers (Batch)

**Old:**
```typescript
// Queried userSettings for all users
// Collected all tokens
// Sent one batch request to gorush
```

**New:**
```typescript
// Sends array of notifications to notifications-server
// Server handles device lookup and gorush communication
await pushNotificationService.sendNotificationToUsers(
  ['user-id-1', 'user-id-2'],
  {
    title: 'Batch Notification',
    body: 'Message',
  }
);
```

## Migration Steps

### For Development

1. **Update Environment Variables**
   ```bash
   # In .env or .env.local
   NOTIFICATIONS_SERVER_URL=http://localhost:8080
   ```

2. **Start Notifications Server**
   ```bash
   # Use local docker-compose
   ./run-notifications-server-local.sh
   
   # Or directly
   docker-compose -f docker-compose.notifications.local.yml up
   ```

3. **Update Code** (if using deprecated methods)
   ```typescript
   // Before
   await pushNotificationService.sendNotification(tokens, notification);
   
   // After
   await pushNotificationService.sendNotificationToUser(userId, notification);
   ```

4. **Test Health Check**
   ```typescript
   const isHealthy = await pushNotificationService.healthCheck();
   // Now checks notifications-server, not gorush directly
   ```

### For Production

1. **Deploy Notifications Server**
   - Ensure notifications-server is running
   - Verify gorush is accessible from notifications-server
   - Set `NOTIFICATIONS_SERVER_URL` in environment

2. **Migrate Device Tokens** (if needed)
   ```sql
   -- If you have old tokens in userSettings, migrate to push_devices
   -- This is a one-time migration script (example)
   
   -- For iOS tokens
   INSERT INTO push_devices (user_id, platform, token, environment, is_active)
   SELECT 
     user_id,
     'ios' as platform,
     unnest(ios_device_token) as token,
     'prod' as environment,
     true as is_active
   FROM user_settings
   WHERE ios_device_token IS NOT NULL AND array_length(ios_device_token, 1) > 0;
   
   -- For Android tokens
   INSERT INTO push_devices (user_id, platform, token, environment, is_active)
   SELECT 
     user_id,
     'android' as platform,
     unnest(android_device_token) as token,
     'prod' as environment,
     true as is_active
   FROM user_settings
   WHERE android_device_token IS NOT NULL AND array_length(android_device_token, 1) > 0;
   ```

3. **Remove Old Columns** (after migration is verified)
   ```sql
   -- Wait until all devices re-register with new system
   -- Then remove old columns from userSettings
   ALTER TABLE user_settings DROP COLUMN IF EXISTS ios_device_token;
   ALTER TABLE user_settings DROP COLUMN IF EXISTS android_device_token;
   ```

4. **Update Deployment Configuration**
   ```yaml
   # docker-compose or Coolify
   environment:
     NOTIFICATIONS_SERVER_URL: http://notifications-server:8080
   ```

## Backwards Compatibility

### Deprecated but Functional
- `sendNotification(tokens, notification)` - Logs warning, no-op
- Direct gorush URL configuration - Still accepted but not used

### Removed Functionality
- Direct token array support - Use user IDs instead
- `userSettings.iosDeviceToken` field - Use `push_devices` table
- `userSettings.androidDeviceToken` field - Use `push_devices` table

## Advantages of New System

### 1. Better Device Management
- Track individual devices (not just arrays of tokens)
- Device metadata (model, app version, build number)
- Active/inactive status tracking
- Last seen timestamps
- Support for multiple devices per user

### 2. Improved Reliability
- Automatic invalid token cleanup
- Environment separation (dev/prod)
- Better error tracking per device
- Device re-registration support

### 3. Enhanced Debugging
- Device registration component with debug info
- Admin dashboard for device management
- Test notification capability
- Comprehensive logging

### 4. Scalability
- Microservice architecture
- Independent notifications server
- Batch processing support
- Better monitoring capabilities

## Troubleshooting

### Type Errors in pushNotifications.ts

**Error:**
```
Property 'iosDeviceToken' does not exist on type 'UserSettings'
```

**Solution:**
```typescript
// Update to use new API (already done in current version)
// Use sendNotificationToUser instead of querying userSettings
```

### Health Check Failures

**Error:**
```
Notifications service health check failed
```

**Check:**
1. Is notifications-server running?
   ```bash
   curl http://localhost:8080/health
   ```

2. Is `NOTIFICATIONS_SERVER_URL` set correctly?
   ```bash
   echo $NOTIFICATIONS_SERVER_URL
   ```

3. Check notifications-server logs:
   ```bash
   docker logs notifications-server-local -f
   ```

### No Notifications Received

**Possible Causes:**
1. Device not registered in `push_devices` table
2. Device marked as inactive
3. Notifications server not running
4. Gorush not configured correctly
5. APNs credentials invalid

**Debug Steps:**
1. Check device exists:
   ```sql
   SELECT * FROM push_devices WHERE user_id = 'USER_ID';
   ```

2. Check device is active:
   ```sql
   SELECT * FROM push_devices WHERE user_id = 'USER_ID' AND is_active = true;
   ```

3. Test notifications server:
   ```bash
   curl -X POST http://localhost:8080/api/push/send \
     -H "Content-Type: application/json" \
     -d '{"user_id":"USER_ID","title":"Test","message":"Test"}'
   ```

4. Check gorush logs:
   ```bash
   docker logs gorush-local -f
   ```

## Code Examples

### Send Notification to Single User
```typescript
import { pushNotificationService } from '@/lib/pushNotifications';

await pushNotificationService.sendNotificationToUser(
  userId,
  {
    title: 'New Message',
    body: 'You have a new message',
    data: {
      type: 'message',
      messageId: '123',
    },
  }
);
```

### Send Notification to Multiple Users
```typescript
import { pushNotificationService } from '@/lib/pushNotifications';

await pushNotificationService.sendNotificationToUsers(
  [userId1, userId2, userId3],
  {
    title: 'System Update',
    body: 'System maintenance scheduled',
    data: {
      type: 'announcement',
    },
  }
);
```

### Check Service Health
```typescript
import { pushNotificationService } from '@/lib/pushNotifications';

const isHealthy = await pushNotificationService.healthCheck();
if (!isHealthy) {
  console.error('Notifications service is down');
  // Fallback to email notifications or other alert method
}
```

## Testing

### Unit Tests
```typescript
// Mock the notifications server
jest.mock('axios');

test('sends notification to user', async () => {
  axios.post.mockResolvedValue({ data: { success: true } });
  
  await pushNotificationService.sendNotificationToUser('user-id', {
    title: 'Test',
    body: 'Test',
  });
  
  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining('/api/push/send'),
    expect.objectContaining({
      user_id: 'user-id',
      title: 'Test',
    })
  );
});
```

### Integration Tests
```bash
# Start local notifications server
./run-notifications-server-local.sh

# Register a test device via mobile app
# Send test notification from admin dashboard
# Verify notification received on device
```

## Related Documentation

- [Push Devices Implementation](./PUSH_DEVICES_IMPLEMENTATION_SUMMARY.md)
- [Admin Push Test Notification Guide](./ADMIN_PUSH_TEST_NOTIFICATION_GUIDE.md)
- [Local Notifications Testing](./LOCAL_NOTIFICATIONS_TESTING.md)
- [Device Registration Component](./MOBILE_DEVICE_REGISTRATION_COMPONENT.md)
- [Notifications Server README](./apps/notifications-server/README.md)

## Support

For issues with migration:
1. Check this guide for common problems
2. Review notifications-server logs
3. Verify environment variables are set
4. Test health check endpoint
5. Consult related documentation above

---

**Migration Status:** ✅ Complete  
**Version:** 2.0.0  
**Date:** January 2024  
**Breaking:** Yes - requires notifications-server deployment