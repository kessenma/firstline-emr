# Enable Logical Replication for PowerSync

This guide will help you enable logical replication on your PostgreSQL server at `<DB_HOST>:27017`.

## Current Status

✅ **Working:**
- PostgreSQL 17.7 is running
- Connection successful
- Database has 28 tables
- User has proper permissions

❌ **Issue:**
- WAL level is `replica` (needs to be `logical`)

## Overview

Logical replication is required for PowerSync to track changes in your PostgreSQL database. This involves:
1. Changing PostgreSQL configuration
2. Restarting PostgreSQL
3. Creating a replication slot and publication
4. Verifying the setup

---

## Step 1: Determine Your PostgreSQL Setup

First, identify how PostgreSQL is running:

### Option A: Docker Container (Most Likely)

If PostgreSQL is running in a Docker container on the remote host:

```bash
# SSH into the remote server
ssh user@<DB_HOST>

# Find the PostgreSQL container
docker ps | grep postgres

# Get container name/ID
CONTAINER_NAME=$(docker ps --format '{{.Names}}' | grep postgres)
echo $CONTAINER_NAME
```

### Option B: Systemd Service

```bash
# SSH into the remote server
ssh user@<DB_HOST>

# Check if PostgreSQL is running as a service
sudo systemctl status postgresql
```

### Option C: Cloud/Managed Service

If this is AWS RDS, Azure Database, DigitalOcean, or similar, skip to the managed service section below.

---

## Step 2: Find the PostgreSQL Configuration File

### For Docker:

```bash
# SSH into the remote server
ssh user@<DB_HOST>

# Find the config file location
docker exec -it <CONTAINER_NAME> psql -U postgres -c "SHOW config_file;"

# Example output: /var/lib/postgresql/data/postgresql.conf
```

### For Systemd:

```bash
# SSH into the remote server
ssh user@<DB_HOST>

# Find config file
sudo -u postgres psql -c "SHOW config_file;"

# Example output: /etc/postgresql/17/main/postgresql.conf
```

---

## Step 3: Enable Logical Replication

### Method A: Docker Container with Volume Mount

If `postgresql.conf` is in a Docker volume:

```bash
# SSH into the remote server
ssh user@<DB_HOST>

# Edit the config file directly in the container
docker exec -it <CONTAINER_NAME> sh -c "
  cat >> /var/lib/postgresql/data/postgresql.conf << EOF

# PowerSync Logical Replication Settings
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10
EOF
"

# Or edit it on the host if volume is mounted
# Find the volume location
docker inspect <CONTAINER_NAME> | grep -A 10 Mounts

# Then edit directly:
# sudo nano /var/lib/docker/volumes/<VOLUME_NAME>/_data/postgresql.conf
```

### Method B: Docker Compose with Environment Variables

If using Docker Compose, you can pass these as command arguments:

```yaml
services:
  postgres:
    image: postgres:17-alpine
    command:
      - "postgres"
      - "-c"
      - "wal_level=logical"
      - "-c"
      - "max_replication_slots=10"
      - "-c"
      - "max_wal_senders=10"
    # ... rest of config
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Method C: Systemd Service

```bash
# SSH into the remote server
ssh user@<DB_HOST>

# Edit postgresql.conf
sudo nano /etc/postgresql/17/main/postgresql.conf

# Add or modify these lines:
wal_level = logical
max_replication_slots = 10
max_wal_senders = 10

# Save and exit (Ctrl+X, Y, Enter)
```

### Method D: Managed Database Service

#### AWS RDS:
1. Go to RDS Console → Parameter Groups
2. Create/edit parameter group
3. Set: `rds.logical_replication = 1`
4. Modify DB instance to use this parameter group
5. Reboot the instance

#### Azure Database for PostgreSQL:
1. Go to Azure Portal → Your PostgreSQL Server
2. Settings → Server parameters
3. Set: `wal_level = logical`
4. Set: `max_replication_slots = 10`
5. Set: `max_wal_senders = 10`
6. Save and restart

#### DigitalOcean Managed Database:
1. Go to Database Dashboard
2. Settings → Configuration
3. Enable "Logical Replication"
4. Apply changes

#### Supabase:
1. Go to Settings → Database
2. Enable "Logical Replication"
3. Or contact support if not available

---

## Step 4: Restart PostgreSQL

### Docker Container:

```bash
# SSH into the remote server
ssh user@<DB_HOST>

# Restart the container
docker restart <CONTAINER_NAME>

# Or if using docker-compose
docker-compose restart postgres
```

### Systemd Service:

```bash
# SSH into the remote server
ssh user@<DB_HOST>

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check status
sudo systemctl status postgresql
```

### Managed Service:

Restart through your provider's dashboard or CLI.

---

## Step 5: Verify the Configuration

From your local machine:

```bash
# Add psql to PATH if not already done
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"

# Run the verification script
cd ~/ws/fajr-medflow-emr
./scripts/test-postgres-connection.sh
```

You should see:
```
✓ WAL level is 'logical' - ready for PowerSync!
```

---

## Step 6: Complete PowerSync Setup

Once logical replication is enabled, run the full configuration script:

```bash
export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"
./scripts/configure-postgresql-for-powersync.sh
```

This will:
- ✅ Verify WAL level is `logical`
- ✅ Create/verify `powersync` user with REPLICATION privilege
- ✅ Grant SELECT permissions
- ✅ Create replication slot `powersync_slot`
- ✅ Create publication `powersync_publication`
- ✅ Install custom functions for sync rules

---

## Troubleshooting

### "Permission denied" errors

You may need superuser access. Try:
```bash
# SSH into the remote server
ssh user@<DB_HOST>

# Switch to postgres user
sudo su - postgres

# Or use sudo with commands
sudo -u postgres psql -c "ALTER SYSTEM SET wal_level = 'logical';"
```

### Container keeps resetting configuration

Make sure the config file is in a persistent volume:
```bash
docker volume ls
docker inspect <CONTAINER_NAME>
```

If the volume isn't persistent, you need to:
1. Create a proper volume or bind mount
2. Or pass config via command line arguments (see Method B above)

### "Cannot create replication slot" error

This means WAL level is still not `logical`. Verify:
```bash
psql "$DATABASE_URL" -c "SHOW wal_level;"
```

If it shows `replica`, PostgreSQL didn't restart properly or the config wasn't saved.

### Connection timeouts

Make sure port 27017 is open:
```bash
# Test from local machine
nc -zv <DB_HOST> 27017

# Or with telnet
telnet <DB_HOST> 27017
```

### "Too many replication slots" error

Clean up old/inactive slots:
```bash
psql "$DATABASE_URL" -c "
  SELECT slot_name, active, restart_lsn 
  FROM pg_replication_slots 
  WHERE NOT active;
"

# Drop inactive slots (carefully!)
psql "$DATABASE_URL" -c "
  SELECT pg_drop_replication_slot('old_slot_name');
"
```

---

## Quick Reference Commands

### Check WAL Level:
```bash
psql "$DATABASE_URL" -c "SHOW wal_level;"
```

### Check Replication Slots:
```bash
psql "$DATABASE_URL" -c "SELECT * FROM pg_replication_slots;"
```

### Check Publications:
```bash
psql "$DATABASE_URL" -c "SELECT * FROM pg_publication;"
```

### Check PowerSync User:
```bash
psql "$DATABASE_URL" -c "
  SELECT usename, userepl 
  FROM pg_user 
  WHERE usename = 'powersync';
"
```

### Manual Setup (if script fails):
```bash
# Create replication slot
psql "$DATABASE_URL" -c "
  SELECT pg_create_logical_replication_slot('powersync_slot', 'pgoutput');
"

# Create publication
psql "$DATABASE_URL" -c "
  CREATE PUBLICATION powersync_publication FOR ALL TABLES;
"

# Grant privileges
psql "$DATABASE_URL" -c "
  ALTER USER powersync WITH REPLICATION;
  GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync;
"
```

---

## Next Steps

Once logical replication is enabled and the setup script completes successfully:

1. **Restart PowerSync Service:**
   ```bash
   docker compose -f docker-compose.powersync.yml restart powersync
   ```

2. **Check PowerSync Logs:**
   ```bash
   docker compose -f docker-compose.powersync.yml logs -f powersync
   ```

3. **Continue with Phase 0.3 Verification:**
   - Follow `apps/mobile/docs/sql-transition/PHASE_0_SETUP.md`
   - Test sync endpoints
   - Verify real-time change detection

---

## Support

If you encounter issues:

1. Check PowerSync logs for errors
2. Verify PostgreSQL logs: `docker logs <CONTAINER_NAME>`
3. Ensure firewall rules allow connections
4. Confirm database user has proper permissions
5. Check PowerSync documentation: https://docs.powersync.com

---

## Security Notes

⚠️ **Important:**
- Logical replication increases WAL size (disk usage)
- Monitor replication slot lag to prevent disk filling
- Regularly check inactive replication slots
- Ensure proper authentication for replication users
- Use SSL/TLS for production connections
- Rotate credentials periodically

---

## Reverting Changes

If you need to revert to `replica` mode:

1. Change `wal_level = replica` in postgresql.conf
2. Restart PostgreSQL
3. Drop replication slots and publications:
   ```bash
   psql "$DATABASE_URL" -c "DROP PUBLICATION IF EXISTS powersync_publication;"
   psql "$DATABASE_URL" -c "SELECT pg_drop_replication_slot('powersync_slot');"
   ```

Note: Reverting will break PowerSync synchronization.