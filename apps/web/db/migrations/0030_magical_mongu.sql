ALTER TABLE "admin_notifications" ADD COLUMN "action_url" text;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD COLUMN "links" json;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD COLUMN "images" json;