// lib/profileUpdateHelpers.ts

/**
 * Utility helpers for managing admin-gated profile fields
 */

/**
 * List of fields that require admin approval for changes
 */
export const ADMIN_GATED_FIELDS = [
  'doctorSpecialty',
  'accountType',
] as const;

export type AdminGatedField = typeof ADMIN_GATED_FIELDS[number];

/**
 * Display names for admin-gated fields
 */
export const FIELD_DISPLAY_NAMES: Record<AdminGatedField, string> = {
  doctorSpecialty: 'Doctor Specialty',
  accountType: 'Account Type',
};

/**
 * Check if a field requires admin approval
 */
export function isAdminGatedField(fieldName: string): fieldName is AdminGatedField {
  return ADMIN_GATED_FIELDS.includes(fieldName as AdminGatedField);
}

/**
 * Get the display name for a field
 */
export function getFieldDisplayName(fieldName: string): string {
  if (isAdminGatedField(fieldName)) {
    return FIELD_DISPLAY_NAMES[fieldName];
  }
  // Fallback: convert camelCase to Title Case
  return fieldName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format a value for display
 */
export function formatFieldValue(value: any): string {
  if (value === null || value === undefined) {
    return 'None';
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return 'None';
    return value.join(', ');
  }

  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

/**
 * Check if two values are different (for determining if change is needed)
 */
export function hasValueChanged(currentValue: any, newValue: any): boolean {
  // Handle arrays
  if (Array.isArray(currentValue) && Array.isArray(newValue)) {
    if (currentValue.length !== newValue.length) return true;
    return !currentValue.every((val, idx) => val === newValue[idx]);
  }

  // Handle objects
  if (typeof currentValue === 'object' && typeof newValue === 'object') {
    return JSON.stringify(currentValue) !== JSON.stringify(newValue);
  }

  // Simple comparison
  return currentValue !== newValue;
}

/**
 * Validate that a field value is acceptable
 */
export function validateFieldValue(fieldName: AdminGatedField, value: any): {
  valid: boolean;
  error?: string;
} {
  if (value === null || value === undefined) {
    return {
      valid: false,
      error: 'Value cannot be empty',
    };
  }

  switch (fieldName) {
    case 'doctorSpecialty':
      if (Array.isArray(value)) {
        if (value.length === 0) {
          return {
            valid: false,
            error: 'Please select at least one specialty',
          };
        }
        if (value.some(v => typeof v !== 'string' || v.trim() === '')) {
          return {
            valid: false,
            error: 'Invalid specialty value',
          };
        }
      } else if (typeof value === 'string') {
        if (value.trim() === '') {
          return {
            valid: false,
            error: 'Specialty cannot be empty',
          };
        }
      } else {
        return {
          valid: false,
          error: 'Invalid specialty format',
        };
      }
      break;

    case 'accountType':
      const validTypes = ['Doctor', 'Triage', 'Evac'];
      if (!validTypes.includes(value)) {
        return {
          valid: false,
          error: `Account type must be one of: ${validTypes.join(', ')}`,
        };
      }
      break;

    default:
      // For any new fields, basic validation
      if (typeof value === 'string' && value.trim() === '') {
        return {
          valid: false,
          error: 'Value cannot be empty',
        };
      }
  }

  return { valid: true };
}

/**
 * Get help text for admin-gated fields
 */
export function getFieldHelpText(fieldName: AdminGatedField): string {
  const helpTexts: Record<AdminGatedField, string> = {
    doctorSpecialty: 'Changes to your medical specialty require administrator approval to ensure proper credentials and licensing.',
    accountType: 'Changes to your account type require administrator approval as it affects your system permissions and capabilities.',
  };

  return helpTexts[fieldName] || 'This field requires administrator approval for changes.';
}

/**
 * Get status badge variant based on request status
 */
export function getStatusVariant(status: 'pending' | 'approved' | 'denied'): {
  variant: string;
  className: string;
} {
  switch (status) {
    case 'pending':
      return {
        variant: 'warning',
        className: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
      };
    case 'approved':
      return {
        variant: 'success',
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      };
    case 'denied':
      return {
        variant: 'destructive',
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      };
  }
}

/**
 * Generate a user-friendly message for request status
 */
export function getRequestStatusMessage(
  status: 'pending' | 'approved' | 'denied',
  fieldName: AdminGatedField,
): string {
  const displayName = getFieldDisplayName(fieldName);

  switch (status) {
    case 'pending':
      return `Your request to update ${displayName} is pending admin approval.`;
    case 'approved':
      return `Your request to update ${displayName} has been approved.`;
    case 'denied':
      return `Your request to update ${displayName} was denied by an administrator.`;
  }
}

/**
 * Check if user can submit a new request for a field
 * (no pending request exists)
 */
export function canSubmitNewRequest(
  pendingRequests: Array<{ fieldName: string; status: string }>,
  fieldName: AdminGatedField,
): boolean {
  return !pendingRequests.some(
    (req) => req.fieldName === fieldName && req.status === 'pending'
  );
}
