ALTER TYPE "public"."internal_message_type" ADD VALUE 'patient-card';--> statement-breakpoint
CREATE TABLE "internal_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"text" text DEFAULT '' NOT NULL,
	"sender" text NOT NULL,
	"sender_id" uuid NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"type" "internal_message_type" DEFAULT 'text' NOT NULL,
	"media_url" text DEFAULT '',
	"reply_to" text,
	"forwarded_from" text DEFAULT '',
	"deleted_at" timestamp,
	"updated_at" timestamp,
	"read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_thread_id_internal_message_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."internal_message_threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internal_messages" ADD CONSTRAINT "internal_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "internal_messages_thread_id_idx" ON "internal_messages" USING btree ("thread_id");--> statement-breakpoint
CREATE INDEX "internal_messages_sender_id_idx" ON "internal_messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "internal_messages_timestamp_idx" ON "internal_messages" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "internal_messages_thread_timestamp_idx" ON "internal_messages" USING btree ("thread_id","timestamp");