import { storageUtils } from '../utils/storage';
import { TokenStorage } from './TokenStorage';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:3000') {
    this.baseUrl = baseUrl;
  }

  /**
   * Set the base URL for API calls (for switching between dev/prod)
   */
  setBaseUrl(url: string): void {
    this.baseUrl = url;
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Make an authenticated API request
   */
  private async request<T = any>(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const { requiresAuth = true, headers = {}, ...restOptions } = options;

    const url = `${this.baseUrl}${endpoint}`;
    const baseHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    const extraHeaders = Array.isArray(headers)
      ? {}
      : (headers as Record<string, string>);
    const finalHeaders: Record<string, string> = {
      ...baseHeaders,
      ...extraHeaders,
    };

    // Add JWT token if authentication is required
    if (requiresAuth) {
      // Use Auth token from TokenStorage (NOT PowerSync token!)
      const authToken = TokenStorage.getAuthToken();
      if (authToken) {
        finalHeaders.Authorization = `Bearer ${authToken}`;
        console.log('🔐 Added JWT auth token to request headers');
      } else {
        console.warn('⚠️ No JWT auth token found for authenticated request');
        return {
          error: 'Authentication required',
          status: 401,
        };
      }
    }

    try {
      console.log(`📡 API Request: ${options.method || 'GET'} ${url}`);

      const response = await fetch(url, {
        ...restOptions,
        headers: finalHeaders,
      });

      console.log(`📡 API Response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        // Try to parse error message from response
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.error ||
          errorData.message ||
          `Request failed: ${response.statusText}`;

        // If unauthorized, clear the stored auth
        if (response.status === 401) {
          console.log('🔐 Unauthorized response, clearing stored auth');
          storageUtils.clearAuth();
        }

        return {
          error: errorMessage,
          status: response.status,
        };
      }

      const data = await response.json();
      return {
        data,
        status: response.status,
      };
    } catch (error) {
      console.error('❌ API request error:', error);
      return {
        error:
          error instanceof Error ? error.message : 'Network request failed',
        status: 0,
      };
    }
  }

  /**
   * GET request
   */
  async get<T = any>(
    endpoint: string,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'GET',
    });
  }

  /**
   * POST request
   */
  async post<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T = any>(
    endpoint: string,
    data?: any,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T = any>(
    endpoint: string,
    options: Omit<RequestOptions, 'method' | 'body'> = {},
  ): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export API-specific functions for common operations
export const patientApi = {
  /**
   * Fetch all patients
   */
  async getPatients() {
    return apiClient.get('/api/patient');
  },

  /**
   * Fetch a single patient by ID
   */
  async getPatient(id: string) {
    return apiClient.get(`/api/patient/${id}`);
  },

  /**
   * Create a new patient
   */
  async createPatient(patientData: any) {
    return apiClient.post('/api/patient', patientData);
  },

  /**
   * Update a patient
   */
  async updatePatient(id: string, patientData: any) {
    return apiClient.patch(`/api/patient/${id}`, patientData);
  },

  /**
   * Update patient (using general endpoint with id in body)
   */
  async updatePatientGeneral(patientData: any) {
    return apiClient.patch('/api/patient', patientData);
  },
};

// Export other API modules as needed
export const userApi = {
  /**
   * Get current user profile
   */
  async getProfile() {
    return apiClient.get('/api/user/profile');
  },

  /**
   * Update user profile
   */
  async updateProfile(userData: any) {
    return apiClient.patch('/api/user/profile', userData);
  },

  /**
   * Get user by ID
   */
  async getUser(userId: string) {
    return apiClient.get(`/api/user/${userId}`);
  },

  /**
   * Update user by ID (for account type switching, etc.)
   */
  async updateUser(userId: string, userData: any) {
    return apiClient.patch(`/api/user/${userId}`, userData);
  },
};

// Helper to update base URL when environment changes
export function updateApiBaseUrl(url: string) {
  apiClient.setBaseUrl(url);
}
