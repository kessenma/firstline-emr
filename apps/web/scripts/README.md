# Database & Testing Scripts

This directory contains utility scripts for testing and managing the database.

## Available Scripts

### 1. Test Signup System

Check the current state of the signup system and database.

```bash
pnpm test:signup
```

**What it does:**
- Shows current user count
- Shows current admin count
- Checks if first user logic will apply
- Lists all existing users with their details
- Shows record counts for all tables

**Example Output:**
```
🧪 Testing Signup Flow

📊 Current user count: 0
👑 Current admin count: 0

🔍 First user check: ✅ YES
   → First user will be automatically granted admin privileges

📋 Database Tables:
   users                     0 records
   admins                    0 records
   security_questions        0 records
   user_settings             0 records
```

---

### 2. Check User by Email

Verify if a user exists and view their details.

```bash
pnpm check:user <email>
```

**Example:**
```bash
pnpm check:user john@example.com
```

**What it does:**
- Searches for user by email (case-insensitive)
- Displays full user details if found
- Shows admin status
- Lists security questions count
- Shows professional details (specialties, languages, countries)

**Example Output (User Found):**
```
🔍 Checking for user: john@example.com

✅ User found!

📋 User Details:
   ID: abc-123-def
   Name: John Doe
   Email: john@example.com
   Account Type: Doctor
   Authorized: ✅ Yes
   Is Admin: 👑 Yes
   Created: 11/29/2025, 10:30:45 PM
   Specialties: Cardiology, Internal Medicine
   Languages: English, Spanish
   Countries: USA, Mexico

👑 Admin Details:
   Admin Since: 11/29/2025, 10:30:45 PM

🔒 Security Questions: 3 configured
```

**Example Output (User Not Found):**
```
🔍 Checking for user: jane@example.com

❌ User not found
   Email: jane@example.com

💡 This email is available for signup
```

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `pnpm test:signup` | Check signup system status |
| `pnpm check:user <email>` | Look up user by email |
| `pnpm db:test` | Test database connection |
| `pnpm db:studio` | Open visual database browser |

---

## Related Documentation

- [Signup Setup Documentation](../docs/SIGNUP_SETUP.md) - Complete signup system documentation
- [Database Connection](../db/connection.ts) - Database configuration
- [Database Schema](../db/schema/) - All database schemas

---

## Troubleshooting

### Script won't run
Make sure you're in the `apps/web` directory:
```bash
cd apps/web
pnpm test:signup
```

### Connection errors
Check your `.env` file at the monorepo root has `DATABASE_URL` set correctly:
```bash
grep DATABASE_URL ../../.env
```

### Permission errors
Ensure you have the correct database credentials in your `.env` file.

---

**Last Updated**: November 29, 2025