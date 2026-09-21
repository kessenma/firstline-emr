// apps/mobile/src/hooks/useChartAccess.ts
// Evaluates whether the current user may open a patient chart, using the same
// shared rule the web app applies. See @fajr/shared/care-team/chart-access.

import { useCallback } from 'react';
import { evaluateChartAccess, type ChartAccessResult } from '@fajr/shared/care-team';
import { useAuth } from '../contexts/AuthContext';
import type { PatientWithMessages } from '../types/patient';

/**
 * `doctor_specialty` reaches the device as a JSON array in a text column, but
 * arrives already-parsed on some auth paths — and is occasionally a bare
 * string. Handle all three rather than trusting one shape.
 */
export function parseSpecialties(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === 'string');
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed)
        ? parsed.filter((v): v is string => typeof v === 'string')
        : [];
    } catch {
      return [trimmed];
    }
  }
  return [];
}

export function useChartAccess() {
  const { user } = useAuth();

  return useCallback(
    (patient: Pick<PatientWithMessages, 'specialties' | 'careTeam'>): ChartAccessResult =>
      evaluateChartAccess({
        accountType: user?.accountType,
        userId: user?.id ? String(user.id) : undefined,
        userEmail: user?.email,
        doctorSpecialties: parseSpecialties(user?.doctorSpecialty),
        patient: {
          specialties: patient.specialties,
          careTeam: patient.careTeam as any,
        },
      }),
    [user],
  );
}
