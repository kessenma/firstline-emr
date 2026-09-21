import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { storageUtils } from '../utils/storage';
import type { AdminUser } from '@fajr/shared/admin';
import { AdminPermission } from '@fajr/shared/admin';

export { AdminPermission };

// Storage keys for admin-specific data
const ADMIN_STORAGE_KEYS = {
  ADMIN_SESSION: '@fajr_emr:admin_session',
  ADMIN_PERMISSIONS: '@fajr_emr:admin_permissions',
  ADMIN_LAST_ACTIVITY: '@fajr_emr:admin_last_activity',
} as const;

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

interface AdminSession {
  adminUser: AdminUser;
  permissions: AdminPermission[];
  lastActivity: number;
  expiresAt: number;
}

interface AdminContextType {
  // Session state
  isAdmin: boolean;
  isAdminSessionActive: boolean;
  adminUser: AdminUser | null;
  permissions: AdminPermission[];
  
  // Session management
  initializeAdminSession: () => Promise<boolean>;
  refreshAdminSession: () => Promise<boolean>;
  endAdminSession: () => void;
  updateLastActivity: () => void;
  
  // Permission checking
  hasPermission: (permission: AdminPermission) => boolean;
  hasAnyPermission: (permissions: AdminPermission[]) => boolean;
  hasAllPermissions: (permissions: AdminPermission[]) => boolean;
  
  // Loading and error states
  isLoading: boolean;
  error: Error | null;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

interface AdminProviderProps {
  children: React.ReactNode;
}

export const AdminProvider: React.FC<AdminProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminSessionActive, setIsAdminSessionActive] = useState(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Check if user is admin on mount
  useEffect(() => {
    checkAdminStatus();
  }, []);

  // Auto-refresh session activity
  useEffect(() => {
    if (isAdminSessionActive) {
      const interval = setInterval(() => {
        checkSessionTimeout();
      }, 60000); // Check every minute

      return () => clearInterval(interval);
    }
  }, [isAdminSessionActive]);

  /**
   * Check if current user has admin privileges
   */
  const checkAdminStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user from storage
      const currentUser = storageUtils.getUser();
      
      if (!currentUser) {
        setIsAdmin(false);
        setIsAdminSessionActive(false);
        setIsLoading(false);
        return;
      }

      // Check if user has admin flag
      if (currentUser.isAdmin) {
        setIsAdmin(true);
        
        // Try to restore admin session
        const sessionRestored = await restoreAdminSession();
        
        if (!sessionRestored) {
          // User is admin but no active session
          setIsAdminSessionActive(false);
        }
      } else {
        setIsAdmin(false);
        setIsAdminSessionActive(false);
      }
    } catch (err) {
      const checkError = err as Error;
      setError(checkError);
      console.error('❌ Error checking admin status:', checkError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Restore admin session from storage
   */
  const restoreAdminSession = useCallback(async (): Promise<boolean> => {
    try {
      const sessionData = storageUtils.get(ADMIN_STORAGE_KEYS.ADMIN_SESSION);
      
      if (!sessionData) {
        return false;
      }

      const session: AdminSession = JSON.parse(sessionData);
      
      // Check if session is expired
      if (Date.now() > session.expiresAt) {
        console.log('⏰ Admin session expired');
        endAdminSession();
        return false;
      }

      // Check for inactivity timeout
      const timeSinceLastActivity = Date.now() - session.lastActivity;
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        console.log('⏰ Admin session timed out due to inactivity');
        endAdminSession();
        return false;
      }

      // Restore session
      setAdminUser(session.adminUser);
      setPermissions(session.permissions);
      setIsAdminSessionActive(true);
      
      // Update last activity
      updateLastActivity();
      
      console.log('✅ Admin session restored');
      return true;
    } catch (err) {
      console.error('❌ Error restoring admin session:', err);
      return false;
    }
  }, []);

  /**
   * Initialize admin session
   */
  const initializeAdminSession = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Get current user
      const currentUser = storageUtils.getUser();
      
      if (!currentUser || !currentUser.isAdmin) {
        throw new Error('User is not an admin');
      }

      // Create admin user object
      const admin: AdminUser = {
        id: currentUser.id,
        userId: currentUser.id,
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        email: currentUser.email,
        adminStartDate: new Date().toISOString(),
      };

      // Get admin permissions (in a real app, fetch from API)
      const adminPermissions = await fetchAdminPermissions(currentUser.id);

      // Create session
      const session: AdminSession = {
        adminUser: admin,
        permissions: adminPermissions,
        lastActivity: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
      };

      // Save session to storage
      storageUtils.set(ADMIN_STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(session));
      storageUtils.set(ADMIN_STORAGE_KEYS.ADMIN_PERMISSIONS, JSON.stringify(adminPermissions));
      storageUtils.set(ADMIN_STORAGE_KEYS.ADMIN_LAST_ACTIVITY, Date.now().toString());

      // Update state
      setAdminUser(admin);
      setPermissions(adminPermissions);
      setIsAdminSessionActive(true);

      console.log('✅ Admin session initialized');
      return true;
    } catch (err) {
      const initError = err as Error;
      setError(initError);
      console.error('❌ Error initializing admin session:', initError);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Refresh admin session (extend expiry)
   */
  const refreshAdminSession = useCallback(async (): Promise<boolean> => {
    try {
      if (!isAdminSessionActive || !adminUser) {
        return false;
      }

      // Update session expiry
      const sessionData = storageUtils.get(ADMIN_STORAGE_KEYS.ADMIN_SESSION);
      
      if (!sessionData) {
        return false;
      }

      const session: AdminSession = JSON.parse(sessionData);
      session.expiresAt = Date.now() + (24 * 60 * 60 * 1000); // Extend by 24 hours
      session.lastActivity = Date.now();

      storageUtils.set(ADMIN_STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(session));
      storageUtils.set(ADMIN_STORAGE_KEYS.ADMIN_LAST_ACTIVITY, Date.now().toString());

      console.log('✅ Admin session refreshed');
      return true;
    } catch (err) {
      console.error('❌ Error refreshing admin session:', err);
      return false;
    }
  }, [isAdminSessionActive, adminUser]);

  /**
   * End admin session
   */
  const endAdminSession = useCallback(() => {
    try {
      // Clear session data
      storageUtils.delete(ADMIN_STORAGE_KEYS.ADMIN_SESSION);
      storageUtils.delete(ADMIN_STORAGE_KEYS.ADMIN_PERMISSIONS);
      storageUtils.delete(ADMIN_STORAGE_KEYS.ADMIN_LAST_ACTIVITY);

      // Reset state
      setAdminUser(null);
      setPermissions([]);
      setIsAdminSessionActive(false);

      console.log('✅ Admin session ended');
    } catch (err) {
      console.error('❌ Error ending admin session:', err);
    }
  }, []);

  /**
   * Update last activity timestamp
   */
  const updateLastActivity = useCallback(() => {
    try {
      if (!isAdminSessionActive) {
        return;
      }

      const sessionData = storageUtils.get(ADMIN_STORAGE_KEYS.ADMIN_SESSION);
      
      if (!sessionData) {
        return;
      }

      const session: AdminSession = JSON.parse(sessionData);
      session.lastActivity = Date.now();

      storageUtils.set(ADMIN_STORAGE_KEYS.ADMIN_SESSION, JSON.stringify(session));
      storageUtils.set(ADMIN_STORAGE_KEYS.ADMIN_LAST_ACTIVITY, Date.now().toString());
    } catch (err) {
      console.error('❌ Error updating last activity:', err);
    }
  }, [isAdminSessionActive]);

  /**
   * Check for session timeout
   */
  const checkSessionTimeout = useCallback(() => {
    try {
      const sessionData = storageUtils.get(ADMIN_STORAGE_KEYS.ADMIN_SESSION);
      
      if (!sessionData) {
        return;
      }

      const session: AdminSession = JSON.parse(sessionData);
      
      // Check expiry
      if (Date.now() > session.expiresAt) {
        console.log('⏰ Admin session expired');
        endAdminSession();
        return;
      }

      // Check inactivity
      const timeSinceLastActivity = Date.now() - session.lastActivity;
      if (timeSinceLastActivity > SESSION_TIMEOUT) {
        console.log('⏰ Admin session timed out due to inactivity');
        endAdminSession();
      }
    } catch (err) {
      console.error('❌ Error checking session timeout:', err);
    }
  }, [endAdminSession]);

  /**
   * Check if user has a specific permission
   */
  const hasPermission = useCallback((permission: AdminPermission): boolean => {
    return permissions.includes(permission);
  }, [permissions]);

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = useCallback((perms: AdminPermission[]): boolean => {
    return perms.some(p => permissions.includes(p));
  }, [permissions]);

  /**
   * Check if user has all of the specified permissions
   */
  const hasAllPermissions = useCallback((perms: AdminPermission[]): boolean => {
    return perms.every(p => permissions.includes(p));
  }, [permissions]);

  const value = useMemo(
    () => ({
      isAdmin,
      isAdminSessionActive,
      adminUser,
      permissions,
      initializeAdminSession,
      refreshAdminSession,
      endAdminSession,
      updateLastActivity,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isLoading,
      error,
    }),
    [
      isAdmin,
      isAdminSessionActive,
      adminUser,
      permissions,
      initializeAdminSession,
      refreshAdminSession,
      endAdminSession,
      updateLastActivity,
      hasPermission,
      hasAnyPermission,
      hasAllPermissions,
      isLoading,
      error,
    ]
  );

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};

/**
 * Hook to use admin context
 */
export const useAdmin = (): AdminContextType => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
};

/**
 * Hook to check if user is admin (convenience)
 */
export const useIsAdmin = (): boolean => {
  const { isAdmin } = useAdmin();
  return isAdmin;
};

/**
 * Hook to check if admin session is active (convenience)
 */
export const useIsAdminSessionActive = (): boolean => {
  const { isAdminSessionActive } = useAdmin();
  return isAdminSessionActive;
};

/**
 * Fetch admin permissions from API
 * TODO: Replace with actual API call
 */
async function fetchAdminPermissions(_userId: string): Promise<AdminPermission[]> {
  // For now, return all permissions
  // In production, fetch from API based on admin role
  return [
    AdminPermission.MANAGE_USERS,
    AdminPermission.MANAGE_ADMINS,
    AdminPermission.VIEW_ANALYTICS,
    AdminPermission.MANAGE_NOTIFICATIONS,
    AdminPermission.MANAGE_SETTINGS,
    AdminPermission.DELETE_DATA,
  ];
}

export default AdminContext;
