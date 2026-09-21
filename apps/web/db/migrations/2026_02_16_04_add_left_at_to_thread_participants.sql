-- Add left_at column to internal_message_thread_participants
-- null = active participant, non-null = user left the thread
ALTER TABLE internal_message_thread_participants
ADD COLUMN left_at TIMESTAMP;

-- Partial index for efficient filtering of active participants
CREATE INDEX idx_imtp_left_at ON internal_message_thread_participants (left_at)
WHERE left_at IS NULL;
