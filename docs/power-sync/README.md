# PowerSync Setup Guide

## Overview

PowerSync provides real-time, offline-first data synchronization between PostgreSQL and mobile SQLite databases. This guide covers setting up PowerSync for the Fajr EMR mobile app.

## Prerequisites

- PostgreSQL 12+ with logical replication enabled
- Docker and Docker Compose
- Access to PostgreSQL with superuser privileges (for initial setup)
- JWT authentication configured in your app

## Quick Start

### 1. Enable PostgreSQL Logical Replication

Connect to your PostgreSQL database and run:

```sql
-- Check if logical replication is enabled
SHOW wal_level;

-- If not 'logical', update postgresql.conf:
-- wal_level = logical
-- max_replication_slots = 10
-- max_wal_senders = 10

-- Then restart PostgreSQL
```

### 2. Create PowerSync Database User

```sql
-- Create a dedicated user for PowerSync
CREATE USER powersync WITH PASSWORD 'secure_password_here';

-- Grant necessary permissions
GRANT CONNECT ON DATABASE fajr_emr TO powersync;
GRANT USAGE ON SCHEMA public TO powersync;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync;

-- Grant replication privileges
ALTER USER powersync WITH REPLICATION;
```

### 3. Configure PowerSync Environment

```bash
# Copy environment template
cp .env.powersync.example .env.powersync

# Edit with your values
nano .env.powersync
```

Key settings to configure:
- `DATABASE_URL` - Your PostgreSQL connection string
- `JWT_SECRET` - Must match your app's JWT secret
- `POWERSYNC_DATA_PATH` - Where to store SQLite databases

### 4. Start PowerSync

```bash
# Create data directory
mkdir -p data/powersync

# Start PowerSync service
docker compose -f docker-compose.powersync.yml up -d

# Check logs
docker compose -f docker-compose.powersync.yml logs -f powersync

# Verify health
curl http://localhost:8080/health
```

## Sync Rules Configuration

### Understanding Sync Rules

Sync rules determine what data each user can access. Edit `powersync/sync-rules.yaml`:

```yaml
sync_rules:
  - name: user_patients
    table: patients
    filter: |
      doctor_id = token_user_id() 
      OR triaged_by_id = token_user_id()
```

### Progressive Rollout

The sync rules are configured for phased rollout:

1. **Phase 1 (Week 1)**: Core data only
   - Current user profile
   - Assigned patients
   - Patient notes

2. **Phase 2 (Week 2)**: Medical records
   - Visits
   - Medication orders
   - Patient photos

3. **Phase 3 (Week 3)**: Collaboration
   - Team members
   - Message threads

4. **Phase 4 (Week 4)**: Full sync
   - Notifications
   - Archived data
   - Medical evacuation

### Activating Sync Phases

To enable a new phase, uncomment the relevant rules in `sync-rules.yaml`:

```yaml
rollout:
  phase_1:
    enabled:
      - current_user
      - assigned_patients
      # Add more as needed
```

## Mobile App Integration

### 1. Install Dependencies

```bash
cd apps/mobile
pnpm add @powersync/react-native @powersync/react-native-op-sqlite
```

### 2. Configure PowerSync Client

```typescript
// src/services/powersync/config.ts
import { PowerSyncDatabase } from '@powersync/react-native';
import { Sqlite } from '@powersync/react-native-op-sqlite';

const sqlite = new Sqlite();
export const db = new PowerSyncDatabase({
  database: sqlite,
  serverUrl: 'https://sync.emr.fajr.org',
});

// Connect with JWT token
await db.connect({
  fetchCredentials: async () => ({
    token: await AuthService.getToken(),
  }),
});
```

### 3. Define Local Schema

```typescript
// src/db/schema.ts
import { Schema, Table, Column } from '@powersync/react-native';

export const schema = new Schema({
  patients: new Table({
    id: Column.text,
    first_name: Column.text,
    last_name: Column.text,
    // ... other columns
  }),
});
```

### 4. Use in React Components

```typescript
// src/hooks/usePatients.ts
import { usePowerSyncQuery } from '@powersync/react-native';

export function usePatients() {
  return usePowerSyncQuery('SELECT * FROM patients ORDER BY last_name');
}
```

## Testing

### 1. Test Replication

```bash
# Check replication slot
docker compose -f docker-compose.powersync.yml exec powersync \
  psql -U postgres -d fajr_emr -c "SELECT * FROM pg_replication_slots;"

# Check publication
docker compose -f docker-compose.powersync.yml exec powersync \
  psql -U postgres -d fajr_emr -c "SELECT * FROM pg_publication_tables;"
```

### 2. Test Sync Rules

```bash
# Generate test JWT token
node scripts/generate-test-jwt.js --user-id=<uuid> --role=Doctor

# Test sync endpoint
curl -H "Authorization: Bearer <token>" \
  http://localhost:8080/sync/patients
```

### 3. Monitor Sync Performance

```bash
# View sync metrics
curl http://localhost:9090/metrics | grep powersync

# Check active connections
docker compose -f docker-compose.powersync.yml exec powersync \
  psql -U postgres -d fajr_emr -c "SELECT * FROM pg_stat_activity WHERE application_name LIKE 'powersync%';"
```

## Production Deployment

### 1. Security Checklist

- [ ] Use strong passwords for database users
- [ ] Enable TLS for all connections
- [ ] Restrict network access to PowerSync
- [ ] Set up monitoring and alerting
- [ ] Configure backup strategy
- [ ] Review and limit sync rules
- [ ] Enable rate limiting

### 2. Performance Tuning

```yaml
# Optimize for production in .env.powersync
POWERSYNC_MAX_CONNECTIONS=200
POWERSYNC_WORKER_THREADS=8
POWERSYNC_MAX_MEMORY_PER_CONNECTION=100
POWERSYNC_INITIAL_SYNC_BATCH_SIZE=500
```

### 3. Monitoring Setup

```bash
# Enable dashboard (with authentication)
docker compose -f docker-compose.powersync.yml --profile monitoring up -d

# Access at https://sync-dashboard.emr.fajr.org
```

### 4. Backup Strategy

```bash
# Backup PowerSync data
tar -czf powersync-backup-$(date +%Y%m%d).tar.gz data/powersync/

# Restore from backup
tar -xzf powersync-backup-20240101.tar.gz
```

## Troubleshooting

### Common Issues

#### 1. Replication Slot Not Created

```sql
-- Manually create replication slot
SELECT pg_create_logical_replication_slot('powersync_slot', 'pgoutput');
```

#### 2. Permission Denied Errors

```sql
-- Grant missing permissions
GRANT ALL ON SCHEMA public TO powersync;
GRANT ALL ON ALL TABLES IN SCHEMA public TO powersync;
```

#### 3. Sync Not Working

```bash
# Check PowerSync logs
docker compose -f docker-compose.powersync.yml logs --tail=100 powersync

# Verify JWT token
curl -H "Authorization: Bearer <token>" http://localhost:8080/auth/validate

# Test database connection
docker compose -f docker-compose.powersync.yml exec powersync \
  psql "${DATABASE_URL}" -c "SELECT 1;"
```

#### 4. High Memory Usage

```yaml
# Adjust in .env.powersync
POWERSYNC_MAX_DATABASE_SIZE=5GB
POWERSYNC_MAX_RECORDS_PER_TABLE=5000
POWERSYNC_COMPACT_INTERVAL=1800000  # 30 minutes
```

## Maintenance

### Regular Tasks

1. **Weekly**: Review sync metrics and performance
2. **Monthly**: Clean up old checkpoints
3. **Quarterly**: Review and optimize sync rules

### Upgrade Process

```bash
# 1. Backup data
tar -czf backup-$(date +%Y%m%d).tar.gz data/powersync/

# 2. Pull new image
docker compose -f docker-compose.powersync.yml pull

# 3. Stop service
docker compose -f docker-compose.powersync.yml down

# 4. Start with new version
docker compose -f docker-compose.powersync.yml up -d

# 5. Verify operation
curl http://localhost:8080/health
```

## Support

- [PowerSync Documentation](https://docs.powersync.com)
- [GitHub Issues](https://github.com/journeyapps/powersync-service/issues)
- Internal: Contact DevOps team

## License

This configuration is part of the Fajr EMR system.