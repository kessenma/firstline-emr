CREATE TYPE "public"."backup_source" AS ENUM('mobile', 'server');--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "backup_source" "backup_source" DEFAULT 'mobile' NOT NULL;