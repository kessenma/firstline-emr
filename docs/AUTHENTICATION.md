# Authentication Architecture

## Overview

This application uses a **dual authentication approach** to support both web and mobile clients:

1. **Web Application**: Uses NextAuth.js with session-based authentication (cookies)
2. **Mobile Application**: Uses JWT tokens passed in Authorization headers

Both authentication methods work with the same API endpoints, allowing code reuse and simplified maintenance.

## Authentication Flow

### Web Authentication (NextAuth)

1. User logs in via `/auth/login` page
2. NextAuth creates a session and stores it in cookies
3. API requests automatically include session cookies
4. Server validates session using `getServerSession(authOptions)`

### Mobile Authentication (JWT)

1. User logs in via mobile app using `/api/auth/mobile-login` endpoint
2. Server returns a JWT token containing user information
3. Mobile app stores token in secure storage (MMKV)
4. API requests include token in Authorization header: `Bearer <token>`
5. Server validates token using `verifyMobileToken()` helper

## Implementation

### API Endpoints

All API endpoints support both authentication methods using the `getUserFromRequest()` helper:

```typescript
// Example: /api/patient/route.ts
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getUserFromRequest } from "@/lib/mobileAuth";

export async function GET(request: NextRequest) {
  // Support both NextAuth sessions (web) and JWT tokens (mobile)
  const session = await getServerSession(authOptions);
  const user = getUserFromRequest(request, session);

  if (!user || !user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Your endpoint logic here...
}
```

### Mobile Login Endpoint

The mobile-specific login endpoint (`/api/auth/mobile-login`) handles authentication and returns a JWT token:

```typescript
// /api/auth/mobile-login/route.ts
export async function POST(request: NextRequest) {
  const { email, password } = await request.json();
  
  // Validate credentials against database
  // ... validation logic ...
  
  // Create JWT token
  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      accountType: user.accountType,
      isAdmin: user.isAdmin,
      // ... other user properties
    },
    JWT_SECRET,
    { expiresIn: "14d" }
  );
  
  return NextResponse.json({
    success: true,
    token,
    user: userData
  });
}
```

### Mobile App Implementation

The mobile app uses an `AuthService` to handle authentication and an `apiClient` for making authenticated requests:

```typescript
// Mobile app login
const response = await authService.login({
  email: 'doctor@example.com',
  password: 'password123'
});

// Make authenticated API calls
const patientsResponse = await patientApi.getPatients();
```

The `apiClient` automatically includes the JWT token in all requests:

```typescript
// Automatically added to all requests when user is logged in
headers['Authorization'] = `Bearer ${user.token}`;
```

## Helper Functions

### mobileAuth.ts

This file contains helper functions for handling dual authentication:

- **`verifyMobileToken(request)`**: Verifies JWT tokens from Authorization headers
- **`getUserFromRequest(request, session)`**: Gets user from either NextAuth session or JWT token
- **`getUserIdFromRequest(request, session)`**: Gets just the user ID from either source

## Security Considerations

### JWT Token Security

- Tokens expire after 14 days
- Tokens are signed with `JWT_SECRET` or `NEXTAUTH_SECRET`
- Mobile app stores tokens in secure MMKV storage
- Tokens include minimal user information needed for authorization

### Session Security

- NextAuth sessions use secure HTTP-only cookies
- Sessions are validated server-side on each request
- CSRF protection is built into NextAuth

## Environment Variables

Required environment variables for authentication:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# JWT Secret (can be same as NEXTAUTH_SECRET)
JWT_SECRET=your-secret-key-here

# Google OAuth (optional, for web only)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

## Migration Guide

### Updating Existing Endpoints

To update existing API endpoints to support mobile authentication:

1. Import the mobile auth helper:
   ```typescript
   import { getUserFromRequest } from "@/lib/mobileAuth";
   ```

2. Get both session and user:
   ```typescript
   const session = await getServerSession(authOptions);
   const user = getUserFromRequest(request, session);
   ```

3. Check for user instead of session:
   ```typescript
   if (!user || !user.id) {
     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
   }
   ```

### Benefits of This Approach

1. **Single Codebase**: API endpoints work for both web and mobile
2. **Gradual Migration**: Endpoints can be updated one at a time
3. **Backward Compatible**: Existing web authentication continues to work
4. **Flexible**: Easy to add new authentication methods in the future
5. **Secure**: Each platform uses appropriate security mechanisms

## Testing

### Testing Web Authentication
1. Login via web browser at `/auth/login`
2. Access protected pages
3. Make API calls from browser console

### Testing Mobile Authentication
1. Login via mobile app
2. Check token is stored in MMKV
3. Make API calls using the apiClient
4. Verify Authorization header is included

### Testing Dual Authentication
1. Create a test endpoint that logs authentication method
2. Access it from both web and mobile
3. Verify correct user information is retrieved

## Troubleshooting

### Common Issues

1. **"Unauthorized" errors on mobile**
   - Check token is being included in Authorization header
   - Verify token hasn't expired
   - Ensure JWT_SECRET matches between server and token creation

2. **Session works on web but not mobile**
   - Mobile doesn't use cookies/sessions
   - Ensure mobile is using JWT token authentication

3. **Can't decode JWT token**
   - Verify JWT_SECRET is set correctly
   - Check token format (should be three parts separated by dots)
   - Ensure token hasn't been corrupted in storage/transmission

## Future Enhancements

1. **Token Refresh**: Implement refresh token mechanism for mobile
2. **Biometric Auth**: Add fingerprint/face ID for mobile app
3. **OAuth for Mobile**: Support Google/Apple sign-in on mobile
4. **Rate Limiting**: Add rate limiting for login attempts
5. **Audit Logging**: Track authentication events for security