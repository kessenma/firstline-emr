-- Create the telegram_messages table (normalized, one row per message)
-- Replaces reliance on the JSON array in telegram_threads.messages for mobile sync
-- The JSON column is kept populated via dual-write for backward compat with web UI

CREATE TABLE IF NOT EXISTS telegram_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES telegram_threads(id) ON DELETE CASCADE,
  text TEXT NOT NULL DEFAULT '',
  sender TEXT NOT NULL,
  sender_id TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  type message_type NOT NULL DEFAULT 'text',
  media_url TEXT DEFAULT '',
  reply_to TEXT,
  forwarded_from TEXT DEFAULT '',
  deleted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  translated_text TEXT,
  is_translated BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS telegram_messages_thread_id_idx ON telegram_messages(thread_id);
CREATE INDEX IF NOT EXISTS telegram_messages_sender_id_idx ON telegram_messages(sender_id);
CREATE INDEX IF NOT EXISTS telegram_messages_timestamp_idx ON telegram_messages(timestamp);
CREATE INDEX IF NOT EXISTS telegram_messages_thread_timestamp_idx ON telegram_messages(thread_id, timestamp);

-- Ensure uuid-ossp extension exists (for uuid_generate_v5 on non-UUID message IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Backfill: copy existing JSON messages into the normalized table
-- Some message IDs may not be valid UUIDs (e.g. "msg_17704..."), so we generate
-- deterministic UUIDs from those strings using uuid_generate_v5.
INSERT INTO telegram_messages (id, thread_id, text, sender, sender_id, timestamp, type, media_url, reply_to, forwarded_from, deleted_at, updated_at, translated_text, is_translated, created_at)
SELECT
  CASE
    WHEN (msg->>'id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN (msg->>'id')::UUID
    ELSE uuid_generate_v5(uuid_ns_url(), msg->>'id')
  END,
  t.id,
  COALESCE(msg->>'text', ''),
  COALESCE(msg->>'sender', 'unknown'),
  msg->>'senderId',
  COALESCE((msg->>'timestamp')::TIMESTAMPTZ, NOW()),
  COALESCE((msg->>'type')::message_type, 'text'),
  COALESCE(msg->>'mediaUrl', ''),
  msg->>'replyTo',
  COALESCE(msg->>'forwardedFrom', ''),
  (msg->>'deletedAt')::TIMESTAMPTZ,
  (msg->>'updatedAt')::TIMESTAMPTZ,
  msg->>'translatedText',
  COALESCE((msg->>'isTranslated')::BOOLEAN, FALSE),
  COALESCE((msg->>'timestamp')::TIMESTAMPTZ, NOW())
FROM telegram_threads t,
LATERAL jsonb_array_elements(COALESCE(t.messages::jsonb, '[]'::jsonb)) AS msg
WHERE t.messages IS NOT NULL AND t.messages::text != '[]'
ON CONFLICT (id) DO NOTHING;

-- Add telegram_messages to PowerSync replication publication
-- NOTE: If publication is FOR ALL TABLES, this will error harmlessly. Safe to skip.
-- ALTER PUBLICATION powersync ADD TABLE telegram_messages;
