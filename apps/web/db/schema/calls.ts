// db/schema/calls.ts
import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  index,
  unique,
  pgEnum,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// Media type of the call. Staff-to-staff calling is audio-only today; "video"
// exists so the patient video flow can migrate onto these tables later.
export const callKindEnum = pgEnum("call_kind", ["audio", "video"]);

// Lifecycle of the call as a whole.
//   ringing   - invites sent, nobody has answered yet
//   active    - at least one callee accepted
//   completed - was answered, then ended normally
//   missed    - nobody answered before the timeout (or the caller cancelled)
//   declined  - every callee explicitly declined
//   canceled  - the caller hung up before anyone answered
//   failed    - stuck/errored; set by the sweeper or when every push failed
export const callStatusEnum = pgEnum("call_status", [
  "ringing",
  "active",
  "completed",
  "missed",
  "declined",
  "canceled",
  "failed",
]);

export const callParticipantRoleEnum = pgEnum("call_participant_role", [
  "caller",
  "callee",
]);

export const callParticipantStatusEnum = pgEnum("call_participant_status", [
  "ringing",
  "accepted",
  "declined",
  "missed",
  "left",
  "failed",
]);

// Calls table - one row per call attempt, answered or not.
// Modeled for N participants even though the UI ships 1:1: LiveKit rooms are
// N-way for free and only CallKit assumes a single remote party.
export const calls = pgTable(
  "calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // LiveKit room name, always "staff-<call id>". Unique so a room can never
    // be reused across two call records.
    roomName: text("room_name").notNull(),

    kind: callKindEnum("kind").default("audio").notNull(),
    status: callStatusEnum("status").default("ringing").notNull(),

    initiatorId: uuid("initiator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    isGroupCall: boolean("is_group_call").default(false).notNull(),

    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    answeredAt: timestamp("answered_at", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),

    // Wall-clock seconds between answeredAt and endedAt. Null for unanswered calls.
    durationSeconds: integer("duration_seconds"),

    // hangup | declined | timeout | canceled | error | room_finished
    endReason: text("end_reason"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    roomNameUnique: unique("calls_room_name_unique").on(table.roomName),
    initiatorIdx: index("calls_initiator_idx").on(table.initiatorId),
    startedAtIdx: index("calls_started_at_idx").on(table.startedAt),
    // Supports the cron sweeper that expires stuck ringing/active calls.
    statusStartedIdx: index("calls_status_started_idx").on(
      table.status,
      table.startedAt,
    ),
  }),
);

// Call participants - one row per user invited to a call, including the caller.
export const callParticipants = pgTable(
  "call_participants",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    callId: uuid("call_id")
      .notNull()
      .references(() => calls.id, { onDelete: "cascade" }),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    role: callParticipantRoleEnum("role").notNull(),
    status: callParticipantStatusEnum("status").default("ringing").notNull(),

    // Denormalized from calls.startedAt so the recents query can sort straight
    // off the (user_id, invited_at) index without joining calls first.
    invitedAt: timestamp("invited_at", { withTimezone: true }).defaultNow().notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }),
    leftAt: timestamp("left_at", { withTimezone: true }),

    // "ios" | "web" - which client this participant answered on
    clientPlatform: text("client_platform"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    callUserUnique: unique("call_participants_call_user_unique").on(
      table.callId,
      table.userId,
    ),
    // The recents index - this is what keeps the Recents tab fast.
    userInvitedIdx: index("call_participants_user_invited_idx").on(
      table.userId,
      table.invitedAt,
    ),
    callIdx: index("call_participants_call_idx").on(table.callId),
  }),
);

// Types
export type Call = typeof calls.$inferSelect;
export type NewCall = typeof calls.$inferInsert;
export type CallParticipant = typeof callParticipants.$inferSelect;
export type NewCallParticipant = typeof callParticipants.$inferInsert;
