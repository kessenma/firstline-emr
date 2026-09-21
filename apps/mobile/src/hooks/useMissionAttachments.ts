// apps/mobile/src/hooks/useMissionAttachments.ts
// PowerSync-based hook for fetching mission attachments from local SQLite

import { usePowerSyncQuery } from './powersync';
import { TABLES } from '@/db';

export interface MissionAttachmentItem {
  id: string;
  missionId: string;
  uploadedBy: string;
  filePath: string;
  fileName: string;
  displayName: string;
  fileSize: number | null;
  contentType: string;
  uploadType: string;
  createdAt: string;
}

interface AttachmentRow {
  id: string;
  mission_id: string;
  uploaded_by: string;
  file_path: string;
  file_name: string;
  display_name: string;
  file_size: number | null;
  content_type: string;
  upload_type: string;
  created_at: string;
}

export function useMissionAttachments(missionId: string | null) {
  const query = usePowerSyncQuery<AttachmentRow>(
    missionId
      ? `SELECT * FROM ${TABLES.MISSION_ATTACHMENTS} WHERE mission_id = ?`
      : `SELECT * FROM ${TABLES.MISSION_ATTACHMENTS} WHERE 0`,
    missionId ? [missionId] : [],
  );

  const attachments: MissionAttachmentItem[] = (query.data || []).map((row) => ({
    id: row.id,
    missionId: row.mission_id,
    uploadedBy: row.uploaded_by,
    filePath: row.file_path,
    fileName: row.file_name,
    displayName: row.display_name,
    fileSize: row.file_size,
    contentType: row.content_type,
    uploadType: row.upload_type,
    createdAt: row.created_at,
  }));

  return {
    attachments,
    loading: query.isLoading,
  };
}
