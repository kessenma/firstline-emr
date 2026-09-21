// apps/mobile/src/config/featureFlags.ts
// Feature flags for PowerSync rollout and migration control

export interface FeatureFlagsType {
  // PowerSync rollout control
  USE_POWERSYNC: boolean;
  POWERSYNC_OFFLINE_MODE: boolean;

  // Per-service enablement
  POWERSYNC_SERVICES: {
    patients: boolean;
    notes: boolean;
    messages: boolean;
    notifications: boolean;
  };

  // Sync behavior
  POWERSYNC_SYNC_STRATEGY: 'incremental' | 'full';
  POWERSYNC_MAX_RETRY_ATTEMPTS: number;
  POWERSYNC_RETRY_DELAY_MS: number;

  // Fallback behavior
  HTTP_FALLBACK_ENABLED: boolean;
  OFFLINE_CACHE_ENABLED: boolean;

  // Offline translation
  OFFLINE_TRANSLATION: boolean;

  // Voice dictation (on-device STT + optional LLM field extraction)
  VOICE_DICTATION: boolean;
  VOICE_DICTATION_LLM: boolean;


  // Two-factor authentication
  REQUIRE_2FA_LOGIN: boolean;
  TWO_FA_GRACE_PERIOD_DAYS: number;
  SKIP_2FA_IN_DEV: boolean;
  CROSS_DEVICE_PASSKEY_AUTH: boolean;

  // Migration control
  USE_POSTGRESQL_API: boolean;

  // Performance tuning
  SYNC_BATCH_SIZE: number;
  SYNC_INTERVAL_MS: number;
}

// Load feature flags from environment variables with defaults
export const FeatureFlags: FeatureFlagsType = {
  // PowerSync rollout control
  USE_POWERSYNC: true, // Enabled for development/testing
  POWERSYNC_OFFLINE_MODE: true, // Enabled for development/testing

  // Per-service enablement (progressive rollout)
  POWERSYNC_SERVICES: {
    patients: true, // Enabled for development/testing
    notes: true, // Enabled for development/testing
    messages: true, // Enabled for development/testing
    notifications: true, // Enabled for development/testing
  },

  // Sync behavior
  POWERSYNC_SYNC_STRATEGY:
    (process.env.POWERSYNC_SYNC_STRATEGY as 'incremental' | 'full') ||
    'incremental',
  POWERSYNC_MAX_RETRY_ATTEMPTS: parseInt(
    process.env.POWERSYNC_MAX_RETRY_ATTEMPTS || '3',
  ),
  POWERSYNC_RETRY_DELAY_MS: parseInt(
    process.env.POWERSYNC_RETRY_DELAY_MS || '1000',
  ),

  // Offline translation (on-device CTranslate2 models)
  OFFLINE_TRANSLATION: true,

  // Voice dictation (on-device SFSpeechRecognizer STT + optional Llama LLM extraction)
  VOICE_DICTATION: true,
  VOICE_DICTATION_LLM: true,


  // Two-factor authentication
  REQUIRE_2FA_LOGIN: process.env.REQUIRE_2FA_LOGIN === 'true',
  TWO_FA_GRACE_PERIOD_DAYS: parseInt(process.env.TWO_FA_GRACE_PERIOD_DAYS || '14'),
  SKIP_2FA_IN_DEV: __DEV__ && process.env.SKIP_2FA_IN_DEV !== 'false',
  CROSS_DEVICE_PASSKEY_AUTH: process.env.CROSS_DEVICE_PASSKEY_AUTH === 'true',

  // Fallback behavior
  HTTP_FALLBACK_ENABLED: process.env.HTTP_FALLBACK_ENABLED !== 'false', // Default true
  OFFLINE_CACHE_ENABLED: process.env.OFFLINE_CACHE_ENABLED !== 'false', // Default true

  // Migration control
  USE_POSTGRESQL_API: process.env.USE_POSTGRESQL_API !== 'false', // Default true

  // Performance tuning
  SYNC_BATCH_SIZE: parseInt(process.env.SYNC_BATCH_SIZE || '100'),
  SYNC_INTERVAL_MS: parseInt(process.env.SYNC_INTERVAL_MS || '30000'),
};

// Utility functions for feature flag management
export const FeatureFlagUtils = {
  /**
   * Check if PowerSync is enabled for a specific service
   */
  isPowerSyncEnabled(
    serviceName: keyof FeatureFlagsType['POWERSYNC_SERVICES'],
  ): boolean {
    return (
      FeatureFlags.USE_POWERSYNC && FeatureFlags.POWERSYNC_SERVICES[serviceName]
    );
  },

  /**
   * Check if offline mode is available
   */
  isOfflineModeEnabled(): boolean {
    return FeatureFlags.USE_POWERSYNC && FeatureFlags.POWERSYNC_OFFLINE_MODE;
  },

  /**
   * Check if HTTP fallback is enabled
   */
  isHttpFallbackEnabled(): boolean {
    return FeatureFlags.HTTP_FALLBACK_ENABLED;
  },

  /**
   * Get retry configuration
   */
  getRetryConfig(): { maxAttempts: number; delayMs: number } {
    return {
      maxAttempts: FeatureFlags.POWERSYNC_MAX_RETRY_ATTEMPTS,
      delayMs: FeatureFlags.POWERSYNC_RETRY_DELAY_MS,
    };
  },

  /**
   * Check if PostgreSQL API should be used
   */
  shouldUsePostgreSQL(): boolean {
    return FeatureFlags.USE_POSTGRESQL_API;
  },

  /**
   * Get performance configuration
   */
  getPerformanceConfig(): { batchSize: number; intervalMs: number } {
    return {
      batchSize: FeatureFlags.SYNC_BATCH_SIZE,
      intervalMs: FeatureFlags.SYNC_INTERVAL_MS,
    };
  },
};

// Development helpers (only available in development)
if (__DEV__) {
  // Log current feature flag state
  console.log('🔧 Feature Flags:', {
    USE_POWERSYNC: FeatureFlags.USE_POWERSYNC,
    POWERSYNC_OFFLINE_MODE: FeatureFlags.POWERSYNC_OFFLINE_MODE,
    POWERSYNC_SERVICES: FeatureFlags.POWERSYNC_SERVICES,
    USE_POSTGRESQL_API: FeatureFlags.USE_POSTGRESQL_API,
  });

  // Global access for debugging
  (global as any).FeatureFlags = FeatureFlags;
  (global as any).FeatureFlagUtils = FeatureFlagUtils;
}
