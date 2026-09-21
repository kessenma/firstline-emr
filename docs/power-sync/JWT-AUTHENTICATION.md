# PowerSync JWT Authentication Setup

## Overview

PowerSync uses JWT (JSON Web Tokens) for authenticating client connections. This document explains how JWT authentication is configured in the Fajr EMR system.

## Security Model

### What is Authenticated?

PowerSync JWT authentication ensures that:

1. ✅ **Only valid users can connect** - JWT must be signed with the correct secret
2. ✅ **Tokens cannot be forged** - Signature verification prevents tampering
3. ✅ **Tokens expire** - 14-day expiration prevents indefinite access
4. ✅ **Issuer is verified** - Only tokens from `https://emr.fajr.org` are accepted
5. ✅ **Audience is verified** - Tokens must be intended for PowerSync

### What is NOT Authentication?

The `kid` (Key ID) field is **NOT** for authentication. It's simply an identifier that tells PowerSync which key to use when you have multiple keys configured.

## Configuration

### PowerSync Server (`apps/powersync-server/config/powersync.yaml`)

```yaml
client_auth:
  jwks:
    keys:
      - kid: "fajr-emr-key"  # Key identifier
        kty: oct              # Key type: octet (symmetric)
        k: <base64-secret>    # The actual secret (HS256)
        alg: HS256            # Algorithm

  audience: ["powersync", "powersync-dev"]
  issuer: https://emr.fajr.org
```

**Important:** The `kid` must match the one in your JWT tokens!

### Backend JWT Generation (`apps/web/lib/jwt-config.ts`)

```typescript
export const JWT_CONFIG = {
  KID: "fajr-emr-key",           // Must match PowerSync config
  MOBILE_TOKEN_EXPIRY: "14d",    // Token expiration
} as const;
```

### JWT Token Structure

When generating JWTs, we include the `kid` in the header:

```typescript
const token = jwt.sign(
  {
    id: user.id,
    email: user.email,
    isAdmin: user.isAdmin,
    accountType: user.accountType,
  },
  process.env.NEXTAUTH_SECRET!,
  {
    expiresIn: JWT_CONFIG.MOBILE_TOKEN_EXPIRY,
    header: {
      kid: JWT_CONFIG.KID,  // Key identifier in header
    },
  }
);
```

This produces a JWT with:

**Header:**
```json
{
  "alg": "HS256",
  "typ": "JWT",
  "kid": "fajr-emr-key"
}
```

**Payload:**
```json
{
  "id": "user-id",
  "email": "user@example.com",
  "isAdmin": true,
  "accountType": "Doctor",
  "iat": 1234567890,
  "exp": 1235000000
}
```

## Where JWTs are Generated

JWTs are generated in the following locations:

1. **Mobile Login** - `apps/web/app/api/mobile-auth/login/route.ts`
2. **Web Session** - `apps/web/lib/auth.ts` (NextAuth callbacks)
3. **Legacy Mobile Login** - `apps/web/app/api/auth/mobile-login/route.ts`

All locations use the same `JWT_CONFIG` constant to ensure consistency.

## Common Issues

### "Could not find an appropriate key in the keystore"

This error means PowerSync couldn't find a key matching the `kid` in your JWT token.

**Solution:**
1. Check that `JWT_CONFIG.KID` in `apps/web/lib/jwt-config.ts` matches
2. Check that `kid` in `apps/powersync-server/config/powersync.yaml` matches
3. Rebuild both services after changes

### "Invalid signature"

This means the JWT secret doesn't match.

**Solution:**
1. Ensure `JWT_SECRET` or `NEXTAUTH_SECRET` environment variable is the same in both web and PowerSync services
2. The `k` value in PowerSync config should be the base64 encoding of this secret

### Tokens Not Expiring

Check the `expiresIn` option when generating tokens. Currently set to 14 days.

## Security Best Practices

### ✅ DO

- Use strong, random secrets (minimum 32 bytes)
- Store secrets in environment variables, never in code
- Use HTTPS/WSS for all PowerSync connections
- Set reasonable token expiration times
- Rotate secrets periodically

### ❌ DON'T

- Use `kid: "*"` in production (too permissive)
- Hardcode secrets in configuration files
- Share secrets between different environments (dev/staging/prod)
- Set very long expiration times (> 30 days)
- Log JWT tokens or secrets

## Updating the Key ID

If you need to change the `kid`:

1. Update `JWT_CONFIG.KID` in `apps/web/lib/jwt-config.ts`
2. Update `kid` in `apps/powersync-server/config/powersync.yaml`
3. Rebuild and redeploy both services
4. Users will need to log out and log back in to get new tokens

## Testing Authentication

Use the test script to verify WebSocket connections:

```bash
./test-powersync-websocket.sh
```

Expected results:
- ✅ HTTP 200 for `/probes/liveness`
- ✅ HTTP 401 for `/sync/stream` without token (authentication required)
- ✅ HTTP 101 for `/sync/stream` with valid token (WebSocket upgrade)

## Environment Variables

### Required

- `JWT_SECRET` or `NEXTAUTH_SECRET` - Shared secret for signing JWTs
- `NEXTAUTH_URL` - Issuer URL (must match `issuer` in PowerSync config)

### PowerSync Config

The JWT secret is converted to base64 and stored in the PowerSync config as the `k` value.

To generate the `k` value from your secret:

```bash
echo -n "your-secret-here" | base64
```

## Troubleshooting

### Check JWT Token Contents

Decode a JWT token to see its contents (header and payload only, signature cannot be verified without secret):

```bash
# Get token from mobile app logs or API response
echo "YOUR_JWT_TOKEN_HERE" | cut -d. -f1-2 | base64 -d
```

### Verify PowerSync Configuration

```bash
# SSH into server
docker exec -it powersync-<container-id> cat /config/config.yaml
```

Check that:
- `kid` matches your JWT tokens
- `issuer` matches `NEXTAUTH_URL`
- `audience` includes "powersync"

### Check Mobile App Token

In mobile app logs, look for the JWT token being sent. Verify it includes `kid` in the header.

## References

- [PowerSync JWT Auth Documentation](https://docs.powersync.com/usage/installation/authentication-setup/jwt-auth)
- [JWT.io Debugger](https://jwt.io/) - Decode and inspect tokens (never paste production tokens!)
- [RFC 7519 - JSON Web Token](https://tools.ietf.org/html/rfc7519)