// apps/mobile/src/services/api/BaseApiService.ts
// Dual-mode API service base class for HTTP + PowerSync integration

import { FeatureFlags, FeatureFlagUtils } from '../../config/featureFlags';
import { getApiUrl } from '../../config';
import { storageUtils } from '../../utils/storage';

// API Request/Response Types
export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
  timeout?: number;
  usePowerSync?: boolean;
  priority?: 'low' | 'normal' | 'high';
  retryOnFailure?: boolean;
  cacheOffline?: boolean;
  endpoint?: string; // Add endpoint property
}

export interface ApiResponse<T> {
  data: T;
  source: 'http' | 'powersync' | 'cache';
  synced: boolean;
  timestamp: Date;
  fromCache?: boolean;
}

// Error Types
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public source?: 'http' | 'powersync',
    public retryable: boolean = true,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class PowerSyncError extends ApiError {
  constructor(message: string, public originalError?: any) {
    super(message, undefined, 'powersync', true);
    this.name = 'PowerSyncError';
  }
}

export class NetworkError extends ApiError {
  constructor(message: string) {
    super(message, undefined, 'http', true);
    this.name = 'NetworkError';
  }
}

// Request Interceptor Types
export interface RequestInterceptor {
  onRequest?: (
    options: ApiRequestOptions,
  ) => Promise<ApiRequestOptions> | ApiRequestOptions;
  onResponse?: <T>(
    response: ApiResponse<T>,
  ) => Promise<ApiResponse<T>> | ApiResponse<T>;
  onError?: (error: ApiError) => Promise<ApiError> | ApiError;
}

// Abstract Base API Service
export abstract class BaseApiService {
  private requestInterceptors: RequestInterceptor[] = [];
  private responseInterceptors: RequestInterceptor[] = [];

  // Add request interceptor
  addRequestInterceptor(interceptor: RequestInterceptor): void {
    this.requestInterceptors.push(interceptor);
  }

  // Add response interceptor
  addResponseInterceptor(interceptor: RequestInterceptor): void {
    this.responseInterceptors.push(interceptor);
  }

  // Main request method with dual-mode support
  protected async request<T>(
    endpoint: string,
    options: ApiRequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const finalOptions = await this.applyRequestInterceptors(options);

    // Determine if PowerSync should be used
    const usePowerSync =
      finalOptions.usePowerSync ?? this.shouldUsePowerSync(endpoint);

    if (usePowerSync && FeatureFlags.USE_POWERSYNC) {
      try {
        const response = await this.powerSyncRequest<T>(endpoint, finalOptions);
        return await this.applyResponseInterceptors(response);
      } catch (error) {
        console.warn(
          `PowerSync request failed for ${endpoint}, falling back to HTTP`,
          error,
        );

        if (FeatureFlagUtils.isHttpFallbackEnabled()) {
          try {
            const response = await this.httpRequest<T>(endpoint, finalOptions);
            return await this.applyResponseInterceptors(response);
          } catch {
            return await this.handleError(error as ApiError, finalOptions);
          }
        }

        return await this.handleError(error as ApiError, finalOptions);
      }
    }

    try {
      const response = await this.httpRequest<T>(endpoint, finalOptions);
      return await this.applyResponseInterceptors(response);
    } catch (error) {
      return await this.handleError(error as ApiError, finalOptions);
    }
  }

  // Apply request interceptors
  private async applyRequestInterceptors(
    options: ApiRequestOptions,
  ): Promise<ApiRequestOptions> {
    let finalOptions = { ...options };

    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onRequest) {
        finalOptions = await interceptor.onRequest(finalOptions);
      }
    }

    return finalOptions;
  }

  // Apply response interceptors
  private async applyResponseInterceptors<T>(
    response: ApiResponse<T>,
  ): Promise<ApiResponse<T>> {
    let finalResponse = { ...response };

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onResponse) {
        finalResponse = await interceptor.onResponse(finalResponse);
      }
    }

    return finalResponse;
  }

  // Handle errors with retry logic and fallbacks
  private async handleError<T>(
    error: ApiError,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    // Apply error interceptors
    let finalError = error;
    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onError) {
        finalError = await interceptor.onError(finalError);
      }
    }

    // Check if we should retry
    if (options.retryOnFailure !== false && finalError.retryable) {
      const retryConfig = FeatureFlagUtils.getRetryConfig();

      for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
        try {
          console.log(
            `🔄 Retrying request (attempt ${attempt}/${retryConfig.maxAttempts})`,
          );

          // Exponential backoff
          if (attempt > 1) {
            await new Promise(resolve =>
              setTimeout(
                resolve,
                retryConfig.delayMs * Math.pow(2, attempt - 1),
              ),
            );
          }

          // Try HTTP fallback if PowerSync failed
          if (
            finalError.source === 'powersync' &&
            FeatureFlagUtils.isHttpFallbackEnabled()
          ) {
            const response = await this.httpRequest<T>(
              options.endpoint || '',
              options,
            );
            return await this.applyResponseInterceptors(response);
          }

          // Retry PowerSync if HTTP failed
          if (finalError.source === 'http' && FeatureFlags.USE_POWERSYNC) {
            const response = await this.powerSyncRequest<T>(
              options.endpoint || '',
              options,
            );
            return await this.applyResponseInterceptors(response);
          }
        } catch (retryError) {
          console.warn(`Retry attempt ${attempt} failed:`, retryError);
          finalError = retryError as ApiError;
        }
      }
    }

    // Check for offline cache fallback
    if (FeatureFlags.OFFLINE_CACHE_ENABLED && options.cacheOffline) {
      try {
        const cachedResponse = await this.getCachedResponse<T>(
          options.endpoint || '',
        );
        if (cachedResponse) {
          console.log('📦 Using cached response for:', options.endpoint);
          return await this.applyResponseInterceptors(cachedResponse);
        }
      } catch (cacheError) {
        console.warn('Cache fallback failed:', cacheError);
      }
    }

    throw finalError;
  }

  // HTTP request implementation
  protected async httpRequest<T>(
    endpoint: string,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<T>> {
    const url = getApiUrl(endpoint);

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authentication if available
    const token = storageUtils.getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    // Build request config
    const requestConfig: RequestInit = {
      method: options.method || 'GET',
      headers,
    };

    // Add body for non-GET requests
    if (options.body && options.method !== 'GET') {
      requestConfig.body = JSON.stringify(options.body);
    }

    // Add query parameters
    let finalUrl = url;
    if (options.params) {
      const urlObj = new URL(url);
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          urlObj.searchParams.set(key, String(value));
        }
      });
      finalUrl = urlObj.toString();
    }

    try {
      const response = await fetch(finalUrl, requestConfig);

      if (!response.ok) {
        await response.text();
        throw new ApiError(
          `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          'http',
          response.status >= 500, // Retry server errors
        );
      }

      const data = await response.json();

      return {
        data,
        source: 'http',
        synced: true,
        timestamp: new Date(),
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      // Network or other fetch errors
      throw new NetworkError(
        error instanceof Error ? error.message : 'Network request failed',
      );
    }
  }

  // PowerSync request implementation (to be overridden by subclasses)
  protected abstract powerSyncRequest<T>(
    endpoint: string,
    options: ApiRequestOptions,
  ): Promise<ApiResponse<T>>;

  // Determine if PowerSync should be used for an endpoint (to be overridden by subclasses)
  protected abstract shouldUsePowerSync(endpoint: string): boolean;

  // Cache management (optional, can be overridden)
  protected async getCachedResponse<T>(
    _endpoint: string,
  ): Promise<ApiResponse<T> | null> {
    // Default implementation - override in subclasses for caching
    return null;
  }

  protected async setCachedResponse<T>(
    _endpoint: string,
    _response: ApiResponse<T>,
  ): Promise<void> {
    // Default implementation - override in subclasses for caching
  }

  // Utility methods
  protected getAuthToken(): string | null | undefined {
    return storageUtils.getToken();
  }

  protected getCurrentUser(): any {
    return storageUtils.getUser();
  }

  protected isOnline(): boolean {
    // Basic online check - can be enhanced with more sophisticated detection
    // For now, assume online - implement proper network detection as needed
    return true;
  }

  // Logging helpers
  protected logRequest(
    endpoint: string,
    options: ApiRequestOptions,
    source: 'http' | 'powersync',
  ): void {
    if (__DEV__) {
      console.log(
        `📡 ${source.toUpperCase()} ${options.method || 'GET'} ${endpoint}`,
      );
    }
  }

  protected logResponse(
    endpoint: string,
    response: ApiResponse<any>,
    source: 'http' | 'powersync',
  ): void {
    if (__DEV__) {
      console.log(
        `✅ ${source.toUpperCase()} response for ${endpoint}:`,
        response.data,
      );
    }
  }

  protected logError(
    endpoint: string,
    error: ApiError,
    source: 'http' | 'powersync',
  ): void {
    console.error(
      `❌ ${source.toUpperCase()} error for ${endpoint}:`,
      error.message,
    );
  }
}
