// apps/mobile/src/navigation/index.ts

/**
 * Navigation Index
 *
 * Central export file for all navigation-related modules.
 */

export { MainNavigator } from './MainNavigator';
export type { SessionUser } from './MainNavigator';

export { AdminStackNavigator } from './AdminStackNavigator';
export type { AdminStackParamList } from './AdminStackNavigator';

export {
  isUserAdmin,
  canAccessAdmin,
  showAccessDeniedAlert,
  navigateToAdmin,
  parseAdminDeepLink,
  validateAdminRoute,
  shouldShowAdminTab,
  isAdminRoute,
  getAdminBadgeCount,
  logAdminNavigation,
  handleAdminRouteError,
  AdminRoutes,
  adminLinkingConfig,
  adminNavigationOptions,
} from './navigationUtils';

export type { AdminRouteName } from './navigationUtils';
