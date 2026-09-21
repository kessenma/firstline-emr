// apps/mobile/src/viewModels/admin/usePatientMediaViewModel.ts
// ViewModel for the admin Patient Media section.
//
// Reads entirely from PowerSync: admins sync `patient_media` for every patient
// via the global bucket, so the gallery browses offline. Only turning a storage
// path into a displayable URL needs the network, and cached items don't even
// need that.

import { useCallback, useMemo, useState } from 'react';
import { usePowerSyncPagedList } from '../../hooks/powersync';
import { resolveMediaType, type MediaType } from '@fajr/shared/media';

export type PatientMediaFilter = 'all' | 'images' | 'pdf';

const PAGE_SIZE = 30;

// Local SQLite joins are fine — the no-JOIN restriction applies to sync rules,
// not to queries run against the synced database.
const WHERE_CLAUSE = `
  WHERE (COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')) LIKE ?
    AND (
      ? = 'all'
      OR (? = 'images' AND pm.content_type LIKE 'image/%')
      OR (? = 'pdf' AND pm.content_type = 'application/pdf')
    )
`;

const PATIENT_MEDIA_SQL = `
  SELECT pm.id, pm.patient_id, pm.url, pm.content_type, pm.uploaded_at,
         p.first_name AS patient_first_name, p.last_name AS patient_last_name
  FROM patient_media pm
  LEFT JOIN patients p ON p.id = pm.patient_id
  ${WHERE_CLAUSE}
  ORDER BY pm.uploaded_at DESC
  LIMIT ?
`;

const PATIENT_MEDIA_COUNT_SQL = `
  SELECT COUNT(*) as count
  FROM patient_media pm
  LEFT JOIN patients p ON p.id = pm.patient_id
  ${WHERE_CLAUSE}
`;

interface PatientMediaRow {
  id: string;
  patient_id: string;
  url: string;
  content_type: string | null;
  uploaded_at: string;
  patient_first_name: string | null;
  patient_last_name: string | null;
}

export interface PatientMediaListItem {
  id: string;
  patientId: string;
  /** Object storage path — resolved to a signed URL or cached data URI lazily. */
  filePath: string;
  fileName: string;
  contentType: string | null;
  uploadedAt: string;
  patientName: string;
  type: MediaType;
}

function mapRowToPatientMedia(row: PatientMediaRow): PatientMediaListItem {
  const name = [row.patient_first_name, row.patient_last_name]
    .filter(Boolean)
    .join(' ')
    .trim();

  return {
    id: row.id,
    patientId: row.patient_id,
    filePath: row.url,
    fileName: row.url.split('/').pop() || row.url,
    contentType: row.content_type,
    uploadedAt: row.uploaded_at,
    patientName: name || 'Unknown patient',
    type: resolveMediaType({ mimeType: row.content_type, url: row.url }),
  };
}

export interface UsePatientMediaViewModelResult {
  items: PatientMediaListItem[];
  totalCount: number;

  isLoading: boolean;
  isRefreshing: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  error: string | null;

  search: string;
  setSearch: (value: string) => void;
  filter: PatientMediaFilter;
  setFilter: (value: PatientMediaFilter) => void;

  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;

  selectedIndex: number | null;
  openViewer: (index: number) => void;
  closeViewer: () => void;
}

export function usePatientMediaViewModel(): UsePatientMediaViewModelResult {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PatientMediaFilter>('all');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // LIKE is case-insensitive for ASCII in SQLite.
  const params = useMemo(
    () => [`%${search.trim()}%`, filter, filter, filter],
    [search, filter],
  );

  const list = usePowerSyncPagedList<PatientMediaRow, PatientMediaListItem>({
    listSql: PATIENT_MEDIA_SQL,
    countSql: PATIENT_MEDIA_COUNT_SQL,
    params,
    pageSize: PAGE_SIZE,
    mapRow: mapRowToPatientMedia,
    notReadyMessage:
      'Offline sync not available. Please ensure you are logged in as an admin.',
  });

  const openViewer = useCallback((index: number) => setSelectedIndex(index), []);
  const closeViewer = useCallback(() => setSelectedIndex(null), []);

  return {
    items: list.items,
    totalCount: list.totalCount,

    isLoading: list.isLoading,
    isRefreshing: list.isRefreshing,
    isLoadingMore: list.isLoadingMore,
    hasMore: list.hasMore,
    error: list.error,

    search,
    setSearch,
    filter,
    setFilter,

    refresh: list.refresh,
    loadMore: list.loadMore,

    selectedIndex,
    openViewer,
    closeViewer,
  };
}
