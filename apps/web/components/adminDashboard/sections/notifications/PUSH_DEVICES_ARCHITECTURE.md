# Push Devices Architecture Documentation

## Overview

This document describes the architecture and implementation of the Push Devices Management system in the Fajr Mission EMR application. The system allows administrators to monitor, manage, and troubleshoot push notification device registrations.

## Architecture Layers

The implementation follows a clean architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────────────┐
│           View Layer (UI Components)            │
│    AdminPushDevicesView.tsx                     │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────┐
│         ViewModel Layer (State Management)      │
│    AdminPushDevicesViewModel.ts                 │
│    - State management                           │
│    - Filter logic                               │
│    - API calls                                  │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────┐
│           API Layer (HTTP Endpoints)            │
│    /api/admin/push-devices                      │
│    /api/admin/push-devices/[id]                 │
│    - Request validation                         │
│    - Authentication/Authorization               │
│    - Response formatting                        │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────┐
│       Service Layer (Business Logic)            │
│    pushDevicesService.ts                        │
│    - Database queries                           │
│    - Data filtering                             │
│    - Statistics calculation                     │
└────────────────┬────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────┐
│          Database Layer (Schema)                │
│    schema/pushDevices.ts                        │
│    - Table definition                           │
│    - Indexes                                    │
│    - Type exports                               │
└─────────────────────────────────────────────────┘
```

## File Structure

```
apps/web/
├── lib/
│   └── pushDevicesService.ts              # Service layer with business logic
├── db/
│   └── schema/
│       └── pushDevices.ts                 # Database schema definition
├── app/
│   └── api/
│       └── admin/
│           └── push-devices/
│               ├── route.ts               # GET endpoint
│               └── [id]/
│                   └── route.ts           # PATCH, DELETE endpoints
└── components/
    └── adminDashboard/
        └── sections/
            └── notifications/
                ├── AdminPushDevicesView.tsx           # UI component
                ├── AdminPushDevicesViewModel.ts       # ViewModel hook
                └── PUSH_DEVICES_ARCHITECTURE.md       # This file
```

## Layer Responsibilities

### 1. Service Layer (`pushDevicesService.ts`)

**Purpose**: Encapsulates all database operations and business logic

**Key Functions**:
- `fetchDevices(options)` - Fetch devices with filtering
- `fetchDeviceById(deviceId)` - Get a single device
- `deactivateDevice(deviceId)` - Mark device as inactive
- `reactivateDevice(deviceId)` - Reactivate a device
- `deleteDevice(deviceId)` - Permanently delete a device
- `fetchDevicesByUserId(userId)` - Get all devices for a user
- `cleanupStaleDevices(daysInactive)` - Remove old inactive devices

**Benefits**:
- Single source of truth for database operations
- Reusable across different API endpoints
- Easy to test in isolation
- Clear separation from HTTP concerns

### 2. API Layer (`route.ts`)

**Purpose**: Handle HTTP requests/responses and authentication

**Endpoints**:

#### GET `/api/admin/push-devices`
- Returns all devices with statistics
- Requires admin authentication
- Uses `PushDevicesService.fetchDevices()`

#### PATCH `/api/admin/push-devices/[id]`
- Deactivate or reactivate a device
- Requires admin authentication
- Body: `{ action: "deactivate" | "reactivate" }`
- Uses `PushDevicesService.deactivateDevice()` or `reactivateDevice()`

#### DELETE `/api/admin/push-devices/[id]`
- Permanently delete a device
- Requires admin authentication
- Uses `PushDevicesService.deleteDevice()`

**Authentication Flow**:
1. Verify session from request
2. Check if user exists
3. Verify user has admin role (`accountType === "Evac"`)
4. Process request or return 401/403

### 3. ViewModel Layer (`AdminPushDevicesViewModel.ts`)

**Purpose**: Manage component state and handle API interactions

**State Management**:
- `devices` - All devices from API
- `filteredDevices` - Devices after applying filters
- `stats` - Device statistics
- `isLoading` - Initial data loading state
- `actionLoading` - Tracks which device is being modified
- `error` - Error message display

**Filters**:
- `searchQuery` - Text search across multiple fields
- `platformFilter` - Filter by iOS/Android
- `statusFilter` - Filter by active/inactive
- `environmentFilter` - Filter by dev/prod

**Actions**:
- `fetchDevices()` - Load devices from API
- `handleDeactivate(id)` - Deactivate a device
- `handleReactivate(id)` - Reactivate a device
- `handleDelete(id)` - Delete a device

**Filter Logic**:
- Filters are applied client-side using `useEffect`
- Multiple filters can be combined
- Search query matches: userName, userEmail, deviceModel, deviceId, token

### 4. View Layer (`AdminPushDevicesView.tsx`)

**Purpose**: Render UI and handle user interactions

**Features**:
- **Statistics Dashboard**: Shows total, active, platform split, environment stats
- **Flexible Filters**: Search, platform, status, environment
- **Two View Modes**: 
  - Table view (desktop-optimized)
  - Cards view (mobile-friendly)
- **Device Actions**: Deactivate, reactivate, delete
- **Responsive Design**: Works on all screen sizes
- **Loading States**: Clear feedback during data fetching
- **Error Handling**: User-friendly error messages

**UI Components Used**:
- `Table` - Custom table component
- `Card` - Shadcn UI card component
- `Select` - Shadcn UI select for filters
- `Input` - Search input
- `Button` - Action buttons
- `Badge` - Status indicators
- Lucide icons for visual feedback

## Data Flow

### Fetching Devices

```
User opens view
     ↓
ViewModel: useEffect calls fetchDevices()
     ↓
ViewModel: fetch('/api/admin/push-devices')
     ↓
API: Authenticate user
     ↓
API: Call PushDevicesService.fetchDevices()
     ↓
Service: Query database with joins
     ↓
Service: Calculate statistics
     ↓
Service: Return { devices, stats }
     ↓
API: Return JSON response
     ↓
ViewModel: Update state (devices, stats)
     ↓
ViewModel: Apply filters → filteredDevices
     ↓
View: Render table/cards with filteredDevices
```

### Deactivating a Device

```
User clicks "Deactivate" button
     ↓
View: Call handleDeactivate(deviceId)
     ↓
ViewModel: setActionLoading(deviceId)
     ↓
ViewModel: PATCH to /api/admin/push-devices/${deviceId}
     ↓
API: Authenticate user
     ↓
API: Call PushDevicesService.deactivateDevice(deviceId)
     ↓
Service: Update device.isActive = false
     ↓
Service: Return success boolean
     ↓
API: Return success response
     ↓
ViewModel: Call fetchDevices() to refresh
     ↓
ViewModel: setActionLoading(null)
     ↓
View: Re-render with updated data
```

## Type Safety

All layers use TypeScript interfaces for type safety:

```typescript
// Shared between layers
export interface PushDeviceWithUser {
  id: string;
  userId: string | null;
  platform: "ios" | "android";
  token: string;
  environment: "dev" | "prod";
  isActive: boolean;
  lastSeenAt: Date;
  deviceId: string | null;
  deviceModel: string | null;
  appVersion: string | null;
  buildNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
  userName: string | null;
  userEmail: string | null;
}

export interface DeviceStats {
  totalDevices: number;
  activeDevices: number;
  inactiveDevices: number;
  iosDevices: number;
  androidDevices: number;
  devEnvironment: number;
  prodEnvironment: number;
}
```

## Security Considerations

1. **Authentication**: All endpoints verify user session
2. **Authorization**: Only admin users (`accountType === "Evac"`) can access
3. **Validation**: Action types are validated before processing
4. **Confirmation**: Destructive actions (delete) require user confirmation
5. **Token Protection**: Device tokens are displayed but can be filtered

## Performance Optimizations

1. **Client-side Filtering**: Reduces API calls
2. **Database Indexes**: Fast queries on userId, token, lastSeenAt
3. **Single Query**: Fetch all data in one request with joins
4. **Optimistic Loading**: Show loading states immediately
5. **Conditional Rendering**: Only render visible elements

## Testing Considerations

### Service Layer
- Test each function in isolation
- Mock database connections
- Test error handling
- Verify statistics calculations

### API Layer
- Test authentication/authorization
- Test request validation
- Test error responses
- Mock service layer calls

### ViewModel
- Test filter combinations
- Test state updates
- Test error handling
- Mock API calls

### View
- Test rendering with different data
- Test user interactions
- Test loading states
- Test error displays

## Future Enhancements

1. **Pagination**: For large device lists
2. **Export**: Export device list to CSV
3. **Bulk Actions**: Select multiple devices for batch operations
4. **Push Test**: Send test notification to specific device
5. **Device History**: Track device state changes over time
6. **Notifications**: Alert admins when devices become stale
7. **Analytics**: Device usage patterns and trends

## Related Documentation

- Database Schema: `apps/web/db/schema/pushDevices.ts`
- Migration Guide: `MIGRATION_COMPLETED_SUMMARY.md`
- Mobile Integration: See mobile app push notification setup

## Troubleshooting

### Error: "Failed to fetch devices"

**Possible Causes**:
1. Database connection issue
2. User not authenticated
3. User not admin
4. Database table doesn't exist

**Solutions**:
- Check server logs for detailed error
- Verify user has `accountType === "Evac"`
- Ensure push_devices table exists
- Check database connection

### Devices Not Showing

**Possible Causes**:
1. No devices registered yet
2. Filters too restrictive
3. Database query issue

**Solutions**:
- Check mobile app registration
- Reset all filters
- Check database directly: `SELECT * FROM push_devices`

### Action Buttons Not Working

**Possible Causes**:
1. API endpoint issue
2. Permission denied
3. Network error

**Solutions**:
- Check browser console for errors
- Verify admin permissions
- Check network tab in DevTools

## Maintenance

- **Weekly**: Review inactive devices
- **Monthly**: Run cleanup script for stale devices
- **Quarterly**: Review and optimize database indexes
- **Yearly**: Archive old device records

---

**Last Updated**: January 2025
**Maintained By**: Fajr MedFlow Development Team