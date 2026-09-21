-- Migration: Remove pagination fields from user_settings
-- Date: 2025-12-22
-- Description: Remove use_infinite_scroll and save_last_page columns as infinite scroll is now the default behavior

-- Remove the pagination-related columns
ALTER TABLE user_settings DROP COLUMN IF EXISTS use_infinite_scroll;
ALTER TABLE user_settings DROP COLUMN IF EXISTS save_last_page;

-- Add comment to track this migration
COMMENT ON TABLE user_settings IS 'User settings table - pagination fields removed in favor of default infinite scroll (2025-12-22)';
