-- Migration: Add PowerSync Admin Views
-- Date: 2025-12-30
-- Purpose: Create views to support PowerSync sync rules for admin data without JOINs

-- VIEW: powersync_views.admin_users
-- Helper view to get admin user IDs without JOIN in parameters
-- This is used in bucket parameters which don't support JOINs
CREATE OR REPLACE VIEW powersync_views.admin_users AS
SELECT user_id as admin_id
FROM admins;

-- VIEW: powersync_views.admin_users_details
-- Helper view to get admin user details with JOIN (for data queries)
-- This can be used in data queries which do support JOINs via views
CREATE OR REPLACE VIEW powersync_views.admin_users_details AS
SELECT
  a.id,
  a.user_id,
  a.created_at,
  u.first_name,
  u.last_name,
  u.email
FROM admins a
INNER JOIN users u ON a.user_id = u.id;

-- Add comments for documentation
COMMENT ON VIEW powersync_views.admin_users IS 'Simple view of admin user IDs for bucket parameters (no JOINs allowed there)';
COMMENT ON VIEW powersync_views.admin_users_details IS 'Detailed view of admin users with user information for data queries';
