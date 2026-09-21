# Authentication System with Couchbase Lite

## Overview

The Fajr-EMR mobile app uses a local-first authentication system powered by Couchbase Lite. User credentials are stored securely in the local database, allowing offline authentication.

## How It Works

### Login Flow

1. **User enters credentials** on `LoginScreen`
2. **Database lookup**: App checks if user document exists in Couchbase
3. **Password verification**: Compares entered password with stored hash
4. **Session creation**: On success, sets `isAuthenticated` state to `true`
5. **Navigation**: User is redirected to `HomeScreen`

### Auto-Registration (Demo Mode)

For development/demo purposes, if a user doesn't exist, the app offers to create an account automatically. This should be disabled in production.

## User Document Structure

```typescript
{
  _id: "user::{email}",
  type: "user",
  email: "doctor@example.com",
  password: "hashed_password", // Use bcrypt in production!
  createdAt: "2024-01-01T00:00:00Z",
  isActive: true,
  role: "doctor", // Optional: doctor, nurse, admin
  profile: {
    firstName: "John",
    lastName: "Doe",
    specialty: "Cardiology"
  }
}
```

## Security Considerations

### ⚠️ Current Implementation (Development Only)

The current implementation stores passwords in **plain text** for development purposes. This is **NOT secure** and should **NEVER** be used in production.

### ✅ Production Requirements

Before deploying to production, implement the following:

#### 1. Password Hashing

Install bcrypt:
```bash
pnpm add bcrypt
pnpm add -D @types/bcrypt
```

Update `createUser` function:
```typescript
import bcrypt from 'bcrypt';

const createUser = async (email: string, password: string) => {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);
  
  const userDoc = new MutableDocument(`user::${email}`)
    .setString('type', 'user')
    .setString('email', email.toLowerCase())
    .setString('password', hashedPassword)
    .setString('createdAt', new Date().toISOString())
    .setBoolean('isActive', true);
    
  await collection.save(userDoc);
};
```

Update login verification:
```typescript
const storedPassword = userDoc.getString('password');
const isValid = await bcrypt.compare(password, storedPassword);
```

#### 2. Database Encryption

Enable Couchbase Lite encryption:
```typescript
import { DatabaseConfiguration, EncryptionKey } from 'cbl-reactnative';

const config = new DatabaseConfiguration();
const encryptionKey = new EncryptionKey('your-secure-key');
config.encryptionKey = encryptionKey;

const database = new Database('fajr-emr', config);
```

#### 3. Secure Key Storage

Use React Native Keychain to store encryption keys:
```bash
pnpm add react-native-keychain
```

```typescript
import * as Keychain from 'react-native-keychain';

// Store encryption key
await Keychain.setGenericPassword('db_encryption', encryptionKey);

// Retrieve encryption key
const credentials = await Keychain.getGenericPassword();
const key = credentials.password;
```

#### 4. Session Management

Implement proper session tokens:
```typescript
{
  type: "session",
  userId: "user::doctor@example.com",
  token: "random-secure-token",
  expiresAt: "2024-01-02T00:00:00Z",
  deviceId: "device-uuid"
}
```

#### 5. Biometric Authentication

Add Face ID/Touch ID support:
```bash
pnpm add react-native-biometrics
```

```typescript
import ReactNativeBiometrics from 'react-native-biometrics';

const rnBiometrics = new ReactNativeBiometrics();

const handleBiometricLogin = async () => {
  const { success } = await rnBiometrics.simplePrompt({
    promptMessage: 'Authenticate to access EMR'
  });
  
  if (success) {
    // Load saved credentials and auto-login
  }
};
```

## User Roles & Permissions

Implement role-based access control:

```typescript
enum UserRole {
  ADMIN = 'admin',
  DOCTOR = 'doctor',
  NURSE = 'nurse',
  RECEPTIONIST = 'receptionist'
}

interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: string[];
}
```

Create permissions checker:
```typescript
const hasPermission = (user: User, permission: string): boolean => {
  return user.permissions.includes(permission) || user.role === UserRole.ADMIN;
};
```

## Sync Gateway Authentication

When implementing sync with Couchbase Sync Gateway:

```typescript
import { Replicator, ReplicatorConfiguration, URLEndpoint, BasicAuthenticator } from 'cbl-reactnative';

const setupSync = async (email: string, password: string) => {
  const endpoint = new URLEndpoint('wss://your-sync-gateway.com:4984/fajr-emr');
  const config = new ReplicatorConfiguration(database, endpoint);
  
  // Use basic auth
  config.authenticator = new BasicAuthenticator(email, password);
  
  // Or use session auth (more secure)
  // config.authenticator = new SessionAuthenticator(sessionToken);
  
  const replicator = new Replicator(config);
  await replicator.start();
};
```

## Logout Implementation

Add proper logout cleanup:

```typescript
const handleLogout = async () => {
  try {
    // Stop replication if active
    await replicator?.stop();
    
    // Clear session data
    await AsyncStorage.removeItem('session');
    
    // Clear sensitive data from state
    setIsAuthenticated(false);
    setUserData(null);
    
    console.log('Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
  }
};
```

## Testing Authentication

### Test Users (Development)

Create test users in the database:

```typescript
const createTestUsers = async () => {
  const collection = databaseService?.getDefaultCollection();
  
  const testUsers = [
    { email: 'doctor@test.com', password: 'test123', role: 'doctor' },
    { email: 'nurse@test.com', password: 'test123', role: 'nurse' },
    { email: 'admin@test.com', password: 'test123', role: 'admin' },
  ];
  
  for (const user of testUsers) {
    await createUser(user.email, user.password, user.role);
  }
};
```

## Compliance Considerations

### HIPAA Requirements

For HIPAA compliance, ensure:

1. ✅ **Encryption at rest**: Database encryption enabled
2. ✅ **Encryption in transit**: Use HTTPS/WSS for sync
3. ✅ **Access controls**: Role-based permissions
4. ✅ **Audit logging**: Log all authentication attempts
5. ✅ **Session timeouts**: Implement auto-logout after inactivity
6. ✅ **Password policies**: Enforce strong passwords

### Audit Logging

Implement authentication audit trail:

```typescript
const logAuthEvent = async (event: string, userId: string, success: boolean) => {
  const auditDoc = new MutableDocument()
    .setString('type', 'audit_log')
    .setString('event', event)
    .setString('userId', userId)
    .setBoolean('success', success)
    .setString('timestamp', new Date().toISOString())
    .setString('deviceInfo', getDeviceInfo());
    
  await collection.save(auditDoc);
};
```

## Next Steps

1. **Implement password hashing** (bcrypt)
2. **Add database encryption**
3. **Implement session tokens**
4. **Add biometric authentication**
5. **Setup Sync Gateway authentication**
6. **Implement role-based access control**
7. **Add audit logging**
8. **Implement session timeout**
9. **Add "Remember Me" functionality**
10. **Implement password reset flow**

## Quick Test

To test the login flow:

1. **Run the app**: `pnpm ios`
2. **Enter any email and password**
3. **Tap "Sign In"**
4. **Confirm account creation** when prompted
5. **You'll be logged in** and see the HomeScreen
6. **Tap "Logout"** to return to login screen
7. **Login again** with the same credentials (no prompt this time)

---

**Remember**: The current implementation is for development only. Implement proper security before production deployment!