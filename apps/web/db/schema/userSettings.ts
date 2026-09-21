// db/schema/userSettings.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// User Settings table
export const userSettings = pgTable(
  "user_settings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(), // One settings record per user

    // NOTE: this table holds *preferences only*. Identity and professional
    // fields — name, email, accountType, countries, languages, doctorSpecialty
    // — live on `users`, which is the single source of truth. They used to be
    // mirrored here and drifted: the session read them from this row while the
    // user directory and PowerSync read them from `users`, and several write
    // paths only updated one side. Do not reintroduce mirrors here.

    // UI preferences
    lastView: varchar("last_view", { length: 500 }).default("/"),
    lastViewSavedAt: varchar("last_view_saved_at", { length: 255 }),
    lastViewSessionId: varchar("last_view_session_id", { length: 255 }),
    saveLastPage: boolean("save_last_page").default(false),
    themeMode: varchar("theme_mode", { length: 20 }).default("system"),

    // Notification preferences
    pushNotificationsEnabled: boolean("push_notifications_enabled").default(
      true,
    ),
    notifyInternalMessages: boolean("notify_internal_messages").default(true),
    notifyPatientMessages: boolean("notify_patient_messages").default(true),
    notifyPatientActions: boolean("notify_patient_actions").default(true),
    // Incoming staff-to-staff calls. A hard opt-out: unlike the categories
    // above, a caller cannot override it. See lib/quietHours.ts for how this
    // interacts with quiet hours (live calls deliberately bypass them).
    notifyCalls: boolean("notify_calls").default(true),

    // Quiet hours
    quietHoursEnabled: boolean("quiet_hours_enabled").default(false),
    quietHoursStart: varchar("quiet_hours_start", { length: 10 }), // "22:00"
    quietHoursEnd: varchar("quiet_hours_end", { length: 10 }), // "07:00"
    quietHoursTimezone: varchar("quiet_hours_timezone", { length: 100 }), // IANA timezone

    // Mobile preferences
    mediaCacheEnabled: boolean("media_cache_enabled").default(true),
    mediaCacheWifiOnly: boolean("media_cache_wifi_only").default(true),
    dataSyncWifiOnly: boolean("data_sync_wifi_only").default(false),
    translationModelWifiOnly: boolean("translation_model_wifi_only").default(
      true,
    ),
    voiceSensitivity: varchar("voice_sensitivity", { length: 20 }).default(
      "adaptive",
    ),

    // On-device transcription of patient video calls.
    //   'off'       — never record or transcribe (default)
    //   'post_call' — record the call, transcribe after hanging up
    //   'live'      — transcribe during the call, show captions
    // Opt-in on purpose: this is the clinician consenting to their own side.
    // The patient consents separately, per call, before joining. Both are
    // required — see apps/web/components/patient-chart/videocall.
    callTranscriptionMode: varchar("call_transcription_mode", {
      length: 16,
    }).default("off"),

    // Mobile UI preferences
    patientChartView: varchar("patient_chart_view", { length: 30 }).default(
      "tabs",
    ),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("user_settings_user_id_idx").on(table.userId),
  }),
);

// Types for TypeScript
export type UserSettings = typeof userSettings.$inferSelect;
export type NewUserSettings = typeof userSettings.$inferInsert;
