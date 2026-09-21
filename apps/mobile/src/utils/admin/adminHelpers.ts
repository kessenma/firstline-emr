// apps/mobile/src/utils/admin/adminHelpers.ts
// Re-exports shared utils + mobile-only normalizer.

export { buildQueryParams, validatePagination, formatFullName, isValidEmail } from '@fajr/shared/admin';

import type { AdminUser } from '@fajr/shared/admin';

/** Normalize a raw API response row (snake_case or camelCase) into an AdminUser. */
export function normalizeAdmin(admin: any): AdminUser {
  return {
    id: String(admin.id),
    userId: String(admin.userId ?? admin.user_id ?? ''),
    firstName: String(admin.firstName ?? admin.first_name ?? ''),
    lastName: String(admin.lastName ?? admin.last_name ?? ''),
    email: String(admin.email ?? ''),
    adminStartDate: admin.adminStartDate ?? admin.admin_start_date,
  };
}
