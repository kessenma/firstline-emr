ALTER TABLE "patient_photos" RENAME TO "patient_media";--> statement-breakpoint
ALTER TABLE "patient_media" DROP CONSTRAINT "patient_photos_patient_id_patients_id_fk";
--> statement-breakpoint
DROP INDEX "patient_photos_patient_id_idx";--> statement-breakpoint
ALTER TABLE "patient_media" ADD COLUMN "content_type" varchar(100);--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "voice_sensitivity" varchar(20) DEFAULT 'adaptive';--> statement-breakpoint
ALTER TABLE "patient_media" ADD CONSTRAINT "patient_media_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "patient_media_patient_id_idx" ON "patient_media" USING btree ("patient_id");