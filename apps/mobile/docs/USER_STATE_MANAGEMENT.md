# User State Management - Mobile App

## Overview

The mobile app uses **AuthContext** as the single source of truth for user state. This ensures that when user data changes (like account type switching), all components automatically update reactively.

## Architecture Pattern

### Centralized State (AuthContext)
```typescript
// apps/mobile/src/contexts/AuthContext.tsx
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: boolean,
  user: SessionUser | null,
  login: (token, user) => Promise<void>,
  logout: () => Promise<void>,
  updateUser: (user) => void,
});
```

### Consumer Pattern (Components)
```typescript
// Any component
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
  const { user, updateUser } = useAuth();
  
  // Component automatically re-renders when user changes
  return <Text>{user?.accountType}</Text>;
}
```

## Key Benefits

✅ **Single Source of Truth**: All components read from the same AuthContext  
✅ **Automatic Updates**: Components re-render when user state changes  
✅ **Persistent Storage**: AuthContext syncs with MMKV/TokenStorage  
✅ **Type Safety**: TypeScript ensures user object consistency  
✅ **No Prop Drilling**: Components get user via hook, not props  

## Implementation Examples

### ❌ OLD Pattern (Props)
```typescript
// MainNavigator passes user as prop
const createHomeWrapper = (user: SessionUser) => {
  return function HomeWrapper() {
    return <HomeScreen user={user} />; // Static prop
  };
};

// HomeScreen receives user as prop
function HomeScreen({ user }: { user: SessionUser }) {
  // Problem: Won't update when user changes elsewhere
  return <Text>{user.accountType}</Text>;
}
```

**Problem**: When account type changes in AccountSwitcher, HomeScreen doesn't know because it has a stale prop.

### ✅ NEW Pattern (AuthContext)
```typescript
// MainNavigator doesn't need to pass user
const createHomeWrapper = (onLogout: () => void) => {
  return function HomeWrapper() {
    return <HomeScreen onLogout={onLogout} />; // No user prop!
  };
};

// HomeScreen reads from AuthContext
function HomeScreen({ onLogout }: { onLogout?: () => void }) {
  const { user } = useAuth(); // Gets live user state
  
  // Automatically updates when user changes!
  return <Text>{user?.accountType}</Text>;
}
```

**Solution**: All screens read from AuthContext, so they all update together.

## User Update Flow

### Account Type Switch Example

```
1. User taps role in AccountSwitcher
   ↓
2. API call: PATCH /api/user/{userId}
   ↓
3. Backend updates database
   ↓
4. AccountSwitcher receives response
   ↓
5. updateUser() called in AuthContext
   ↓
6. AuthContext updates:
   - In-memory user state
   - MMKV storage (TokenStorage)
   ↓
7. All components using useAuth() re-render
   ↓
8. HomeScreen, ProfileScreen, etc. show new accountType ✅
```

## Storage Layers

### 1. AuthContext (In-Memory)
- **Purpose**: Runtime state, triggers React re-renders
- **Location**: `apps/mobile/src/contexts/AuthContext.tsx`
- **Lifetime**: While app is running
- **Updates**: Via `updateUser()` method

### 2. TokenStorage (Persistent)
- **Purpose**: Secure storage, survives app restarts
- **Location**: `apps/mobile/src/services/TokenStorage.ts`
- **Lifetime**: Until logout or token expiry
- **Updates**: Via `setUser()` method

### 3. MMKV (Low-Level)
- **Purpose**: Native encrypted storage
- **Location**: `apps/mobile/src/utils/mmkv.ts`
- **Lifetime**: Persistent on device
- **Updates**: Via `storage.set()` methods

## Update Methods

### updateUser() - The Main Method
```typescript
const updateUser = useCallback(async (userData: any) => {
  try {
    // Preserve the token when updating user
    const token = await getStoredToken();
    const userWithToken = { ...userData, token };
    
    // Update persistent storage
    await setStoredUser(userWithToken);
    
    // Update in-memory state (triggers re-renders)
    setUser(userWithToken);
    
    console.log('[AuthContext] User updated:', userData.email);
  } catch (error) {
    console.error('[AuthContext] Error updating user:', error);
    throw error;
  }
}, []);
```

**When to use:**
- Account type changes
- Profile updates (name, image, etc.)
- Settings changes
- Any user data modification

**What it does:**
1. Merges new data with existing user
2. Updates TokenStorage (persistent)
3. Updates AuthContext state (in-memory)
4. All components re-render automatically

## Component Migration Guide

### Step 1: Remove User Prop
```typescript
// Before
interface MyComponentProps {
  user: SessionUser;  // ❌ Remove this
  onAction: () => void;
}

// After
interface MyComponentProps {
  onAction: () => void;  // ✅ No user prop needed
}
```

### Step 2: Import useAuth Hook
```typescript
import { useAuth } from '../contexts/AuthContext';
```

### Step 3: Get User from Hook
```typescript
function MyComponent({ onAction }: MyComponentProps) {
  const { user } = useAuth();  // ✅ Get user from context
  
  if (!user) return <Loading />; // Handle null case
  
  return <Text>{user.accountType}</Text>;
}
```

### Step 4: Update Navigator (if needed)
```typescript
// Before
const createMyWrapper = (user: SessionUser) => {
  return function MyWrapper() {
    return <MyComponent user={user} />;
  };
};

// After
const createMyWrapper = () => {
  return function MyWrapper() {
    return <MyComponent />; // No user prop
  };
};
```

## Already Migrated Components

✅ **HomeScreen** - Uses `useAuth()` hook  
✅ **AccountSwitcher** - Uses `useAuth()` hook  
✅ **SettingsSheet** - Uses `useAuth()` hook  

## Components To Migrate

⏳ **MessagesScreen** - Still receives user prop  
⏳ **NotificationsScreen** - Still receives user prop  
⏳ **PatientDashboardScreen** - Still receives user prop  
⏳ **ProfileScreen** - Still receives user prop  
⏳ **AdminStackNavigator** - Receives isAdmin flag  

## Best Practices

### ✅ DO

1. **Read user from AuthContext**
   ```typescript
   const { user } = useAuth();
   ```

2. **Update user via updateUser()**
   ```typescript
   const { updateUser } = useAuth();
   await updateUser({ ...user, accountType: 'Doctor' });
   ```

3. **Check for null user**
   ```typescript
   if (!user) return <Loading />;
   ```

4. **Use TypeScript types**
   ```typescript
   const { user } = useAuth();
   const accountType: 'Doctor' | 'Triage' | 'Evac' = user?.accountType || 'Triage';
   ```

### ❌ DON'T

1. **Don't pass user as props**
   ```typescript
   // Bad
   <HomeScreen user={user} />
   
   // Good
   <HomeScreen />
   ```

2. **Don't mutate user directly**
   ```typescript
   // Bad
   user.accountType = 'Doctor';
   
   // Good
   updateUser({ ...user, accountType: 'Doctor' });
   ```

3. **Don't store user in component state**
   ```typescript
   // Bad
   const [localUser, setLocalUser] = useState(user);
   
   // Good
   const { user } = useAuth(); // Always fresh
   ```

4. **Don't update storage directly**
   ```typescript
   // Bad
   TokenStorage.setUser(newUser);
   
   // Good
   updateUser(newUser); // Updates both context and storage
   ```

## Debugging

### Check Current User State
```typescript
import { useAuth } from '../contexts/AuthContext';

const { user } = useAuth();
console.log('Current user:', user);
console.log('Account type:', user?.accountType);
console.log('Is admin:', user?.isAdmin);
```

### Check Persistent Storage
```typescript
import { TokenStorage } from '../services/TokenStorage';

const storedUser = TokenStorage.getUser();
console.log('Stored user:', storedUser);
```

### Debug User Updates
```typescript
const { updateUser } = useAuth();

await updateUser({
  ...user,
  accountType: 'Doctor',
});

console.log('[Debug] User updated, new type:', user?.accountType);
```

### Common Issues

**Issue**: Component not updating after account switch  
**Solution**: Make sure component uses `useAuth()` hook, not props

**Issue**: User is null  
**Solution**: Check if user is logged in, add null check

**Issue**: Changes don't persist after restart  
**Solution**: Verify `updateUser()` is being called, not direct storage updates

## Comparison with Web App

### Web (NextAuth)
```typescript
// Web uses NextAuth session
const { data: session, update } = useSession();

// Update session
await update({
  ...session,
  user: { ...session.user, accountType: 'Doctor' }
});
```

### Mobile (AuthContext)
```typescript
// Mobile uses AuthContext
const { user, updateUser } = useAuth();

// Update user
await updateUser({
  ...user,
  accountType: 'Doctor'
});
```

**Key Difference**: Web uses NextAuth's session management, mobile uses custom AuthContext. Both provide the same reactive pattern.

## Performance Considerations

✅ **React.useMemo**: Used in MainNavigator to prevent unnecessary re-renders  
✅ **useCallback**: Used in AuthContext to memoize update functions  
✅ **Shallow comparison**: Only updates when actual data changes  
✅ **No deep nesting**: Flat user object structure for efficient updates  

## Future Enhancements

- [ ] Add user update listeners/subscriptions
- [ ] Implement optimistic updates
- [ ] Add undo/redo for user changes
- [ ] Cache user queries with React Query
- [ ] Add user state snapshots for debugging
- [ ] Implement user state sync with PowerSync

## Related Files

```
apps/mobile/src/
├── contexts/
│   └── AuthContext.tsx          # Main user state management
├── services/
│   ├── TokenStorage.ts          # Persistent storage
│   └── api.ts                   # API calls with auth
├── utils/
│   └── storage.ts               # MMKV wrapper
└── screens/
    ├── HomeScreen.tsx           # Example: Uses useAuth()
    └── settings/
        └── SettingsSheet.tsx    # Example: Uses useAuth()
```

## Summary

**Before**: User passed as props, components have stale data  
**After**: User from AuthContext, components auto-update  

**Key Insight**: By using AuthContext as the single source of truth, account type switches (and any other user changes) automatically propagate to all screens without manual updates.

---

**Last Updated**: 2024  
**Version**: 2.0 (AuthContext Pattern)  
**Status**: ✅ Implemented for HomeScreen, AccountSwitcher, SettingsSheet