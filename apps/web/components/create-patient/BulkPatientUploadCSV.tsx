"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Upload, X, AlertCircle, AlertTriangle, CheckCircle2, Pencil, Check, LayoutGrid, Table2, Hospital } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table } from "@/components/ui/Table/Table";
import type { TableColumn } from "@/components/ui/Table/types";
import { useToast } from "@/components/hooks/useToast";
import { useMissions, type MissionOption } from "@/hooks/useMissions";
import { DoctorSpecialties } from "@/data/doctorSpecialty.enum";
import { LanguagesList } from "@/data/languages.enum";
import { CountriesList, CountryCodesList } from "@/data/countries.enum";


// Valid enum values for validation (cast to string[] for includes() checks)
const VALID_LANGUAGES = LanguagesList as string[];
const VALID_COUNTRIES = CountriesList as string[];
const VALID_COUNTRY_CODES = CountryCodesList as string[];
const VALID_GENDERS = ["Male", "Female"] as const;

// Case-insensitive match helper - returns the correctly-cased value or null if no match
function findCaseInsensitiveMatch(value: string, validOptions: string[]): string | null {
  // First try exact match
  if (validOptions.includes(value)) {
    return value;
  }
  // Try case-insensitive match
  const lowerValue = value.toLowerCase();
  const match = validOptions.find((opt) => opt.toLowerCase() === lowerValue);
  return match || null;
}

// Find the closest matching option using various heuristics
function findClosestMatch(value: string, validOptions: string[]): string | null {
  if (!value || validOptions.length === 0) return null;

  const lowerValue = value.toLowerCase().trim();

  // 1. Try adding "+" prefix (common for country codes)
  if (!value.startsWith("+")) {
    const withPlus = "+" + value;
    if (validOptions.includes(withPlus)) {
      return withPlus;
    }
  }

  // 2. Try removing "+" prefix
  if (value.startsWith("+")) {
    const withoutPlus = value.slice(1);
    const match = validOptions.find((opt) => opt === withoutPlus || opt === "+" + withoutPlus);
    if (match) return match;
  }

  // 3. Check if value is contained within an option (e.g., "Gaza" matches "Palestine - Gaza")
  const containsMatch = validOptions.find((opt) =>
    opt.toLowerCase().includes(lowerValue) || lowerValue.includes(opt.toLowerCase())
  );
  if (containsMatch) return containsMatch;

  // 4. Calculate Levenshtein distance for closest match
  let bestMatch: string | null = null;
  let bestDistance = Infinity;

  for (const option of validOptions) {
    const distance = levenshteinDistance(lowerValue, option.toLowerCase());
    // Only suggest if reasonably close (less than half the length difference)
    if (distance < bestDistance && distance <= Math.max(value.length, option.length) / 2) {
      bestDistance = distance;
      bestMatch = option;
    }
  }

  return bestMatch;
}

// Levenshtein distance algorithm for fuzzy matching
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

// Validate DOB format (YYYY-MM-DD) and check if it's a valid date
function validateDOB(value: string): { valid: boolean; suggestedValue?: string } {
  if (!value) return { valid: true }; // Empty is allowed

  // Check format: YYYY-MM-DD
  const dateRegex = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
  const match = value.match(dateRegex);

  if (!match) {
    return { valid: false };
  }

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  // Check if values are in valid ranges
  if (month < 1 || month > 12 || day < 1 || day > 31 || year < 1900 || year > new Date().getFullYear()) {
    return { valid: false };
  }

  // Try to create a date and verify it's valid
  const date = new Date(year, month - 1, day);
  const isValidDate =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day;

  if (!isValidDate) {
    // Try to suggest a corrected date (e.g., pad single digits)
    const paddedMonth = month.toString().padStart(2, "0");
    const paddedDay = day.toString().padStart(2, "0");
    const suggested = `${year}-${paddedMonth}-${paddedDay}`;

    // Verify the suggested date is valid
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

  // Check if date needs padding (e.g., "1990-1-5" -> "1990-01-05")
  const paddedMonth = month.toString().padStart(2, "0");
  const paddedDay = day.toString().padStart(2, "0");
  const paddedValue = `${year}-${paddedMonth}-${paddedDay}`;

  if (paddedValue !== value) {
    return { valid: true, suggestedValue: paddedValue };
  }

  return { valid: true };
}

const CSV_HEADERS = [
  "firstName",
  "lastName",
  "dob",
  "gender",
  "language",
  "chiefComplaint",
  "currentMeds",
  "allergies",
  "city",
  "country",
  "phoneCountryCode",
  "phoneNumber",
  "specialty",
];

// Template with example data showing correct formats:
// - dob: YYYY-MM-DD format (ISO date)
// - gender: Male or Female
// - phoneCountryCode: include the + prefix (e.g., +1, +972)
// - phoneNumber: digits only, no spaces or dashes
// - country, language, specialty must match allowed enum values
const TEMPLATE_DATA = `firstName,lastName,dob,gender,language,chiefComplaint,currentMeds,allergies,city,country,phoneCountryCode,phoneNumber,specialty
Ahmad,Hassan,1990-01-15,Male,Arabic,Knee pain after injury,Ibuprofen,Penicillin,Gaza City,Palestine - Gaza,+970,591234567,Orthopedic Trauma
Fatima,Ali,1985-06-20,Female,English,Chronic back pain,None,No allergies,Ramallah,Palestine - West Bank,+970,598765432,Spine`;

interface PatientRow {
  id: number; // Row number for Table component
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

interface UploadResult {
  row: number;
  name: string;
  success: boolean;
  error?: string;
}

interface ValidationIssue {
  row: number;
  field: string;
  originalValue: string;
  correctedValue?: string; // If auto-corrected
  suggestedValue?: string; // For errors - closest match suggestion
  type: "error" | "corrected";
}

// Cell components defined OUTSIDE the main component to prevent re-creation on each render
interface EditableCellProps {
  value: string;
  rowId: number;
  field: string;
  onUpdate: (rowId: number, field: string, value: string) => void;
  issue?: ValidationIssue;
  className?: string;
  numericOnly?: boolean; // Shows numeric keyboard and filters non-digit input
}

function EditableTextCell({ value, rowId, field, onUpdate, issue, className = "", numericOnly = false }: EditableCellProps) {
  const isError = issue?.type === "error";
  const isCorrected = issue?.type === "corrected";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value;
    if (numericOnly) {
      // Strip non-digit characters
      newValue = newValue.replace(/[^0-9]/g, "");
    }
    onUpdate(rowId, field, newValue);
  };

  return (
    <input
      type="text"
      inputMode={numericOnly ? "tel" : undefined}
      pattern={numericOnly ? "[0-9]*" : undefined}
      value={value}
      onChange={handleChange}
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onFocus={(e) => e.stopPropagation()}
      className={`w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-primary rounded ${
        isError
          ? "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200"
          : isCorrected
            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
            : "bg-transparent"
      } ${className}`}
    />
  );
}

interface EditableDateCellProps {
  value: string;
  rowId: number;
  onUpdate: (rowId: number, field: string, value: string) => void;
  issue?: ValidationIssue;
}

function EditableDateCell({ value, rowId, onUpdate, issue }: EditableDateCellProps) {
  const isError = issue?.type === "error";
  const isCorrected = issue?.type === "corrected";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Remove all non-digit characters to re-format
    const cleaned = inputValue.replace(/[^0-9]/g, "");

    // Auto-format as YYYY-MM-DD
    let formatted = cleaned;
    if (cleaned.length > 4) {
      formatted = cleaned.slice(0, 4) + "-" + cleaned.slice(4);
    }
    if (cleaned.length > 6) {
      formatted = formatted.slice(0, 7) + "-" + formatted.slice(7, 9);
    }

    // Limit to 10 characters (YYYY-MM-DD)
    if (formatted.length > 10) {
      formatted = formatted.slice(0, 10);
    }

    onUpdate(rowId, "dob", formatted);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value}
      onChange={handleChange}
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onFocus={(e) => e.stopPropagation()}
      placeholder="YYYY-MM-DD"
      maxLength={10}
      className={`w-full px-2 py-1 text-sm border-0 focus:ring-1 focus:ring-primary rounded ${
        isError
          ? "bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200"
          : isCorrected
            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
            : "bg-transparent"
      }`}
    />
  );
}

interface EditableSelectCellProps {
  value: string;
  rowId: number;
  field: string;
  options: string[];
  onUpdate: (rowId: number, field: string, value: string) => void;
  issue?: ValidationIssue;
}

function EditableSelectCell({ value, rowId, field, options, onUpdate, issue }: EditableSelectCellProps) {
  const isError = issue?.type === "error";
  const isCorrected = issue?.type === "corrected";

  return (
    <select
      value={value}
      onChange={(e) => onUpdate(rowId, field, e.target.value)}
      onKeyDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onFocus={(e) => e.stopPropagation()}
      className={`w-full px-1 py-1 text-sm border-0 rounded focus:ring-1 focus:ring-primary cursor-pointer ${
        isError
          ? "bg-yellow-50 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200"
          : isCorrected
            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
            : "bg-transparent"
      }`}
    >
      {!options.includes(value) && value && (
        <option value={value} className="text-yellow-600">
          {value} (invalid)
        </option>
      )}
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

// Mobile card component for displaying patient data
interface MobilePatientCardProps {
  patient: PatientRow;
  isEditing: boolean;
  onToggleEdit: () => void;
  onUpdate: (rowId: number, field: string, value: string) => void;
  getCellIssue: (rowId: number, field: string) => ValidationIssue | undefined;
  validCountries: string[];
  validCountryCodes: string[];
  validLanguages: string[];
  specialtyOptions: string[];
  missions: MissionOption[];
}

function MobilePatientCard({
  patient,
  isEditing,
  onToggleEdit,
  onUpdate,
  getCellIssue,
  validCountries,
  validCountryCodes,
  validLanguages,
  specialtyOptions,
  missions,
}: MobilePatientCardProps) {
  const hasErrors = [
    getCellIssue(patient.id, "firstName"),
    getCellIssue(patient.id, "lastName"),
    getCellIssue(patient.id, "dob"),
    getCellIssue(patient.id, "gender"),
    getCellIssue(patient.id, "country"),
    getCellIssue(patient.id, "phoneCountryCode"),
    getCellIssue(patient.id, "phone.phoneNumber"),
    getCellIssue(patient.id, "language"),
    getCellIssue(patient.id, "specialty"),
  ].some((issue) => issue?.type === "error");

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={`relative border-2 shadow-sm transition-colors duration-300 ${hasErrors ? "border-red-400 dark:border-red-600" : isEditing ? "border-primary/50" : "border-border"}`}>
        <CardContent className="p-4">
          {/* Edit toggle button */}
          <motion.button
            type="button"
            onClick={onToggleEdit}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            animate={{ rotate: isEditing ? 0 : 0 }}
            className={`absolute top-3 right-3 p-2 rounded-full transition-colors duration-200 ${
              isEditing
                ? "bg-primary text-primary-foreground shadow-md"
                : "bg-muted hover:bg-muted/80"
            }`}
          >
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="check"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: 180 }}
                  transition={{ duration: 0.2 }}
                >
                  <Check className="w-4 h-4" />
                </motion.div>
              ) : (
                <motion.div
                  key="pencil"
                  initial={{ scale: 0, rotate: 180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0, rotate: -180 }}
                  transition={{ duration: 0.2 }}
                >
                  <Pencil className="w-4 h-4" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>

          {/* Row number badge */}
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 text-xs font-medium bg-muted rounded-full">
              #{patient.id}
            </span>
            <AnimatePresence>
              {hasErrors && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200 rounded-full"
                >
                  Has errors
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* Patient name header */}
          <div className="mb-4 min-h-[2.5rem]">
            <AnimatePresence mode="wait">
              {isEditing ? (
                <motion.div
                  key="editing"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="flex gap-2"
                >
                  <EditableTextCell
                    value={patient.firstName}
                    rowId={patient.id}
                    field="firstName"
                    onUpdate={onUpdate}
                    issue={getCellIssue(patient.id, "firstName")}
                    className="border border-border"
                  />
                  <EditableTextCell
                    value={patient.lastName}
                    rowId={patient.id}
                    field="lastName"
                    onUpdate={onUpdate}
                    issue={getCellIssue(patient.id, "lastName")}
                    className="border border-border"
                  />
                </motion.div>
              ) : (
                <motion.h4
                  key="viewing"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="font-medium text-lg"
                >
                  {patient.firstName} {patient.lastName}
                </motion.h4>
              )}
            </AnimatePresence>
          </div>

          {/* Fields grid */}
          <motion.div
            layout
            className="grid grid-cols-2 gap-3 text-sm"
          >
          {/* DOB */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">DOB</label>
            {isEditing ? (
              <EditableDateCell
                value={patient.dob}
                rowId={patient.id}
                onUpdate={onUpdate}
                issue={getCellIssue(patient.id, "dob")}
              />
            ) : (
              <p className={getCellIssue(patient.id, "dob")?.type === "error" ? "text-red-600" : ""}>
                {patient.dob || "-"}
              </p>
            )}
          </div>

          {/* Gender */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Gender</label>
            {isEditing ? (
              <EditableSelectCell
                value={patient.gender}
                rowId={patient.id}
                field="gender"
                options={VALID_GENDERS as unknown as string[]}
                onUpdate={onUpdate}
                issue={getCellIssue(patient.id, "gender")}
              />
            ) : (
              <p className={getCellIssue(patient.id, "gender")?.type === "error" ? "text-red-600" : ""}>
                {patient.gender || "-"}
              </p>
            )}
          </div>

          {/* Country */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Country</label>
            {isEditing ? (
              <EditableSelectCell
                value={patient.country}
                rowId={patient.id}
                field="country"
                options={validCountries}
                onUpdate={onUpdate}
                issue={getCellIssue(patient.id, "country")}
              />
            ) : (
              <p className={`truncate ${getCellIssue(patient.id, "country")?.type === "error" ? "text-red-600" : ""}`}>
                {patient.country || "-"}
              </p>
            )}
          </div>

          {/* City */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">City</label>
            {isEditing ? (
              <EditableTextCell
                value={patient.city}
                rowId={patient.id}
                field="city"
                onUpdate={onUpdate}
                issue={getCellIssue(patient.id, "city")}
                className="border border-border"
              />
            ) : (
              <p className="truncate">
                {patient.city || "-"}
              </p>
            )}
          </div>

          {/* Language */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Language</label>
            {isEditing ? (
              <EditableSelectCell
                value={patient.language}
                rowId={patient.id}
                field="language"
                options={validLanguages}
                onUpdate={onUpdate}
                issue={getCellIssue(patient.id, "language")}
              />
            ) : (
              <p className={getCellIssue(patient.id, "language")?.type === "error" ? "text-red-600" : ""}>
                {patient.language}
              </p>
            )}
          </div>

          {/* Phone */}
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Phone</label>
            {isEditing ? (
              <div className="flex gap-2">
                <div className="w-24">
                  <EditableSelectCell
                    value={patient.phone.countryCode}
                    rowId={patient.id}
                    field="phone.countryCode"
                    options={validCountryCodes}
                    onUpdate={onUpdate}
                    issue={getCellIssue(patient.id, "phoneCountryCode")}
                  />
                </div>
                <EditableTextCell
                  value={patient.phone.phoneNumber}
                  rowId={patient.id}
                  field="phone.phoneNumber"
                  onUpdate={onUpdate}
                  issue={getCellIssue(patient.id, "phone.phoneNumber")}
                  className="border border-border flex-1"
                  numericOnly
                />
              </div>
            ) : (
              <p className={getCellIssue(patient.id, "phoneCountryCode")?.type === "error" ? "text-red-600" : ""}>
                {patient.phone.countryCode} {patient.phone.phoneNumber || "-"}
              </p>
            )}
          </div>

          {/* Allergies */}
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Allergies</label>
            {isEditing ? (
              <EditableTextCell
                value={patient.allergies}
                rowId={patient.id}
                field="allergies"
                onUpdate={onUpdate}
                issue={getCellIssue(patient.id, "allergies")}
                className="border border-border"
              />
            ) : (
              <p className="truncate">
                {patient.allergies || "Unknown"}
              </p>
            )}
          </div>

          {/* Specialty */}
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Specialty</label>
            {isEditing ? (
              <EditableSelectCell
                value={patient.specialty}
                rowId={patient.id}
                field="specialty"
                options={specialtyOptions}
                onUpdate={onUpdate}
                issue={getCellIssue(patient.id, "specialty")}
              />
            ) : (
              <p className={`truncate ${getCellIssue(patient.id, "specialty")?.type === "error" ? "text-red-600" : ""}`}>
                {patient.specialty}
              </p>
            )}
          </div>

          {/* Mission & Hospital */}
          <div className="col-span-2 mt-2 pt-2 border-t border-border">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Mission</label>
            {isEditing ? (
              <select
                value={patient.missionId}
                onChange={(e) => {
                  onUpdate(patient.id, "missionId", e.target.value);
                  const m = missions.find(ms => ms.id === e.target.value);
                  onUpdate(patient.id, "hospital", m?.defaultIntakeHospital || "");
                }}
                onKeyDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-2 py-1 text-sm border border-border rounded bg-transparent focus:ring-1 focus:ring-primary"
              >
                <option value="">No mission</option>
                {missions
                  .sort((a, b) => {
                    const order: Record<string, number> = { active: 0, planned: 1, completed: 2 };
                    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                  })
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.country}){m.isActiveIntake ? " *" : ""}
                    </option>
                  ))}
              </select>
            ) : (
              <p className="truncate">
                {missions.find(m => m.id === patient.missionId)?.name || "Not assigned"}
              </p>
            )}
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground uppercase tracking-wide">Hospital</label>
            {(() => {
              const patientMission = missions.find(m => m.id === patient.missionId);
              const hospitalOpts = (patientMission?.hospitals || []).map(h =>
                typeof h === "string" ? h : h.name
              );
              return isEditing ? (
                <select
                  value={patient.hospital}
                  onChange={(e) => onUpdate(patient.id, "hospital", e.target.value)}
                  disabled={!patient.missionId || hospitalOpts.length === 0}
                  onKeyDown={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full px-2 py-1 text-sm border border-border rounded bg-transparent focus:ring-1 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">
                    {!patient.missionId ? "Select mission first" : hospitalOpts.length === 0 ? "No hospitals" : "Not assigned"}
                  </option>
                  {hospitalOpts.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              ) : (
                <p className="truncate">{patient.hospital || "Not assigned"}</p>
              );
            })()}
          </div>
        </motion.div>
      </CardContent>
    </Card>
  </motion.div>
  );
}

export function BulkPatientUploadCSV() {
  const router = useRouter();
  const { data: session } = useSession();
  const { setToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { missions } = useMissions();

  const [file, setFile] = useState<File | null>(null);
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showAllowedValues, setShowAllowedValues] = useState(false);
  const [editingRowId, setEditingRowId] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"cards" | "table">("table");

  // Mission & Hospital batch assignment
  const [globalMissionId, setGlobalMissionId] = useState<string>("");
  const [globalHospital, setGlobalHospital] = useState<string>("");

  const globalMission = missions.find(m => m.id === globalMissionId);
  const globalHospitalOptions = (globalMission?.hospitals || []).map(h =>
    typeof h === "string" ? h : h.name
  );

  const handleApplyMissionToAll = () => {
    setPatients(prev => prev.map(p => ({
      ...p,
      missionId: globalMissionId,
      hospital: globalHospital,
    })));
    if (globalMissionId) {
      const mName = missions.find(m => m.id === globalMissionId)?.name || "";
      setToast({
        title: "Applied to all",
        description: `${mName}${globalHospital ? ` / ${globalHospital}` : ""} applied to ${patients.length} patients`,
        variant: "success",
      });
    }
  };

  const specialtyOptions = DoctorSpecialties;

  const downloadTemplate = () => {
    const blob = new Blob([TEMPLATE_DATA], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "patient_upload_template.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Helper to validate and auto-correct enum field
  const validateEnumField = (
    value: string,
    validOptions: string[],
    rowNum: number,
    fieldName: string,
    issues: ValidationIssue[]
  ): string => {
    if (!value) return value;

    const match = findCaseInsensitiveMatch(value, validOptions);
    if (match) {
      // If corrected (different case), track it
      if (match !== value) {
        issues.push({
          row: rowNum,
          field: fieldName,
          originalValue: value,
          correctedValue: match,
          type: "corrected",
        });
      }
      return match;
    }
    // No match found - this is an error, try to find closest match for suggestion
    const suggestedValue = findClosestMatch(value, validOptions);
    issues.push({
      row: rowNum,
      field: fieldName,
      originalValue: value,
      suggestedValue: suggestedValue || undefined,
      type: "error",
    });
    return value; // Keep original value
  };

  const parseCSV = (text: string): { rows: PatientRow[]; issues: ValidationIssue[] } => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) {
      throw new Error("CSV must have a header row and at least one data row");
    }

    const headers = lines[0].split(",").map((h) => h.trim());

    // Validate headers
    const missingHeaders = CSV_HEADERS.filter((h) => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required columns: ${missingHeaders.join(", ")}`);
    }

    const rows: PatientRow[] = [];
    const issues: ValidationIssue[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      if (values.length !== headers.length) {
        throw new Error(
          `Row ${i + 1} has ${values.length} columns, expected ${headers.length}`
        );
      }

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      const rowNum = i + 1;

      // Validate and auto-correct enum fields
      const gender = validateEnumField(row.gender, VALID_GENDERS as unknown as string[], rowNum, "gender", issues);
      const language = validateEnumField(row.language, VALID_LANGUAGES, rowNum, "language", issues);
      const country = validateEnumField(row.country, VALID_COUNTRIES, rowNum, "country", issues);
      const phoneCountryCode = validateEnumField(row.phoneCountryCode, VALID_COUNTRY_CODES, rowNum, "phoneCountryCode", issues);
      const specialty = validateEnumField(row.specialty, specialtyOptions as string[], rowNum, "specialty", issues);

      // Validate DOB format
      let dob = row.dob || "";
      if (dob) {
        const dobValidation = validateDOB(dob);
        if (!dobValidation.valid) {
          issues.push({
            row: rowNum,
            field: "dob",
            originalValue: dob,
            suggestedValue: dobValidation.suggestedValue,
            type: "error",
          });
        } else if (dobValidation.suggestedValue) {
          // Auto-correct format (e.g., padding)
          issues.push({
            row: rowNum,
            field: "dob",
            originalValue: dob,
            correctedValue: dobValidation.suggestedValue,
            type: "corrected",
          });
          dob = dobValidation.suggestedValue;
        }
      }

      rows.push({
        id: rowNum,
        firstName: row.firstName || "",
        lastName: row.lastName || "",
        dob,
        gender: gender || "",
        language: language || "English",
        chiefComplaint: row.chiefComplaint || "",
        currentMeds: row.currentMeds || "",
        allergies: row.allergies || "Unknown",
        city: row.city || "",
        country: country || "",
        phone: {
          countryCode: phoneCountryCode || "",
          phoneNumber: row.phoneNumber || "",
        },
        specialty: specialty || specialtyOptions[0],
        status: "Pre-Op / Not Cleared",
        missionId: "",  // Will be set by batch assignment bar or per-row
        hospital: "",
      });
    }

    return { rows, issues };
  };

  // Handle CSV values that might contain commas within quotes
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setPatients([]);
    setValidationIssues([]);
    setResults([]);
    setShowResults(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { rows, issues } = parseCSV(text);

        // Smart default: auto-assign active intake mission + its default hospital
        const activeIntake = missions.find(m => m.isActiveIntake);
        if (activeIntake) {
          const defaultHosp = activeIntake.defaultIntakeHospital || "";
          setGlobalMissionId(activeIntake.id);
          setGlobalHospital(defaultHosp);
          rows.forEach(r => {
            r.missionId = activeIntake.id;
            r.hospital = defaultHosp;
          });
        }

        setPatients(rows);
        setValidationIssues(issues);
      } catch (err) {
        setParseError(err instanceof Error ? err.message : "Failed to parse CSV");
      }
    };
    reader.readAsText(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    setPatients([]);
    setParseError(null);
    setValidationIssues([]);
    setResults([]);
    setShowResults(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Update a patient field
  const updatePatient = (rowId: number, field: keyof PatientRow | "phone.countryCode" | "phone.phoneNumber", value: string) => {
    setPatients((prev) =>
      prev.map((p) => {
        if (p.id !== rowId) return p;
        if (field === "phone.countryCode") {
          return { ...p, phone: { ...p.phone, countryCode: value } };
        }
        if (field === "phone.phoneNumber") {
          return { ...p, phone: { ...p.phone, phoneNumber: value } };
        }
        return { ...p, [field]: value };
      })
    );
    // Clear any validation issue for this field when user edits it
    // Map phoneCountryCode field name to the internal format
    const issueField = field === "phone.countryCode" ? "phoneCountryCode" : field;
    setValidationIssues((prev) =>
      prev.filter((i) => !(i.row === rowId && i.field === issueField))
    );
  };

  // Apply a suggested fix for a validation error
  const applySuggestion = (issue: ValidationIssue, showToast = true) => {
    if (!issue.suggestedValue) return;

    // Map field names - validation uses "phoneCountryCode" but updatePatient uses "phone.countryCode"
    const updateField = issue.field === "phoneCountryCode" ? "phone.countryCode" : issue.field;
    updatePatient(issue.row, updateField as keyof PatientRow | "phone.countryCode" | "phone.phoneNumber", issue.suggestedValue);

    if (showToast) {
      setToast({
        title: "Fix applied",
        description: `Row ${issue.row}: ${issue.field} updated to "${issue.suggestedValue}"`,
        variant: "success",
      });
    }
  };

  // Apply all suggestions at once
  const applyAllSuggestions = () => {
    const errorsWithSuggestions = validationIssues.filter((i) => i.type === "error" && i.suggestedValue);
    errorsWithSuggestions.forEach((issue) => {
      applySuggestion(issue, false); // Don't show individual toasts
    });

    if (errorsWithSuggestions.length > 0) {
      setToast({
        title: "All fixes applied",
        description: `${errorsWithSuggestions.length} validation error${errorsWithSuggestions.length !== 1 ? "s" : ""} fixed`,
        variant: "success",
      });
    }
  };

  // Helper to check if a cell has an issue
  const getCellIssue = (rowId: number, field: string): ValidationIssue | undefined => {
    return validationIssues.find((i) => i.row === rowId && i.field === field);
  };

  // Wrapper for updatePatient that works with the external cell components
  const handleCellUpdate = (rowId: number, field: string, value: string) => {
    updatePatient(rowId, field as keyof PatientRow | "phone.countryCode" | "phone.phoneNumber", value);
  };

  // Table columns definition with editable cells
  const getTableColumns = (): TableColumn<PatientRow>[] => [
    {
      key: "id",
      header: "#",
      width: 45,
      render: (_, item) => <span className="text-muted-foreground">{item.id}</span>,
    },
    {
      key: "firstName",
      header: "First Name",
      minWidth: 100,
      render: (_, item) => (
        <EditableTextCell
          value={item.firstName}
          rowId={item.id}
          field="firstName"
          onUpdate={handleCellUpdate}
          issue={getCellIssue(item.id, "firstName")}
        />
      ),
    },
    {
      key: "lastName",
      header: "Last Name",
      minWidth: 100,
      render: (_, item) => (
        <EditableTextCell
          value={item.lastName}
          rowId={item.id}
          field="lastName"
          onUpdate={handleCellUpdate}
          issue={getCellIssue(item.id, "lastName")}
        />
      ),
    },
    {
      key: "dob",
      header: "DOB",
      width: 120,
      render: (_, item) => (
        <EditableDateCell
          value={item.dob}
          rowId={item.id}
          onUpdate={handleCellUpdate}
          issue={getCellIssue(item.id, "dob")}
        />
      ),
    },
    {
      key: "gender",
      header: "Gender",
      width: 90,
      render: (_, item) => (
        <EditableSelectCell
          value={item.gender}
          rowId={item.id}
          field="gender"
          options={VALID_GENDERS as unknown as string[]}
          onUpdate={handleCellUpdate}
          issue={getCellIssue(item.id, "gender")}
        />
      ),
    },
    {
      key: "country",
      header: "Country",
      minWidth: 180,
      render: (_, item) => (
        <EditableSelectCell
          value={item.country}
          rowId={item.id}
          field="country"
          options={VALID_COUNTRIES}
          onUpdate={handleCellUpdate}
          issue={getCellIssue(item.id, "country")}
        />
      ),
    },
    {
      key: "city",
      header: "City",
      minWidth: 100,
      render: (_, item) => (
        <EditableTextCell
          value={item.city}
          rowId={item.id}
          field="city"
          onUpdate={handleCellUpdate}
          issue={getCellIssue(item.id, "city")}
        />
      ),
    },
    {
      key: "phoneCountryCode",
      header: "Code",
      width: 95,
      render: (_, item) => (
        <EditableSelectCell
          value={item.phone.countryCode}
          rowId={item.id}
          field="phone.countryCode"
          options={VALID_COUNTRY_CODES}
          onUpdate={handleCellUpdate}
          issue={getCellIssue(item.id, "phoneCountryCode")}
        />
      ),
    },
    {
      key: "phoneNumber",
      header: "Phone #",
      minWidth: 110,
      render: (_, item) => (
        <EditableTextCell
          value={item.phone.phoneNumber}
          rowId={item.id}
          field="phone.phoneNumber"
          onUpdate={handleCellUpdate}
          issue={getCellIssue(item.id, "phone.phoneNumber")}
          numericOnly
        />
      ),
    },
    {
      key: "language",
      header: "Language",
      minWidth: 100,
      render: (_, item) => (
        <EditableSelectCell
          value={item.language}
          rowId={item.id}
          field="language"
          options={VALID_LANGUAGES}
          onUpdate={handleCellUpdate}
          issue={getCellIssue(item.id, "language")}
        />
      ),
    },
    {
      key: "allergies",
      header: "Allergies",
      minWidth: 120,
      render: (_, item) => (
        <EditableTextCell
          value={item.allergies}
          rowId={item.id}
          field="allergies"
          onUpdate={handleCellUpdate}
          issue={getCellIssue(item.id, "allergies")}
        />
      ),
    },
    {
      key: "specialty",
      header: "Specialty",
      minWidth: 200,
      render: (_, item) => (
        <EditableSelectCell
          value={item.specialty}
          rowId={item.id}
          field="specialty"
          options={specialtyOptions as string[]}
          onUpdate={handleCellUpdate}
          issue={getCellIssue(item.id, "specialty")}
        />
      ),
    },
    {
      key: "missionId",
      header: "Mission",
      minWidth: 160,
      render: (_, item) => (
        <select
          value={item.missionId}
          onChange={(e) => {
            handleCellUpdate(item.id, "missionId", e.target.value);
            const m = missions.find(ms => ms.id === e.target.value);
            handleCellUpdate(item.id, "hospital", m?.defaultIntakeHospital || "");
          }}
          onKeyDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.stopPropagation()}
          className="w-full px-1 py-1 text-sm border-0 rounded focus:ring-1 focus:ring-primary cursor-pointer bg-transparent"
        >
          <option value="">None</option>
          {missions
            .sort((a, b) => {
              const order: Record<string, number> = { active: 0, planned: 1, completed: 2 };
              return (order[a.status] ?? 3) - (order[b.status] ?? 3);
            })
            .map(m => (
              <option key={m.id} value={m.id}>
                {m.name}{m.isActiveIntake ? " *" : ""}
              </option>
            ))}
        </select>
      ),
    },
    {
      key: "hospital",
      header: "Hospital",
      minWidth: 150,
      render: (_, item) => {
        const patientMission = missions.find(m => m.id === item.missionId);
        const hospitalOpts = (patientMission?.hospitals || []).map(h =>
          typeof h === "string" ? h : h.name
        );
        return (
          <select
            value={item.hospital}
            onChange={(e) => handleCellUpdate(item.id, "hospital", e.target.value)}
            disabled={!item.missionId || hospitalOpts.length === 0}
            onKeyDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onFocus={(e) => e.stopPropagation()}
            className="w-full px-1 py-1 text-sm border-0 rounded focus:ring-1 focus:ring-primary cursor-pointer bg-transparent disabled:opacity-50"
          >
            <option value="">
              {!item.missionId ? "Select mission" : hospitalOpts.length === 0 ? "No hospitals" : "Not assigned"}
            </option>
            {hospitalOpts.map(h => (
              <option key={h} value={h}>{h}</option>
            ))}
          </select>
        );
      },
    },
  ];

  const handleUpload = async () => {
    if (patients.length === 0) return;

    setUploading(true);
    setResults([]);
    const uploadResults: UploadResult[] = [];

    for (let i = 0; i < patients.length; i++) {
      const patient = patients[i];
      try {
        const response = await fetch("/api/patient", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...patient,
            missionId: patient.missionId || undefined,
            hospital: patient.hospital || undefined,
          }),
        });

        if (!response.ok) {
          const { message } = await response.json();
          throw new Error(message || "Failed to create patient");
        }

        uploadResults.push({
          row: i + 1,
          name: `${patient.firstName} ${patient.lastName}`,
          success: true,
        });
      } catch (err) {
        uploadResults.push({
          row: i + 1,
          name: `${patient.firstName} ${patient.lastName}`,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }
    }

    setResults(uploadResults);
    setShowResults(true);
    setUploading(false);

    // If all succeeded, redirect after a delay
    const allSucceeded = uploadResults.every((r) => r.success);
    if (allSucceeded) {
      setTimeout(() => {
        router.push("/patient-dashboard");
      }, 2000);
    }
  };

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const hasValidationErrors = validationIssues.some((i) => i.type === "error");

  return (
    <div className="space-y-6">
      {/* Download Template */}
      <div className="flex flex-col items-center gap-3 p-6 border border-dashed border-border rounded-lg bg-muted/30">
        <p className="text-sm text-muted-foreground text-center">
          Download the template CSV file to see the required format
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={downloadTemplate}
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Download Template
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowAllowedValues(!showAllowedValues)}
            className="text-sm"
          >
            {showAllowedValues ? "Hide" : "Show"} Allowed Values
          </Button>
        </div>
      </div>

      {/* Allowed Values Reference */}
      {showAllowedValues && (
        <div className="p-4 border border-border rounded-lg bg-muted/20 space-y-3 text-sm">
          <h4 className="font-medium">Allowed Values for Enum Fields:</h4>
          <div className="grid gap-3">
            <div>
              <span className="font-medium">gender:</span>{" "}
              <span className="text-muted-foreground">{VALID_GENDERS.join(", ")}</span>
            </div>
            <div>
              <span className="font-medium">language:</span>{" "}
              <span className="text-muted-foreground">{VALID_LANGUAGES.join(", ")}</span>
            </div>
            <div>
              <span className="font-medium">country:</span>{" "}
              <span className="text-muted-foreground">{VALID_COUNTRIES.join(", ")}</span>
            </div>
            <div>
              <span className="font-medium">phoneCountryCode:</span>{" "}
              <span className="text-muted-foreground">{VALID_COUNTRY_CODES.join(", ")}</span>
            </div>
            <div>
              <span className="font-medium">specialty:</span>{" "}
              <span className="text-muted-foreground">{specialtyOptions.join(", ")}</span>
            </div>
          </div>
        </div>
      )}

      {/* File Upload */}
      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          className="hidden"
          id="csv-upload"
        />
        {!file ? (
          <label
            htmlFor="csv-upload"
            className="flex flex-col items-center gap-3 p-8 border border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              Click to upload a CSV file
            </span>
          </label>
        ) : (
          <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/30">
            <span className="text-sm font-medium truncate">{file.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={clearFile}
              className="ml-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Parse Error */}
      {parseError && (
        <div className="flex items-start gap-2 p-4 border border-destructive/50 rounded-lg bg-destructive/10">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <p className="text-sm text-destructive">{parseError}</p>
        </div>
      )}

      {/* Validation Issues */}
      {validationIssues.length > 0 && !showResults && (
        <div className="space-y-3">
          {/* Corrections (auto-fixed) */}
          {validationIssues.filter((i) => i.type === "corrected").length > 0 && (
            <div className="p-4 border border-blue-500/50 rounded-lg bg-blue-50 dark:bg-blue-900/20 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0" />
                <span className="font-medium text-blue-800 dark:text-blue-200">
                  {validationIssues.filter((i) => i.type === "corrected").length} value{validationIssues.filter((i) => i.type === "corrected").length !== 1 ? "s" : ""} auto-corrected
                </span>
              </div>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Case mismatches were automatically fixed:
              </p>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1 max-h-24 overflow-y-auto">
                {validationIssues
                  .filter((i) => i.type === "corrected")
                  .map((i, idx) => (
                    <li key={idx}>
                      Row {i.row}: <span className="font-medium">{i.field}</span> &quot;{i.originalValue}&quot; → &quot;{i.correctedValue}&quot;
                    </li>
                  ))}
              </ul>
            </div>
          )}

          {/* Errors (no match found) */}
          {validationIssues.filter((i) => i.type === "error").length > 0 && (
            <div className="p-4 border border-red-500/50 rounded-lg bg-red-50 dark:bg-red-900/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span className="font-medium text-red-800 dark:text-red-200">
                    {validationIssues.filter((i) => i.type === "error").length} validation error{validationIssues.filter((i) => i.type === "error").length !== 1 ? "s" : ""} - upload blocked
                  </span>
                </div>
                {validationIssues.filter((i) => i.type === "error" && i.suggestedValue).length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyAllSuggestions}
                    className="text-xs border-red-300 text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/50"
                  >
                    Apply All Fixes ({validationIssues.filter((i) => i.type === "error" && i.suggestedValue).length})
                  </Button>
                )}
              </div>
              <p className="text-sm text-red-700 dark:text-red-300">
                The following values don&apos;t match any allowed options. Fix them before uploading.
              </p>
              <ul className="text-sm text-red-700 dark:text-red-300 space-y-2 max-h-32 overflow-y-auto">
                {validationIssues
                  .filter((i) => i.type === "error")
                  .map((i, idx) => (
                    <li key={idx} className="flex items-center gap-2 flex-wrap">
                      <span>
                        Row {i.row}: <span className="font-medium">{i.field}</span> = &quot;{i.originalValue}&quot;
                      </span>
                      {i.suggestedValue ? (
                        <button
                          type="button"
                          onClick={() => applySuggestion(i)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-800 hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900"
                        >
                          Fix: &quot;{i.suggestedValue}&quot;
                        </button>
                      ) : (
                        <span className="text-xs text-red-500 dark:text-red-400 italic">
                          (no suggestion - edit in table)
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
              <button
                type="button"
                onClick={() => setShowAllowedValues(true)}
                className="text-sm text-red-800 dark:text-red-200 underline"
              >
                View allowed values
              </button>
            </div>
          )}
        </div>
      )}

      {/* Mission & Hospital Assignment Bar */}
      {patients.length > 0 && !showResults && (
        <div className={`p-4 border border-border rounded-lg bg-muted/20 space-y-3 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
          <div className="flex items-center gap-2 text-sm font-medium">
            <Hospital className="w-4 h-4" />
            Assign Mission & Hospital
            <span className="text-muted-foreground font-normal ml-auto text-xs">
              {patients.filter(p => p.missionId).length} of {patients.length} assigned
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:items-end">
            <div className="flex-1 min-w-0">
              <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">Mission</label>
              <select
                value={globalMissionId}
                onChange={(e) => {
                  setGlobalMissionId(e.target.value);
                  const newMission = missions.find(m => m.id === e.target.value);
                  setGlobalHospital(newMission?.defaultIntakeHospital || "");
                }}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">No mission</option>
                {missions
                  .sort((a, b) => {
                    const order: Record<string, number> = { active: 0, planned: 1, completed: 2 };
                    return (order[a.status] ?? 3) - (order[b.status] ?? 3);
                  })
                  .map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.country}){m.isActiveIntake ? " - Active Intake" : ""}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex-1 min-w-0">
              <label className="text-xs text-muted-foreground uppercase tracking-wide block mb-1">Hospital</label>
              <select
                value={globalHospital}
                onChange={(e) => setGlobalHospital(e.target.value)}
                disabled={!globalMissionId || globalHospitalOptions.length === 0}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm disabled:opacity-50"
              >
                <option value="">
                  {!globalMissionId ? "Select a mission first" :
                   globalHospitalOptions.length === 0 ? "No hospitals" : "Not assigned"}
                </option>
                {globalHospitalOptions.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleApplyMissionToAll}
              disabled={!globalMissionId}
              className="shrink-0"
            >
              Apply to All
            </Button>
          </div>

          {globalMissionId && (
            <p className="text-xs text-muted-foreground">
              You can override per-patient in the {viewMode === "cards" ? "cards" : "table"} below.
            </p>
          )}
        </div>
      )}

      {/* Preview Table / Cards */}
      {patients.length > 0 && !showResults && (
        <div className={`space-y-3 ${uploading ? "pointer-events-none opacity-60" : ""}`}>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-medium">
              Preview ({patients.length} patient{patients.length !== 1 ? "s" : ""})
              <span className="text-muted-foreground font-normal ml-2">
                {viewMode === "cards" ? "- tap pencil to edit" : "- click cells to edit"}
              </span>
            </h3>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30">
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === "cards"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                  viewMode === "table"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Table2 className="w-3.5 h-3.5" />
                Table
              </button>
            </div>
          </div>

          {/* Card View - shown when viewMode is "cards" */}
          {viewMode === "cards" && (
            <div className="space-y-3">
              {patients.map((patient) => (
                <MobilePatientCard
                  key={patient.id}
                  patient={patient}
                  isEditing={editingRowId === patient.id}
                  onToggleEdit={() => setEditingRowId(editingRowId === patient.id ? null : patient.id)}
                  onUpdate={handleCellUpdate}
                  getCellIssue={getCellIssue}
                  validCountries={VALID_COUNTRIES}
                  validCountryCodes={VALID_COUNTRY_CODES}
                  validLanguages={VALID_LANGUAGES}
                  specialtyOptions={specialtyOptions as string[]}
                  missions={missions}
                />
              ))}
            </div>
          )}

          {/* Table View - shown when viewMode is "table" */}
          {viewMode === "table" && (
            <div className="border border-border rounded-lg overflow-x-auto bg-muted/20">
              <div className="min-w-[1400px]">
                <Table
                  data={patients}
                  columns={getTableColumns()}
                  stickyHeader
                  backgroundColor="background"
                  headerBackgroundColor="muted"
                  hoverBackgroundColor="primary/5"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              Results: {successCount} succeeded, {failCount} failed
            </span>
          </div>
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="max-h-60 overflow-y-auto">
              {results.map((result, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-2 px-3 py-2 border-b border-border last:border-b-0 ${
                    result.success ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  {result.success ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  )}
                  <span className="text-sm">
                    Row {result.row}: {result.name}
                    {result.error && (
                      <span className="text-red-600 ml-2">- {result.error}</span>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {failCount > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowResults(false);
                setResults([]);
              }}
            >
              Try Again
            </Button>
          )}
        </div>
      )}

      {/* Upload Button */}
      {patients.length > 0 && !showResults && (
        <div className="flex flex-col items-center gap-2">
          {hasValidationErrors && (
            <p className="text-sm text-destructive">
              Fix all validation errors before uploading
            </p>
          )}
          <Button
            type="button"
            onClick={handleUpload}
            disabled={uploading || hasValidationErrors}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 py-2 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : `Upload ${patients.length} Patient${patients.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      )}
    </div>
  );
}
