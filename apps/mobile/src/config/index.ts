// Environment configuration for mobile app
import { Platform } from 'react-native';
import { storage } from '../utils/storage';

// Detect if running in development or production
const __DEV__ = process.env.NODE_ENV === 'development';

// Localhost address based on platform
const LOCALHOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';

// ---------------------------------------------------------------------------
// Server registry
// ---------------------------------------------------------------------------
// The app can point at more than one backend ("server"). This used to be locked
// to production; it is now a small registry persisted in MMKV so an admin/tester
// can point the app at a custom host from Settings — e.g. a new server's IP
// during a migration, or a QA environment. A "server" is really four URLs: the
// web app, its /api, a websocket, and the PowerSync sync service.

export type ServerId = 'production' | 'custom';

export interface ServerUrls {
  BASE_URL: string;
  API_URL: string;
  WS_URL: string;
  POWERSYNC_URL: string;
  // Object storage has two distinct URLs: the S3 API endpoint the backend uses
  // to read/write media (never touched by the app directly), and this one — the
  // RustFS admin console UI, which an admin opens in a browser.
  STORAGE_ADMIN_URL: string;
  // LiveKit SFU signalling endpoint for video consults. Always wss:// in
  // production — iOS ATS forbids cleartext, so a ws:// value only works
  // against a local dev server.
  LIVEKIT_URL: string;
}

export interface CustomServerConfig {
  baseUrl: string;
  powersyncUrl?: string;
}

// Storage keys for the active server selection + the user-entered custom server.
const ACTIVE_SERVER_KEY = '@fajr_emr:activeServer';
const CUSTOM_SERVER_KEY = '@fajr_emr:customServer';

// Canonical production URLs (also exposed as API_CONFIG.PROD for legacy callers).
const PRODUCTION_URLS: ServerUrls = {
  BASE_URL: 'https://fajrmission.org',
  API_URL: 'https://fajrmission.org/api',
  WS_URL: 'wss://fajrmission.org',
  POWERSYNC_URL: 'https://sync.fajrmission.org',
  STORAGE_ADMIN_URL: 'https://storage-admin.fajrmission.org',
  LIVEKIT_URL: 'wss://livekit.fajrmission.org',
};

/**
 * Best-effort guess of the PowerSync URL when a custom server doesn't specify one.
 * PowerSync runs on a different host/port than the web app:
 *   - explicit port (http://1.2.3.4:3000)  → swap it for :6061
 *   - otherwise (https://x.org)             → assume a "sync." subdomain
 * When in doubt, enter the PowerSync URL explicitly in the switcher.
 */
const guessPowerSyncUrl = (base: string): string => {
  const portMatch = base.match(/^(https?:\/\/[^/:]+):(\d+)$/);
  if (portMatch) return `${portMatch[1]}:6061`;
  return base.replace(/^(https?:\/\/)/, '$1sync.');
};

/**
 * Same idea for the RustFS admin console, which is not on the web app's host:
 *   - explicit port (http://1.2.3.4:3000)  → swap it for :9001 (RustFS console)
 *   - otherwise (https://x.org)             → assume a "storage-admin." subdomain
 * In production that subdomain sits behind oauth2-proxy, so it must be opened in
 * the system browser (SSO cookies) rather than an in-app WebView.
 */
const guessStorageAdminUrl = (base: string): string => {
  const portMatch = base.match(/^(https?:\/\/[^/:]+):(\d+)$/);
  if (portMatch) return `${portMatch[1]}:9001`;
  return base.replace(/^(https?:\/\/)/, '$1storage-admin.');
};

/**
 * Same idea for the LiveKit SFU, which is its own service on its own host:
 *   - explicit port (http://1.2.3.4:3000)  → swap it for :7880 (LiveKit HTTP)
 *   - otherwise (https://x.org)             → assume a "livekit." subdomain
 * Always returned as a ws/wss URL — the client connects over WebSocket.
 *
 * Note this is the SFU, not the patient-facing /call page on the web app.
 */
const guessLiveKitUrl = (base: string): string => {
  const toWs = (url: string) =>
    url.replace(/^http(s?):\/\//, (_m, s: string) => (s ? 'wss://' : 'ws://'));

  const portMatch = base.match(/^(https?:\/\/[^/:]+):(\d+)$/);
  if (portMatch) return toWs(`${portMatch[1]}:7880`);
  return toWs(base.replace(/^(https?:\/\/)/, '$1livekit.'));
};

/**
 * Derive the service URLs from a single base URL, e.g. "http://5.161.10.20:3000".
 * The PowerSync URL can be overridden explicitly since it usually lives elsewhere.
 */
export const deriveServerUrls = (
  baseInput: string,
  powersyncOverride?: string,
): ServerUrls => {
  const base = baseInput.trim().replace(/\/+$/, '');
  const wsBase = base.replace(/^http(s?):\/\//, (_m, s: string) =>
    s ? 'wss://' : 'ws://',
  );
  const powersync = powersyncOverride?.trim()
    ? powersyncOverride.trim().replace(/\/+$/, '')
    : guessPowerSyncUrl(base);
  return {
    BASE_URL: base,
    API_URL: `${base}/api`,
    WS_URL: wsBase,
    POWERSYNC_URL: powersync,
    STORAGE_ADMIN_URL: guessStorageAdminUrl(base),
    LIVEKIT_URL: guessLiveKitUrl(base),
  };
};

/** The currently-selected server id (defaults to production). */
export const getActiveServerId = (): ServerId => {
  try {
    return storage.getString(ACTIVE_SERVER_KEY) === 'custom'
      ? 'custom'
      : 'production';
  } catch {
    return 'production';
  }
};

/** The user-entered custom server, if any. */
export const getCustomServer = (): CustomServerConfig | null => {
  try {
    const raw = storage.getString(CUSTOM_SERVER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CustomServerConfig;
    return parsed?.baseUrl ? parsed : null;
  } catch {
    return null;
  }
};

/** Persist (but do not activate) the custom server config. */
export const setCustomServer = (config: CustomServerConfig): void => {
  storage.set(
    CUSTOM_SERVER_KEY,
    JSON.stringify({
      baseUrl: config.baseUrl.trim(),
      powersyncUrl: config.powersyncUrl?.trim() || undefined,
    }),
  );
};

/** Select which server the app should talk to. */
export const setActiveServer = (id: ServerId): void => {
  storage.set(ACTIVE_SERVER_KEY, id);
};

/** Resolve the URLs for the currently-active server. */
export const getActiveServerUrls = (): ServerUrls => {
  if (getActiveServerId() === 'custom') {
    const custom = getCustomServer();
    if (custom?.baseUrl) {
      return deriveServerUrls(custom.baseUrl, custom.powersyncUrl);
    }
  }
  return PRODUCTION_URLS;
};

export interface ActiveServerInfo {
  id: ServerId;
  label: string;
  urls: ServerUrls;
}

/** Human-facing description of the active server, for display in Settings. */
export const getActiveServerInfo = (): ActiveServerInfo => {
  const id = getActiveServerId();
  return {
    id,
    label: id === 'custom' ? 'Custom' : 'Production',
    urls: getActiveServerUrls(),
  };
};

// API Configuration
export const API_CONFIG = {
  // Development URLs (local web server)
  DEV: {
    BASE_URL: `http://${LOCALHOST}:3000`,
    API_URL: `http://${LOCALHOST}:3000/api`,
    WS_URL: `ws://${LOCALHOST}:3000`,
    POWERSYNC_URL: `http://${LOCALHOST}:6061`,
    STORAGE_ADMIN_URL: `http://${LOCALHOST}:9001`,
  },

  // Production URLs
  PROD: PRODUCTION_URLS,

  // The active server's URLs — production by default, or a custom server the
  // user selected in Settings. Read fresh on every access so new requests pick
  // up a server switch immediately (long-lived connections like PowerSync are
  // re-initialized on the sign-out that a switch triggers).
  get current(): ServerUrls {
    return getActiveServerUrls();
  },
};

// Auth Configuration
export const AUTH_CONFIG = {
  // NextAuth endpoints
  ENDPOINTS: {
    SIGNIN: '/auth/callback/credentials',
    SIGNOUT: '/auth/signout',
    SESSION: '/auth/session',
    CSRF: '/auth/csrf',
  },

  // Session configuration
  SESSION_TIMEOUT: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds

  // Token storage keys
  STORAGE_KEYS: {
    USER: '@fajr_emr:user',
    TOKEN: '@fajr_emr:token',
    SESSION: '@fajr_emr:session',
  },
};

// Database Configuration
export const DB_CONFIG = {
  NAME: 'fajr-emr',

  // Sync Gateway configuration (optional)
  SYNC_GATEWAY: {
    URL: __DEV__
      ? 'ws://localhost:4984/fajr-emr'
      : 'wss://your-sync-gateway-url.com/fajr-emr',
    ENABLED: false, // Set to true when you have Sync Gateway setup
  },
};

// App Configuration
export const APP_CONFIG = {
  NAME: 'Fajr EMR',
  VERSION: '1.0.0',

  // Feature flags
  FEATURES: {
    OFFLINE_MODE: true,
    BIOMETRIC_AUTH: true, // Passkey/biometric authentication enabled
    GOOGLE_SIGNIN: false, // Enable when implementing Google Sign-In
    AUTO_SYNC: false, // Enable when Sync Gateway is configured
  },

  // Network configuration
  NETWORK: {
    TIMEOUT: 30000, // 30 seconds
    RETRY_ATTEMPTS: 3,
    RETRY_DELAY: 1000, // 1 second
  },
};

// Translation model download config
export const TRANSLATION_CONFIG = {
  // API endpoint path for getting signed download URLs
  DOWNLOAD_URL_PATH: '/translation-models/download-url',
  // Model directions
  DIRECTIONS: ['ar-en', 'en-ar'] as const,
  // Local storage directory name (under DocumentDirectoryPath)
  MODELS_DIR: 'translation-models',
};

// Environment helpers — retained for backward compatibility. The app now uses a
// server registry (see getActiveServer* above) instead of a dev/prod toggle, so
// these report production and setEnvironment is a no-op.
export const setEnvironment = (_env: 'development' | 'production'): void => {};

export const getEnvironment = (): 'development' | 'production' => 'production';

// Export helper function to get API URL
export const getApiUrl = (endpoint: string = ''): string => {
  return endpoint
    ? `${API_CONFIG.current.API_URL}${endpoint}`
    : API_CONFIG.current.API_URL;
};

// Export helper function to get base URL
export const getBaseUrl = (): string => {
  return API_CONFIG.current.BASE_URL;
};

// Export helper function to get the object storage admin console URL
export const getStorageAdminUrl = (): string => {
  return API_CONFIG.current.STORAGE_ADMIN_URL;
};

export default {
  API_CONFIG,
  AUTH_CONFIG,
  DB_CONFIG,
  APP_CONFIG,
  getApiUrl,
  getBaseUrl,
  getStorageAdminUrl,
  setEnvironment,
  getEnvironment,
  getActiveServerId,
  getActiveServerInfo,
  getActiveServerUrls,
  getCustomServer,
  setActiveServer,
  setCustomServer,
  deriveServerUrls,
};
