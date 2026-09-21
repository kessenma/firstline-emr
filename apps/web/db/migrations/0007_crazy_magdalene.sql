CREATE TYPE "public"."med_evac_gender" AS ENUM('Male', 'Female');--> statement-breakpoint
ALTER TABLE "med_evac_patients" DROP CONSTRAINT "med_evac_patients_patient_id_unique";--> statement-breakpoint
ALTER TABLE "med_evac_patients" DROP CONSTRAINT "med_evac_patients_patient_id_patients_id_fk";
--> statement-breakpoint
DROP INDEX "med_evac_patients_patient_id_idx";--> statement-breakpoint
ALTER TABLE "med_evac_patients" ADD COLUMN "first_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "med_evac_patients" ADD COLUMN "last_name" varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE "med_evac_patients" ADD COLUMN "dob" timestamp;--> statement-breakpoint
ALTER TABLE "med_evac_patients" ADD COLUMN "gender" "med_evac_gender";--> statement-breakpoint
ALTER TABLE "med_evac_patients" ADD COLUMN "phone" json;--> statement-breakpoint
ALTER TABLE "med_evac_patients" ADD COLUMN "country" varchar(255);--> statement-breakpoint
ALTER TABLE "med_evac_patients" ADD COLUMN "city" varchar(255);--> statement-breakpoint
ALTER TABLE "med_evac_patients" ADD COLUMN "language" varchar(100);--> statement-breakpoint
ALTER TABLE "med_evac_patients" ADD COLUMN "chief_complaint" text;--> statement-breakpoint
CREATE INDEX "med_evac_patients_first_name_idx" ON "med_evac_patients" USING btree ("first_name");--> statement-breakpoint
CREATE INDEX "med_evac_patients_last_name_idx" ON "med_evac_patients" USING btree ("last_name");--> statement-breakpoint
ALTER TABLE "med_evac_patients" DROP COLUMN "patient_id";