// apps/mobile/src/navigation/navigationUtils.ts

import { Alert } from 'react-native';
import type { SessionUser } from './MainNavigator';

/**
 * Navigation Utilities
 *
 * Helper functions for navigation and role-based access control.
 */

/**
 * Check if a user has admin privileges
 */
export function isUserAdmin(user: SessionUser | null): boolean {
  if (!user) {
    return false;
  }
  return user.isAdmin === true;
}

/**
 * Check if a user can access admin features
 * Can be extended with more complex logic if needed
 */
export function canAccessAdmin(user: SessionUser | null): boolean {
  return isUserAdmin(user);
}

/**
 * Show access denied alert for non-admin users
 */
export function showAccessDeniedAlert(
  title: string = 'Access Denied',
  message: string = 'You do not have permission to access this feature.',
): void {
  Alert.alert(title, message, [{ text: 'OK', style: 'default' }]);
}

/**
 * Navigate to admin dashboard with role check
 */
export function navigateToAdmin(
  navigation: any,
  user: SessionUser | null,
): boolean {
  if (!canAccessAdmin(user)) {
    showAccessDeniedAlert(
      'Admin Access Required',
      'This feature is only available to administrators.',
    );
    return false;
  }

  try {
    navigation.navigate('Admin', { screen: 'AdminDashboard' });
    return true;
  } catch (error) {
    console.error('Navigation to admin failed:', error);
    Alert.alert('Error', 'Failed to navigate to admin dashboard.');
    return false;
  }
}

/**
 * Deep linking configuration for admin routes
 */
export const adminLinkingConfig = {
  admin: {
    path: 'admin',
    screens: {
      AdminDashboard: 'dashboard',
      // Add more admin screens here as they're created
      // AdminUserDetail: {
      //   path: 'users/:userId',
      //   parse: {
      //     userId: (userId: string) => userId,
      //   },
      // },
    },
  },
};

/**
 * Parse deep link URL for admin routes
 */
export function parseAdminDeepLink(url: string): {
  screen?: string;
  params?: Record<string, string>;
} | null {
  // fajrmission://admin/dashboard
  // https://fajrmission.org/admin/dashboard
  const adminPathMatch = url.match(/admin\/([^?]+)/);

  if (!adminPathMatch) {
    return null;
  }

  const path = adminPathMatch[1];

  if (path === 'dashboard') {
    return { screen: 'AdminDashboard' };
  }

  // Add more route parsing here as needed
  // Example:
  // if (path.startsWith('users/')) {
  //   const userId = path.split('/')[1];
  //   return { screen: 'AdminUserDetail', params: { userId } };
  // }

  return null;
}

/**
 * Validate admin route access
 */
export function validateAdminRoute(
  user: SessionUser | null,
  _routeName: string,
): boolean {
  // All admin routes require admin access
  if (!canAccessAdmin(user)) {
    return false;
  }

  // Can add route-specific checks here if needed
  // Example:
  // if (routeName === 'AdminSettings' && !user?.isSuperAdmin) {
  //   return false;
  // }

  return true;
}

/**
 * Get admin tab visibility
 */
export function shouldShowAdminTab(user: SessionUser | null): boolean {
  return isUserAdmin(user);
}

/**
 * Admin route names for type safety
 */
export const AdminRoutes = {
  ADMIN_TAB: 'Admin',
  ADMIN_DASHBOARD: 'AdminDashboard',
  // Add more routes here as they're created
  // ADMIN_USER_DETAIL: 'AdminUserDetail',
  // ADMIN_SETTINGS: 'AdminSettings',
} as const;

export type AdminRouteName = (typeof AdminRoutes)[keyof typeof AdminRoutes];

/**
 * Check if current route is an admin route
 */
export function isAdminRoute(routeName: string): boolean {
  return Object.values(AdminRoutes).includes(routeName as AdminRouteName);
}

/**
 * Get admin tab badge count (for future use)
 * Can be used to show pending approvals, notifications, etc.
 */
export function getAdminBadgeCount(user: SessionUser | null): number {
  if (!isUserAdmin(user)) {
    return 0;
  }

  // TODO: Implement badge count logic
  // This could fetch pending approvals, notifications, etc.
  // For now, return 0
  return 0;
}

/**
 * Admin navigation options
 */
export const adminNavigationOptions = {
  tabBarBadge: undefined, // Will be set dynamically based on getAdminBadgeCount
  tabBarBadgeStyle: {
    backgroundColor: '#FF3B30',
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  headerShown: false, // Stack navigator handles its own header
};

/**
 * Log admin navigation events (for analytics)
 */
export function logAdminNavigation(
  user: SessionUser | null,
  screen: string,
  action: 'view' | 'navigate',
): void {
  if (!isUserAdmin(user)) {
    return;
  }

  const logData = {
    userId: user?.id,
    userEmail: user?.email,
    screen,
    action,
    timestamp: new Date().toISOString(),
  };

  // TODO: Send to analytics service
  console.log('📊 Admin Navigation:', logData);
}

/**
 * Handle admin route error
 */
export function handleAdminRouteError(
  error: Error,
  routeName: string,
): void {
  console.error(`Admin route error (${routeName}):`, error);

  Alert.alert(
    'Navigation Error',
    'An error occurred while navigating. Please try again.',
    [{ text: 'OK', style: 'default' }],
  );
}
