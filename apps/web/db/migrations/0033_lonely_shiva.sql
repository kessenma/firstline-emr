CREATE TYPE "public"."backup_mode" AS ENUM('clinical', 'full_migration');--> statement-breakpoint
CREATE TYPE "public"."backup_status" AS ENUM('uploading', 'processing', 'available', 'restoring', 'failed', 'expired');--> statement-breakpoint
CREATE TYPE "public"."conflict_strategy" AS ENUM('skip', 'overwrite', 'newer_wins');--> statement-breakpoint
CREATE TYPE "public"."restore_status" AS ENUM('pending', 'in_progress', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "backup_restores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"backup_id" uuid NOT NULL,
	"restored_by" uuid NOT NULL,
	"status" "restore_status" DEFAULT 'pending' NOT NULL,
	"conflict_strategy" "conflict_strategy" NOT NULL,
	"tables_restored" json,
	"total_inserted" integer DEFAULT 0,
	"total_updated" integer DEFAULT 0,
	"total_skipped" integer DEFAULT 0,
	"total_failed" integer DEFAULT 0,
	"error_log" json,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by" uuid NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_path" text NOT NULL,
	"file_size" integer NOT NULL,
	"status" "backup_status" DEFAULT 'uploading' NOT NULL,
	"backup_mode" "backup_mode" DEFAULT 'clinical' NOT NULL,
	"tables" json NOT NULL,
	"total_records" integer NOT NULL,
	"checksum" varchar(64),
	"device_info" json,
	"error_message" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "backup_restores" ADD CONSTRAINT "backup_restores_backup_id_backups_id_fk" FOREIGN KEY ("backup_id") REFERENCES "public"."backups"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_restores" ADD CONSTRAINT "backup_restores_restored_by_users_id_fk" FOREIGN KEY ("restored_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backups" ADD CONSTRAINT "backups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "br_backup_id_idx" ON "backup_restores" USING btree ("backup_id");--> statement-breakpoint
CREATE INDEX "br_restored_by_idx" ON "backup_restores" USING btree ("restored_by");--> statement-breakpoint
CREATE INDEX "br_status_idx" ON "backup_restores" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bk_created_by_idx" ON "backups" USING btree ("created_by");--> statement-breakpoint
CREATE INDEX "bk_status_idx" ON "backups" USING btree ("status");--> statement-breakpoint
CREATE INDEX "bk_created_at_idx" ON "backups" USING btree ("created_at");