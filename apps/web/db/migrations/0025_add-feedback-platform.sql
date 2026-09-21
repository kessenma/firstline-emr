CREATE TYPE "public"."feedback_platform" AS ENUM('mobile', 'web', 'both');--> statement-breakpoint
CREATE TYPE "public"."mobile_platform" AS ENUM('android', 'ios');--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "platform" "feedback_platform";--> statement-breakpoint
UPDATE "user_feedback" SET "platform" = 'web' WHERE "platform" IS NULL;--> statement-breakpoint
ALTER TABLE "user_feedback" ALTER COLUMN "platform" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "user_feedback" ADD COLUMN "mobile_platform" "mobile_platform";