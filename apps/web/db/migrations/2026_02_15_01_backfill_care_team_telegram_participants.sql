-- Backfill: Add existing care team members to telegram thread participants
-- This ensures care team members who joined BEFORE the auto-sync feature
-- get access to their patient's telegram threads.

-- Step 1: Insert missing rows into telegram_thread_participants junction table
-- (drives PowerSync sync via user_telegram_messaging bucket)
INSERT INTO telegram_thread_participants (id, thread_id, user_id, joined_at)
SELECT gen_random_uuid(), tt.id, pct.user_id, NOW()
FROM patient_care_team pct
JOIN telegram_threads tt ON tt.patient_id = pct.patient_id
LEFT JOIN telegram_thread_participants ttp
  ON ttp.thread_id = tt.id AND ttp.user_id = pct.user_id
WHERE pct.removed_at IS NULL
  AND ttp.id IS NULL;

-- Step 2: Update telegram_threads.participants[] arrays to include care team members
-- (drives web queries via ANY(participants))
-- Note: user_id is UUID but participants is text[], so cast to text
WITH care_team_users AS (
  SELECT tt.id AS thread_id, pct.user_id::text AS user_id
  FROM patient_care_team pct
  JOIN telegram_threads tt ON tt.patient_id = pct.patient_id
  WHERE pct.removed_at IS NULL
),
existing_participants AS (
  SELECT
    tt.id AS thread_id,
    unnest(COALESCE(tt.participants, ARRAY[]::text[])) AS participant
  FROM telegram_threads tt
  WHERE EXISTS (SELECT 1 FROM care_team_users ctu WHERE ctu.thread_id = tt.id)
),
all_participants AS (
  SELECT thread_id, participant AS val FROM existing_participants
  UNION
  SELECT thread_id, user_id AS val FROM care_team_users
),
final_participants AS (
  SELECT thread_id, array_agg(DISTINCT val) AS participants
  FROM all_participants
  GROUP BY thread_id
)
UPDATE telegram_threads tt
SET participants = fp.participants, updated_at = NOW()
FROM final_participants fp
WHERE tt.id = fp.thread_id;
