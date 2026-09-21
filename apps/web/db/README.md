# PostgreSQL Database Setup with Drizzle ORM

This directory contains the PostgreSQL database schema and migration setup for the Fajr Medical Flow EMR application.

## 📁 Directory Structure

```
db/
├── schema/              # Database schema definitions
│   ├── index.ts        # Main schema export with relations
│   ├── users.ts        # User-related tables
│   ├── admins.ts       # Admin table
│   ├── patients.ts     # Patient and RX orders tables
│   ├── notes.ts        # Medical notes tables
│   ├── visits.ts       # Patient visit records
│   ├── medOrders.ts    # Medication orders
│   ├── userSettings.ts # User preferences
│   └── notifications.ts # Notification system
├── migrations/         # Generated SQL migrations (auto-generated)
├── connection.ts       # Database connection pool
├── migrate.ts         # Migration runner script
└── README.md          # This file
```

## 🚀 Quick Start

### 1. Install Dependencies

First, ensure you have the required dependencies:

```bash
pnpm add drizzle-orm pg
pnpm add -D drizzle-kit @types/pg
```

### 2. Set Environment Variable

Add your PostgreSQL connection string to `.env.local`:

```env
DATABASE_URL=postgres://postgres:PASSWORD@HOST:PORT/DATABASE?sslmode=allow
```

### 3. Generate Initial Migration

Generate the SQL migration files from your schema:

```bash
pnpm db:generate
```

This will create migration files in the `db/migrations/` directory.

### 4. Run Migrations

Apply the migrations to your database:

```bash
pnpm db:migrate
```

### 5. Test Connection

Test your database connection:

```typescript
import { testConnection } from './db/connection';

await testConnection();
```

## 📝 NPM Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "tsx db/migrate.ts",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio",
    "db:drop": "drizzle-kit drop",
    "db:check": "drizzle-kit check"
  }
}
```

### Script Descriptions

- **`db:generate`** - Generate migration files from schema changes
- **`db:migrate`** - Run pending migrations
- **`db:push`** - Push schema changes directly (for development)
- **`db:studio`** - Open Drizzle Studio (visual database browser)
- **`db:drop`** - Drop migration files
- **`db:check`** - Check for schema issues

## 📊 Schema Overview

### Core Tables

#### Users & Authentication
- **users** - User accounts (doctors, triage, evac coordinators)
- **security_questions** - User security questions
- **user_follow_up_emails** - Email tracking for admin follow-ups
- **admins** - Admin privileges table
- **user_settings** - User preferences and UI settings

#### Patient Management
- **patients** - Patient records
- **patient_photos** - Patient photo uploads
- **notes** - Medical notes (procedure, SOAP, triage, blank)
- **visits** - Patient visit records with lab values
- **rx_orders** - Prescription orders
- **med_orders** - Medication orders

#### Notifications
- **notifications** - Notification content
- **user_notifications** - User-specific notification status
- **notification_recipients** - Intended recipients

## 🔧 Usage Examples

### Querying Data

```typescript
import { db } from './db/connection';
import { users, patients } from './db/schema';
import { eq } from 'drizzle-orm';

// Get a user by email
const user = await db
  .select()
  .from(users)
  .where(eq(users.email, 'doctor@example.com'));

// Get patients with their coordinator
const patientsWithCoordinator = await db
  .select()
  .from(patients)
  .leftJoin(users, eq(patients.coordinatorId, users.id));
```

### Inserting Data

```typescript
import { db } from './db/connection';
import { users } from './db/schema';

// Insert a new user
const newUser = await db.insert(users).values({
  email: 'new.doctor@example.com',
  firstName: 'John',
  lastName: 'Doe',
  accountType: 'Doctor',
  password: 'hashed_password',
}).returning();
```

### Using Relations

```typescript
import { db } from './db/connection';
import { users } from './db/schema';

// Query with relations
const userWithSettings = await db.query.users.findFirst({
  where: (users, { eq }) => eq(users.email, 'doctor@example.com'),
  with: {
    settings: true,
    admin: true,
    coordinatedPatients: true,
  },
});
```

## 🔄 Migration Workflow

### Making Schema Changes

1. **Edit schema files** in `db/schema/`
2. **Generate migration**: `pnpm db:generate`
3. **Review the SQL** in `db/migrations/`
4. **Apply migration**: `pnpm db:migrate`

### Example: Adding a New Field

```typescript
// 1. Edit db/schema/patients.ts
export const patients = pgTable('patients', {
  // ... existing fields
  emergencyContact: varchar('emergency_contact', { length: 255 }),
});

// 2. Generate migration
// pnpm db:generate

// 3. Review generated SQL in db/migrations/

// 4. Apply migration
// pnpm db:migrate
```

## 🎯 First User Admin Logic

The first user to register is automatically set as an admin. Implement this in your registration logic:

```typescript
import { db } from './db/connection';
import { users, admins } from './db/schema';
import { count } from 'drizzle-orm';

async function registerUser(userData: NewUser) {
  // Check if this is the first user
  const userCount = await db.select({ count: count() }).from(users);
  const isFirstUser = userCount[0].count === 0;

  // Create user with authorized = true if first user
  const [newUser] = await db.insert(users).values({
    ...userData,
    authorized: isFirstUser ? true : undefined,
  }).returning();

  // Create admin record if first user
  if (isFirstUser) {
    await db.insert(admins).values({
      userId: newUser.id,
      firstName: newUser.firstName,
      lastName: newUser.lastName,
      email: newUser.email,
      adminStartDate: new Date(),
    });
  }

  return newUser;
}
```

## 🔐 Environment Variables

Required environment variables:

```env
DATABASE_URL=postgres://user:password@host:port/database?sslmode=allow
NODE_ENV=development|production
```

## 📈 Monitoring & Debugging

### Drizzle Studio

Launch the visual database browser:

```bash
pnpm db:studio
```

This opens a web interface at `https://local.drizzle.studio` where you can:
- Browse tables and data
- Run queries
- Edit records
- View relationships

### Enable Query Logging

For development, enable SQL query logging:

```typescript
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({ connectionString });

const db = drizzle(pool, {
  logger: true, // Enable SQL logging
});
```

## 🚨 Common Issues

### Issue: Migration fails with "relation already exists"

**Solution**: Drop the existing tables or use `db:push` for development.

```bash
# For development only - pushes schema without migrations
pnpm db:push
```

### Issue: Connection timeout

**Solution**: Check your connection string and firewall settings.

```typescript
const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 10000, // Increase timeout
});
```

### Issue: Enum conflicts

**Solution**: Drop and recreate enums, or use `ALTER TYPE` in a custom migration.

## 🔄 Data Migration from MongoDB

See the main migration guide at `apps/mongoDB_postgreSQL_migration.md` for:
- Complete data migration scripts
- Field mapping documentation
- Validation procedures
- Rollback strategies

## 📚 Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/docs/overview)
- [Drizzle Kit Documentation](https://orm.drizzle.team/kit-docs/overview)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PowerSync Documentation](https://docs.powersync.com/)

## 🎓 Best Practices

1. **Always review generated migrations** before applying
2. **Test migrations locally first** before production
3. **Keep migrations small and focused** on single changes
4. **Never edit applied migrations** - create new ones instead
5. **Use transactions** for data migrations
6. **Backup your database** before major migrations
7. **Use Drizzle Studio** for data exploration and debugging

## 🛠️ Troubleshooting

### Reset Database (Development Only)

```bash
# Drop all tables and start fresh
psql $DATABASE_URL -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Regenerate and apply migrations
pnpm db:generate
pnpm db:migrate
```

### Check Current Schema

```bash
# List all tables
psql $DATABASE_URL -c "\dt"

# Describe a table
psql $DATABASE_URL -c "\d users"
```

## 📞 Support

For issues or questions:
1. Check the main migration guide
2. Review Drizzle ORM documentation
3. Check PostgreSQL logs for detailed errors
4. Use Drizzle Studio to inspect the database state