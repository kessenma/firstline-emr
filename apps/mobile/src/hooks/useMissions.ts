// apps/mobile/src/hooks/useMissions.ts
// PowerSync-based hook for fetching missions from the locally synced missions table

import { usePowerSyncQuery } from './powersync';
import { TABLES } from '@/db';

export interface MissionUrl {
  url: string;
  displayName: string;
}

export interface MissionHospitalImage {
  filePath: string;
  fileName: string;
  fileSize: number;
  contentType: string;
}

export type HospitalVisibility = 'public' | 'private';

export interface MissionHospital {
  name: string;
  visibility?: HospitalVisibility;
  url?: string;
  mapLink?: string;
  website?: string;
  description?: string;
  images?: MissionHospitalImage[];
}

export interface MissionOption {
  id: string;
  name: string;
  status: string;
  country: string;
  city: string | null;
  hospitals: MissionHospital[];
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  urls: MissionUrl[];
  isActiveIntake: boolean;
  defaultIntakeHospital: string | null;
}

interface MissionRow {
  id: string;
  name: string;
  status: string;
  country: string;
  city: string | null;
  hospitals: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  urls: string | null;
  is_active_intake: number | null;
  default_intake_hospital: string | null;
}

function parseJson<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}

export function useMissions() {
  const query = usePowerSyncQuery<MissionRow>(
    `SELECT id, name, status, country, city, hospitals, description, start_date, end_date, urls, is_active_intake, default_intake_hospital FROM ${TABLES.MISSIONS} ORDER BY created_at DESC`,
    [],
  );

  const missions: MissionOption[] = (query.data || []).map((row) => ({
    id: row.id,
    name: row.name,
    status: row.status,
    country: row.country,
    city: row.city,
    hospitals: parseJson<MissionHospital[]>(row.hospitals, []).map((h: any) =>
      typeof h === 'string' ? { name: h } : h
    ),
    description: row.description,
    startDate: row.start_date,
    endDate: row.end_date,
    urls: parseJson<MissionUrl[]>(row.urls, []),
    isActiveIntake: row.is_active_intake === 1,
    defaultIntakeHospital: row.default_intake_hospital,
  }));

  return {
    missions,
    loading: query.isLoading,
  };
}

/**
 * Returns only missions the given user is assigned to.
 * Uses the `users.missions` JSON array column synced via PowerSync.
 */
export function useMyMissions(userMissionIds: string[] | null) {
  const { missions, loading } = useMissions();

  const myMissions = userMissionIds
    ? missions.filter((m) => userMissionIds.includes(m.id))
    : [];

  return {
    missions: myMissions,
    loading,
  };
}
