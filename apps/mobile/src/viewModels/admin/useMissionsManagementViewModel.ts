// apps/mobile/src/viewModels/admin/useMissionsManagementViewModel.ts
// ViewModel for admin missions management
// HYBRID APPROACH: Reads from PowerSync (offline-first), writes via API (reliable)

import { useState, useCallback, useMemo } from 'react';
import { useMissions, type MissionOption, type MissionUrl, type MissionHospital, type MissionHospitalImage } from '../../hooks/useMissions';
import { usePowerSyncQuery } from '../../hooks/powersync';
import { TABLES } from '../../db/powerSyncSchema';
import { TokenStorage } from '../../services/TokenStorage';
import { getApiUrl, getBaseUrl } from '../../config';

// ─── Types ────────────────────────────────────────────────────────────────────

export type { MissionOption, MissionUrl, MissionHospital, MissionHospitalImage };

export interface MissionWithCount extends MissionOption {
  memberCount: number;
  groupChatThreadId: string | null;
}

export interface MissionMember {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
  accountType: string | null;
}

export interface MissionAttachment {
  id: string;
  missionId: string;
  displayName: string | null;
  fileName: string | null;
  contentType: string;
  fileSize: number | null;
  createdAt: string | null;
}

interface MissionFormData {
  name: string;
  country: string;
  city?: string;
  hospitals?: MissionHospital[];
  description?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  urls?: MissionUrl[];
  defaultIntakeHospital?: string | null;
}

// PowerSync row types
interface UserRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  account_type: string | null;
  missions: string | null;
}

interface MissionRow {
  id: string;
  group_chat_thread_id: string | null;
}

interface AttachmentRow {
  id: string;
  mission_id: string;
  display_name: string | null;
  file_name: string | null;
  content_type: string;
  file_size: number | null;
  created_at: string | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMissionsManagementViewModel() {
  const { missions, loading: missionsLoading } = useMissions();

  // Query all users (admins have global bucket) for member counting + search
  const usersQuery = usePowerSyncQuery<UserRow>(
    `SELECT id, first_name, last_name, email, account_type, missions FROM ${TABLES.USERS}`,
    [],
  );
  const usersQueryData = usersQuery.data;
  const allUsers = useMemo(() => usersQueryData || [], [usersQueryData]);

  // Query all mission rows for group_chat_thread_id
  const missionExtraQuery = usePowerSyncQuery<MissionRow>(
    `SELECT id, group_chat_thread_id FROM ${TABLES.MISSIONS}`,
    [],
  );
  const missionExtras = missionExtraQuery.data || [];

  // Compute missions with member counts (offline)
  const missionsData: MissionWithCount[] = missions.map((m) => {
    let memberCount = 0;
    for (const user of allUsers) {
      if (!user.missions) continue;
      try {
        const userMissions: string[] = JSON.parse(user.missions);
        if (userMissions.includes(m.id)) memberCount++;
      } catch { /* ignore parse errors */ }
    }
    const extra = missionExtras.find((e) => e.id === m.id);
    return {
      ...m,
      memberCount,
      groupChatThreadId: extra?.group_chat_thread_id ?? null,
    };
  });

  // ─── State ────────────────────────────────────────────────────────────────

  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Members — derived reactively from allUsers; hidden ids cover optimistic removes
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [hiddenMemberIds, setHiddenMemberIds] = useState<string[]>([]);

  // Full user roster for the add-members list (admins sync all users offline)
  const allUsersDirectory: MissionMember[] = useMemo(
    () =>
      allUsers.map((u) => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        accountType: u.account_type,
      })),
    [allUsers],
  );

  // Attachments — reactive query keyed by the mission being viewed/edited;
  // hidden ids cover optimistic deletes until PowerSync syncs
  const [attachmentsMissionId, setAttachmentsMissionId] = useState<string | null>(null);
  const [hiddenAttachmentIds, setHiddenAttachmentIds] = useState<string[]>([]);

  const attachmentsQuery = usePowerSyncQuery<AttachmentRow>(
    `SELECT id, mission_id, display_name, file_name, content_type, file_size, created_at FROM ${TABLES.MISSION_ATTACHMENTS} WHERE mission_id = ?`,
    attachmentsMissionId ? [attachmentsMissionId] : [],
    { enabled: attachmentsMissionId !== null },
  );

  const selectedAttachments: MissionAttachment[] = useMemo(() => {
    const rows = attachmentsQuery.data || [];
    return rows
      .filter((row) => !hiddenAttachmentIds.includes(row.id))
      .map((row) => ({
        id: row.id,
        missionId: row.mission_id,
        displayName: row.display_name,
        fileName: row.file_name,
        contentType: row.content_type,
        fileSize: row.file_size,
        createdAt: row.created_at,
      }));
  }, [attachmentsQuery.data, hiddenAttachmentIds]);

  // ─── Helpers ──────────────────────────────────────────────────────────────

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = TokenStorage.getAuthToken();
    if (!token) throw new Error('No authentication token found');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const apiRequest = useCallback(
    async <T = unknown>(endpoint: string, body?: unknown): Promise<T> => {
      const url = getApiUrl(endpoint);
      const res = await fetch(url, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Request failed: ${res.status}`);
      }
      return res.json();
    },
    [getAuthHeaders],
  );

  // ─── Offline member lookup (reactive — recomputes when allUsers syncs) ────

  const selectedMissionMembers: MissionMember[] = useMemo(() => {
    if (!selectedMissionId) return [];
    const members: MissionMember[] = [];
    for (const user of allUsers) {
      if (!user.missions) continue;
      if (hiddenMemberIds.includes(user.id)) continue;
      try {
        const userMissions: string[] = JSON.parse(user.missions);
        if (userMissions.includes(selectedMissionId)) {
          members.push({
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            email: user.email,
            accountType: user.account_type,
          });
        }
      } catch { /* ignore */ }
    }
    return members;
  }, [allUsers, selectedMissionId, hiddenMemberIds]);

  const fetchMissionMembers = useCallback(
    (missionId: string) => {
      setHiddenMemberIds([]);
      setSelectedMissionId(missionId);
    },
    [],
  );

  // ─── Attachment reads (offline, reactive) ─────────────────────────────────

  // Thin wrapper — points the reactive attachments query at a mission
  const fetchMissionAttachments = useCallback(
    (missionId: string) => {
      setHiddenAttachmentIds([]);
      setAttachmentsMissionId(missionId);
    },
    [],
  );

  // ─── API Mutations ────────────────────────────────────────────────────────

  const handleCreateMission = useCallback(
    async (data: MissionFormData) => {
      setIsMutating(true);
      setError(null);
      try {
        await apiRequest('/admin/POST/create-mission', data);
        // PowerSync will auto-sync the new mission
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to create mission';
        setError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [apiRequest],
  );

  const handleUpdateMission = useCallback(
    async (missionId: string, data: MissionFormData) => {
      setIsMutating(true);
      setError(null);
      try {
        await apiRequest('/admin/POST/update-mission', { missionId, ...data });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to update mission';
        setError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [apiRequest],
  );

  const handleDeleteMission = useCallback(
    async (missionId: string, archiveChat: boolean) => {
      setIsMutating(true);
      setError(null);
      try {
        await apiRequest('/admin/POST/delete-mission', { missionId, archiveChat });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete mission';
        setError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [apiRequest],
  );

  const handleSetActiveIntake = useCallback(
    async (missionId: string | null) => {
      setIsMutating(true);
      setError(null);
      try {
        await apiRequest('/admin/POST/set-active-intake-mission', { missionId });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to set active intake';
        setError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [apiRequest],
  );

  const handleAssignMembers = useCallback(
    async (missionId: string, userIds: string[]) => {
      setIsMutating(true);
      setError(null);
      try {
        await apiRequest('/admin/POST/assign-mission-members', {
          missionId,
          userIds,
          action: 'add',
        });
        // Reactive users query picks up the new memberships when they sync
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to assign members';
        setError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [apiRequest],
  );

  const handleRemoveMember = useCallback(
    async (missionId: string, userId: string) => {
      setIsMutating(true);
      setError(null);
      try {
        await apiRequest('/admin/POST/assign-mission-members', {
          missionId,
          userIds: [userId],
          action: 'remove',
        });
        // Optimistic update — hide until PowerSync syncs the removal
        setHiddenMemberIds((prev) => [...prev, userId]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to remove member';
        setError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [apiRequest],
  );

  const handleUploadAttachment = useCallback(
    async (missionId: string, fileUri: string, fileName: string, fileType: string, displayName: string) => {
      setIsMutating(true);
      setError(null);
      try {
        const token = TokenStorage.getAuthToken();
        if (!token) throw new Error('No authentication token');

        const formData = new FormData();
        formData.append('file', {
          uri: fileUri,
          name: fileName,
          type: fileType,
        } as unknown as Blob);
        formData.append('displayName', displayName);

        const url = `${getBaseUrl()}/api/missions/${missionId}/upload-attachment`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Upload failed');
        }

        // Reactive attachments query picks up the new row when it syncs
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to upload attachment';
        setError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [],
  );

  const handleDeleteAttachment = useCallback(
    async (missionId: string, attachmentId: string) => {
      setIsMutating(true);
      setError(null);
      try {
        const token = TokenStorage.getAuthToken();
        if (!token) throw new Error('No authentication token');

        const url = `${getBaseUrl()}/api/missions/${missionId}/delete-attachment`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ attachmentId }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Delete failed');
        }

        // Optimistic update — hide until PowerSync syncs the delete
        setHiddenAttachmentIds((prev) => [...prev, attachmentId]);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete attachment';
        setError(msg);
        throw err;
      } finally {
        setIsMutating(false);
      }
    },
    [],
  );

  const handleUploadHospitalImage = useCallback(
    async (missionId: string, hospitalName: string, fileUri: string, fileName: string, fileType: string): Promise<MissionHospitalImage | null> => {
      try {
        const token = TokenStorage.getAuthToken();
        if (!token) throw new Error('No authentication token');

        const formData = new FormData();
        formData.append('file', {
          uri: fileUri,
          name: fileName,
          type: fileType,
        } as unknown as Blob);
        formData.append('hospitalName', hospitalName);

        const url = `${getBaseUrl()}/api/missions/${missionId}/upload-hospital-image`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Upload failed');
        }

        const data = await res.json();
        return data.image as MissionHospitalImage;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to upload hospital image';
        setError(msg);
        return null;
      }
    },
    [],
  );

  const handleDeleteHospitalImage = useCallback(
    async (missionId: string, filePath: string): Promise<boolean> => {
      try {
        const token = TokenStorage.getAuthToken();
        if (!token) throw new Error('No authentication token');

        const url = `${getBaseUrl()}/api/missions/${missionId}/delete-hospital-image`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ filePath }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Delete failed');
        }

        return true;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to delete hospital image';
        setError(msg);
        return false;
      }
    },
    [],
  );

  const computeChangeSummary = useCallback(
    (original: MissionOption, updatedData: MissionFormData): string[] => {
      const changes: string[] = [];
      if (updatedData.name && updatedData.name !== original.name) changes.push(`Rename to "${updatedData.name}"`);
      if (updatedData.description !== undefined && (updatedData.description || '') !== (original.description || '')) changes.push('Update description');
      if (updatedData.country && updatedData.country !== original.country) changes.push(`Change country to ${updatedData.country}`);
      if (updatedData.city !== undefined && (updatedData.city || '') !== (original.city || '')) changes.push(updatedData.city ? `Change city to ${updatedData.city}` : 'Remove city');
      if (updatedData.status && updatedData.status !== original.status) changes.push(`Change status to ${updatedData.status}`);

      if (updatedData.hospitals) {
        const oldNames = new Set(original.hospitals.map((h) => h.name));
        const newNames = new Set(updatedData.hospitals.map((h) => h.name));
        const added = updatedData.hospitals.filter((h) => !oldNames.has(h.name));
        const removed = original.hospitals.filter((h) => !newNames.has(h.name));
        if (added.length > 0) changes.push(`Add hospital${added.length > 1 ? 's' : ''}: ${added.map((h) => h.name).join(', ')}`);
        if (removed.length > 0) changes.push(`Remove hospital${removed.length > 1 ? 's' : ''}: ${removed.map((h) => h.name).join(', ')}`);
      }

      return changes;
    },
    [],
  );

  return {
    // Data
    missionsData,
    isLoading: missionsLoading,
    isMutating,
    error,

    // Members
    selectedMissionId,
    selectedMissionMembers,
    fetchMissionMembers,

    // Full roster for add-members list (filtered client-side in the view)
    allUsersDirectory,

    // Attachments
    selectedAttachments,
    fetchMissionAttachments,

    // Mutations
    handleCreateMission,
    handleUpdateMission,
    handleDeleteMission,
    handleSetActiveIntake,
    handleAssignMembers,
    handleRemoveMember,
    handleUploadAttachment,
    handleDeleteAttachment,
    handleUploadHospitalImage,
    handleDeleteHospitalImage,
    computeChangeSummary,
  };
}
