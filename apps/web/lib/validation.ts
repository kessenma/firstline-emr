// lib/validation.ts
/**
 * Centralized validation utilities for the application
 * Used across API endpoints for consistent validation
 */

/**
 * UUID v4 regex pattern
 * Matches standard UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 */
export const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates if a string is a valid UUID v4
 * @param value - The string to validate
 * @returns true if valid UUID, false otherwise
 */
export function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Validates multiple UUIDs at once
 * @param values - Array of strings to validate
 * @returns true if all are valid UUIDs, false otherwise
 */
export function areValidUuids(values: string[]): boolean {
  return values.every((value) => isValidUuid(value));
}

/**
 * Validates a Telegram chat ID format
 * Telegram chat IDs are typically numeric strings (can be negative for groups)
 * @param chatId - The chat ID to validate
 * @returns true if valid format, false otherwise
 */
export function isValidTelegramChatId(chatId: string): boolean {
  // Must be a non-empty string that represents a valid integer
  if (!chatId || chatId.trim() === "") return false;

  // Check if it's a valid integer (positive or negative)
  const parsed = parseInt(chatId, 10);
  return !isNaN(parsed) && parsed.toString() === chatId;
}

/**
 * Validates a token format (alphanumeric + hyphens/underscores)
 * Used for intake tokens, API keys, etc.
 * @param token - The token to validate
 * @param minLength - Minimum length (default: 16)
 * @param maxLength - Maximum length (default: 255)
 * @returns true if valid format, false otherwise
 */
export function isValidToken(
  token: string,
  minLength: number = 16,
  maxLength: number = 255,
): boolean {
  if (!token || typeof token !== "string") return false;

  const length = token.length;
  if (length < minLength || length > maxLength) return false;

  // Allow alphanumeric, hyphens, and underscores
  const tokenRegex = /^[a-zA-Z0-9_-]+$/;
  return tokenRegex.test(token);
}

/**
 * Validates an email address format
 * @param email - The email to validate
 * @returns true if valid format, false otherwise
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validates a phone number format
 * Accepts international format with + or without
 * @param phone - The phone number to validate
 * @returns true if valid format, false otherwise
 */
export function isValidPhone(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;

  // Remove spaces, hyphens, parentheses
  const cleaned = phone.replace(/[\s\-()]/g, "");

  // Must be 10-15 digits, optionally starting with +
  const phoneRegex = /^\+?[0-9]{10,15}$/;
  return phoneRegex.test(cleaned);
}

/**
 * Validates a date string is a valid ISO 8601 date
 * @param dateString - The date string to validate
 * @returns true if valid date, false otherwise
 */
export function isValidISODate(dateString: string): boolean {
  if (!dateString || typeof dateString !== "string") return false;

  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Validates that a date is not in the past
 * @param dateString - The date string to validate
 * @returns true if date is in the future or today, false otherwise
 */
export function isNotPastDate(dateString: string): boolean {
  if (!isValidISODate(dateString)) return false;

  const date = new Date(dateString);
  const now = new Date();
  return date >= now;
}

/**
 * Sanitizes a string by removing potentially dangerous characters
 * @param input - The string to sanitize
 * @returns Sanitized string
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== "string") return "";

  // Remove null bytes and other control characters
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
}

/**
 * Validates and sanitizes a pagination offset
 * @param offset - The offset value (string or number)
 * @param defaultValue - Default value if invalid (default: 0)
 * @returns Valid offset number
 */
export function validateOffset(
  offset: string | number | undefined,
  defaultValue: number = 0,
): number {
  if (offset === undefined || offset === null) return defaultValue;

  const parsed = typeof offset === "string" ? parseInt(offset, 10) : offset;

  if (isNaN(parsed) || parsed < 0) return defaultValue;

  return parsed;
}

/**
 * Validates and sanitizes a pagination limit
 * @param limit - The limit value (string or number)
 * @param defaultValue - Default value if invalid (default: 20)
 * @param maxValue - Maximum allowed value (default: 100)
 * @returns Valid limit number
 */
export function validateLimit(
  limit: string | number | undefined,
  defaultValue: number = 20,
  maxValue: number = 100,
): number {
  if (limit === undefined || limit === null) return defaultValue;

  const parsed = typeof limit === "string" ? parseInt(limit, 10) : limit;

  if (isNaN(parsed) || parsed < 1) return defaultValue;
  if (parsed > maxValue) return maxValue;

  return parsed;
}

/**
 * Type guard to check if a value is a non-empty string
 * @param value - The value to check
 * @returns true if value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Type guard to check if a value is a valid number
 * @param value - The value to check
 * @returns true if value is a valid number (not NaN or Infinity)
 */
export function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && !isNaN(value) && isFinite(value);
}

/**
 * Validates a message type for Telegram messages
 * @param type - The message type to validate
 * @returns true if valid message type
 */
export function isValidMessageType(type: string): boolean {
  const validTypes = ["text", "image", "video", "file", "reply", "forward", "audio"];
  return validTypes.includes(type);
}

/**
 * Validation result type for more detailed error messages
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a UUID and returns a detailed result
 * @param value - The string to validate
 * @param fieldName - Name of the field for error message
 * @returns Validation result with error message if invalid
 */
export function validateUuid(
  value: string,
  fieldName: string = "ID",
): ValidationResult {
  if (!value) {
    return {
      valid: false,
      error: `${fieldName} is required`,
    };
  }

  if (!isValidUuid(value)) {
    return {
      valid: false,
      error: `Invalid ${fieldName} format`,
    };
  }

  return { valid: true };
}

/**
 * Validates a Telegram chat ID and returns a detailed result
 * @param chatId - The chat ID to validate
 * @returns Validation result with error message if invalid
 */
export function validateTelegramChatId(chatId: string): ValidationResult {
  if (!chatId) {
    return {
      valid: false,
      error: "Telegram chat ID is required",
    };
  }

  if (!isValidTelegramChatId(chatId)) {
    return {
      valid: false,
      error: "Invalid Telegram chat ID format",
    };
  }

  return { valid: true };
}

/**
 * Validates required fields in a request body
 * @param body - The request body object
 * @param requiredFields - Array of required field names
 * @returns Validation result with error message if invalid
 */
export function validateRequiredFields(
  body: Record<string, any>,
  requiredFields: string[],
): ValidationResult {
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (body[field] === undefined || body[field] === null || body[field] === "") {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      error: `Missing required fields: ${missingFields.join(", ")}`,
    };
  }

  return { valid: true };
}
