// apps/mobile/src/types/admin.ts
// Re-exports shared entity types + mobile-specific response/request envelopes.

// ── Re-exports from shared ──
export type {
  AdminUser,
  AdminUserSummary,
  AdminNotification,
  PatientIntakeConfig,
  MedOrderItem,
  SpecialtyBreakdownItem,
  PaginationParams,
  UserCountStatistics,
  ActivityMetrics,
  StatisticsData,
  DateRange,
  StorageStats,
  StorageImage,
  ProfileUpdateRequest,
  ForgotPasswordUser,
} from '@fajr/shared/admin';

// Backward-compat alias: mobile code uses ExistingUserSummary everywhere
import type { AdminUserSummary } from '@fajr/shared/admin';
export type ExistingUserSummary = AdminUserSummary;

// ── Mobile-only response/request envelopes ──

export interface AdminListResponse {
  admins: import('@fajr/shared/admin').AdminUser[];
}

export interface AdminSearchResponse {
  admins: import('@fajr/shared/admin').AdminUser[];
}

export interface ExistingUsersResponse {
  users: AdminUserSummary[];
}

export interface NewUsersResponse {
  users: AdminUserSummary[];
  totalPages: number;
  currentPage: number;
}

export interface DeniedUsersResponse {
  users: AdminUserSummary[];
  totalPages: number;
  currentPage: number;
}

export interface ApproveUsersRequest {
  userIds: string[];
}

export interface DenyUsersRequest {
  userIds: string[];
}

export interface ReApproveUsersRequest {
  userIds: string[];
}

export interface AdminMgmtAddRequest {
  userId: string;
}

export interface AdminMgmtRemoveRequest {
  adminId: string;
}

export interface ForgotPasswordUserSearchResponse {
  user: import('@fajr/shared/admin').ForgotPasswordUser;
}

export interface GenerateForgotPasswordLinkRequest {
  userId: string;
}

export interface GenerateForgotPasswordLinkResponse {
  resetLink: string;
  resetLinkExpiration: string | Date;
}

export interface SendUserEmailRequest {
  userId: string;
  confirmationToken: string;
}

export interface SendPasswordResetEmailRequest {
  userId: string;
}

export type NotificationType = 'message' | 'alert' | 'all';

export interface UserNotificationsResponse {
  notifications: import('@fajr/shared/admin').AdminNotification[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface PatientIntakeGetResponse {
  success: boolean;
  patientIntakes: import('@fajr/shared/admin').PatientIntakeConfig[];
}

export interface PatientIntakeUpdateRequest {
  intakeMessage: string;
  confirmationMessage?: string;
}

export interface PatientIntakeUpdateResponse {
  success: boolean;
  patientIntake: import('@fajr/shared/admin').PatientIntakeConfig;
}

export interface MedOrdersResponse {
  orders: import('@fajr/shared/admin').MedOrderItem[];
  totalPages: number;
  currentPage: number;
  totalOrders: number;
}

export interface SpecialtyBreakdownResponse {
  specialtyBreakdown: import('@fajr/shared/admin').SpecialtyBreakdownItem[];
}

export interface StatisticsResponse {
  statistics: import('@fajr/shared/admin').StatisticsData;
}

export interface ImageStorageListResponse {
  images: import('@fajr/shared/admin').StorageImage[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  stats?: import('@fajr/shared/admin').StorageStats;
}

export interface ImageStorageStatsResponse {
  stats: import('@fajr/shared/admin').StorageStats;
}

export interface DeleteImageRequest {
  imageId: string;
  key: string;
}

export interface BulkDeleteImagesRequest {
  imageIds: string[];
  keys: string[];
}

export interface DeleteImageResponse {
  success: boolean;
  message: string;
  deletedCount?: number;
}

export interface ProfileUpdateRequestsResponse {
  requests: import('@fajr/shared/admin').ProfileUpdateRequest[];
}

export interface ReviewProfileUpdateRequest {
  action: 'approve' | 'deny';
  reviewNotes?: string;
}
