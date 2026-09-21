// db/schema/missions.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
  pgEnum,
  json,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { internalMessageThreads } from "./internalMessageThreads";

// Types
export interface MissionUrl {
  url: string;
  displayName: string;
}

export interface MissionHospitalImage {
  filePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export type HospitalVisibility = "public" | "private";

export interface MissionHospital {
  name: string;
  visibility?: HospitalVisibility;
  url?: string;
  mapLink?: string;
  website?: string;
  description?: string;
  images?: MissionHospitalImage[];
}

// Enums
export const missionStatusEnum = pgEnum("mission_status", [
  "planned",
  "active",
  "completed",
]);

// Missions table
export const missions = pgTable(
  "missions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 255 }).notNull(),
    country: varchar("country", { length: 255 }).notNull(),
    city: varchar("city", { length: 255 }),
    hospitals: json("hospitals").$type<MissionHospital[]>().default([]),
    description: text("description"),
    status: missionStatusEnum("status").default("planned").notNull(),
    startDate: timestamp("start_date", { withTimezone: true }),
    endDate: timestamp("end_date", { withTimezone: true }),
    defaultIntakeHospital: varchar("default_intake_hospital", { length: 255 }),
    isActiveIntake: boolean("is_active_intake").default(false).notNull(),
    groupChatThreadId: uuid("group_chat_thread_id").references(() => internalMessageThreads.id),
    createdBy: uuid("created_by").references(() => users.id),
    urls: json("urls").$type<MissionUrl[]>().default([]),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    statusIdx: index("missions_status_idx").on(table.status),
    activeIntakeIdx: index("missions_active_intake_idx").on(
      table.isActiveIntake,
    ),
    createdAtIdx: index("missions_created_at_idx").on(table.createdAt),
  }),
);

// Types for TypeScript
export type Mission = typeof missions.$inferSelect;
export type NewMission = typeof missions.$inferInsert;
