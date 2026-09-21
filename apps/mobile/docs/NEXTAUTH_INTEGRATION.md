# Next.js Backend Authentication Integration

## Overview

The Fajr-EMR mobile app now authenticates against your existing Next.js backend using NextAuth. This provides a unified authentication system across web and mobile platforms.

## Architecture

```
Mobile App (React Native)
    ↓
AuthService (src/services/AuthService.ts)
    ↓
Next.js API (/api/auth/...)
    ↓
MongoDB (User collection)
    ↓
Return Session + JWT Token
    ↓
Store in Couchbase Lite (offline access)
```

## How It Works

### 1. Online Authentication Flow

1. **User enters credentials** in LoginScreen
2. **AuthService.login()** sends POST to `/api/auth/callback/credentials`
3. **NextAuth verifies** credentials against MongoDB
4. **Session returned** with user data (firstName, lastName, accountType, etc.)
5. **User data stored** in Couchbase Lite for offline access
6. **Navigation** to HomeScreen with user object

### 2. Offline Authentication Flow

If the network is unavailable:

1. **Network error detected** during login attempt
2. **AuthService.loginOffline()** checks Couchbase Lite
3. **Verify credentials** against locally stored user data
4. **Session created** from cached data
5. **Navigation** to HomeScreen

## Setup Instructions

### 1. Configure API URL

Update `src/config/index.ts` with your backend URL:

```typescript
export const API_CONFIG = {
  DEV: {
    BASE_URL: 'http://localhost:3000', // Your local dev server
  },
  PROD: {
    BASE_URL: 'https://your-app.com', // Your production URL
  },
};
```

**Important for iOS Simulator:**
- Use `http://localhost:3000` for local dev
- iOS Simulator can access host machine's localhost

**Important for Android Emulator:**
- Use `http://10.0.2.2:3000` instead of localhost
- Android emulator maps 10.0.2.2 to host machine's localhost

**For Physical Devices:**
- Use your computer's IP address: `http://192.168.1.XXX:3000`
- Make sure device is on same network as dev machine

### 2. Start Your Next.js Backend

```bash
# In your web app directory
cd apps/web
pnpm dev
```

Your backend should be running on http://localhost:3000

### 3. Test Authentication

Run the mobile app:

```bash
cd apps/mobile
pnpm ios
```

Login with existing credentials from your web app:
- Email: `doctor@example.com`
- Password: `your-password`

## User Data Mapping

The mobile app receives the same user object as the web app:

```typescript
interface SessionUser {
  id: string;              // MongoDB _id
  _id: string;             // MongoDB _id
  email: string;           // User email
  accountType: 'Doctor' | 'Triage' | 'Evac';
  firstName: string;       // From User model
  lastName: string;        // From User model
  city: string;           
  countries: string[];     // From UserSettings
  languages: string[];     // From UserSettings
  doctorSpecialty?: string[]; // From UserSettings
  image?: string;
  isAdmin: boolean;        // From Admin collection
  dob?: string | Date;
  gender?: 'Male' | 'Female';
  token?: string;          // JWT token
  userSettings?: string;   // UserSettings _id
  userNotifications?: string; // UserNotifications _id
  userMessages?: string;   // UserMessages _id
}
```

## Offline Support

### Data Stored Locally (Couchbase)

When a user logs in successfully, their data is cached in Couchbase Lite:

```typescript
Document ID: "user::{email}"
Fields:
  - type: "user"
  - id, _id, email
  - accountType, firstName, lastName
  - city, countries, languages
  - doctorSpecialty, isAdmin
  - token (JWT)
  - userSettings, userNotifications, userMessages (IDs)
  - lastSync (timestamp)
```

### Offline Login

If the backend is unreachable:
- User can still login with previously cached credentials
- All user data loads from Couchbase Lite
- App functions normally in offline mode
- Data syncs when connection restored

## Security Considerations

### Current Implementation

✅ **Secure:**
- Uses existing NextAuth authentication
- Password hashing via bcrypt (in backend)
- JWT tokens for session management
- HTTPS in production

⚠️ **To Improve:**
- Offline password verification (currently stores plain text for demo)
- Token refresh mechanism
- Biometric authentication

### Production Requirements

Before deploying to production:

#### 1. Enable HTTPS

Update config for production:

```typescript
PROD: {
  BASE_URL: 'https://your-app.com', // Must be HTTPS
}
```

#### 2. Implement Token Refresh

Add token refresh logic to AuthService:

```typescript
async refreshToken(): Promise<void> {
  const response = await fetch(`${this.baseUrl}/api/auth/session`);
  const session = await response.json();
  if (session?.user?.token) {
    await this.updateStoredToken(session.user.token);
  }
}
```

#### 3. Add Biometric Authentication

Install dependencies:

```bash
pnpm add react-native-biometrics
```

Store credentials securely and use biometrics for quick login.

#### 4. Secure Offline Credentials

Instead of storing plain password for offline login:

```typescript
// Store hashed password from backend
const userDoc = new MutableDocument(userId)
  .setString('passwordHash', user.passwordHash) // Get from backend
  // ... other fields
```

Then verify offline using the hash.

## API Endpoints Used

### 1. Login (POST)
```
/api/auth/callback/credentials
```

**Request:**
```json
{
  "email": "doctor@example.com",
  "password": "password123",
  "csrfToken": "..."
}
```

**Response:**
Redirects to session endpoint

### 2. Get Session (GET)
```
/api/auth/session
```

**Response:**
```json
{
  "user": {
    "id": "...",
    "email": "doctor@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "accountType": "Doctor",
    // ... all user fields
  }
}
```

### 3. Get CSRF Token (GET)
```
/api/auth/csrf
```

**Response:**
```json
{
  "csrfToken": "abc123..."
}
```

### 4. Logout (POST)
```
/api/auth/signout
```

Clears session and cookies.

## Environment-Specific Configuration

### Development

```typescript
// src/config/index.ts
DEV: {
  BASE_URL: 'http://localhost:3000',
}
```

**iOS Simulator:** Works with localhost
**Android Emulator:** Use `http://10.0.2.2:3000`
**Physical Device:** Use IP address `http://192.168.1.XXX:3000`

### Production

```typescript
PROD: {
  BASE_URL: 'https://your-production-api.com',
}
```

## Troubleshooting

### "Network request failed"

**Problem:** Can't connect to backend

**Solutions:**
1. Check backend is running (`pnpm dev` in web app)
2. Verify URL in config matches your backend
3. For Android emulator, use `10.0.2.2` instead of `localhost`
4. For physical device, use IP address
5. Check firewall settings

### "Invalid credentials" (but works on web)

**Problem:** Credentials valid on web but fail on mobile

**Solutions:**
1. Check API endpoint URLs are correct
2. Verify CSRF token is being sent
3. Check cookie handling (may need credentials: 'include')
4. Review NextAuth configuration

### Offline login not working

**Problem:** Can't login when offline

**Solutions:**
1. Login at least once while online (to cache credentials)
2. Check database is initialized
3. Verify user data was stored in Couchbase

### "Database not ready"

**Problem:** Database initialization takes too long

**Solutions:**
1. Wait for `isInitialized` to be true
2. Check DatabaseProvider is wrapping app correctly
3. Review Couchbase Lite logs

## Code Examples

### Custom Login with Additional Fields

```typescript
const handleCustomLogin = async () => {
  const response = await authService.login({
    email: email,
    password: password,
  });

  if (response.success && response.user) {
    // Access user data
    console.log('Account Type:', response.user.accountType);
    console.log('Is Admin:', response.user.isAdmin);
    console.log('Specialties:', response.user.doctorSpecialty);
    
    // Navigate based on account type
    if (response.user.accountType === 'Doctor') {
      navigation.navigate('DoctorDashboard');
    } else if (response.user.accountType === 'Triage') {
      navigation.navigate('TriageDashboard');
    }
  }
};
```

### Check Session on App Start

```typescript
useEffect(() => {
  const checkExistingSession = async () => {
    const user = await authService.checkSession();
    if (user) {
      setIsAuthenticated(true);
      setCurrentUser(user);
    }
  };

  checkExistingSession();
}, []);
```

### Logout with Cleanup

```typescript
const handleLogout = async () => {
  try {
    await authService.logout();
    
    // Clear any local state
    setCurrentUser(null);
    setIsAuthenticated(false);
    
    // Optional: Clear cached data
    await databaseService?.deleteDatabase();
    await databaseService?.initializeDatabase();
    
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

## Testing

### Test Online Login

1. Start Next.js backend: `cd apps/web && pnpm dev`
2. Run mobile app: `cd apps/mobile && pnpm ios`
3. Enter valid credentials
4. Verify user data displays correctly
5. Check logout works

### Test Offline Login

1. Login while online (to cache credentials)
2. Logout
3. Stop Next.js backend
4. Try logging in with same credentials
5. Should work using cached data

### Test Network Switching

1. Login while online
2. Turn off wifi/network
3. App should show "Offline Mode" banner
4. User data should still be accessible
5. Turn on wifi/network
6. Banner should disappear

## Next Steps

1. ✅ **Completed:** Basic authentication with Next.js backend
2. ✅ **Completed:** Offline authentication with Couchbase
3. **TODO:** Implement token refresh
4. **TODO:** Add biometric authentication
5. **TODO:** Implement data sync (when network restored)
6. **TODO:** Add Google Sign-In support
7. **TODO:** Implement password reset flow
8. **TODO:** Add session timeout/auto-logout

## Related Files

- `src/services/AuthService.ts` - Authentication logic
- `src/config/index.ts` - API configuration
- `src/screens/LoginScreen.tsx` - Login UI
- `src/screens/HomeScreen.tsx` - Dashboard
- `App.tsx` - Main app with auth state

## Support

For issues:
1. Check this documentation
2. Review backend logs (Next.js)
3. Review mobile logs (React Native debugger)
4. Check network traffic (React Native Debugger → Network tab)

---

**You're all set!** Your mobile app now shares the same authentication system as your web app. 🎉