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
} from '@firstline/shared/admin';

// Backward-compat alias: mobile code uses ExistingUserSummary everywhere
import type { AdminUserSummary } from '@firstline/shared/admin';
export type ExistingUserSummary = AdminUserSummary;

// ── Mobile-only response/request envelopes ──

export interface AdminListResponse {
  admins: import('@firstline/shared/admin').AdminUser[];
}

export interface AdminSearchResponse {
  admins: import('@firstline/shared/admin').AdminUser[];
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
  user: import('@firstline/shared/admin').ForgotPasswordUser;
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
  notifications: import('@firstline/shared/admin').AdminNotification[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface PatientIntakeGetResponse {
  success: boolean;
  patientIntakes: import('@firstline/shared/admin').PatientIntakeConfig[];
}

export interface PatientIntakeUpdateRequest {
  intakeMessage: string;
  confirmationMessage?: string;
}

export interface PatientIntakeUpdateResponse {
  success: boolean;
  patientIntake: import('@firstline/shared/admin').PatientIntakeConfig;
}

export interface MedOrdersResponse {
  orders: import('@firstline/shared/admin').MedOrderItem[];
  totalPages: number;
  currentPage: number;
  totalOrders: number;
}

export interface SpecialtyBreakdownResponse {
  specialtyBreakdown: import('@firstline/shared/admin').SpecialtyBreakdownItem[];
}

export interface StatisticsResponse {
  statistics: import('@firstline/shared/admin').StatisticsData;
}

export interface ImageStorageListResponse {
  images: import('@firstline/shared/admin').StorageImage[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  stats?: import('@firstline/shared/admin').StorageStats;
}

export interface ImageStorageStatsResponse {
  stats: import('@firstline/shared/admin').StorageStats;
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
  requests: import('@firstline/shared/admin').ProfileUpdateRequest[];
}

export interface ReviewProfileUpdateRequest {
  action: 'approve' | 'deny';
  reviewNotes?: string;
}
