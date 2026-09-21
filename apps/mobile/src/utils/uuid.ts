// apps/mobile/src/utils/uuid.ts
// UUID validation and generation utilities for Phase 2.1

/**
 * Validates if a string is a valid UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Generates a random UUID v4
 * Simple implementation for development - use a proper UUID library in production
 */
export function generateUUID(): string {
  // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
  // where x is any hexadecimal digit and y is one of 8, 9, A, or B
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validates UUID and throws error if invalid
 */
export function validateUUID(uuid: string, fieldName: string = 'UUID'): void {
  if (!isValidUUID(uuid)) {
    throw new Error(`Invalid ${fieldName}: ${uuid}. Must be a valid UUID v4.`);
  }
}

/**
 * Type guard to check if a string is a valid UUID
 */
export function isUUID(value: any): value is string {
  return typeof value === 'string' && isValidUUID(value);
}

/**
 * Converts various ID formats to UUID string
 * Useful for handling API responses during transition
 */
export function normalizeToUUID(id: any): string {
  if (typeof id === 'string') {
    // If it's already a valid UUID, return it
    if (isValidUUID(id)) {
      return id;
    }
    // If it's a different format, try to convert or generate new UUID
    console.warn(`Converting non-UUID id to new UUID: ${id}`);
    return generateUUID();
  }

  // For other types, generate new UUID
  console.warn(`Converting ${typeof id} to new UUID:`, id);
  return generateUUID();
}
