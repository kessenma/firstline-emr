# Admin Context Usage Guide

This guide explains how to use the AdminContext in the mobile app.

## Setup

### 1. Wrap your app with AdminProvider

Add the `AdminProvider` to your app's provider hierarchy in `App.tsx`:

```tsx
import { AdminProvider } from './src/contexts/AdminContext';

export default function App() {
  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={styles.container}>
        <SafeAreaProvider>
          <ThemeProvider>
            <DatabaseProvider>
              <AdminProvider>
                {/* Your app content */}
              </AdminProvider>
            </DatabaseProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
```

## Usage

### Basic Admin Check

```tsx
import { useAdmin, useIsAdmin } from '../contexts/AdminContext';

function MyComponent() {
  const isAdmin = useIsAdmin();
  
  if (!isAdmin) {
    return <Text>Access denied</Text>;
  }
  
  return <Text>Welcome, Admin!</Text>;
}
```

### Full Admin Context

```tsx
import { useAdmin, AdminPermission } from '../contexts/AdminContext';

function AdminDashboard() {
  const {
    isAdmin,
    isAdminSessionActive,
    adminUser,
    permissions,
    initializeAdminSession,
    endAdminSession,
    hasPermission,
    isLoading,
    error,
  } = useAdmin();

  // Initialize session when entering admin area
  useEffect(() => {
    if (isAdmin && !isAdminSessionActive) {
      initializeAdminSession();
    }
  }, [isAdmin, isAdminSessionActive]);

  if (isLoading) {
    return <ActivityIndicator />;
  }

  if (error) {
    return <Text>Error: {error.message}</Text>;
  }

  if (!isAdmin) {
    return <Text>You must be an admin to access this area</Text>;
  }

  if (!isAdminSessionActive) {
    return (
      <Button 
        title="Start Admin Session" 
        onPress={initializeAdminSession}
      />
    );
  }

  return (
    <View>
      <Text>Welcome, {adminUser?.firstName}!</Text>
      <Button title="End Session" onPress={endAdminSession} />
    </View>
  );
}
```

### Permission Checking

```tsx
import { useAdmin, AdminPermission } from '../contexts/AdminContext';

function UserManagement() {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAdmin();

  // Check single permission
  if (!hasPermission(AdminPermission.MANAGE_USERS)) {
    return <Text>You don't have permission to manage users</Text>;
  }

  // Check if user has any of multiple permissions
  const canViewData = hasAnyPermission([
    AdminPermission.VIEW_ANALYTICS,
    AdminPermission.MANAGE_USERS,
  ]);

  // Check if user has all permissions
  const canDeleteData = hasAllPermissions([
    AdminPermission.DELETE_DATA,
    AdminPermission.MANAGE_SETTINGS,
  ]);

  return (
    <View>
      <Text>User Management</Text>
      {canViewData && <Button title="View Analytics" />}
      {canDeleteData && <Button title="Delete Test Data" />}
    </View>
  );
}
```

### Session Management

```tsx
import { useAdmin } from '../contexts/AdminContext';

function AdminScreen() {
  const {
    isAdminSessionActive,
    refreshAdminSession,
    updateLastActivity,
  } = useAdmin();

  // Update activity on user interaction
  const handleUserAction = () => {
    updateLastActivity();
    // ... perform action
  };

  // Refresh session before it expires
  const handleRefreshSession = async () => {
    const success = await refreshAdminSession();
    if (success) {
      Alert.alert('Success', 'Session refreshed');
    }
  };

  return (
    <View>
      <Button title="Perform Action" onPress={handleUserAction} />
      <Button title="Refresh Session" onPress={handleRefreshSession} />
    </View>
  );
}
```

### Navigation Guard

```tsx
import { useAdmin } from '../contexts/AdminContext';
import { useEffect } from 'react';

function AdminNavigationGuard({ children, navigation }) {
  const { isAdmin, isAdminSessionActive, initializeAdminSession } = useAdmin();

  useEffect(() => {
    if (!isAdmin) {
      // Redirect non-admin users
      navigation.navigate('Home');
      return;
    }

    if (!isAdminSessionActive) {
      // Initialize session for admin users
      initializeAdminSession();
    }
  }, [isAdmin, isAdminSessionActive]);

  if (!isAdmin || !isAdminSessionActive) {
    return null;
  }

  return children;
}
```

## API Reference

### AdminContext Properties

- `isAdmin: boolean` - Whether the current user has admin privileges
- `isAdminSessionActive: boolean` - Whether an admin session is currently active
- `adminUser: AdminUser | null` - Current admin user information
- `permissions: AdminPermission[]` - Array of admin permissions
- `isLoading: boolean` - Loading state
- `error: Error | null` - Error state

### AdminContext Methods

- `initializeAdminSession(): Promise<boolean>` - Start a new admin session
- `refreshAdminSession(): Promise<boolean>` - Refresh the current session
- `endAdminSession(): void` - End the current admin session
- `updateLastActivity(): void` - Update the last activity timestamp
- `hasPermission(permission: AdminPermission): boolean` - Check single permission
- `hasAnyPermission(permissions: AdminPermission[]): boolean` - Check if user has any of the permissions
- `hasAllPermissions(permissions: AdminPermission[]): boolean` - Check if user has all permissions

### Admin Permissions

```typescript
enum AdminPermission {
  MANAGE_USERS = 'manage_users',
  MANAGE_ADMINS = 'manage_admins',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
  MANAGE_SETTINGS = 'manage_settings',
  DELETE_DATA = 'delete_data',
}
```

## Session Behavior

- **Session Duration**: 24 hours from initialization
- **Inactivity Timeout**: 30 minutes of inactivity
- **Auto-Check**: Session validity is checked every minute
- **Storage**: Session data is persisted in MMKV storage

## Best Practices

1. **Always check `isAdmin` before showing admin UI**
2. **Initialize session when entering admin area**
3. **Update activity on user interactions** to prevent timeout
4. **Check permissions before showing sensitive actions**
5. **Handle session expiry gracefully** with user feedback
6. **End session when leaving admin area** for security

## Security Notes

- Session data is stored in encrypted MMKV storage
- Sessions automatically expire after 24 hours
- Inactivity timeout prevents unauthorized access
- Permissions are checked on every sensitive operation
- Session state is validated on app restart
