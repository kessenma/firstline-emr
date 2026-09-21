# AuthContext Usage Guide

## Overview

The `AuthContext` provides authentication state management for the Fajr Mission EMR mobile app.

## Features

- ✅ User authentication state
- ✅ Login/logout functionality
- ✅ Session persistence with MMKV storage
- ✅ Auto-restore session on app restart
- ✅ User data management

## Setup

The `AuthProvider` is already configured in `App.tsx`:

```tsx
<AuthProvider>
  {/* Your app components */}
</AuthProvider>
```

## Usage

### Basic Hook Usage

```tsx
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { isAuthenticated, user, login, logout } = useAuth();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Access user data
  console.log('Current user:', user);

  return <View>...</View>;
}
```

### Login

```tsx
const { login } = useAuth();

async function handleLogin(token: string, userData: any) {
  try {
    await login(token, userData);
    // Navigate to home screen
  } catch (error) {
    console.error('Login failed:', error);
  }
}
```

### Logout

```tsx
const { logout } = useAuth();

async function handleLogout() {
  try {
    await logout();
    // Navigate to login screen
  } catch (error) {
    console.error('Logout failed:', error);
  }
}
```

### Update User Data

```tsx
const { updateUser, user } = useAuth();

function updateProfile(newData: any) {
  const updatedUser = { ...user, ...newData };
  updateUser(updatedUser);
}
```

## API Reference

### `AuthContextType`

```typescript
interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (token: string, user: any) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: any) => void;
}
```

### Methods

#### `login(token: string, user: any): Promise<void>`
Authenticates the user and stores their session.

**Parameters:**
- `token`: Authentication token
- `user`: User data object

**Example:**
```tsx
await login('jwt-token-here', {
  id: '123',
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
});
```

#### `logout(): Promise<void>`
Logs out the current user and clears session data.

**Example:**
```tsx
await logout();
```

#### `updateUser(user: any): void`
Updates the current user data without re-authentication.

**Parameters:**
- `user`: Updated user data object

**Example:**
```tsx
updateUser({
  ...user,
  firstName: 'Jane',
});
```

## Storage

The AuthContext uses MMKV storage to persist:
- Authentication token (`authToken` key)
- User data (`user` key)

Session is automatically restored when the app restarts.

## Integration with Navigation

Example of protected routes:

```tsx
function RootNavigator() {
  const { isAuthenticated } = useAuth();

  return (
    <NavigationContainer>
      {isAuthenticated ? (
        <MainStack />
      ) : (
        <AuthStack />
      )}
    </NavigationContainer>
  );
}
```

## Best Practices

1. **Always handle errors**: Wrap auth calls in try-catch blocks
2. **Check authentication state**: Use `isAuthenticated` to protect routes
3. **Clear sensitive data**: Logout clears all stored auth data
4. **Update user data**: Use `updateUser` for profile changes

## Troubleshooting

### Session not persisting
- Check MMKV storage is properly initialized
- Verify token and user data are being stored
- Check console logs for storage errors

### Logout not working
- Ensure `removeStoredToken()` and `removeStoredUser()` are working
- Check navigation is resetting properly after logout
- Verify all auth state is being cleared

## See Also

- [AdminContext Usage](./admin-dashboard/ADMIN_CONTEXT_USAGE.md)
- [Storage Utilities](../apps/mobile/src/utils/storage.ts)
