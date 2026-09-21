// db/schema/missionAttachments.ts
import {
  pgTable,
  uuid,
  varchar,
  integer,
  timestamp,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";
import { missions } from "./missions";
import { users } from "./users";

// Enum for attachment type — supports admin documents now, user photos later
export const missionAttachmentTypeEnum = pgEnum("mission_attachment_type", [
  "admin_document",
  "member_photo",
]);

// Mission attachments table
export const missionAttachments = pgTable(
  "mission_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    missionId: uuid("mission_id")
      .references(() => missions.id, { onDelete: "cascade" })
      .notNull(),
    uploadedBy: uuid("uploaded_by")
      .references(() => users.id)
      .notNull(),
    filePath: varchar("file_path", { length: 500 }).notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    displayName: varchar("display_name", { length: 255 }).notNull(),
    fileSize: integer("file_size"),
    contentType: varchar("content_type", { length: 100 }).notNull(),
    uploadType: missionAttachmentTypeEnum("upload_type")
      .default("admin_document")
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    missionIdIdx: index("mission_attachments_mission_id_idx").on(
      table.missionId,
    ),
    uploadedByIdx: index("mission_attachments_uploaded_by_idx").on(
      table.uploadedBy,
    ),
    uploadTypeIdx: index("mission_attachments_upload_type_idx").on(
      table.uploadType,
    ),
  }),
);

// Types for TypeScript
export type MissionAttachment = typeof missionAttachments.$inferSelect;
export type NewMissionAttachment = typeof missionAttachments.$inferInsert;
