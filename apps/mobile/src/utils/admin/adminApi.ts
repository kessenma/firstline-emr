// apps/mobile/src/utils/admin/adminApi.ts
import { storageUtils } from '../../utils/storage';
import { getApiUrl } from '../../config';
import {
  buildQueryParams,
  validatePagination,
  normalizeAdmin,
} from './adminHelpers';
import {
  AdminListResponse,
  AdminSearchResponse,
  AdminMgmtAddRequest,
  AdminMgmtRemoveRequest,
  ExistingUsersResponse,
  NewUsersResponse,
  DeniedUsersResponse,
  ApproveUsersRequest,
  DenyUsersRequest,
  ReApproveUsersRequest,
  ForgotPasswordUserSearchResponse,
  GenerateForgotPasswordLinkRequest,
  GenerateForgotPasswordLinkResponse,
  SendUserEmailRequest,
  SendPasswordResetEmailRequest,
  UserNotificationsResponse,
  PatientIntakeGetResponse,
  PatientIntakeUpdateRequest,
  PatientIntakeUpdateResponse,
  MedOrdersResponse,
  SpecialtyBreakdownResponse,
  StatisticsData,
  UserCountStatistics,
  ActivityMetrics,
  ImageStorageListResponse,
  ImageStorageStatsResponse,
  DeleteImageRequest,
  BulkDeleteImagesRequest,
  DeleteImageResponse,
} from '../../types/admin';
import type {
  StorageCategoryId,
  StorageCategoryGroup,
} from '@fajr/shared/admin';

class AdminApiClient {
  private getAuthHeaders(): Record<string, string> {
    const token = storageUtils.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  private async request<T>(endpoint: string, init?: RequestInit): Promise<T> {
    const url = getApiUrl(endpoint);
    const response = await fetch(url, {
      ...init,
      headers: {
        ...((init?.headers as Record<string, string>) || {}),
        ...this.getAuthHeaders(),
      },
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(
        text || `Request failed: ${response.status} ${response.statusText}`,
      );
    }
    return response.json();
  }

  async getExistingAdmins(): Promise<AdminListResponse> {
    const data = await this.request<AdminListResponse>(
      '/admin/GET/existing-admins',
    );
    return { admins: data.admins.map(normalizeAdmin) };
  }

  async searchAdmins(search: string): Promise<AdminSearchResponse> {
    const qs = buildQueryParams({ search });
    const data = await this.request<AdminSearchResponse>(
      `/admin/GET/admin-mgmt-search${qs}`,
    );
    return { admins: data.admins.map(normalizeAdmin) };
  }

  async addAdmin(req: AdminMgmtAddRequest): Promise<{ message: string }> {
    return this.request('/admin/POST/admin-mgmt-add', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async removeAdmin(req: AdminMgmtRemoveRequest): Promise<{ message: string }> {
    return this.request('/admin/POST/admin-mgmt-remove', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async getExistingUsers(search?: string): Promise<ExistingUsersResponse> {
    const qs = buildQueryParams({ search });
    return this.request(`/admin/GET/existing-users${qs}`);
  }

  async getNewUsers(params?: {
    page?: number;
    limit?: number;
  }): Promise<NewUsersResponse> {
    const { page, limit } = validatePagination(params);
    const qs = buildQueryParams({ page, limit });
    return this.request(`/admin/GET/new-users${qs}`);
  }

  async getDeniedUsers(params?: {
    page?: number;
    limit?: number;
  }): Promise<DeniedUsersResponse> {
    const { page, limit } = validatePagination(params);
    const qs = buildQueryParams({ page, limit });
    return this.request(`/admin/GET/denied-users${qs}`);
  }

  async approveUsers(req: ApproveUsersRequest): Promise<{ message: string }> {
    return this.request('/admin/POST/approve-users', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async denyUsers(
    req: DenyUsersRequest,
  ): Promise<{ message: string; updatedCount?: number }> {
    return this.request('/admin/POST/deny-users', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async denyExistingUsers(req: DenyUsersRequest): Promise<{ message: string }> {
    return this.request('/admin/POST/deny-existing-users', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async reApproveUsers(
    req: ReApproveUsersRequest,
  ): Promise<{ message: string }> {
    return this.request('/admin/POST/re-approve-users', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async searchUsersByEmail(email: string): Promise<{
    users: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
    }>;
  }> {
    const qs = buildQueryParams({ email });
    return this.request(`/admin/GET/search-users${qs}`);
  }

  async getDoctorSpecialtyBreakdown(): Promise<SpecialtyBreakdownResponse> {
    return this.request('/admin/GET/doctor-specialty-breakdown');
  }

  async getStatisticsDoctorSpecialtySpread(): Promise<SpecialtyBreakdownResponse> {
    return this.request('/admin/GET/statistics/doctor-specialty-spread');
  }

  async getPatientIntake(): Promise<PatientIntakeGetResponse> {
    return this.request('/admin/GET/patient-intake');
  }

  async updatePatientIntake(
    req: PatientIntakeUpdateRequest,
  ): Promise<PatientIntakeUpdateResponse> {
    return this.request('/admin/POST/patient-intake', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async getUserNotifications(params?: {
    page?: number;
    limit?: number;
    userId?: string;
    type?: 'message' | 'alert' | 'all';
  }): Promise<UserNotificationsResponse> {
    const { page, limit } = validatePagination(params);
    const qs = buildQueryParams({
      page,
      limit,
      userId: params?.userId,
      type: params?.type,
    });
    return this.request(`/admin/GET/user-notifications${qs}`);
  }

  async getMedOrders(params?: {
    page?: number;
    limit?: number;
  }): Promise<MedOrdersResponse> {
    const { page, limit } = validatePagination(params);
    const qs = buildQueryParams({ page, limit });
    return this.request(`/admin/GET/med-orders${qs}`);
  }

  async forgotPasswordUserSearch(
    email: string,
  ): Promise<ForgotPasswordUserSearchResponse> {
    const qs = buildQueryParams({ email });
    return this.request(`/admin/GET/forgot-password/user-search${qs}`);
  }

  async generateForgotPasswordLink(
    req: GenerateForgotPasswordLinkRequest,
  ): Promise<GenerateForgotPasswordLinkResponse> {
    return this.request('/admin/POST/forgot-password-link', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async sendUserEmail(
    req: SendUserEmailRequest,
  ): Promise<{ success?: boolean; message: string }> {
    return this.request('/admin/POST/send-user-email', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async sendPasswordResetEmail(
    req: SendPasswordResetEmailRequest,
  ): Promise<{ message: string }> {
    return this.request('/admin/POST/send-password-reset-email', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Statistics endpoints
  async getStatistics(): Promise<StatisticsData> {
    // Fetch all statistics data in parallel
    const [
      newUsers,
      existingUsers,
      deniedUsers,
      admins,
      specialtyBreakdown,
      medOrders,
      notifications,
    ] = await Promise.all([
      this.getNewUsers({ page: 1, limit: 1 }),
      this.getExistingUsers(),
      this.getDeniedUsers({ page: 1, limit: 1 }),
      this.getExistingAdmins(),
      this.getStatisticsDoctorSpecialtySpread(),
      this.getMedOrders({ page: 1, limit: 1 }),
      this.getUserNotifications({ page: 1, limit: 1 }),
    ]);

    // Count users by account type
    const doctorCount = existingUsers.users.filter(
      u => u.accountType === 'Doctor',
    ).length;
    const triageCount = existingUsers.users.filter(
      u => u.accountType === 'Triage',
    ).length;

    const userCounts: UserCountStatistics = {
      totalUsers: existingUsers.users.length,
      newSignups: newUsers.totalPages * 10, // Estimate based on pagination
      existingUsers: existingUsers.users.length,
      deniedUsers: deniedUsers.totalPages * 10, // Estimate based on pagination
      adminUsers: admins.admins.length,
      doctorCount,
      triageCount,
    };

    const activityMetrics: ActivityMetrics = {
      medicalOrdersCount: medOrders.totalOrders || 0,
      notificationsCount: notifications.totalCount || 0,
      lastWeekSignups: 0, // Will be calculated if we have date filtering
      lastMonthSignups: 0, // Will be calculated if we have date filtering
    };

    return {
      userCounts,
      specialtyBreakdown: specialtyBreakdown.specialtyBreakdown,
      activityMetrics,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getPatientSpecialtyBreakdown(): Promise<SpecialtyBreakdownResponse> {
    return this.request('/admin/GET/statistics/patient-specialty-spread');
  }

  // Image Storage endpoints
  // Backed by the cached storage index on the web server, so sorting and page
  // numbers apply across the whole category rather than just the current page.

  async getImageStorageStats(
    refresh = false,
  ): Promise<ImageStorageStatsResponse> {
    const qs = refresh ? buildQueryParams({ refresh: 'true' }) : '';
    return this.request(`/admin/GET/image-storage/stats${qs}`);
  }

  async getImageStorageList(params?: {
    page?: number;
    limit?: number;
    sortBy?: 'uploadedAt' | 'fileName' | 'fileSize';
    order?: 'asc' | 'desc';
    category?: StorageCategoryId;
    group?: StorageCategoryGroup;
    search?: string;
    refresh?: boolean;
  }): Promise<ImageStorageListResponse> {
    const { page, limit } = validatePagination(params);
    const qs = buildQueryParams({
      page,
      limit,
      sortBy: params?.sortBy,
      order: params?.order,
      category: params?.category,
      group: params?.group,
      search: params?.search,
      refresh: params?.refresh ? 'true' : undefined,
    });
    return this.request(`/admin/GET/image-storage/list${qs}`);
  }

  async deleteImage(req: DeleteImageRequest): Promise<DeleteImageResponse> {
    // TODO: Backend endpoint to be implemented
    // POST /admin/POST/image-storage/delete
    return this.request('/admin/POST/image-storage/delete', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  async bulkDeleteImages(
    req: BulkDeleteImagesRequest,
  ): Promise<DeleteImageResponse> {
    // TODO: Backend endpoint to be implemented
    // POST /admin/POST/image-storage/bulk-delete
    return this.request('/admin/POST/image-storage/bulk-delete', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  }

  // Listing URLs expire after an hour; call this to re-sign one whose preview
  // is still open.
  //
  // With `variant: 'thumb'` it returns the derived thumbnail, generating it on
  // demand. `url` is null when no thumbnail is possible (HEIC, oversized, an
  // unrenderable PDF) — callers fall back to a type icon.
  async getImageSignedUrl(
    key: string,
    opts?: { variant?: 'thumb' },
  ): Promise<{ url: string | null; thumbStatus?: 'ready' | 'unavailable' }> {
    const qs = buildQueryParams({ key, variant: opts?.variant });
    return this.request(`/admin/GET/image-storage/signed-url${qs}`);
  }
}

export const adminApi = new AdminApiClient();
