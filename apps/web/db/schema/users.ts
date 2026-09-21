// db/schema/users.ts
import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  json,
  index,
  pgEnum,
  integer,
} from "drizzle-orm/pg-core";

// Enums
export const accountTypeEnum = pgEnum("account_type", [
  "Doctor",
  "Triage",
]);
export const genderEnum = pgEnum("gender", ["Male", "Female"]);
export const emailTypeEnum = pgEnum("email_type", ["follow-up", "reminder"]);

// Users table
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    firstName: varchar("first_name", { length: 255 }).notNull(),
    lastName: varchar("last_name", { length: 255 }).notNull(),
    accountType: accountTypeEnum("account_type").notNull(),
    password: varchar("password", { length: 255 }),

    // Professional details
    doctorSpecialty: text("doctor_specialty").array(), // Array of specialties
    languages: text("languages").array(),
    countries: text("countries").array(),
    missions: text("missions").array(), // Array of mission UUIDs

    // Personal details
    gender: genderEnum("gender"),
    dob: timestamp("dob", { withTimezone: true }),
    image: text("image"),

    // Medical licenses
    medicalLicense: text("medical_license"), // Deprecated - kept for backward compatibility
    medicalLicenses: json("medical_licenses").$type<
      Array<{
        specialty: string;
        licenseUrl: string;
        uploadedAt: Date;
        mimeType?: string; // File type (e.g., 'application/pdf', 'image/png')
      }>
    >(),

    // Authorization
    authorized: boolean("authorized"),
    approvalDate: timestamp("approval_date", { withTimezone: true }),
    denialDate: timestamp("denial_date", { withTimezone: true }),

    // Password reset
    tempPasswordResetCode: varchar("temp_password_reset_code", { length: 255 }),
    tempCodeExpiry: timestamp("temp_code_expiry", { withTimezone: true }),
    adminResetPasswordLink: text("admin_reset_password_link"),
    adminResetLinkExpiry: timestamp("admin_reset_link_expiry", { withTimezone: true }),
    passwordResetCount: integer("password_reset_count").default(0),

    // Account management
    isAdminCreated: boolean("is_admin_created").default(false),
    accountConfirmed: boolean("account_confirmed").default(true),
    adminCreatedBy: json("admin_created_by").$type<{
      adminId: string;
      adminEmail: string;
      adminName: string;
      createdAt: Date;
    }>(),
    adminCreatedDate: timestamp("admin_created_date", { withTimezone: true }),

    // Email verification
    emailSentDate: timestamp("email_sent_date", { withTimezone: true }),
    confirmationToken: varchar("confirmation_token", { length: 255 }),
    confirmationTokenExpiry: timestamp("confirmation_token_expiry", { withTimezone: true }),
    verificationCode: varchar("verification_code", { length: 10 }),
    verificationCodeExpiry: timestamp("verification_code_expiry", { withTimezone: true }),
    tokenSessionExpiry: timestamp("token_session_expiry", { withTimezone: true }),

    // Two-factor authentication
    twoFactorStatus: varchar("two_factor_status", { length: 20 }), // null | 'setup_pending' | 'active'
    twoFactorGraceDeadline: timestamp("two_factor_grace_deadline", {
      withTimezone: true,
    }),

    // Timestamps
    lastLogin: timestamp("last_login", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    accountTypeIdx: index("users_account_type_idx").on(table.accountType),
    authorizedIdx: index("users_authorized_idx").on(table.authorized),
    // Composite index for optimized sorting of authorized users
    authorizedApprovalDateIdx: index("users_authorized_approval_date_idx").on(table.authorized, table.approvalDate),
  }),
);

// Security Questions table (extracted from User)
export const securityQuestions = pgTable(
  "security_questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    question: varchar("question", { length: 500 }).notNull(),
    answer: varchar("answer", { length: 500 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index("security_questions_user_id_idx").on(table.userId),
  }),
);

// User Follow-up Emails table (extracted from User)
export const userFollowUpEmails = pgTable(
  "user_follow_up_emails",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sentByAdminId: uuid("sent_by_admin_id").references(() => users.id),
    sentByAdminEmail: varchar("sent_by_admin_email", { length: 255 }),
    sentByAdminName: varchar("sent_by_admin_name", { length: 255 }),
    sentAt: timestamp("sent_at", { withTimezone: true }).defaultNow().notNull(),
    emailType: emailTypeEnum("email_type").default("follow-up").notNull(),
  },
  (table) => ({
    userIdIdx: index("user_follow_up_emails_user_id_idx").on(table.userId),
    sentByAdminIdIdx: index("user_follow_up_emails_sent_by_admin_id_idx").on(
      table.sentByAdminId,
    ),
  }),
);

// Types for TypeScript
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type SecurityQuestion = typeof securityQuestions.$inferSelect;
export type NewSecurityQuestion = typeof securityQuestions.$inferInsert;
export type UserFollowUpEmail = typeof userFollowUpEmails.$inferSelect;
export type NewUserFollowUpEmail = typeof userFollowUpEmails.$inferInsert;
