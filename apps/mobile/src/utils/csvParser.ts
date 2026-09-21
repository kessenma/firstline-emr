// CSV parsing + validation + fuzzy matching for bulk patient upload
// Ported from apps/web/components/create-patient/BulkPatientUploadCSV.tsx

import { CountriesList, CountryCodesList } from '../data/countries';
import { LanguagesList } from '../data/languages';
import { DoctorSpecialties } from '../data/doctorSpecialty';

// Valid enum values
const VALID_LANGUAGES = LanguagesList as string[];
const VALID_COUNTRIES = CountriesList as string[];
const VALID_COUNTRY_CODES = CountryCodesList as string[];
const VALID_GENDERS = ['Male', 'Female'];

export const CSV_HEADERS = [
  'firstName',
  'lastName',
  'dob',
  'gender',
  'language',
  'chiefComplaint',
  'currentMeds',
  'allergies',
  'city',
  'country',
  'phoneCountryCode',
  'phoneNumber',
  'specialty',
];

export const TEMPLATE_DATA = `firstName,lastName,dob,gender,language,chiefComplaint,currentMeds,allergies,city,country,phoneCountryCode,phoneNumber,specialty
Ahmad,Hassan,1990-01-15,Male,Arabic,Knee pain after injury,Ibuprofen,Penicillin,Gaza City,Palestine - Gaza,+970,591234567,Orthopedic Trauma
Fatima,Ali,1985-06-20,Female,English,Chronic back pain,None,No allergies,Ramallah,Palestine - West Bank,+970,598765432,Spine`;

export interface ParsedPatientRow {
  id: number;
  firstName: string;
  lastName: string;
  dob: string;
  gender: string;
  language: string;
  chiefComplaint: string;
  currentMeds: string;
  allergies: string;
  city: string;
  country: string;
  phone: {
    countryCode: string;
    phoneNumber: string;
  };
  specialty: string;
  status: string;
  missionId: string;
  hospital: string;
}

export interface ValidationIssue {
  row: number;
  field: string;
  originalValue: string;
  correctedValue?: string;
  suggestedValue?: string;
  type: 'error' | 'corrected';
}

export interface UploadResult {
  row: number;
  name: string;
  success: boolean;
  error?: string;
}

// Case-insensitive match helper
function findCaseInsensitiveMatch(
  value: string,
  validOptions: string[],
): string | null {
  if (validOptions.includes(value)) return value;
  const lowerValue = value.toLowerCase();
  const match = validOptions.find((opt) => opt.toLowerCase() === lowerValue);
  return match || null;
}

// Find closest matching option using various heuristics
function findClosestMatch(
  value: string,
  validOptions: string[],
): string | null {
  if (!value || validOptions.length === 0) return null;
  const lowerValue = value.toLowerCase().trim();

  // Try adding "+" prefix (common for country codes)
  if (!value.startsWith('+')) {
    const withPlus = '+' + value;
    if (validOptions.includes(withPlus)) return withPlus;
  }

  // Try removing "+" prefix
  if (value.startsWith('+')) {
    const withoutPlus = value.slice(1);
    const match = validOptions.find(
      (opt) => opt === withoutPlus || opt === '+' + withoutPlus,
    );
    if (match) return match;
  }

  // Check if value is contained within an option
  const containsMatch = validOptions.find(
    (opt) =>
      opt.toLowerCase().includes(lowerValue) ||
      lowerValue.includes(opt.toLowerCase()),
  );
  if (containsMatch) return containsMatch;

  // Levenshtein distance for closest match
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const option of validOptions) {
    const distance = levenshteinDistance(lowerValue, option.toLowerCase());
    if (
      distance < bestDistance &&
      distance <= Math.max(value.length, option.length) / 2
    ) {
      bestDistance = distance;
      bestMatch = option;
    }
  }

  return bestMatch;
}

// Levenshtein distance algorithm
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

// Validate DOB format (YYYY-MM-DD)
export function validateDOB(
  value: string,
): { valid: boolean; suggestedValue?: string } {
  if (!value) return { valid: true };

  const dateRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const match = value.match(dateRegex);
  if (!match) return { valid: false };

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    year < 1900 ||
    year > new Date().getFullYear()
  ) {
    return { valid: false };
  }

  const date = new Date(year, month - 1, day);
  const isValidDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValidDate) {
    const paddedMonth = month.toString().padStart(2, '0');
    const paddedDay = day.toString().padStart(2, '0');
    const suggested = `${year}-${paddedMonth}-${paddedDay}`;
    const suggestedDate = new Date(year, month - 1, day);
    if (
      suggestedDate.getFullYear() === year &&
      suggestedDate.getMonth() === month - 1 &&
      suggestedDate.getDate() === day
    ) {
      return { valid: false, suggestedValue: suggested };
    }
    return { valid: false };
  }

  const paddedMonth = month.toString().padStart(2, '0');
  const paddedDay = day.toString().padStart(2, '0');
  const paddedValue = `${year}-${paddedMonth}-${paddedDay}`;

  if (paddedValue !== value) {
    return { valid: true, suggestedValue: paddedValue };
  }

  return { valid: true };
}

// Validate an enum field with auto-correction
function validateEnumField(
  value: string,
  validOptions: string[],
  rowNum: number,
  fieldName: string,
  issues: ValidationIssue[],
): string {
  if (!value) return value;

  const match = findCaseInsensitiveMatch(value, validOptions);
  if (match) {
    if (match !== value) {
      issues.push({
        row: rowNum,
        field: fieldName,
        originalValue: value,
        correctedValue: match,
        type: 'corrected',
      });
    }
    return match;
  }

  const suggestedValue = findClosestMatch(value, validOptions);
  issues.push({
    row: rowNum,
    field: fieldName,
    originalValue: value,
    suggestedValue: suggestedValue || undefined,
    type: 'error',
  });
  return value;
}

// Handle CSV values that might contain commas within quotes
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

// Main CSV parser
export function parseCSV(
  text: string,
): { rows: ParsedPatientRow[]; issues: ValidationIssue[] } {
  const specialtyOptions = DoctorSpecialties as string[];
  const lines = text.trim().split('\n');

  if (lines.length < 2) {
    throw new Error('CSV must have a header row and at least one data row');
  }

  const headers = lines[0].split(',').map((h) => h.trim());
  const missingHeaders = CSV_HEADERS.filter((h) => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required columns: ${missingHeaders.join(', ')}`);
  }

  const rows: ParsedPatientRow[] = [];
  const issues: ValidationIssue[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    if (values.length !== headers.length) {
      throw new Error(
        `Row ${i + 1} has ${values.length} columns, expected ${headers.length}`,
      );
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });

    const rowNum = i + 1;

    // Validate and auto-correct enum fields
    const gender = validateEnumField(
      row.gender,
      VALID_GENDERS,
      rowNum,
      'gender',
      issues,
    );
    const language = validateEnumField(
      row.language,
      VALID_LANGUAGES,
      rowNum,
      'language',
      issues,
    );
    const country = validateEnumField(
      row.country,
      VALID_COUNTRIES,
      rowNum,
      'country',
      issues,
    );
    const phoneCountryCode = validateEnumField(
      row.phoneCountryCode,
      VALID_COUNTRY_CODES,
      rowNum,
      'phoneCountryCode',
      issues,
    );
    const specialty = validateEnumField(
      row.specialty,
      specialtyOptions,
      rowNum,
      'specialty',
      issues,
    );

    // Validate DOB format
    let dob = row.dob || '';
    if (dob) {
      const dobValidation = validateDOB(dob);
      if (!dobValidation.valid) {
        issues.push({
          row: rowNum,
          field: 'dob',
          originalValue: dob,
          suggestedValue: dobValidation.suggestedValue,
          type: 'error',
        });
      } else if (dobValidation.suggestedValue) {
        issues.push({
          row: rowNum,
          field: 'dob',
          originalValue: dob,
          correctedValue: dobValidation.suggestedValue,
          type: 'corrected',
        });
        dob = dobValidation.suggestedValue;
      }
    }

    rows.push({
      id: rowNum,
      firstName: row.firstName || '',
      lastName: row.lastName || '',
      dob,
      gender: gender || '',
      language: language || 'English',
      chiefComplaint: row.chiefComplaint || '',
      currentMeds: row.currentMeds || '',
      allergies: row.allergies || 'Unknown',
      city: row.city || '',
      country: country || '',
      phone: {
        countryCode: phoneCountryCode || '',
        phoneNumber: row.phoneNumber || '',
      },
      specialty: specialty || specialtyOptions[0],
      status: 'Pre-Op / Not Cleared',
      missionId: '',
      hospital: '',
    });
  }

  return { rows, issues };
}
