// packages/shared/src/admin/types.ts
// Shared entity types for the admin dashboard (web + mobile)
// Response envelopes and request payloads stay platform-specific.

// ── User Management ──

export interface AdminUser {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  adminStartDate?: string | Date;
}

/** Compact user row used in new-signups, existing-users, denied-users lists. */
export interface AdminUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
  countries?: string[];
  doctorSpecialty?: string[] | null;
  approvalDate?: string | Date;
  authorized?: boolean;
}

/** Extended user details shown in the existing-users detail view. */
export interface AdminUserDetail extends AdminUserSummary {
  gender?: 'Male' | 'Female' | null;
  dob?: string | null;
  languages?: string[];
  googleId?: string;
  googleEmail?: string;
  googleImage?: string;
  isAdminCreated?: boolean;
  accountConfirmed?: boolean;
  emailSentDate?: string;
  confirmationToken?: string;
  confirmationTokenExpiry?: string | Date;
}

/** User returned from forgot-password search. */
export interface ForgotPasswordUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  accountType: string;
  country?: string;
  language?: string;
  doctorSpecialty?: string[] | null;
  approvalDate?: string | Date;
  passwordResetCount?: number;
  resetLink?: string;
  resetLinkExpiration?: string | Date;
}

// ── Notifications ──

export type CentralNotificationType = 'message' | 'alert' | 'announcement' | 'reminder';
export type UserNotificationType = 'message' | 'alert';

/** A notification as seen from the admin "all notifications" view. */
export interface CentralNotification {
  id: string;
  message: string;
  type: CentralNotificationType;
  createdAt: string | Date;
  patientId?: string;
  redirectTo?: string;
  sourceId?: string;
  subject?: string;
  recipientCount: number;
  readCount: number;
}

/** A single user's notification record. */
export interface UserNotification {
  id: string;
  userId: string;
  notificationId: string;
  read: boolean;
  methods: string[];
  emailAddress?: string;
  message: string;
  type: UserNotificationType;
  subject?: string;
  createdAt: string | Date;
  patientId?: string;
  redirectTo?: string;
}

/** Mobile's per-user notification with nested recipient info. */
export interface AdminNotification {
  id: string;
  notificationId: string;
  message: string;
  type: UserNotificationType;
  subject?: string;
  read?: boolean;
  createdAt: string | Date;
  patientId?: string;
  redirectTo?: string;
  recipient: {
    id: string;
    name: string;
    email: string;
    accountType: string;
  };
  specialty?: string;
}

// ── Profile Update Requests ──

export type ProfileUpdateFieldName = 'doctorSpecialty' | 'accountType';
export type ProfileUpdateStatus = 'pending' | 'approved' | 'denied';
export type ReviewAction = 'approve' | 'deny';

export interface ProfileUpdateRequest {
  id: string;
  userId: string;
  fieldName: ProfileUpdateFieldName;
  currentValue: any;
  requestedValue: any;
  status: ProfileUpdateStatus;
  userEmail: string;
  userName: string;
  reviewedBy?: string;
  reviewedByEmail?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  reviewNotes?: string;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    accountType: string;
    doctorSpecialty?: string[];
  };
}

// ── Clinical Operations ──

export interface MedOrderItem {
  id: string;
  oid?: string;
  patientId?: string;
  patientName?: string;
  patientPhone?: string;
  patientCity?: string;
  patientCountry?: string;
  drId?: string;
  prescribingDr?: string;
  drEmail?: string;
  doctorSpecialty?: string[] | string;
  orderDate?: string | Date;
  medications?: any;
  validated?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  doctorFirstName?: string;
  doctorLastName?: string;
  doctorEmail?: string;
  patientFirstName?: string;
  patientLastName?: string;
}

export interface ConflictUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  accountType: string | null;
}

export type CareTeamConflictStatus = 'unresolved' | 'resolved';

export interface CareTeamConflictItem {
  id: string;
  patientId: string;
  conflictingUserIds: (string | null)[];
  status: CareTeamConflictStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  createdAt: string;
  patientFirstName: string | null;
  patientLastName: string | null;
  conflictingUsers: ConflictUser[];
}

// ── Patient Intake ──

export interface PatientIntakeUpdatedBy {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface PatientIntakeConfig {
  id: string;
  intakeMessage: string;
  confirmationMessage?: string;
  mode?: 'default' | 'custom';
  createdAt?: string | Date;
  updatedAt?: string | Date;
  updatedBy?: PatientIntakeUpdatedBy | null;
}

// ── Missions ──

export interface MissionMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  accountType: string | null;
  doctorSpecialty?: string[] | null;
}

export interface MissionRequestRow {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userAccountType: string;
  missionId: string;
  missionName: string;
  missionCountry: string;
  status: string;
  reviewNotes: string | null;
  createdAt: string;
}

// ── Statistics ──

export interface UserCountStatistics {
  totalUsers: number;
  newSignups: number;
  existingUsers: number;
  deniedUsers: number;
  adminUsers: number;
  doctorCount: number;
  triageCount: number;
}

export interface ActivityMetrics {
  medicalOrdersCount: number;
  notificationsCount: number;
  lastWeekSignups: number;
  lastMonthSignups: number;
}

export interface SpecialtyBreakdownItem {
  specialty: string;
  count: number;
}

export interface StatisticsData {
  userCounts: UserCountStatistics;
  specialtyBreakdown: SpecialtyBreakdownItem[];
  activityMetrics: ActivityMetrics;
  lastUpdated: string | Date;
}

// ── User Feedback ──

export interface FeedbackAttachment {
  filePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  signedUrl?: string | null;
}

export interface SyncDiagnostics {
  tableCounts: Record<string, number>;
  isConnected: boolean;
  connectionTimedOut: boolean;
  lastSyncTime: string | null;
  pendingChanges: number;
  errors: string[];
  serverUrl: string;
  devicePlatform: string;
}

export interface FeedbackItem {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  category: string;
  title: string;
  description: string;
  attachments: FeedbackAttachment[];
  appSections: string[];
  platform: string;
  mobilePlatform: string | null;
  status: string;
  adminNotes: string | null;
  syncDiagnostics: SyncDiagnostics | null;
  appVersion: string | null;
  threadId: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Image Storage ──

export interface StorageStats {
  /** Configured storage budget in bytes (OBJECT_STORAGE_QUOTA_BYTES), or 0 if unset. */
  totalSize: number;
  totalFiles: number;
  /** Actual bytes stored, summed from a full listing. */
  usedSpace: number;
  /** totalSize - usedSpace, or 0 when no quota is configured. */
  availableSpace: number;
  bucketName: string;
  lastUpdated: string | Date;
  /** True when a quota is configured; when false, clients must not render a usage %. */
  hasQuota: boolean;
  /** Per-category totals, in STORAGE_CATEGORIES order. */
  categories: StorageCategoryStats[];
}

export interface StorageCategoryStats {
  id: StorageCategoryId;
  fileCount: number;
  totalBytes: number;
}

// ── Object Storage Taxonomy ──

export type StorageCategoryGroup = 'clinical' | 'operational';

export type StorageCategoryId =
  | 'patient-media'
  | 'telegram-photos'
  | 'telegram-audio'
  | 'internal-messages'
  | 'medical-licenses'
  | 'profile-pictures'
  | 'missions'
  | 'admin-notifications'
  | 'feedback';

export interface StorageCategory {
  id: StorageCategoryId;
  label: string;
  description: string;
  group: StorageCategoryGroup;
  /** Key prefixes (relative to the environment prefix) that belong to this category. */
  prefixes: string[];
  /**
   * What kind of entity the scopeId segment points at. Drives the owner
   * avatar shown on each tile before any details are fetched.
   */
  ownerKind: StorageOwnerKind;
}

// ── Storage Object Ownership ──

export type StorageOwnerKind = 'patient' | 'staff' | 'system';

/**
 * Resolved owner of a stored object, shaped for direct display — the client
 * renders title + lines without knowing per-kind field semantics.
 * `kind: 'unknown'` means the scope id no longer resolves (deleted record).
 */
export interface StorageOwnerDetails {
  kind: StorageOwnerKind | 'unknown';
  /** Primary display line — a person's name or a source label. */
  title: string;
  /** Preformatted label/value rows for the details popover. */
  lines: { label: string; value: string }[];
}

export interface StorageImage {
  id: string;
  key: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string | Date;
  uploadedBy?: {
    id: string;
    name: string;
    email: string;
  };
  url?: string;
  /** Signed URL of the derived thumbnail, present only when one already exists. */
  thumbnail?: string;
  /** True when this object IS a thumbnail file (listed only on request). */
  isThumb?: boolean;
  tags?: string[];
  metadata?: Record<string, string>;
}

// ── Database Backup & Restore ──

export type BackupStatus = 'uploading' | 'processing' | 'available' | 'restoring' | 'failed' | 'expired';
export type RestoreStatus = 'pending' | 'in_progress' | 'completed' | 'failed';
export type ConflictStrategy = 'skip' | 'overwrite' | 'newer_wins';
export type BackupMode = 'clinical' | 'full_migration';
export type BackupSource = 'mobile' | 'server';

export interface BackupTableManifest {
  tableName: string;
  recordCount: number;
  columns: string[];
}

export interface BackupDeviceInfo {
  platform: 'ios' | 'android' | 'server';
  appVersion: string;
  powerSyncSchemaVersion?: string;
  deviceModel?: string;
}

/**
 * Non-secret metadata for a backup that includes the encrypted authentication
 * bundle (app passkey/TOTP credentials + a Zitadel database dump). Fingerprints
 * are SHA-256 hashes used to verify the target server's env keys match — never
 * the keys themselves.
 */
export interface BackupAuthMeta {
  zitadelVersion: string;
  externalDomain: string;
  masterkeyFingerprint: string | null;
  totpKeyFingerprint: string | null;
  webauthnRpId: string;
  masterkeyEmbedded: boolean;
  dumpSize: number;
  passkeyCount: number;
  totpCount: number;
}

export interface BackupSummary {
  id: string;
  createdBy: string;
  createdByName: string;
  fileName: string;
  fileSize: number;
  status: BackupStatus;
  backupMode: BackupMode;
  backupSource: BackupSource;
  tables: BackupTableManifest[];
  totalRecords: number;
  checksum?: string;
  encrypted?: boolean;
  deviceInfo?: BackupDeviceInfo;
  /** True when this backup carries the encrypted auth bundle. */
  includesAuth?: boolean;
  authMeta?: BackupAuthMeta;
  createdAt: string;
  expiresAt?: string;
}

export interface RestoreTableResult {
  tableName: string;
  inserted: number;
  updated: number;
  skipped: number;
  failed: number;
  errors?: string[];
}

export interface RestoreSummary {
  id: string;
  backupId: string;
  restoredByName: string;
  status: RestoreStatus;
  conflictStrategy: ConflictStrategy;
  tablesRestored: RestoreTableResult[] | null;
  totalInserted: number;
  totalUpdated: number;
  totalSkipped: number;
  totalFailed: number;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface RestorePreviewTable {
  tableName: string;
  recordCount: number;
  existingCount: number;
  newCount: number;
  conflictCount: number;
  sampleRecords: Record<string, any>[];
}

export interface RestorePreview {
  backupId: string;
  tables: RestorePreviewTable[];
}

/** Tables safe for clinical (routine) backups. */
export const CLINICAL_BACKUP_TABLES = [
  'patients',
  'notes',
  'note_edits',
  'med_orders',
  'rx_orders',
  'patient_media',
  'patient_care_team',
  'care_team_conflicts',
  'missions',
  'mission_attachments',
  'telegram_threads',
  'telegram_messages',
  'telegram_thread_participants',
  'internal_message_threads',
  'internal_message_thread_participants',
  'internal_messages',
  'notifications',
  'notification_recipients',
  'admin_notifications',
  'user_feedback',
  'patient_follow_ups',
  'user_messages',
] as const;

/** Tables for full server migration (clinical + user data, excludes credentials). */
export const FULL_MIGRATION_TABLES = [
  ...CLINICAL_BACKUP_TABLES,
  'users',
  'admins',
  'user_settings',
  'user_profile_logs',
  'telegram_link_codes',
  'mission_requests',
] as const;

export type ClinicalBackupTable = typeof CLINICAL_BACKUP_TABLES[number];
export type FullMigrationTable = typeof FULL_MIGRATION_TABLES[number];

// ── Pagination ──

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

// ── Mission Options (used in create-user / new-signups for mission assignment) ──

export interface MissionOption {
  id: string;
  name: string;
  country: string;
  status: string;
}
