# Account Switcher - Mobile App

## Overview

The Account Switcher feature allows admin users to switch between different account types (Doctor, Triage, MedEvac) directly from the mobile app. This is particularly useful for admins who need to test different user experiences or manage multiple roles.

## Features

- 🔐 **Admin-Only Access**: Only users with `isAdmin: true` can access the account switcher
- 🎨 **Native UI**: Built with React Native components for optimal mobile experience
- 💾 **Persistent Storage**: Account type changes are saved to both local storage and backend
- 🔄 **Real-time Updates**: UI updates immediately after account type change
- ✅ **Validation**: Confirms changes with user before switching
- 📱 **Responsive Design**: Works seamlessly on all mobile device sizes

## Architecture

### Components

#### `AccountSwitcher.tsx`
- Main component for account type switching
- Uses `RadioCard` UI component for role selection
- Integrates with `AuthContext` for user state management
- Makes API calls to update account type on backend

#### `SettingsSheet.tsx`
- Updated to include "Switch Account Type" option for admin users
- Conditionally renders based on `user.isAdmin` flag
- Shows AccountSwitcher component when activated

### API Integration

The account switcher uses the existing user update endpoint:

```typescript
PATCH /api/user/{userId}
Body: { accountType: "Doctor" | "Triage" | "Evac" }
```

This endpoint:
- Updates the user's account type in the database
- Logs the change in `user_profile_logs` table
- Updates the `user_settings` table if it exists
- Returns the updated user data

### Storage

Account type changes are persisted in multiple places:

1. **Local Storage** (via TokenStorage/MMKV)
   - `user` object with updated `accountType`
   - Survives app restarts

2. **Auth Context**
   - In-memory user state
   - Updated via `updateUser()` method

3. **Backend Database**
   - `users.account_type` column
   - `user_settings.account_type` column
   - Audit trail in `user_profile_logs`

## Usage

### For Admin Users

1. Open the app and navigate to **Profile** tab
2. Tap the **Settings** icon (⚙️) in the top right
3. In the Settings sheet, scroll to the **ADMIN** section
4. Tap **Switch Account Type**
5. Select your desired role:
   - 🩺 **Doctor** - Medical consultation and diagnosis
   - 👥 **Triage** - Patient intake and prioritization
   - 🚑 **MedEvac** - Medical evacuation coordination
6. Tap **Switch Role**
7. Confirm the change in the alert dialog
8. Your account type will be updated immediately

### For Non-Admin Users

The "Switch Account Type" option is automatically hidden for non-admin users.

## Implementation Details

### Determining Admin Status

Admin status is determined by checking if the user has an entry in the `admins` table:

```typescript
// In mobile-login API
const user = await db.query.users.findFirst({
  where: eq(users.email, email),
  with: {
    admin: true, // Joins with admins table
  },
});

// isAdmin flag is set
const responseUser = {
  // ... other fields
  isAdmin: !!user.admin,
};
```

### Account Type Options

```typescript
type AccountType = 'Doctor' | 'Triage' | 'Evac';

const roleConfig = {
  Doctor: {
    icon: Stethoscope,
    label: 'Doctor',
    description: 'Medical consultation and diagnosis',
  },
  Triage: {
    icon: Users,
    label: 'Triage',
    description: 'Patient intake and prioritization',
  },
  Evac: {
    icon: Ambulance,
    label: 'MedEvac',
    description: 'Medical evacuation coordination',
  },
};
```

### State Management Flow

```
User taps "Switch Role"
    ↓
Confirmation dialog shown
    ↓
User confirms
    ↓
API call to PATCH /api/user/{userId}
    ↓
Backend updates database
    ↓
Response with updated user data
    ↓
Update AuthContext via updateUser()
    ↓
Update local storage via TokenStorage
    ↓
UI updates with new account type
    ↓
Success message shown
    ↓
Settings sheet closes
```

## Security Considerations

### Authentication
- All API calls use JWT authentication (Bearer token)
- Token stored securely in MMKV (encrypted storage)
- 30-day auth token for API calls
- 24-hour PowerSync token (auto-refreshed)

### Authorization
- Account type switching requires:
  1. Valid authentication token
  2. `isAdmin: true` in user object
  3. User can only update their own account

### Audit Trail
- All account type changes are logged in `user_profile_logs` table
- Log includes:
  - `userId` - who made the change
  - `changedBy` - same as userId (self-change)
  - `changes` - array of field changes with old/new values
  - `isAdminAction` - true if admin changing another user's account
  - `timestamp` - when the change occurred

## Testing

### Manual Testing Checklist

- [ ] Admin user can see "Switch Account Type" in settings
- [ ] Non-admin user cannot see "Switch Account Type"
- [ ] All three account types (Doctor, Triage, MedEvac) are selectable
- [ ] Confirmation dialog appears before switching
- [ ] Account type updates successfully
- [ ] UI reflects new account type immediately
- [ ] Change persists after app restart
- [ ] Backend database is updated correctly
- [ ] Audit log is created
- [ ] Error handling works (network errors, API errors)

### Test Admin User

To test this feature, you need a user with `isAdmin: true`. This requires:

1. A user account in the `users` table
2. A corresponding entry in the `admins` table with matching `user_id`

```sql
-- Check if user is admin
SELECT u.email, u.account_type, a.id as admin_id
FROM users u
LEFT JOIN admins a ON u.id = a.user_id
WHERE u.email = 'your-email@example.com';
```

## Troubleshooting

### "Switch Account Type" not showing

**Possible causes:**
- User is not an admin (`isAdmin: false`)
- No entry in `admins` table for this user
- Auth token is stale (logout and login again)

**Solution:**
```typescript
// Check user object in console
console.log('User:', user);
console.log('Is Admin:', user?.isAdmin);
```

### Account type not persisting

**Possible causes:**
- API call failed but error was not shown
- Storage write failed
- Auth context not updating

**Solution:**
```typescript
// Enable debug logging
TokenStorage.debugTokenInfo();
```

### API returns 401 Unauthorized

**Possible causes:**
- Auth token expired (rare with 30-day expiry)
- Token not included in request headers
- User logged out in another session

**Solution:**
- Log out and log back in
- Check token storage: `TokenStorage.getAuthToken()`

### Changes revert after app restart

**Possible causes:**
- Backend update succeeded but local storage failed
- Race condition between API response and storage

**Solution:**
- Check backend database to confirm change was saved
- Clear app data and log in again

## Future Enhancements

- [ ] Add loading animation during account type switch
- [ ] Show current capabilities for each account type
- [ ] Add undo functionality
- [ ] Sync with PowerSync for offline support
- [ ] Add role-specific onboarding after switch
- [ ] Track usage analytics for each role

## Related Files

```
apps/mobile/src/
├── components/
│   ├── AccountSwitcher.tsx          # Main component
│   └── ui/
│       ├── RadioCard.tsx            # UI component for selection
│       └── Button.tsx               # Button component
├── screens/
│   └── settings/
│       └── SettingsSheet.tsx        # Settings with switcher
├── contexts/
│   └── AuthContext.tsx              # User state management
├── services/
│   ├── api.ts                       # API client
│   └── TokenStorage.ts              # Secure token storage
└── navigation/
    └── MainNavigator.tsx            # Uses isAdmin flag

apps/web/app/api/
└── user/
    └── [id]/
        └── route.ts                 # PATCH endpoint
```

## Database Schema

### Users Table
```typescript
{
  id: uuid,
  email: string,
  accountType: 'Doctor' | 'Triage' | 'Evac',
  // ... other fields
}
```

### Admins Table
```typescript
{
  id: uuid,
  userId: uuid,  // Foreign key to users.id
  firstName: string,
  lastName: string,
  email: string,
  // ... other fields
}
```

### User Profile Logs Table
```typescript
{
  id: uuid,
  userId: uuid,
  changedBy: uuid,
  changes: json,  // [{ field, oldValue, newValue }]
  isAdminAction: boolean,
  createdAt: timestamp,
}
```

## Support

For questions or issues with the account switcher feature, please:
1. Check this documentation
2. Review console logs for error messages
3. Verify admin status in database
4. Contact the development team

---

**Last Updated**: 2024
**Version**: 1.0.0
**Maintainer**: Development Team