// db/schema/missionRequests.ts
import {
  pgTable,
  uuid,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { missions } from "./missions";
import { requestStatusEnum } from "./userProfileUpdateRequests";

// Mission join requests table
export const missionRequests = pgTable(
  "mission_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    missionId: uuid("mission_id")
      .notNull()
      .references(() => missions.id, { onDelete: "cascade" }),
    status: requestStatusEnum("status").default("pending").notNull(),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewNotes: text("review_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("mission_requests_user_id_idx").on(table.userId),
    missionIdIdx: index("mission_requests_mission_id_idx").on(table.missionId),
    statusIdx: index("mission_requests_status_idx").on(table.status),
    userMissionStatusIdx: index("mission_requests_user_mission_status_idx").on(
      table.userId,
      table.missionId,
      table.status,
    ),
  }),
);

// Types for TypeScript
export type MissionRequest = typeof missionRequests.$inferSelect;
export type NewMissionRequest = typeof missionRequests.$inferInsert;
