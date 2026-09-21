# Real-Time Telegram Messaging Setup

This guide explains how to enable live messaging for the telegram-messages component using PostgreSQL logical replication with LISTEN/NOTIFY.

## Overview

The real-time messaging system uses:
- **PostgreSQL Logical Replication** (already enabled for PowerSync)
- **PostgreSQL LISTEN/NOTIFY** for instant notifications
- **Server-Sent Events (SSE)** to stream updates to the browser
- **Automatic fallback** to HTTP polling if SSE fails

## Architecture

```
PostgreSQL Table Change
  ↓
Database Trigger (notify_telegram_thread_change)
  ↓
LISTEN/NOTIFY Channel (telegram_threads_changes)
  ↓
SSE Endpoint (/api/telegram-thread/realtime)
  ↓
React Hook (useRealtimeMessages)
  ↓
UI Updates Automatically
```

## Setup Instructions

### 1. Apply Database Migration

Run the SQL migration to create the trigger:

```bash
cd apps/web
psql $DATABASE_URL -f db/migrations/add_telegram_realtime_trigger.sql
```

Or manually execute:

```sql
-- This creates a function and trigger that sends notifications
-- when the telegram_threads table is modified
\i db/migrations/add_telegram_realtime_trigger.sql
```

### 2. Verify the Trigger

Check that the trigger was created successfully:

```sql
-- Check trigger
SELECT tgname, tgtype, tgenabled 
FROM pg_trigger 
WHERE tgname = 'telegram_threads_notify_trigger';

-- Check function
SELECT proname, prosrc 
FROM pg_proc 
WHERE proname = 'notify_telegram_thread_change';
```

### 3. Test Real-Time Updates

1. Open your app and navigate to a patient's telegram messages
2. In another tab/window, insert a test message directly in the database:

```sql
-- Update a thread to test notifications
UPDATE telegram_threads 
SET updated_at = NOW(), 
    unread_count = unread_count + 1 
WHERE chat_id = 'YOUR_CHAT_ID';
```

3. The UI should update automatically without refresh!

### 4. Monitor Notifications (Optional)

You can listen to notifications directly in PostgreSQL:

```sql
-- Connect to database
psql $DATABASE_URL

-- Listen to the channel
LISTEN telegram_threads_changes;

-- You'll now see notifications as they happen
-- Press Ctrl+C to stop
```

## How It Works

### Database Layer

When a row in `telegram_threads` is INSERT/UPDATE/DELETE:

1. **Trigger fires**: `telegram_threads_notify_trigger`
2. **Function executes**: `notify_telegram_thread_change()`
3. **Payload created**: JSON with operation, chat_id, thread_id, etc.
4. **Notification sent**: `pg_notify('telegram_threads_changes', payload)`

### API Layer

The SSE endpoint (`/api/telegram-thread/realtime/route.ts`):

1. Authenticates the user
2. Creates a dedicated PostgreSQL connection
3. Executes `LISTEN telegram_threads_changes`
4. Streams notifications to the client as SSE events
5. Filters by chatId/patientId if specified

### Frontend Layer

The React hook (`useRealtimeMessages.ts`):

1. Creates an EventSource connection to the SSE endpoint
2. Listens for `thread-update` events
3. Triggers `loadMessages()` when updates are received
4. Handles reconnection with exponential backoff
5. Falls back to HTTP polling if SSE fails

## Features

### ✅ Automatic Reconnection
- Reconnects automatically if connection drops
- Exponential backoff (1s, 2s, 4s, 8s, 16s, 30s max)
- Maximum 5 reconnection attempts

### ✅ Page Visibility Handling
- Reconnects when user returns to the tab
- Saves resources when page is hidden

### ✅ Fallback to Polling
- If SSE fails, automatically falls back to HTTP polling
- Users always get updates, even if real-time fails

### ✅ Filtering
- Can filter by `chatId` for specific conversations
- Can filter by `patientId` for patient-specific updates

### ✅ Heartbeat
- Keeps connection alive with 30-second heartbeats
- Prevents proxy/firewall timeouts

## API Endpoints

### GET /api/telegram-thread/realtime

Server-Sent Events endpoint for real-time updates.

**Query Parameters:**
- `chatId` (optional): Filter updates for specific chat
- `patientId` (optional): Filter updates for specific patient

**Events:**
- `connected`: Initial connection established
- `thread-update`: Thread was modified
- `heartbeat`: Keep-alive ping every 30s
- `error`: Error occurred

**Example:**

```typescript
const eventSource = new EventSource(
  '/api/telegram-thread/realtime?chatId=123456789'
);

eventSource.addEventListener('thread-update', (event) => {
  const data = JSON.parse(event.data);
  console.log('Update:', data);
  // { operation: 'UPDATE', chat_id: '...', thread_id: '...', ... }
});
```

## Usage in Components

The feature is automatically enabled in `TelegramMessagesViewModel`:

```typescript
const {
  messages,
  isConnected,    // Real-time connection status
  reconnect,      // Manual reconnect function
  useRealtime,    // true = SSE, false = polling
  setUseRealtime, // Toggle mode
  // ... other properties
} = useTelegramMessagesViewModel(patientId, chatId);
```

### Check Connection Status

```typescript
{isConnected ? (
  <Badge>🟢 Live</Badge>
) : (
  <Badge>🟡 Polling</Badge>
)}
```

### Manual Reconnect

```typescript
<Button onClick={reconnect}>
  Reconnect
</Button>
```

### Toggle Real-Time Mode

```typescript
<Switch
  checked={useRealtime}
  onCheckedChange={setUseRealtime}
>
  Use Real-Time Updates
</Switch>
```

## Debugging

### Check SSE Connection

Open browser DevTools → Network tab → Filter by "realtime":
- Should show a persistent connection
- Type: `eventsource`
- Status: `200` (pending)

### Check Console Logs

Real-time logs are prefixed with `[realtime]`:

```
[realtime] New SSE connection
[realtime] PostgreSQL client connected
[realtime] Listening to telegram_threads_changes
[realtime] Sending update: { operation: 'UPDATE', ... }
```

### Check Database Notifications

```sql
-- In one terminal
psql $DATABASE_URL
LISTEN telegram_threads_changes;

-- In another terminal
psql $DATABASE_URL
UPDATE telegram_threads SET updated_at = NOW() WHERE chat_id = 'test';

-- First terminal should show:
-- Asynchronous notification "telegram_threads_changes" received...
```

### Common Issues

**Issue**: "EventSource is not defined"
- **Solution**: SSE only works in the browser, not in Node.js

**Issue**: Connection drops frequently
- **Solution**: Check if proxy/nginx is buffering. Set `X-Accel-Buffering: no`

**Issue**: Updates not received
- **Solution**: Check trigger is enabled: `SELECT tgenabled FROM pg_trigger WHERE tgname = 'telegram_threads_notify_trigger'`

**Issue**: High database connections
- **Solution**: Each SSE connection uses 1 PostgreSQL connection. Monitor with:
  ```sql
  SELECT count(*) FROM pg_stat_activity 
  WHERE application_name = 'your_app';
  ```

## Performance Considerations

### Database Connections
- Each SSE client = 1 PostgreSQL connection
- Plan for max concurrent users
- Recommended: Use connection pooler (PgBouncer) in transaction mode

### Scaling
For high-traffic deployments:

1. **Use Redis Pub/Sub** instead of direct PostgreSQL LISTEN
2. **Add a message queue** (RabbitMQ, NATS) for reliable delivery
3. **Implement WebSocket** for bidirectional communication
4. **Use PowerSync Web SDK** to leverage your existing PowerSync setup

### Memory Usage
- SSE connections are lightweight (~10KB per connection)
- Heartbeats prevent memory leaks
- Automatic cleanup on disconnect

## Production Checklist

- [ ] Database trigger created and enabled
- [ ] LISTEN/NOTIFY tested manually
- [ ] SSE endpoint authenticated properly
- [ ] Connection limits configured
- [ ] Monitoring set up (track active SSE connections)
- [ ] Fallback to polling works
- [ ] Reconnection logic tested
- [ ] Works behind proxy/load balancer
- [ ] Page visibility handling tested
- [ ] Error logging configured

## Alternative: PowerSync Web SDK

Since you already have PowerSync running, you could also use the PowerSync Web SDK for web clients:

```bash
npm install @powersync/web
```

This would give you:
- ✅ Same real-time infrastructure as mobile
- ✅ Offline-first capabilities
- ✅ Optimistic updates
- ✅ Conflict resolution
- ✅ Unified sync rules

See: https://docs.powersync.com/usage/installation/web-sdk

## Support

- **PostgreSQL LISTEN/NOTIFY Docs**: https://www.postgresql.org/docs/current/sql-notify.html
- **SSE Spec**: https://html.spec.whatwg.org/multipage/server-sent-events.html
- **PowerSync Docs**: https://docs.powersync.com

## License

Part of Fajr Mission EMR system.