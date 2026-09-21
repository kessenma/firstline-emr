-- Migration: Fix authorized=false to authorized=null for pending users
-- Description: Updates users who have authorized set to false (instead of null)
--              to have authorized set to null, which is the correct pending state.
--              This ensures consistency with the new signup flow where pending
--              users have authorized=null instead of authorized=false.
-- Date: 2024-12-24

-- Update users with authorized=false to authorized=null
-- Only update users who:
-- 1. Have authorized set to false (not approved/denied yet)
-- 2. Don't have an approval_date or denial_date (confirms they're pending)
UPDATE users
SET
    authorized = NULL,
    updated_at = NOW()
WHERE
    authorized = false
    AND approval_date IS NULL
    AND denial_date IS NULL;

-- Log the results
DO $$
DECLARE
    updated_count INTEGER;
BEGIN
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RAISE NOTICE 'Updated % users from authorized=false to authorized=null', updated_count;
END $$;
