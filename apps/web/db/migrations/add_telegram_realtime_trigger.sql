-- Migration: Add real-time notification trigger for telegram_threads table
-- This enables live updates for the web app when telegram messages are added/updated

-- Create a function that sends notifications when telegram_threads are updated
CREATE OR REPLACE FUNCTION notify_telegram_thread_change()
RETURNS TRIGGER AS $$
DECLARE
  payload json;
BEGIN
  -- Build the notification payload with thread info
  payload = json_build_object(
    'operation', TG_OP,
    'chat_id', COALESCE(NEW.chat_id, OLD.chat_id),
    'thread_id', COALESCE(NEW.id, OLD.id),
    'patient_id', COALESCE(NEW.patient_id, OLD.patient_id),
    'updated_at', COALESCE(NEW.updated_at, OLD.updated_at),
    'unread_count', COALESCE(NEW.unread_count, OLD.unread_count),
    'message_count', CASE
      WHEN NEW.messages IS NOT NULL THEN jsonb_array_length(NEW.messages::jsonb)
      ELSE 0
    END
  );

  -- Send notification on the telegram_threads_changes channel
  PERFORM pg_notify('telegram_threads_changes', payload::text);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT, UPDATE, DELETE operations
DROP TRIGGER IF EXISTS telegram_threads_notify_trigger ON telegram_threads;

CREATE TRIGGER telegram_threads_notify_trigger
  AFTER INSERT OR UPDATE OR DELETE ON telegram_threads
  FOR EACH ROW
  EXECUTE FUNCTION notify_telegram_thread_change();

-- Create an index on updated_at for better performance with real-time queries
CREATE INDEX IF NOT EXISTS telegram_threads_updated_at_idx
  ON telegram_threads(updated_at DESC);

-- Grant necessary permissions (adjust based on your user setup)
-- GRANT EXECUTE ON FUNCTION notify_telegram_thread_change() TO your_app_user;

COMMENT ON FUNCTION notify_telegram_thread_change() IS
  'Sends PostgreSQL notifications when telegram_threads table changes for real-time updates';

COMMENT ON TRIGGER telegram_threads_notify_trigger ON telegram_threads IS
  'Triggers real-time notifications for web clients when telegram threads are modified';
