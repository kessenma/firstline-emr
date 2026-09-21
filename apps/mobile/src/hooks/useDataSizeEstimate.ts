// apps/mobile/src/hooks/useDataSizeEstimate.ts
// Estimates the size of synced patient data and uncached media for the data settings UI.

import { useMemo } from 'react';
import { usePowerSyncQuery } from './powersync';

// Average row sizes in bytes (conservative estimates based on typical EMR data)
const AVG_ROW_BYTES: Record<string, number> = {
  patients: 2048,
  notes: 3072,
  internal_message_threads: 512,
  internal_messages: 512,
  telegram_threads: 512,
  user_messages: 256,
  med_orders: 1024,
  rx_orders: 1024,
  patient_follow_ups: 256,
  notifications: 256,
  notification_recipients: 128,
  users: 1024,
  user_settings: 256,
  admins: 256,
  admin_notifications: 256,
  user_profile_logs: 512,
  internal_message_thread_participants: 128,
  telegram_thread_participants: 128,
  patient_media: 256, // metadata only — the photo itself is media
};

// Average photo file size for uncached media estimate
const AVG_PHOTO_BYTES = 250 * 1024; // 250 KB per photo

export interface DataSizeEstimate {
  /** Total estimated patient/text data in bytes */
  patientDataBytes: number;
  /** Total estimated uncached media in bytes */
  mediaBytes: number;
  /** Combined total */
  totalBytes: number;
  /** Breakdown by table */
  tableCounts: Record<string, number>;
  /** Number of uncached photos */
  uncachedPhotoCount: number;
  /** Total photo count */
  totalPhotoCount: number;
  isLoading: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export { formatBytes };

export function useDataSizeEstimate(): DataSizeEstimate {
  // Count rows across all synced tables using a UNION query
  const { data: countData, isLoading: countsLoading } = usePowerSyncQuery<{
    tbl: string;
    cnt: number;
  }>(
    `SELECT 'patients' as tbl, COUNT(*) as cnt FROM patients
     UNION ALL SELECT 'notes', COUNT(*) FROM notes
     UNION ALL SELECT 'internal_messages', COUNT(*) FROM internal_messages
     UNION ALL SELECT 'internal_message_threads', COUNT(*) FROM internal_message_threads
     UNION ALL SELECT 'telegram_threads', COUNT(*) FROM telegram_threads
     UNION ALL SELECT 'user_messages', COUNT(*) FROM user_messages
     UNION ALL SELECT 'med_orders', COUNT(*) FROM med_orders
     UNION ALL SELECT 'rx_orders', COUNT(*) FROM rx_orders
     UNION ALL SELECT 'patient_follow_ups', COUNT(*) FROM patient_follow_ups
     UNION ALL SELECT 'notifications', COUNT(*) FROM notifications
     UNION ALL SELECT 'users', COUNT(*) FROM users
     UNION ALL SELECT 'patient_media', COUNT(*) FROM patient_media`,
    [],
  );

  // Count already-cached media
  const { data: cachedData, isLoading: cachedLoading } = usePowerSyncQuery<{
    cnt: number;
  }>(`SELECT COUNT(*) as cnt FROM media_cache`, []);

  const result = useMemo(() => {
    const tableCounts: Record<string, number> = {};
    let patientDataBytes = 0;
    let totalPhotoCount = 0;

    if (countData) {
      for (const row of countData) {
        tableCounts[row.tbl] = row.cnt;
        const avgSize = AVG_ROW_BYTES[row.tbl] ?? 512;

        if (row.tbl === 'patient_media') {
          totalPhotoCount = row.cnt;
          // Photo metadata is still patient data
          patientDataBytes += row.cnt * avgSize;
        } else {
          patientDataBytes += row.cnt * avgSize;
        }
      }
    }

    const cachedCount = cachedData?.[0]?.cnt ?? 0;
    const uncachedPhotoCount = Math.max(0, totalPhotoCount - cachedCount);
    const mediaBytes = uncachedPhotoCount * AVG_PHOTO_BYTES;

    return {
      patientDataBytes,
      mediaBytes,
      totalBytes: patientDataBytes + mediaBytes,
      tableCounts,
      uncachedPhotoCount,
      totalPhotoCount,
      isLoading: countsLoading || cachedLoading,
    };
  }, [countData, cachedData, countsLoading, cachedLoading]);

  return result;
}
