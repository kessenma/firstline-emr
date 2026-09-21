/**
 * API Configuration Constants
 */

// Determine the API base URL based on environment
// For development, use your local machine's IP or ngrok URL
// For production, use your production API URL

const DEV_API_URL = __DEV__ 
  ? 'http://localhost:3000' // Change this to your backend URL
  : 'https://api.fajr-medflow.com'; // Production URL

export const API_BASE_URL = DEV_API_URL;

/**
 * API Endpoints
 */
export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    LOGOUT: '/api/auth/logout',
    EMAIL_CHECK: '/api/auth/signup/email-check',
  },

  // Admin endpoints
  ADMIN: {
    NEW_SIGNUPS: '/api/admin/GET/new-signups',
    EXISTING_USERS: '/api/admin/GET/existing-users',
    DENIED_USERS: '/api/admin/GET/denied-users',
    ADMINS: '/api/admin/GET/admins',
    APPROVE_USERS: '/api/admin/POST/approve-users',
    DENY_USERS: '/api/admin/POST/deny-users',
    DENY_EXISTING_USERS: '/api/admin/POST/deny-existing-users',
    REINSTATE_USERS: '/api/admin/POST/reinstate-users',
    ADD_ADMIN: '/api/admin/POST/add-admin',
    REMOVE_ADMIN: '/api/admin/POST/remove-admin',
    PASSWORD_RESET: {
      SEARCH: '/api/admin/GET/forgot-password/user-search',
      GENERATE_LINK: '/api/admin/POST/forgot-password-link',
      SEND_EMAIL: '/api/admin/POST/send-password-reset-email',
      CLEAR_EXPIRED: '/api/admin/POST/clear-expired-password-links',
    },
    NOTIFICATIONS: '/api/notifications/admin',
    NOTIFICATION_HISTORY: '/api/admin/GET/admin-notifications',
    MEDICAL_ORDERS: '/api/admin/GET/medical-orders',
    STATISTICS: '/api/admin/GET/statistics',
    IMAGE_STORAGE: '/api/admin/GET/image-storage',
    PATIENT_INTAKE: '/api/admin/GET/patient-intake-settings',
    CREATE_USER: '/api/admin-signup/create-user',
    SEND_FOLLOW_UP: '/api/admin-signup/send-follow-up',
  },

  // User endpoints
  USER: {
    PROFILE: '/api/user',
    UPDATE: (userId: string) => `/api/user/${userId}`,
    SEARCH: '/api/admin/GET/user-search',
  },
} as const;

/**
 * Request timeout in milliseconds
 */
export const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;
