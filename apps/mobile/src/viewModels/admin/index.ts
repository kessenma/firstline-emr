// apps/mobile/src/viewModels/admin/index.ts

/**
 * Admin ViewModels Index
 *
 * Central export file for all admin-related ViewModels (custom hooks).
 * These hooks contain the business logic and state management for each admin section.
 */

// User Management ViewModels
export { useNewSignupsViewModel } from './useNewSignupsViewModel';
export { useExistingUsersViewModel } from './useExistingUsersViewModel';
export { useAdminManagementViewModel } from './useAdminManagementViewModel';
export { useDeniedUsersViewModel } from './useDeniedUsersViewModel';
export { useUserCreationViewModel } from './useUserCreationViewModel';
export { usePasswordResetViewModel } from './usePasswordResetViewModel';

// Operations ViewModels
export { useNotificationsViewModel } from './useNotificationsViewModel';
export { useMedOrdersViewModel } from './useMedOrdersViewModel';
export { useStatisticsViewModel } from './useStatisticsViewModel';
export { useAnalyticsViewModel } from './useAnalyticsViewModel';
export { usePatientIntakeViewModel } from './usePatientIntakeViewModel';
export { useImageStorageViewModel } from './useImageStorageViewModel';
export { useClearTestDataViewModel } from './useClearTestDataViewModel';

// Admin Tools ViewModels
export { useProfileUpdateRequestsViewModel } from './useProfileUpdateRequestsViewModel';
export { useTranslationServiceViewModel } from './useTranslationServiceViewModel';
export { usePowerSyncViewModel } from './usePowerSyncViewModel';
