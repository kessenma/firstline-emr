-- Migrate notes and note_edits timestamp columns from `timestamp` to `timestamptz`
-- Existing values are treated as UTC so they are reinterpreted correctly.

ALTER TABLE notes
  ALTER COLUMN date          TYPE timestamptz USING date          AT TIME ZONE 'UTC',
  ALTER COLUMN created_at    TYPE timestamptz USING created_at    AT TIME ZONE 'UTC',
  ALTER COLUMN updated_at    TYPE timestamptz USING updated_at    AT TIME ZONE 'UTC';

ALTER TABLE note_edits
  ALTER COLUMN created_at    TYPE timestamptz USING created_at    AT TIME ZONE 'UTC';
