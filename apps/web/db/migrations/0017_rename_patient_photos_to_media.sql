-- Rename patient_photos to patient_media and add content_type column
ALTER TABLE "patient_photos" RENAME TO "patient_media";--> statement-breakpoint
ALTER INDEX "patient_photos_patient_id_idx" RENAME TO "patient_media_patient_id_idx";--> statement-breakpoint
ALTER TABLE "patient_media" ADD COLUMN "content_type" varchar(100);--> statement-breakpoint
UPDATE "patient_media" SET "content_type" = CASE
  WHEN LOWER(url) LIKE '%.pdf' THEN 'application/pdf'
  ELSE 'image/jpeg'
END;
