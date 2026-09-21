// db/schema/index.ts
// Export all tables from individual schema files
export * from "./users";
export * from "./admins";
export * from "./adminNotifications";
export * from "./patients";
export * from "./notes";
export * from "./visits";
export * from "./medOrders";
export * from "./userSettings";
export * from "./pushDevices";
export * from "./notifications";
export * from "./telegramThreads";
export * from "./internalMessageThreads";
export * from "./internalMessages";
export * from "./telegramMessages";
export * from "./patientIntake";
export * from "./userProfileLogs";
export * from "./userMessages";
export * from "./medicalCodes";
export * from "./userProfileUpdateRequests";
export * from "./passkeyCredentials";
export * from "./totpCredentials";
export * from "./oidc";
export * from "./missions";
export * from "./missionAttachments";
export * from "./missionRequests";
export * from "./patientCareTeam";
export * from "./patientDrafts";
export * from "./userFeedback";
export * from "./telegramLinkCodes";
export * from "./videoCallSessions";
export * from "./backups";
export * from "./calls";

// Import tables for relations
import { relations } from "drizzle-orm";
import { users, securityQuestions, userFollowUpEmails } from "./users";
import { admins } from "./admins";
import { adminNotifications } from "./adminNotifications";
import { patients, patientMedia, rxOrders } from "./patients";
import { notes, noteEdits } from "./notes";
import { visits } from "./visits";
import { medOrders } from "./medOrders";
import { userSettings } from "./userSettings";
import { pushDevices } from "./pushDevices";
import {
  notifications,
  userNotifications,
  notificationRecipients,
} from "./notifications";
import {
  telegramThreads,
  telegramThreadParticipants,
  patientFollowUps,
} from "./telegramThreads";
import {
  internalMessageThreads,
  internalMessageThreadParticipants,
} from "./internalMessageThreads";
import { internalMessages } from "./internalMessages";
import { telegramMessages } from "./telegramMessages";
import { patientIntakes, telegramIntakeTokens } from "./patientIntake";
import { userProfileLogs } from "./userProfileLogs";
import { userMessages } from "./userMessages";
import { userProfileUpdateRequests } from "./userProfileUpdateRequests";
import { passkeyCredentials } from "./passkeyCredentials";
import { totpCredentials } from "./totpCredentials";
import { missions } from "./missions";
import { missionAttachments } from "./missionAttachments";
import { missionRequests } from "./missionRequests";
import { patientCareTeam, careTeamConflicts } from "./patientCareTeam";
import { patientDrafts } from "./patientDrafts";
import { userFeedback } from "./userFeedback";
import { telegramLinkCodes, pendingLinkAttempts } from "./telegramLinkCodes";
import { videoCallSessions } from "./videoCallSessions";
import { backups, backupRestores } from "./backups";
import { calls, callParticipants } from "./calls";

// ===== RELATIONS =====

// User Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  // One-to-one with admin
  admin: one(admins, {
    fields: [users.id],
    references: [admins.userId],
  }),
  // One-to-one with user settings
  settings: one(userSettings, {
    fields: [users.id],
    references: [userSettings.userId],
  }),
  // One-to-many
  pushDevices: many(pushDevices),
  passkeyCredentials: many(passkeyCredentials),
  totpCredentials: many(totpCredentials),
  securityQuestions: many(securityQuestions),
  followUpEmails: many(userFollowUpEmails),
  coordinatedPatients: many(patients, { relationName: "coordinatedPatients" }),
  createdPatients: many(patients, { relationName: "createdPatients" }),
  authoredNotes: many(notes),
  prescribedMedOrders: many(medOrders),
  userNotifications: many(userNotifications),
  notificationRecipients: many(notificationRecipients),
  telegramThreadParticipations: many(telegramThreadParticipants),
  internalThreadParticipations: many(internalMessageThreadParticipants),
  profileLogs: many(userProfileLogs),
  profileLogsChanged: many(userProfileLogs),
  messages: one(userMessages, {
    fields: [users.id],
    references: [userMessages.userId],
  }),
  profileUpdateRequests: many(userProfileUpdateRequests),
  reviewedProfileUpdateRequests: many(userProfileUpdateRequests),
  careTeamAssignments: many(patientCareTeam),
  missionRequests: many(missionRequests),
  feedbackSubmissions: many(userFeedback),
  createdLinkCodes: many(telegramLinkCodes),
  startedVideoCalls: many(videoCallSessions),
  initiatedCalls: many(calls),
  callParticipations: many(callParticipants),
}));

// Admin Relations
export const adminsRelations = relations(admins, ({ one }) => ({
  user: one(users, {
    fields: [admins.userId],
    references: [users.id],
  }),
}));

// Security Questions Relations
export const securityQuestionsRelations = relations(
  securityQuestions,
  ({ one }) => ({
    user: one(users, {
      fields: [securityQuestions.userId],
      references: [users.id],
    }),
  }),
);

// User Follow-up Emails Relations
export const userFollowUpEmailsRelations = relations(
  userFollowUpEmails,
  ({ one }) => ({
    user: one(users, {
      fields: [userFollowUpEmails.userId],
      references: [users.id],
    }),
    sentByAdmin: one(users, {
      fields: [userFollowUpEmails.sentByAdminId],
      references: [users.id],
    }),
  }),
);

// Patient Relations
export const patientsRelations = relations(patients, ({ one, many }) => ({
  coordinator: one(users, {
    fields: [patients.coordinatorId],
    references: [users.id],
    relationName: "coordinatedPatients",
  }),
  createdBy: one(users, {
    fields: [patients.createdById],
    references: [users.id],
    relationName: "createdPatients",
  }),
  notes: many(notes),
  visits: many(visits),
  rxOrders: many(rxOrders),
  medOrders: many(medOrders),
  media: many(patientMedia),

  telegramThread: one(telegramThreads, {
    fields: [patients.id],
    references: [telegramThreads.patientId],
  }),
  mission: one(missions, {
    fields: [patients.missionId],
    references: [missions.id],
  }),
  followUps: many(patientFollowUps),
  intakeTokens: many(telegramIntakeTokens),
  careTeam: many(patientCareTeam),
  careTeamConflicts: many(careTeamConflicts),
  linkCodes: many(telegramLinkCodes),
  videoCalls: many(videoCallSessions),
}));

// Missions Relations
export const missionsRelations = relations(missions, ({ one, many }) => ({
  creator: one(users, {
    fields: [missions.createdBy],
    references: [users.id],
  }),
  groupChatThread: one(internalMessageThreads, {
    fields: [missions.groupChatThreadId],
    references: [internalMessageThreads.id],
  }),
  patients: many(patients),
  missionRequests: many(missionRequests),
  attachments: many(missionAttachments),
}));

// Mission Attachments Relations
export const missionAttachmentsRelations = relations(
  missionAttachments,
  ({ one }) => ({
    mission: one(missions, {
      fields: [missionAttachments.missionId],
      references: [missions.id],
    }),
    uploader: one(users, {
      fields: [missionAttachments.uploadedBy],
      references: [users.id],
    }),
  }),
);

// Patient Media Relations
export const patientMediaRelations = relations(patientMedia, ({ one }) => ({
  patient: one(patients, {
    fields: [patientMedia.patientId],
    references: [patients.id],
  }),
  // Declared here rather than on the column itself: videoCallSessions.ts
  // imports patients.ts, so a `.references()` there would close an import
  // cycle. The FK constraint is in the migration.
  videoCallSession: one(videoCallSessions, {
    fields: [patientMedia.videoCallSessionId],
    references: [videoCallSessions.id],
  }),
}));

// RX Orders Relations
export const rxOrdersRelations = relations(rxOrders, ({ one }) => ({
  patient: one(patients, {
    fields: [rxOrders.patientId],
    references: [patients.id],
  }),
}));

// Notes Relations
export const notesRelations = relations(notes, ({ one, many }) => ({
  patient: one(patients, {
    fields: [notes.patientId],
    references: [patients.id],
  }),
  author: one(users, {
    fields: [notes.authorId],
    references: [users.id],
  }),
  attendingPhysician: one(users, {
    fields: [notes.attendingPhysicianId],
    references: [users.id],
  }),
  edits: many(noteEdits),
}));

// Note Edits Relations
export const noteEditsRelations = relations(noteEdits, ({ one }) => ({
  note: one(notes, {
    fields: [noteEdits.noteId],
    references: [notes.id],
  }),
  editor: one(users, {
    fields: [noteEdits.editorId],
    references: [users.id],
  }),
}));

// Visits Relations
export const visitsRelations = relations(visits, ({ one }) => ({
  patient: one(patients, {
    fields: [visits.patientId],
    references: [patients.id],
  }),
}));

// Med Orders Relations
export const medOrdersRelations = relations(medOrders, ({ one }) => ({
  patient: one(patients, {
    fields: [medOrders.patientId],
    references: [patients.id],
  }),
  doctor: one(users, {
    fields: [medOrders.drId],
    references: [users.id],
  }),
}));

// User Settings Relations
export const userSettingsRelations = relations(userSettings, ({ one }) => ({
  user: one(users, {
    fields: [userSettings.userId],
    references: [users.id],
  }),
}));

// Push Devices Relations
export const pushDevicesRelations = relations(pushDevices, ({ one }) => ({
  user: one(users, {
    fields: [pushDevices.userId],
    references: [users.id],
  }),
}));

// Passkey Credentials Relations
export const passkeyCredentialsRelations = relations(
  passkeyCredentials,
  ({ one }) => ({
    user: one(users, {
      fields: [passkeyCredentials.userId],
      references: [users.id],
    }),
  }),
);

// TOTP Credentials Relations
export const totpCredentialsRelations = relations(
  totpCredentials,
  ({ one }) => ({
    user: one(users, {
      fields: [totpCredentials.userId],
      references: [users.id],
    }),
  }),
);

// Notifications Relations
export const notificationsRelations = relations(
  notifications,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [notifications.patientId],
      references: [patients.id],
    }),
    userNotifications: many(userNotifications),
    recipients: many(notificationRecipients),
  }),
);

// User Notifications Relations
export const userNotificationsRelations = relations(
  userNotifications,
  ({ one }) => ({
    user: one(users, {
      fields: [userNotifications.userId],
      references: [users.id],
    }),
    notification: one(notifications, {
      fields: [userNotifications.notificationId],
      references: [notifications.id],
    }),
  }),
);


// Telegram Threads Relations
export const telegramThreadsRelations = relations(
  telegramThreads,
  ({ one, many }) => ({
    patient: one(patients, {
      fields: [telegramThreads.patientId],
      references: [patients.id],
    }),
    participants: many(telegramThreadParticipants),
    followUps: many(patientFollowUps),
    telegramMessages: many(telegramMessages),
  }),
);

// Telegram Thread Participants Relations
export const telegramThreadParticipantsRelations = relations(
  telegramThreadParticipants,
  ({ one }) => ({
    thread: one(telegramThreads, {
      fields: [telegramThreadParticipants.threadId],
      references: [telegramThreads.id],
    }),
    user: one(users, {
      fields: [telegramThreadParticipants.userId],
      references: [users.id],
    }),
  }),
);

// Telegram Messages Relations
export const telegramMessagesRelations = relations(
  telegramMessages,
  ({ one }) => ({
    thread: one(telegramThreads, {
      fields: [telegramMessages.threadId],
      references: [telegramThreads.id],
    }),
  }),
);

// Patient Follow-ups Relations
export const patientFollowUpsRelations = relations(
  patientFollowUps,
  ({ one }) => ({
    thread: one(telegramThreads, {
      fields: [patientFollowUps.telegramThreadId],
      references: [telegramThreads.id],
    }),
  }),
);

// Internal Message Threads Relations
export const internalMessageThreadsRelations = relations(
  internalMessageThreads,
  ({ one, many }) => ({
    creator: one(users, {
      fields: [internalMessageThreads.createdBy],
      references: [users.id],
    }),
    participants: many(internalMessageThreadParticipants),
    internalMessages: many(internalMessages),
  }),
);

// Internal Messages Relations
export const internalMessagesRelations = relations(
  internalMessages,
  ({ one }) => ({
    thread: one(internalMessageThreads, {
      fields: [internalMessages.threadId],
      references: [internalMessageThreads.id],
    }),
    senderUser: one(users, {
      fields: [internalMessages.senderId],
      references: [users.id],
    }),
  }),
);

// Internal Message Thread Participants Relations
export const internalMessageThreadParticipantsRelations = relations(
  internalMessageThreadParticipants,
  ({ one }) => ({
    thread: one(internalMessageThreads, {
      fields: [internalMessageThreadParticipants.threadId],
      references: [internalMessageThreads.id],
    }),
    user: one(users, {
      fields: [internalMessageThreadParticipants.userId],
      references: [users.id],
    }),
  }),
);

// Patient Intakes Relations
export const patientIntakesRelations = relations(patientIntakes, ({ one }) => ({
  updatedByUser: one(users, {
    fields: [patientIntakes.updatedBy],
    references: [users.id],
  }),
}));

// Telegram Intake Tokens Relations
export const telegramIntakeTokensRelations = relations(
  telegramIntakeTokens,
  ({ one }) => ({
    patient: one(patients, {
      fields: [telegramIntakeTokens.patientId],
      references: [patients.id],
    }),
  }),
);

// User Profile Logs Relations
export const userProfileLogsRelations = relations(
  userProfileLogs,
  ({ one }) => ({
    user: one(users, {
      fields: [userProfileLogs.userId],
      references: [users.id],
    }),
    changedByUser: one(users, {
      fields: [userProfileLogs.changedBy],
      references: [users.id],
    }),
  }),
);

// Notification Recipients Relations
export const notificationRecipientsRelations = relations(
  notificationRecipients,
  ({ one }) => ({
    notification: one(notifications, {
      fields: [notificationRecipients.notificationId],
      references: [notifications.id],
    }),
    user: one(users, {
      fields: [notificationRecipients.userId],
      references: [users.id],
    }),
  }),
);

// User Messages Relations
export const userMessagesRelations = relations(userMessages, ({ one }) => ({
  user: one(users, {
    fields: [userMessages.userId],
    references: [users.id],
  }),
}));

// Admin Notifications Relations
export const adminNotificationsRelations = relations(
  adminNotifications,
  ({ one }) => ({
    sender: one(users, {
      fields: [adminNotifications.senderId],
      references: [users.id],
    }),
  }),
);

// User Profile Update Requests Relations
export const userProfileUpdateRequestsRelations = relations(
  userProfileUpdateRequests,
  ({ one }) => ({
    user: one(users, {
      fields: [userProfileUpdateRequests.userId],
      references: [users.id],
    }),
    reviewer: one(users, {
      fields: [userProfileUpdateRequests.reviewedBy],
      references: [users.id],
    }),
  }),
);

// Patient Care Team Relations
export const patientCareTeamRelations = relations(
  patientCareTeam,
  ({ one }) => ({
    patient: one(patients, {
      fields: [patientCareTeam.patientId],
      references: [patients.id],
    }),
    user: one(users, {
      fields: [patientCareTeam.userId],
      references: [users.id],
    }),
    assignedByUser: one(users, {
      fields: [patientCareTeam.assignedBy],
      references: [users.id],
    }),
  }),
);

// Care Team Conflicts Relations
export const careTeamConflictsRelations = relations(
  careTeamConflicts,
  ({ one }) => ({
    patient: one(patients, {
      fields: [careTeamConflicts.patientId],
      references: [patients.id],
    }),
    resolvedByUser: one(users, {
      fields: [careTeamConflicts.resolvedBy],
      references: [users.id],
    }),
  }),
);

// Mission Requests Relations
export const missionRequestsRelations = relations(
  missionRequests,
  ({ one }) => ({
    user: one(users, {
      fields: [missionRequests.userId],
      references: [users.id],
    }),
    mission: one(missions, {
      fields: [missionRequests.missionId],
      references: [missions.id],
    }),
    reviewer: one(users, {
      fields: [missionRequests.reviewedBy],
      references: [users.id],
    }),
  }),
);

// Patient Drafts Relations
export const patientDraftsRelations = relations(patientDrafts, ({ one }) => ({
  createdBy: one(users, {
    fields: [patientDrafts.createdById],
    references: [users.id],
  }),
  mission: one(missions, {
    fields: [patientDrafts.missionId],
    references: [missions.id],
  }),
}));

// User Feedback Relations
export const userFeedbackRelations = relations(userFeedback, ({ one }) => ({
  user: one(users, {
    fields: [userFeedback.userId],
    references: [users.id],
  }),
  reviewer: one(users, {
    fields: [userFeedback.reviewedBy],
    references: [users.id],
  }),
  thread: one(internalMessageThreads, {
    fields: [userFeedback.threadId],
    references: [internalMessageThreads.id],
  }),
}));

// Telegram Link Codes Relations
export const telegramLinkCodesRelations = relations(
  telegramLinkCodes,
  ({ one }) => ({
    patient: one(patients, {
      fields: [telegramLinkCodes.patientId],
      references: [patients.id],
    }),
    createdBy: one(users, {
      fields: [telegramLinkCodes.createdById],
      references: [users.id],
    }),
  }),
);

// Video Call Session Relations
export const videoCallSessionsRelations = relations(
  videoCallSessions,
  ({ one }) => ({
    patient: one(patients, {
      fields: [videoCallSessions.patientId],
      references: [patients.id],
    }),
    startedBy: one(users, {
      fields: [videoCallSessions.startedById],
      references: [users.id],
    }),
  }),
);

// Backups Relations
export const backupsRelations = relations(backups, ({ one, many }) => ({
  creator: one(users, {
    fields: [backups.createdBy],
    references: [users.id],
  }),
  restores: many(backupRestores),
}));

// Backup Restores Relations
export const backupRestoresRelations = relations(
  backupRestores,
  ({ one }) => ({
    backup: one(backups, {
      fields: [backupRestores.backupId],
      references: [backups.id],
    }),
    restoredByUser: one(users, {
      fields: [backupRestores.restoredBy],
      references: [users.id],
    }),
  }),
);

// Calls Relations
export const callsRelations = relations(calls, ({ one, many }) => ({
  initiator: one(users, {
    fields: [calls.initiatorId],
    references: [users.id],
  }),
  participants: many(callParticipants),
}));

// Call Participants Relations
export const callParticipantsRelations = relations(
  callParticipants,
  ({ one }) => ({
    call: one(calls, {
      fields: [callParticipants.callId],
      references: [calls.id],
    }),
    user: one(users, {
      fields: [callParticipants.userId],
      references: [users.id],
    }),
  }),
);
