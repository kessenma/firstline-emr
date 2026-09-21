// apps/mobile/src/utils/enumValidation.ts
// Enum validation and sanitization utilities for Phase 2.3

import {
  isValidGender,
  isValidPatientStatus,
  isValidPatientPriority,
  isValidAccountType,
  DEFAULT_GENDER,
  DEFAULT_PATIENT_STATUS,
  DEFAULT_PATIENT_PRIORITY,
  DEFAULT_ACCOUNT_TYPE
} from '../types/enums';

/**
 * Comprehensive enum validation for all types used in the app
 */
export interface EnumValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate all enums in a Patient object
 */
export function validatePatientEnums(patient: any): EnumValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate gender
  if (patient.gender && !isValidGender(patient.gender)) {
    errors.push(`Invalid gender: ${patient.gender}`);
  }

  // Validate status
  if (patient.status && !isValidPatientStatus(patient.status)) {
    errors.push(`Invalid patient status: ${patient.status}`);
  }

  // Validate priority
  if (patient.priority && !isValidPatientPriority(patient.priority)) {
    errors.push(`Invalid patient priority: ${patient.priority}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate all enums in a User object
 */
export function validateUserEnums(user: any): EnumValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate account type
  if (user.accountType && !isValidAccountType(user.accountType)) {
    errors.push(`Invalid account type: ${user.accountType}`);
  }

  // Validate gender
  if (user.gender && !isValidGender(user.gender)) {
    errors.push(`Invalid gender: ${user.gender}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Sanitize enum values to valid defaults if invalid
 */
export function sanitizePatientEnums(patient: any): any {
  const sanitized = { ...patient };

  // Sanitize gender
  if (patient.gender && !isValidGender(patient.gender)) {
    sanitized.gender = DEFAULT_GENDER;
  }

  // Sanitize status
  if (patient.status && !isValidPatientStatus(patient.status)) {
    sanitized.status = DEFAULT_PATIENT_STATUS;
  }

  // Sanitize priority
  if (patient.priority && !isValidPatientPriority(patient.priority)) {
    sanitized.priority = DEFAULT_PATIENT_PRIORITY;
  }

  return sanitized;
}

/**
 * Sanitize enum values for User objects
 */
export function sanitizeUserEnums(user: any): any {
  const sanitized = { ...user };

  // Sanitize account type
  if (user.accountType && !isValidAccountType(user.accountType)) {
    sanitized.accountType = DEFAULT_ACCOUNT_TYPE;
  }

  // Sanitize gender
  if (user.gender && !isValidGender(user.gender)) {
    sanitized.gender = DEFAULT_GENDER;
  }

  return sanitized;
}

/**
 * Validate and sanitize a patient object in one operation
 */
export function validateAndSanitizePatient(patient: any): { patient: any; validation: EnumValidationResult } {
  const validation = validatePatientEnums(patient);
  const sanitizedPatient = sanitizePatientEnums(patient);

  return {
    patient: sanitizedPatient,
    validation
  };
}

/**
 * Validate and sanitize a user object in one operation
 */
export function validateAndSanitizeUser(user: any): { user: any; validation: EnumValidationResult } {
  const validation = validateUserEnums(user);
  const sanitizedUser = sanitizeUserEnums(user);

  return {
    user: sanitizedUser,
    validation
  };
}

/**
 * Check if an object has any invalid enum values
 */
export function hasInvalidEnums(obj: any): boolean {
  // Check if it's a patient-like object
  if (obj.status || obj.priority || obj.gender) {
    const validation = validatePatientEnums(obj);
    return !validation.valid;
  }

  // Check if it's a user-like object
  if (obj.accountType) {
    const validation = validateUserEnums(obj);
    return !validation.valid;
  }

  return false;
}

/**
 * Get a summary of enum validation status for monitoring
 */
export function getEnumValidationSummary(objects: any[]): {
  total: number;
  valid: number;
  invalid: number;
  sanitized: number;
} {
  let valid = 0;
  let invalid = 0;
  let sanitized = 0;

  objects.forEach(obj => {
    const wasInvalid = hasInvalidEnums(obj);
    if (wasInvalid) {
      invalid++;
      const sanitizedObj = obj.status || obj.priority ? sanitizePatientEnums(obj) : sanitizeUserEnums(obj);
      const stillInvalid = hasInvalidEnums(sanitizedObj);
      if (!stillInvalid) {
        sanitized++;
      }
    } else {
      valid++;
    }
  });

  return {
    total: objects.length,
    valid,
    invalid,
    sanitized
  };
}
