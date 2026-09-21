-- Add mission attachments table and URLs column to missions
-- Supports admin-uploaded documents (PDFs, images) and future user-uploaded photos

CREATE TYPE "mission_attachment_type" AS ENUM ('admin_document', 'member_photo');

CREATE TABLE IF NOT EXISTS "mission_attachments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "mission_id" uuid NOT NULL REFERENCES "missions"("id") ON DELETE CASCADE,
  "uploaded_by" uuid NOT NULL REFERENCES "users"("id"),
  "file_path" varchar(500) NOT NULL,
  "file_name" varchar(255) NOT NULL,
  "display_name" varchar(255) NOT NULL,
  "file_size" integer,
  "content_type" varchar(100) NOT NULL,
  "upload_type" "mission_attachment_type" NOT NULL DEFAULT 'admin_document',
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "mission_attachments_mission_id_idx" ON "mission_attachments" ("mission_id");
CREATE INDEX IF NOT EXISTS "mission_attachments_uploaded_by_idx" ON "mission_attachments" ("uploaded_by");
CREATE INDEX IF NOT EXISTS "mission_attachments_upload_type_idx" ON "mission_attachments" ("upload_type");

ALTER TABLE "missions" ADD COLUMN IF NOT EXISTS "urls" json DEFAULT '[]'::json;
