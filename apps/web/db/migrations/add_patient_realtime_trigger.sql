-- Migration: Add real-time notification trigger for patients table
-- This enables live updates for the web app when patients are added/updated/deleted

-- Create a function that sends notifications when patients are changed
CREATE OR REPLACE FUNCTION notify_patient_change()
RETURNS TRIGGER AS $$
DECLARE
  payload json;
BEGIN
  -- Build the notification payload with patient info
  payload = json_build_object(
    'operation', TG_OP,
    'patient_id', COALESCE(NEW.id, OLD.id),
    'first_name', COALESCE(NEW.first_name, OLD.first_name),
    'last_name', COALESCE(NEW.last_name, OLD.last_name),
    'status', COALESCE(NEW.status, OLD.status),
    'priority', COALESCE(NEW.priority, OLD.priority),
    'specialties', COALESCE(NEW.specialties, OLD.specialties),
    'coordinator_id', COALESCE(NEW.coordinator_id, OLD.coordinator_id),
    'updated_at', COALESCE(NEW.updated_at, OLD.updated_at)
  );

  -- Send notification on the patients_changes channel
  PERFORM pg_notify('patients_changes', payload::text);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT, UPDATE, DELETE operations
DROP TRIGGER IF EXISTS patients_notify_trigger ON patients;

CREATE TRIGGER patients_notify_trigger
  AFTER INSERT OR UPDATE OR DELETE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION notify_patient_change();

COMMENT ON FUNCTION notify_patient_change() IS
  'Sends PostgreSQL notifications when patients table changes for real-time dashboard updates';

COMMENT ON TRIGGER patients_notify_trigger ON patients IS
  'Triggers real-time notifications for web clients when patients are modified';
