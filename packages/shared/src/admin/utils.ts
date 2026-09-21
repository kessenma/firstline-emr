// packages/shared/src/admin/utils.ts
// Pure utility functions shared across web and mobile admin dashboards.

import type { PaginationParams, AdminSectionMeta, AdminSectionId, AdminSectionCategory } from './index';
import { ADMIN_SECTIONS, DEFAULT_PAGE, DEFAULT_PAGE_SIZE, ADMIN_CATEGORY_ORDER } from './constants';

/** Build a URL query string from a params object. Omits undefined/null values. */
export function buildQueryParams(params: Record<string, string | number | boolean | undefined>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.set(key, String(value));
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

/** Clamp pagination params to valid positive integers with defaults. */
export function validatePagination(params?: PaginationParams): Required<PaginationParams> {
  const page = params?.page && params.page > 0 ? params.page : DEFAULT_PAGE;
  const limit = params?.limit && params.limit > 0 ? params.limit : DEFAULT_PAGE_SIZE;
  return { page, limit };
}

/** Format a first + last name into "First Last", handling missing parts. */
export function formatFullName(firstName?: string | null, lastName?: string | null): string {
  const f = firstName?.trim() || '';
  const l = lastName?.trim() || '';
  if (!f && !l) return '';
  if (!f) return l;
  if (!l) return f;
  return `${f} ${l}`;
}

/** Basic email validation. */
export function isValidEmail(email: string): boolean {
  return /.+@.+\..+/.test(email);
}

/** Type guard for AdminSectionId. */
export function isValidAdminSectionId(id: string): id is AdminSectionId {
  return ADMIN_SECTIONS.some((s) => s.id === id);
}

/** Group sections by category, respecting ADMIN_CATEGORY_ORDER. */
export function getSectionsByCategory(
  sections: AdminSectionMeta[] = ADMIN_SECTIONS,
): Map<AdminSectionCategory, AdminSectionMeta[]> {
  const grouped = new Map<AdminSectionCategory, AdminSectionMeta[]>();
  for (const category of ADMIN_CATEGORY_ORDER) {
    grouped.set(category, []);
  }
  for (const section of sections) {
    grouped.get(section.category)?.push(section);
  }
  return grouped;
}
