ALTER TABLE "user_settings"
ADD COLUMN IF NOT EXISTS "translation_model_wifi_only" boolean DEFAULT true;
