// packages/shared/src/admin/constants.ts
// Shared constants for the admin dashboard section registry, permissions, and labels.

import type { StorageCategory, StorageCategoryGroup } from './types';

// ── Section Categories ──

export type AdminSectionCategory =
  | 'userManagement'
  | 'notifications'
  | 'clinicalOperations'
  | 'patientIntake'
  | 'missions'
  | 'analyticsStatistics'
  | 'systemTools'
  | 'feedback';

export const ADMIN_CATEGORY_LABELS: Record<AdminSectionCategory, string> = {
  userManagement: 'User Management',
  notifications: 'Notifications',
  clinicalOperations: 'Clinical Operations',
  patientIntake: 'Patient Intake',
  missions: 'Missions',
  analyticsStatistics: 'Analytics & Statistics',
  systemTools: 'System Tools',
  feedback: 'Feedback',
};

export const ADMIN_CATEGORY_ORDER: AdminSectionCategory[] = [
  'userManagement',
  'notifications',
  'clinicalOperations',
  'patientIntake',
  'missions',
  'analyticsStatistics',
  'systemTools',
  'feedback',
];

// ── Section IDs ──
// Canonical kebab-case IDs. Mobile uses camelCase aliases mapped in its own config.

export type AdminSectionId =
  | 'create-user'
  | 'new-signups'
  | 'existing-users'
  | 'denied-users'
  | 'profile-update-requests'
  | 'admin-management'
  | 'password-reset'
  | 'notifications'
  | 'medical-orders'
  | 'care-team-conflicts'
  | 'telegram-bot-settings'
  | 'missions-management'
  | 'mission-join-requests'
  | 'statistics'
  | 'analytics-dashboard'
  | 'powersync-service'
  | 'translation-service'
  | 'image-storage'
  | 'clear-test-data'
  | 'user-feedback'
  | 'database-backups'
  | 'verify-auth-migration';

/** Platform-agnostic section metadata (no icon/component). */
export interface AdminSectionMeta {
  id: AdminSectionId;
  title: string;
  subtitle?: string;
  category: AdminSectionCategory;
}

export const ADMIN_SECTIONS: AdminSectionMeta[] = [
  // User Management
  { id: 'create-user', title: 'Create New Doctor, Triage, or Evac User', subtitle: 'Create Doctor or Triage User', category: 'userManagement' },
  { id: 'new-signups', title: 'New Signups', subtitle: 'Pending user approvals', category: 'userManagement' },
  { id: 'existing-users', title: 'Existing Doctors & Triage', subtitle: 'Doctors and Triage', category: 'userManagement' },
  { id: 'denied-users', title: 'Denied Doctors & Triage', subtitle: 'Rejected signups', category: 'userManagement' },
  { id: 'profile-update-requests', title: 'Profile Update Requests', subtitle: 'Review profile change requests', category: 'userManagement' },
  { id: 'admin-management', title: 'Admin Management', subtitle: 'Manage admin users', category: 'userManagement' },
  { id: 'password-reset', title: 'Password Reset', subtitle: 'Reset user passwords', category: 'userManagement' },

  // Notifications
  { id: 'notifications', title: 'Notifications', subtitle: 'Send notifications to users', category: 'notifications' },

  // Clinical Operations
  { id: 'medical-orders', title: 'Medical Orders', subtitle: 'View and manage orders', category: 'clinicalOperations' },
  { id: 'care-team-conflicts', title: 'Care Team Conflicts', subtitle: 'Resolve duplicate lead assignments', category: 'clinicalOperations' },

  // Patient Intake
  { id: 'telegram-bot-settings', title: 'Telegram Bot Settings', subtitle: 'Patient intake configuration', category: 'patientIntake' },

  // Missions
  { id: 'missions-management', title: 'Missions Management', subtitle: 'Create and manage medical missions', category: 'missions' },
  { id: 'mission-join-requests', title: 'Mission Join Requests', subtitle: 'Review mission join requests', category: 'missions' },

  // Analytics & Statistics
  { id: 'statistics', title: 'Statistics', subtitle: 'User and system statistics', category: 'analyticsStatistics' },
  { id: 'analytics-dashboard', title: 'Analytics Dashboard', subtitle: 'System analytics and metrics', category: 'analyticsStatistics' },

  // System Tools
  { id: 'powersync-service', title: 'PowerSync Service', subtitle: 'Offline sync functionality', category: 'systemTools' },
  { id: 'translation-service', title: 'Translation Service', subtitle: 'Translation health and testing', category: 'systemTools' },
  // Section id stays 'image-storage' — it is a routing key (deep links,
  // persisted prefs); only the display strings say "media".
  { id: 'image-storage', title: 'Media Storage', subtitle: 'Browse stored media', category: 'systemTools' },
  { id: 'clear-test-data', title: 'Clear Test Data', subtitle: 'Remove test data (dev only)', category: 'systemTools' },
  { id: 'database-backups', title: 'Database Backups', subtitle: 'Backup & restore from mobile', category: 'systemTools' },
  { id: 'verify-auth-migration', title: 'Verify Auth Migration', subtitle: 'Test passkeys, 2FA & Zitadel after a move', category: 'systemTools' },

  // Feedback
  { id: 'user-feedback', title: 'User Feedback', subtitle: 'Review user feedback and bug reports', category: 'feedback' },
];

// ── Permissions ──

export enum AdminPermission {
  MANAGE_USERS = 'manage_users',
  MANAGE_ADMINS = 'manage_admins',
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_NOTIFICATIONS = 'manage_notifications',
  MANAGE_SETTINGS = 'manage_settings',
  DELETE_DATA = 'delete_data',
}

// ── Pagination Defaults ──

export const DEFAULT_PAGE_SIZE = 20;
export const DEFAULT_PAGE = 1;

// ── Object Storage Taxonomy ──
//
// Maps the key prefixes that upload routes write to (see storageService.upload's
// `basePath` values) into admin-facing categories. Keys look like
// `{env}/{prefix}/{scopeId}/{timestamp}-{fileName}`, so the segment after the
// prefix is the patient/chat/thread/user id the file belongs to.
//
// `backups/` and `setup-temp/` are deliberately absent — they are not media and
// are managed by the Database Backups section instead.

export const STORAGE_CATEGORIES: StorageCategory[] = [
  {
    id: 'patient-media',
    label: 'Patient Media',
    description: 'Photos and documents attached to patient charts',
    group: 'clinical',
    // `patient-photos/` is the legacy path this feature wrote to before
    // `patient-media/`. Real objects still live under it — the patient and
    // admin delete routes both clean it up as "legacy" — so the browser has to
    // list both or those files stay invisible.
    prefixes: ['patient-media/', 'patient-photos/'],
    ownerKind: 'patient', // scopeId = patient uuid
  },
  {
    id: 'telegram-photos',
    label: 'Patient Photos (Telegram)',
    description: 'Images exchanged with patients over Telegram',
    group: 'clinical',
    prefixes: ['telegram/photos/'],
    ownerKind: 'patient', // scopeId = telegram chat id → patients.telegramChatId
  },
  {
    id: 'telegram-audio',
    label: 'Patient Audio (Telegram)',
    description: 'Voice notes exchanged with patients over Telegram',
    group: 'clinical',
    prefixes: ['telegram/audio/'],
    ownerKind: 'patient', // scopeId = telegram chat id → patients.telegramChatId
  },
  {
    id: 'internal-messages',
    label: 'Staff Messages',
    description: 'Photos, audio, and documents sent between staff',
    group: 'operational',
    prefixes: [
      'internal-messages-photos/',
      'internal-messages-audio/',
      'internal-messages-documents/',
    ],
    ownerKind: 'staff', // scopeId = internal message thread id
  },
  {
    id: 'medical-licenses',
    label: 'Medical Licenses',
    description: 'License documents uploaded during signup and verification',
    group: 'operational',
    prefixes: ['medical_license/'],
    ownerKind: 'staff', // scopeId = userId (new uploads) or specialty (legacy keys)
  },
  {
    id: 'profile-pictures',
    label: 'Profile Pictures',
    description: 'Staff account profile images',
    group: 'operational',
    prefixes: ['user_pictures/'],
    ownerKind: 'staff', // scopeId = `{userId}_{lastName}`
  },
  {
    id: 'missions',
    label: 'Mission Attachments',
    description: 'Files attached to missions and their hospitals',
    group: 'operational',
    prefixes: ['missions/'],
    ownerKind: 'system', // scopeId = mission id
  },
  {
    id: 'admin-notifications',
    label: 'Admin Broadcasts',
    description: 'Images attached to admin announcements',
    group: 'operational',
    prefixes: ['admin-notifications/'],
    ownerKind: 'system', // no scope segment
  },
  {
    id: 'feedback',
    label: 'User Feedback',
    description: 'Screenshots attached to feedback and bug reports',
    group: 'operational',
    prefixes: ['feedback/'],
    ownerKind: 'staff', // scopeId = uploader's user id
  },
];

export const STORAGE_GROUP_LABELS: Record<StorageCategoryGroup, string> = {
  clinical: 'Clinical Operations',
  operational: 'Operational Data',
};

export const STORAGE_GROUP_ORDER: StorageCategoryGroup[] = [
  'clinical',
  'operational',
];

// ── Profile Update Request Field Labels ──

export const PROFILE_UPDATE_FIELD_LABELS: Record<string, string> = {
  doctorSpecialty: 'Doctor Specialty',
  accountType: 'Account Type',
};
