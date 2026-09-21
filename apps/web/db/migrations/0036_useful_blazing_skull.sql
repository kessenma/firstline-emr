ALTER TABLE "backups" ADD COLUMN "includes_auth" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "auth_dump_path" text;--> statement-breakpoint
ALTER TABLE "backups" ADD COLUMN "auth_meta" json;