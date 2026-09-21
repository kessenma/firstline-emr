-- Migration: Create internal_messages table for normalized message storage
-- Date: 2026-02-08
-- Description: Extracts messages from the JSON array in internal_message_threads.messages
--              into a dedicated table. Each message becomes its own row, enabling reliable
--              PowerSync sync (individual INSERTs instead of rewriting the entire JSON blob).

-- Step 1: Add 'patient-card' to internal_message_type enum if not already present
ALTER TYPE "public"."internal_message_type" ADD VALUE IF NOT EXISTS 'patient-card';

-- Step 2: Create the internal_messages table
CREATE TABLE IF NOT EXISTS "public"."internal_messages" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "thread_id" uuid NOT NULL,
    "text" text DEFAULT '' NOT NULL,
    "sender" text NOT NULL,
    "sender_id" uuid NOT NULL,
    "timestamp" timestamp DEFAULT now() NOT NULL,
    "type" "internal_message_type" DEFAULT 'text' NOT NULL,
    "media_url" text DEFAULT '',
    "reply_to" text,
    "forwarded_from" text DEFAULT '',
    "deleted_at" timestamp,
    "updated_at" timestamp,
    "read" boolean DEFAULT false NOT NULL,
    "read_at" timestamp,
    "created_at" timestamp DEFAULT now() NOT NULL
);

-- Step 3: Add foreign key constraints
ALTER TABLE "public"."internal_messages"
ADD CONSTRAINT "internal_messages_thread_id_fk"
FOREIGN KEY ("thread_id") REFERENCES "public"."internal_message_threads"("id") ON DELETE CASCADE;

ALTER TABLE "public"."internal_messages"
ADD CONSTRAINT "internal_messages_sender_id_fk"
FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id");

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS "internal_messages_thread_id_idx"
    ON "public"."internal_messages" ("thread_id");
CREATE INDEX IF NOT EXISTS "internal_messages_sender_id_idx"
    ON "public"."internal_messages" ("sender_id");
CREATE INDEX IF NOT EXISTS "internal_messages_timestamp_idx"
    ON "public"."internal_messages" ("timestamp");
CREATE INDEX IF NOT EXISTS "internal_messages_thread_timestamp_idx"
    ON "public"."internal_messages" ("thread_id", "timestamp");

-- Step 5: Data migration - Extract messages from JSON column into the new table
-- Uses json_array_elements since the column is json type (not jsonb).
-- Only migrates messages with a valid senderId that exists in the users table.
-- Messages with invalid/missing senderId are skipped.
INSERT INTO "public"."internal_messages" (
    id, thread_id, text, sender, sender_id, timestamp, type,
    media_url, reply_to, forwarded_from,
    deleted_at, updated_at, read, read_at, created_at
)
SELECT
    COALESCE(
        NULLIF(msg->>'id', '')::uuid,
        gen_random_uuid()
    ) AS id,
    t.id AS thread_id,
    COALESCE(msg->>'text', '') AS text,
    COALESCE(msg->>'sender', '') AS sender,
    (msg->>'senderId')::uuid AS sender_id,
    COALESCE(
        (msg->>'timestamp')::timestamp,
        now()
    ) AS timestamp,
    COALESCE(
        NULLIF(msg->>'type', '')::internal_message_type,
        'text'
    ) AS type,
    COALESCE(msg->>'mediaUrl', '') AS media_url,
    msg->>'replyTo' AS reply_to,
    COALESCE(msg->>'forwardedFrom', '') AS forwarded_from,
    (msg->>'deletedAt')::timestamp AS deleted_at,
    (msg->>'updatedAt')::timestamp AS updated_at,
    COALESCE((msg->>'read')::boolean, false) AS read,
    (msg->>'readAt')::timestamp AS read_at,
    COALESCE(
        (msg->>'timestamp')::timestamp,
        now()
    ) AS created_at
FROM
    "public"."internal_message_threads" t,
    json_array_elements(t.messages) AS msg
WHERE
    t.messages IS NOT NULL
    AND t.messages::text != '[]'
    AND t.messages::text != 'null'
    AND msg->>'senderId' IS NOT NULL
    AND msg->>'senderId' != ''
    AND EXISTS (SELECT 1 FROM "public"."users" WHERE id = (msg->>'senderId')::uuid);

COMMENT ON TABLE "public"."internal_messages" IS 'Individual messages in internal staff-to-staff threads. Normalized from the JSON messages column in internal_message_threads for reliable PowerSync sync.';
