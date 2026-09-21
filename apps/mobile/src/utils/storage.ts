import { storage } from './mmkv';

export { storage };

/**
 * Get the stored authentication token
 */
export async function getStoredToken(): Promise<string | null> {
  try {
    // Try the new key first (from TokenStorage), fall back to legacy key
    const token = storage.getString('auth_token') || storage.getString('authToken');
    return token || null;
  } catch (error) {
    console.error('[Storage] Error getting token:', error);
    return null;
  }
}

/**
 * Store the authentication token
 */
export async function setStoredToken(token: string): Promise<void> {
  try {
    storage.set('authToken', token);
    console.log('[Storage] Token stored successfully');
  } catch (error) {
    console.error('[Storage] Error setting token:', error);
    throw error;
  }
}

/**
 * Remove the authentication token
 */
export async function removeStoredToken(): Promise<void> {
  try {
    storage.remove('authToken');
    console.log('[Storage] Token removed successfully');
  } catch (error) {
    console.error('[Storage] Error removing token:', error);
  }
}

/**
 * Get the stored user data
 */
export async function getStoredUser(): Promise<any | null> {
  try {
    const userJson = storage.getString('user');
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error('[Storage] Error getting user:', error);
    return null;
  }
}

/**
 * Store user data (also stores token separately)
 */
export async function setStoredUser(user: any): Promise<void> {
  try {
    storage.set('user', JSON.stringify(user));

    if (user.token) {
      await setStoredToken(user.token);
    }

    console.log('[Storage] User stored successfully');
  } catch (error) {
    console.error('[Storage] Error setting user:', error);
    throw error;
  }
}

/**
 * Remove stored user data
 */
export async function removeStoredUser(): Promise<void> {
  try {
    storage.remove('user');
    console.log('[Storage] User removed successfully');
  } catch (error) {
    console.error('[Storage] Error removing user:', error);
  }
}

/**
 * Clear all stored data
 */
export async function clearAllStorage(): Promise<void> {
  try {
    storage.clearAll();
    console.log('[Storage] All storage cleared');
  } catch (error) {
    console.error('[Storage] Error clearing storage:', error);
    throw error;
  }
}

/**
 * Legacy storage utilities for backward compatibility
 * Used by older parts of the codebase
 */
export const storageUtils = {
  getUser: () => {
    try {
      const userJson = storage.getString('user');
      return userJson ? JSON.parse(userJson) : null;
    } catch {
      return null;
    }
  },
  setUser: (user: any) => {
    storage.set('user', JSON.stringify(user));
    if (user.token) {
      storage.set('authToken', user.token);
    }
  },
  clearUser: () => {
    storage.remove('user');
    storage.remove('authToken');
  },
  clearAuth: () => {
    storage.remove('user');
    storage.remove('authToken');
  },
  getToken: () => {
    // Try the new key first (from TokenStorage), fall back to legacy key
    return storage.getString('auth_token') || storage.getString('authToken') || null;
  },
  get: (key: string) => {
    try {
      const value = storage.getString(key);
      if (!value) return null;
      try {
        return JSON.parse(value);
      } catch {
        return value;
      }
    } catch {
      return null;
    }
  },
  set: (key: string, value: any) => {
    try {
      const serialized =
        typeof value === 'string' ? value : JSON.stringify(value);
      storage.set(key, serialized);
    } catch (error) {
      console.error(`[Storage] Error setting ${key}:`, error);
    }
  },
  delete: (key: string) => {
    try {
      storage.remove(key);
    } catch (error) {
      console.error(`[Storage] Error deleting ${key}:`, error);
    }
  },
};
