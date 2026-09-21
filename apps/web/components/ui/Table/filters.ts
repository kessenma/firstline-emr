// apps/web/components/ui/Table/filters.ts

import { PATIENT_STATUS_VALUES, PATIENT_PRIORITY_VALUES } from '@fajr/shared/patient';

export const PRIORITIES = PATIENT_PRIORITY_VALUES as readonly string[];

export const STATUS = PATIENT_STATUS_VALUES;

export const EXPAND_OPTIONS = ["Expand All", "Collapse All"];