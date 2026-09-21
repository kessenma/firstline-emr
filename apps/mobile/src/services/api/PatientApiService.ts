// apps/mobile/src/services/api/PatientApiService.ts
// Patient API Service with HTTP + PowerSync dual-mode support

import {
  BaseApiService,
  ApiRequestOptions,
  ApiResponse,
  ApiError,
} from './BaseApiService';
import { powerSyncService } from '../powersync/PowerSyncService';
import { FeatureFlagUtils } from '../../config/featureFlags';
import {
  Patient,
  PatientFilters,
  PatientListResponse,
  PatientWithMessages,
} from '../../types/patient';
import {
  PatientRow,
  rowToEntity,
  entityToRow,
  rowsToEntities,
  buildOrderByClause,
} from '../../utils/fieldMapping';

// Patient-specific API types
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortDirection?: 'ASC' | 'DESC';
}

export interface PatientQueryOptions extends PaginationOptions {
  filters?: PatientFilters;
}

export interface PatientSyncStatus {
  id: string;
  synced: boolean;
  lastSyncTime?: Date;
  pendingChanges: boolean;
  conflicted: boolean;
}

export interface WriteThroughResult {
  success: boolean;
  data?: Patient;
  syncStatus: PatientSyncStatus;
  error?: Error;
}

/**
 * Patient API Service
 * Handles all patient-related operations with HTTP and PowerSync support
 */
export class PatientApiService extends BaseApiService {
  private static instance: PatientApiService | null = null;
  private cacheKey = 'patients';

  private constructor() {
    super();
    this.setupInterceptors();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PatientApiService {
    if (!PatientApiService.instance) {
      PatientApiService.instance = new PatientApiService();
    }
    return PatientApiService.instance;
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Add authentication interceptor
    this.addRequestInterceptor({
      onRequest: async options => {
        const token = this.getAuthToken();
        if (token && !options.headers?.Authorization) {
          options.headers = {
            ...options.headers,
            Authorization: `Bearer ${token}`,
          };
        }
        return options;
      },
    });

    // Add response caching interceptor
    this.addResponseInterceptor({
      onResponse: async response => {
        // Cache successful responses for offline fallback
        if (response.source === 'http' && response.synced) {
          await this.setCachedResponse(this.cacheKey, response);
        }
        return response;
      },
    });
  }

  // ============================================================================
  // HTTP API Methods
  // ============================================================================

  /**
   * Get patients with pagination (HTTP)
   */
  async getPatients(
    options: PatientQueryOptions = {},
  ): Promise<ApiResponse<PatientListResponse>> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortDirection = 'DESC',
      filters,
    } = options;

    const params: Record<string, any> = {
      page,
      limit,
      sortBy,
      sortDirection,
    };

    // Add filters
    if (filters) {
      if (filters.status) params.status = filters.status;
      if (filters.priority) params.priority = filters.priority;
      if (filters.specialty) params.specialty = filters.specialty;
      if (filters.search) params.search = filters.search;
    }

    return this.request<PatientListResponse>('/api/patients', {
      method: 'GET',
      params,
      cacheOffline: true,
    });
  }

  /**
   * Get a single patient by ID (HTTP)
   */
  async getPatient(id: string): Promise<ApiResponse<Patient>> {
    return this.request<Patient>(`/api/patients/${id}`, {
      method: 'GET',
      cacheOffline: true,
    });
  }

  /**
   * Create a new patient (HTTP)
   */
  async createPatient(
    patient: Omit<Patient, 'id'>,
  ): Promise<ApiResponse<Patient>> {
    return this.request<Patient>('/api/patient', {
      method: 'POST',
      body: patient,
    });
  }

  /**
   * Update a patient (HTTP)
   */
  async updatePatient(
    id: string,
    updates: Partial<Patient>,
  ): Promise<ApiResponse<Patient>> {
    return this.request<Patient>(`/api/patients/${id}`, {
      method: 'PATCH',
      body: updates,
    });
  }

  /**
   * Delete a patient (HTTP)
   */
  async deletePatient(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/api/patients/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // PowerSync SQLite Methods (Offline-First)
  // ============================================================================

  /**
   * Get patients from PowerSync (offline-first)
   */
  async getPatientsOffline(
    options: PatientQueryOptions = {},
  ): Promise<ApiResponse<PatientListResponse>> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortDirection = 'DESC',
        filters,
      } = options;

      // Build WHERE clause from filters
      const whereConditions: string[] = [];
      const params: any[] = [];

      // Status filter
      if (filters?.status) {
        whereConditions.push('status = ?');
        params.push(filters.status);
      }

      // Priority filter
      if (filters?.priority) {
        whereConditions.push('priority = ?');
        params.push(filters.priority);
      }

      // Specialty filter
      if (filters?.specialty) {
        whereConditions.push('specialty = ?');
        params.push(filters.specialty);
      }

      // Search filter (name or chief complaint)
      if (filters?.search) {
        whereConditions.push(
          '(first_name LIKE ? OR last_name LIKE ? OR chief_complaint LIKE ?)',
        );
        const searchPattern = `%${filters.search}%`;
        params.push(searchPattern, searchPattern, searchPattern);
      }

      // Current user's patients only (if user is a doctor)
      const currentUser = this.getCurrentUser();
      if (currentUser?.accountType === 'Doctor') {
        whereConditions.push('doctor_id = ?');
        params.push(currentUser.id);
      }

      // Build final WHERE clause
      const whereClause =
        whereConditions.length > 0 ? whereConditions.join(' AND ') : undefined;

      // Calculate pagination
      const offset = (page - 1) * limit;

      // Get total count
      const totalCount = await powerSyncService.count(
        'patients',
        whereClause,
        params,
      );

      // Get paginated results
      const orderByClause = buildOrderByClause({
        field: sortBy,
        direction: sortDirection,
      });
      const rows = await powerSyncService.getAll<PatientRow>(
        'patients',
        whereClause,
        params,
        orderByClause.replace('ORDER BY ', ''),
        limit,
        offset,
      );

      // Convert to entities with camelCase
      const patients = rowsToEntities(rows) as Patient[];

      // Get unread message counts for each patient (if messages table exists)
      const patientsWithMessages: PatientWithMessages[] =
        await this.enrichWithMessageCounts(patients);

      return {
        data: {
          patients: patientsWithMessages,
          total: totalCount,
          page,
          limit,
        },
        source: 'powersync',
        synced: await this.isFullySynced(),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new ApiError(
        `PowerSync query failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        undefined,
        'powersync',
        true,
      );
    }
  }

  /**
   * Get a single patient by ID from PowerSync
   */
  async getPatientOffline(id: string): Promise<ApiResponse<Patient>> {
    try {
      const row = await powerSyncService.getById<PatientRow>('patients', id);

      if (!row) {
        throw new ApiError('Patient not found', 404, 'powersync', false);
      }

      // Convert to entity with camelCase
      const patient = rowToEntity(row) as Patient;

      return {
        data: patient,
        source: 'powersync',
        synced: await this.isFullySynced(),
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(
        `PowerSync query failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        undefined,
        'powersync',
        true,
      );
    }
  }

  /**
   * Search patients in PowerSync
   */
  async searchPatientsOffline(
    searchQuery: string,
  ): Promise<ApiResponse<Patient[]>> {
    try {
      const sql = `
        SELECT * FROM patients
        WHERE (first_name LIKE ? OR last_name LIKE ? OR chief_complaint LIKE ?)
        ORDER BY last_name ASC, first_name ASC
        LIMIT 50
      `;

      const searchPattern = `%${searchQuery}%`;
      const rows = await powerSyncService.query<PatientRow>(sql, [
        searchPattern,
        searchPattern,
        searchPattern,
      ]);

      const patients = rowsToEntities(rows) as Patient[];

      return {
        data: patients,
        source: 'powersync',
        synced: await this.isFullySynced(),
        timestamp: new Date(),
      };
    } catch (error) {
      throw new ApiError(
        `PowerSync search failed: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        undefined,
        'powersync',
        true,
      );
    }
  }

  // ============================================================================
  // Write-Through Operations (Offline + Sync)
  // ============================================================================

  /**
   * Create patient with write-through
   * Writes to local PowerSync DB immediately, syncs to server in background
   */
  async createPatientWriteThrough(
    patient: Omit<Patient, 'id'>,
  ): Promise<WriteThroughResult> {
    const patientId = this.generateUUID();

    try {
      // 1. Write to local PowerSync database first (for immediate feedback)
      const patientWithId = { ...patient, id: patientId };
      const dbRow = entityToRow(patientWithId);

      await powerSyncService.insert('patients', dbRow);

      // 2. Attempt to sync to server if online
      let serverPatient: Patient | undefined;

      if (this.isOnline() && FeatureFlagUtils.isHttpFallbackEnabled()) {
        try {
          const response = await this.createPatient(patientWithId);
          serverPatient = response.data;
        } catch (error) {
          console.warn('Server sync failed, will retry later:', error);
          // Local write succeeded, so this is acceptable
        }
      }

      // 3. Get sync status
      const syncStatus = await this.getPatientSyncStatus(patientId);

      return {
        success: true,
        data: serverPatient || patientWithId,
        syncStatus,
      };
    } catch (error) {
      return {
        success: false,
        syncStatus: {
          id: patientId,
          synced: false,
          pendingChanges: true,
          conflicted: false,
        },
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Update patient with write-through
   */
  async updatePatientWriteThrough(
    id: string,
    updates: Partial<Patient>,
  ): Promise<WriteThroughResult> {
    try {
      // 1. Write to local PowerSync database first
      const dbUpdates = entityToRow(updates);
      await powerSyncService.update('patients', id, dbUpdates);

      // 2. Attempt to sync to server if online
      let serverPatient: Patient | undefined;

      if (this.isOnline() && FeatureFlagUtils.isHttpFallbackEnabled()) {
        try {
          const response = await this.updatePatient(id, updates);
          serverPatient = response.data;
        } catch (error) {
          console.warn('Server sync failed, will retry later:', error);
        }
      }

      // 3. Get updated patient from local DB
      const localPatient = await this.getPatientOffline(id);

      // 4. Get sync status
      const syncStatus = await this.getPatientSyncStatus(id);

      return {
        success: true,
        data: serverPatient || localPatient.data,
        syncStatus,
      };
    } catch (error) {
      return {
        success: false,
        syncStatus: {
          id,
          synced: false,
          pendingChanges: true,
          conflicted: false,
        },
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  /**
   * Delete patient with write-through
   */
  async deletePatientWriteThrough(id: string): Promise<WriteThroughResult> {
    try {
      // 1. Delete from local PowerSync database first
      await powerSyncService.delete('patients', id);

      // 2. Attempt to sync to server if online
      let httpSuccess = false;

      if (this.isOnline() && FeatureFlagUtils.isHttpFallbackEnabled()) {
        try {
          await this.deletePatient(id);
          httpSuccess = true;
        } catch (error) {
          console.warn('Server sync failed, will retry later:', error);
        }
      }

      return {
        success: true,
        syncStatus: {
          id,
          synced: httpSuccess,
          pendingChanges: !httpSuccess,
          conflicted: false,
        },
      };
    } catch (error) {
      return {
        success: false,
        syncStatus: {
          id,
          synced: false,
          pendingChanges: true,
          conflicted: false,
        },
        error: error instanceof Error ? error : new Error('Unknown error'),
      };
    }
  }

  // ============================================================================
  // Sync Status Tracking
  // ============================================================================

  /**
   * Get sync status for a specific patient
   */
  async getPatientSyncStatus(id: string): Promise<PatientSyncStatus> {
    try {
      // Check if patient exists in local DB
      const patient = await powerSyncService.getById<PatientRow>(
        'patients',
        id,
      );

      if (!patient) {
        return {
          id,
          synced: false,
          pendingChanges: false,
          conflicted: false,
        };
      }

      // Check for pending changes in PowerSync crud table
      const pendingChanges = await powerSyncService.query<any>(
        'SELECT * FROM ps_crud WHERE id = ? AND uploaded = 0',
        [id],
      );

      // Check last sync time from PowerSync metadata
      const lastSyncTime = patient.powersync_updated_at
        ? new Date(patient.powersync_updated_at)
        : undefined;

      return {
        id,
        synced: pendingChanges.length === 0,
        lastSyncTime,
        pendingChanges: pendingChanges.length > 0,
        conflicted: false, // TODO: Implement conflict detection
      };
    } catch (error) {
      console.warn('Could not get sync status:', error);
      return {
        id,
        synced: false,
        pendingChanges: false,
        conflicted: false,
      };
    }
  }

  /**
   * Get all patients with pending sync
   */
  async getPatientsWithPendingSync(): Promise<PatientSyncStatus[]> {
    try {
      const pendingRecords = await powerSyncService.query<any>(
        'SELECT DISTINCT id FROM ps_crud WHERE table_name = ? AND uploaded = 0',
        ['patients'],
      );

      const statuses = await Promise.all(
        pendingRecords.map((record: any) =>
          this.getPatientSyncStatus(record.id),
        ),
      );

      return statuses;
    } catch (error) {
      console.warn('Could not get patients with pending sync:', error);
      return [];
    }
  }

  /**
   * Wait for patient to sync
   */
  async waitForPatientSync(
    id: string,
    timeoutMs: number = 30000,
  ): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const status = await this.getPatientSyncStatus(id);

      if (status.synced) {
        return true;
      }

      // Wait 500ms before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    return false;
  }

  // ============================================================================
  // PowerSync Implementation (Required by BaseApiService)
  // ============================================================================

  /**
   * PowerSync request implementation
   */
  protected async powerSyncRequest<T>(
    endpoint: string,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    // Route to appropriate offline method based on endpoint
    if (endpoint.includes('/patients')) {
      const parts = endpoint.split('/');
      const patientId = parts[parts.length - 1];

      // Single patient request
      if (patientId && patientId !== 'patients') {
        const response = await this.getPatientOffline(patientId);
        return response as ApiResponse<T>;
      }

      // List patients request
      const queryOptions: PatientQueryOptions = {
        page: options.params?.page,
        limit: options.params?.limit,
        sortBy: options.params?.sortBy,
        sortDirection: options.params?.sortDirection,
        filters: {
          status: options.params?.status,
          priority: options.params?.priority,
          specialty: options.params?.specialty,
          search: options.params?.search,
        },
      };

      const response = await this.getPatientsOffline(queryOptions);
      return response as ApiResponse<T>;
    }

    throw new ApiError(
      'Endpoint not supported for PowerSync',
      undefined,
      'powersync',
      false,
    );
  }

  /**
   * Determine if endpoint should use PowerSync
   */
  protected shouldUsePowerSync(endpoint: string): boolean {
    return (
      FeatureFlagUtils.isPowerSyncEnabled('patients') &&
      endpoint.includes('/patients')
    );
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Enrich patients with unread message counts
   */
  private async enrichWithMessageCounts(
    patients: Patient[],
  ): Promise<PatientWithMessages[]> {
    // TODO: Query messages table for unread counts
    // For now, return patients with zero unread messages
    return patients.map(patient => ({
      ...patient,
      unreadMessages: 0,
    }));
  }

  /**
   * Check if all data is fully synced
   */
  private async isFullySynced(): Promise<boolean> {
    try {
      const pendingCount = await powerSyncService.getPendingChangesCount();
      return pendingCount === 0;
    } catch {
      return false;
    }
  }

  /**
   * Generate UUID v4
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
      /[xy]/g,
      function (c) {
        /* eslint-disable no-bitwise */
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        /* eslint-enable no-bitwise */
        return v.toString(16);
      },
    );
  }

  /**
   * Cache management
   */
  protected async getCachedResponse<T>(
    _endpoint: string,
  ): Promise<ApiResponse<T> | null> {
    // TODO: Implement proper caching
    return null;
  }

  protected async setCachedResponse<T>(
    _key: string,
    _response: ApiResponse<T>,
  ): Promise<void> {
    // TODO: Implement proper caching
  }

  /**
   * Reset singleton instance (for testing)
   */
  static reset(): void {
    PatientApiService.instance = null;
  }
}

// Export singleton instance
export const patientApiService = PatientApiService.getInstance();
