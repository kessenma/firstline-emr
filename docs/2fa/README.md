# 2FA Implementation Progress

## Status: Implementation Complete, Rollout Pending

### Completed
- [x] Phase 1: DB schema (`totp_credentials` table, `two_factor_status` column) + TOTP server utils
- [x] Phase 2: TOTP API routes (setup, verify-setup, verify, 2FA status)
- [x] Phase 3: Login 2FA enforcement (web NextAuth + mobile login)
- [x] Phase 4: Signup flow — security questions replaced with 2FA setup (TOTP required, passkey optional)
- [x] Phase 5: Existing user migration — grace period logic, setup-2fa page, notification sheet
- [x] Phase 6: Cross-device passkey scaffolding (feature flag only, implementation deferred)
- [x] Phase 7: Documentation

### What to do when enabling REQUIRE_2FA_LOGIN

1. **Send 2FA reminder notification from Admin Dashboard** — use the existing "Send Admin Notification" section with this message:

   > Two-factor authentication is now required for all accounts. Please set up 2FA using an authenticator app (Microsoft Authenticator, Authy, or Google Authenticator) in your Profile > Security settings within 14 days. After this period, you will not be able to sign in without 2FA.

2. **Wait 14 days** for the grace period

3. **Set `REQUIRE_2FA_LOGIN=true`** in production environment variables

4. **Monitor adoption** — query users who haven't set up 2FA:
   ```sql
   SELECT email, first_name, last_name, two_factor_status
   FROM users
   WHERE two_factor_status IS NULL OR two_factor_status = 'setup_pending';
   ```

5. **Send follow-up notification** to remaining users ~3 days before deadline

6. **After grace period expires** — users without 2FA will be blocked at login and redirected to `/auth/setup-2fa`

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `TOTP_ENCRYPTION_KEY` | Yes (prod) | — | 64-char hex string (32 bytes) for AES-256-GCM encryption of TOTP secrets |
| `REQUIRE_2FA_LOGIN` | No | `false` | Enable 2FA enforcement for all users |
| `TWO_FA_GRACE_PERIOD_DAYS` | No | `14` | Days existing users have to set up 2FA |
| `SKIP_2FA_IN_DEV` | No | `true` (in dev) | Skip 2FA checks in development/localhost |
| `CROSS_DEVICE_PASSKEY_AUTH` | No | `false` | Enable cross-device passkey auth (future) |

### Generating TOTP_ENCRYPTION_KEY

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### How 2FA Works

- **New signups**: TOTP authenticator app is required at signup (step 2). Passkey is optional bonus.
- **Login with password**: After password verified, 2FA is required (TOTP code or passkey).
- **Login with passkey**: Passkey already satisfies 2FA (biometric + possession). No additional step.
- **Development**: `SKIP_2FA_IN_DEV=true` (default) bypasses 2FA on localhost and emulators.
