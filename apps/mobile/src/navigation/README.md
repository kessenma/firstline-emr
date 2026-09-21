# Navigation Directory

This directory contains all navigation-related components and utilities for the Fajr EMR mobile app.

## Structure

```
navigation/
├── MainNavigator.tsx          # Main tab navigation with all app screens
├── AdminStackNavigator.tsx    # Admin-specific stack navigator
├── navigationUtils.ts         # Navigation helper functions and utilities
├── index.ts                   # Central exports file
└── README.md                  # This file
```

## Overview

The app uses React Navigation v6 with the following structure:
- **Tab Navigator** (Main): Home, Messages, Notifications, Dashboard, Profile, Admin (conditional)
- **Stack Navigator** (Admin): Admin Dashboard and related screens

## Main Navigator

The `MainNavigator` is the root tab navigation that contains all main app screens.

### Tabs
1. **Home** - Main dashboard/home screen
2. **Messages** - Patient messages and conversations
3. **Notifications** - System notifications
4. **Dashboard** - Patient dashboard view
5. **Profile** - User profile and settings
6. **Admin** - Admin dashboard (only visible to admin users)

### Usage

```typescript
import { MainNavigator } from './navigation';

<MainNavigator user={currentUser} onLogout={handleLogout} />
```

## Admin Navigation

### Admin Stack Navigator

The `AdminStackNavigator` manages all admin-related screens with built-in role-based access control.

#### Features
- ✅ Role-based access control (checks `user.isAdmin`)
- ✅ Access denied screen for non-admin users
- ✅ Custom admin header with badge
- ✅ Deep linking support
- ✅ Consistent theming

#### Screens
- **AdminDashboard** - Main admin dashboard with all sections
- More screens can be added as needed

### Admin Tab Visibility

The admin tab is **conditionally rendered** based on the user's admin status:

```typescript
// Admin tab only shows if user.isAdmin === true
{user.isAdmin && (
  <Tab.Screen
    name="Admin"
    component={AdminWrapper}
    options={{
      tabBarLabel: 'Admin',
      tabBarIcon: ({ color, size }) => <Shield size={size} color={color} />,
    }}
  />
)}
```

## Navigation Utilities

The `navigationUtils.ts` file provides helper functions for admin navigation and role checks.

### Key Functions

#### `isUserAdmin(user)`
Check if a user has admin privileges.

```typescript
import { isUserAdmin } from './navigation';

if (isUserAdmin(currentUser)) {
  // User is an admin
}
```

#### `canAccessAdmin(user)`
Check if a user can access admin features.

```typescript
import { canAccessAdmin } from './navigation';

if (canAccessAdmin(currentUser)) {
  // Allow access to admin features
}
```

#### `navigateToAdmin(navigation, user)`
Navigate to admin dashboard with automatic role checking.

```typescript
import { navigateToAdmin } from './navigation';

// In a component
const handleAdminPress = () => {
  navigateToAdmin(navigation, currentUser);
  // Automatically shows access denied alert if user is not admin
};
```

#### `shouldShowAdminTab(user)`
Determine if admin tab should be visible.

```typescript
import { shouldShowAdminTab } from './navigation';

const showAdminTab = shouldShowAdminTab(currentUser);
```

### Admin Routes Constants

Use the `AdminRoutes` constant for type-safe route names:

```typescript
import { AdminRoutes } from './navigation';

navigation.navigate(AdminRoutes.ADMIN_TAB, {
  screen: AdminRoutes.ADMIN_DASHBOARD,
});
```

Available routes:
- `AdminRoutes.ADMIN_TAB` - 'Admin'
- `AdminRoutes.ADMIN_DASHBOARD` - 'AdminDashboard'

## Deep Linking

### Supported URLs

The app supports deep linking for admin routes:

**App Scheme:**
- `fajrmission://admin/dashboard`

**HTTPS:**
- `https://fajrmission.org/admin/dashboard`

### Configuration

Deep linking is configured in `MainNavigator.tsx`:

```typescript
<NavigationContainer
  linking={{
    prefixes: ['fajrmission://', 'https://fajrmission.org'],
    config: {
      screens: {
        Admin: {
          path: 'admin',
          screens: {
            AdminDashboard: 'dashboard',
          },
        },
      },
    },
  }}
>
```

### Testing Deep Links

#### iOS Simulator
```bash
xcrun simctl openurl booted "fajrmission://admin/dashboard"
```

#### Android Emulator
```bash
adb shell am start -W -a android.intent.action.VIEW -d "fajrmission://admin/dashboard"
```

### Parsing Deep Links

Use `parseAdminDeepLink` to parse admin URLs:

```typescript
import { parseAdminDeepLink } from './navigation';

const result = parseAdminDeepLink('fajrmission://admin/dashboard');
// { screen: 'AdminDashboard' }
```

## Role-Based Access Control

### How It Works

1. **User Object**: The `SessionUser` type includes an `isAdmin` boolean field
2. **Tab Visibility**: Admin tab only renders if `user.isAdmin === true`
3. **Navigator Check**: `AdminStackNavigator` verifies admin status
4. **Access Denied**: Non-admin users see an access denied screen
5. **Utilities**: Helper functions provide reusable role checks

### Access Flow

```
User attempts to access admin features
            ↓
Check user.isAdmin === true?
            ↓
        ┌───┴───┐
        ↓       ↓
      Yes      No
        ↓       ↓
   Allow    Show Access
   Access   Denied Screen
```

### Adding New Admin Screens

1. **Create the screen component**
   ```typescript
   // screens/admin/NewAdminScreen.tsx
   export default function NewAdminScreen() {
     return <View>...</View>;
   }
   ```

2. **Add to AdminStackParamList type**
   ```typescript
   export type AdminStackParamList = {
     AdminDashboard: undefined;
     NewAdminScreen: { id: string }; // Add this
   };
   ```

3. **Add screen to AdminStackNavigator**
   ```typescript
   <Stack.Screen
     name="NewAdminScreen"
     component={NewAdminScreen}
     options={{ title: 'New Admin Screen' }}
   />
   ```

4. **Add to AdminRoutes constant**
   ```typescript
   export const AdminRoutes = {
     ADMIN_TAB: 'Admin',
     ADMIN_DASHBOARD: 'AdminDashboard',
     NEW_ADMIN_SCREEN: 'NewAdminScreen', // Add this
   } as const;
   ```

5. **Update deep linking config (optional)**
   ```typescript
   Admin: {
     path: 'admin',
     screens: {
       AdminDashboard: 'dashboard',
       NewAdminScreen: 'new-screen/:id', // Add this
     },
   }
   ```

## Session User Type

The `SessionUser` interface defines the user object structure:

```typescript
interface SessionUser {
  id: string;
  _id: string;
  email: string;
  accountType: 'Doctor' | 'Triage' | 'Evac';
  firstName: string;
  lastName: string;
  city: string;
  countries: string[];
  languages: string[];
  doctorSpecialty?: string[];
  image?: string;
  isAdmin: boolean;           // ← Admin flag
  dob?: string | Date;
  gender?: 'Male' | 'Female';
  token?: string;
  userSettings?: string;
  userNotifications?: string;
  userMessages?: string;
}
```

## Best Practices

### 1. Always Check Admin Status
```typescript
// ✅ Good
if (canAccessAdmin(user)) {
  // Admin logic
}

// ❌ Bad
if (user.isAdmin) {
  // Direct property check (use utility functions instead)
}
```

### 2. Use Navigation Utilities
```typescript
// ✅ Good
navigateToAdmin(navigation, user);

// ❌ Bad
navigation.navigate('Admin', { screen: 'AdminDashboard' });
// Missing role check
```

### 3. Use Route Constants
```typescript
// ✅ Good
navigation.navigate(AdminRoutes.ADMIN_DASHBOARD);

// ❌ Bad
navigation.navigate('AdminDashboard'); // String literal
```

### 4. Handle Errors
```typescript
import { handleAdminRouteError } from './navigation';

try {
  // Navigation logic
} catch (error) {
  handleAdminRouteError(error, 'AdminDashboard');
}
```

## Testing

### Unit Tests
Test navigation utilities:
```typescript
import { isUserAdmin, canAccessAdmin } from './navigation';

describe('Navigation Utilities', () => {
  it('should identify admin users', () => {
    const adminUser = { isAdmin: true, ... };
    expect(isUserAdmin(adminUser)).toBe(true);
  });
});
```

### Integration Tests
Test navigation flow:
```typescript
it('should navigate to admin dashboard for admin users', () => {
  const adminUser = { isAdmin: true, ... };
  const result = navigateToAdmin(navigation, adminUser);
  expect(result).toBe(true);
  expect(navigation.navigate).toHaveBeenCalledWith('Admin', {
    screen: 'AdminDashboard',
  });
});
```

## Troubleshooting

### Admin tab not visible
- Check: `user.isAdmin === true`
- Check: User object is properly passed to `MainNavigator`
- Check: No console errors in React Navigation

### Access denied screen shows for admin
- Check: `user.isAdmin` is boolean `true`, not string `"true"`
- Check: User object is not null/undefined
- Check: `AdminStackNavigator` receives `isAdmin` prop correctly

### Deep linking not working
- Check: URL scheme registered in iOS Info.plist and Android AndroidManifest.xml
- Check: Linking config matches URL structure
- Check: Test with correct URL format

### Navigation errors
- Check: All screen names match in navigator and type definitions
- Check: React Navigation packages are properly installed
- Check: Stack navigator is properly initialized

## Dependencies

Required packages:
- `@react-navigation/native`
- `@react-navigation/bottom-tabs`
- `@react-navigation/stack`
- `react-native-safe-area-context`
- `react-native-screens`
- `react-native-gesture-handler`
- `lucide-react-native` (for icons)

## Related Documentation

- **Admin Dashboard Docs**: `docs/mobile/admin-dashboard/`
- **Navigation Docs**: React Navigation v6 official docs
- **Deep Linking**: `docs/mobile/deep-linking.md` (if exists)

## Phase 1.4 Complete ✅

This navigation setup completes Phase 1.4 of the admin dashboard implementation:
- [x] Admin route added to navigation
- [x] Admin tab with conditional rendering
- [x] Admin role check implemented
- [x] Deep linking support added
- [x] Navigation utilities created

## Next Steps

Proceed to **Phase 2: Core Components**
- Create AdminDashboardView
- Create AdminAccordion
- Create shared components

---

**Last Updated**: 2024-01-01  
**Status**: Phase 1.4 Complete ✅