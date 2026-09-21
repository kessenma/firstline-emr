-- Migration: Add device token columns to user_settings table for push notifications
-- Date: 2026-01-09

-- Add iOS device token column
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS ios_device_token TEXT;

-- Add Android device token column
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS android_device_token TEXT;

-- Add push notifications enabled flag
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS push_notifications_enabled BOOLEAN DEFAULT true;

-- Add comment for documentation
COMMENT ON COLUMN user_settings.ios_device_token IS 'FCM/APNS device token for iOS push notifications';
COMMENT ON COLUMN user_settings.android_device_token IS 'FCM device token for Android push notifications';
COMMENT ON COLUMN user_settings.push_notifications_enabled IS 'Whether user has enabled push notifications';
