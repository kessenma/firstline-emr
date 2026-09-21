import { useSession } from "next-auth/react";
import { useState, useCallback, useEffect } from "react";
import { useToast } from "@/components/hooks/useToast";
import type { Mission, MissionUrl, MissionHospital, MissionHospitalImage } from "@/db/schema/missions";
import type { MissionAttachment } from "@/db/schema/missionAttachments";
import type { MissionMember } from "@fajr/shared/admin";

export type { MissionUrl, MissionHospital, MissionHospitalImage, MissionMember };

export interface MissionWithCount extends Mission {
  memberCount: number;
}

export function useMissionsManagementViewModel() {
  const [missionsData, setMissionsData] = useState<MissionWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [selectedMissionMembers, setSelectedMissionMembers] = useState<MissionMember[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<MissionMember[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const { data: session } = useSession();
  const token = session?.user.token;
  const { setToast, api } = useToast();

  const fetchMissions = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/api/admin/GET/missions", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setMissionsData((data as any)?.missions || []);
    } catch (error) {
      console.error("Error fetching missions:", error);
      setToast?.({
        title: "Error",
        description: "Failed to fetch missions.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [token, setToast, api]);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  const handleCreateMission = async (
    missionData: {
      name: string;
      country: string;
      city?: string;
      hospitals?: MissionHospital[];
      description?: string;
      status?: string;
      startDate?: string;
      endDate?: string;
      urls?: MissionUrl[];
    },
    pendingFiles?: Array<{ file: File; displayName: string }>,
    onProgress?: (msg: string) => void,
  ) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      onProgress?.("Creating mission...");
      const data = await api.post("/api/admin/POST/create-mission", missionData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      const missionId = (data as any)?.mission?.id;

      // Upload staged files sequentially
      if (pendingFiles && pendingFiles.length > 0 && missionId) {
        for (let i = 0; i < pendingFiles.length; i++) {
          onProgress?.(`Uploading ${i + 1}/${pendingFiles.length}...`);
          try {
            await uploadAttachment(missionId, pendingFiles[i].file, pendingFiles[i].displayName);
          } catch (err) {
            console.error(`Failed to upload file ${i + 1}:`, err);
          }
        }
      }

      setToast?.({
        title: "Success",
        description: "Mission created successfully.",
        variant: "default",
      });
      await fetchMissions();
    } catch (error) {
      console.error("Error creating mission:", error);
      setToast?.({
        title: "Error",
        description: "Failed to create mission.",
        variant: "destructive",
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleUpdateMission = async (
    missionId: string,
    updates: Record<string, any>,
  ) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      await api.post(
        "/api/admin/POST/update-mission",
        { missionId, ...updates },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setToast?.({
        title: "Success",
        description: "Mission updated successfully.",
        variant: "default",
      });
      await fetchMissions();
    } catch (error) {
      console.error("Error updating mission:", error);
      setToast?.({
        title: "Error",
        description: "Failed to update mission.",
        variant: "destructive",
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleDeleteMission = async (missionId: string, archiveChat?: boolean) => {
    if (isMutating) return;
    setIsMutating(true);
    try {
      await api.post(
        "/api/admin/POST/delete-mission",
        { missionId, archiveChat: archiveChat ?? true },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setToast?.({
        title: "Success",
        description: "Mission deleted and removed from all users.",
        variant: "default",
      });
      await fetchMissions();
    } catch (error) {
      console.error("Error deleting mission:", error);
      setToast?.({
        title: "Error",
        description: "Failed to delete mission.",
        variant: "destructive",
      });
    } finally {
      setIsMutating(false);
    }
  };

  const handleSetActiveIntake = async (missionId: string | null) => {
    try {
      await api.post(
        "/api/admin/POST/set-active-intake-mission",
        { missionId },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setToast?.({
        title: "Success",
        description: missionId
          ? "Active intake mission set. New patients will be auto-tagged to this mission."
          : "Active intake mission cleared.",
        variant: "default",
      });
      await fetchMissions();
    } catch (error) {
      console.error("Error setting active intake:", error);
      setToast?.({
        title: "Error",
        description: "Failed to update active intake mission.",
        variant: "destructive",
      });
    }
  };

  const fetchMissionMembers = async (missionId: string) => {
    try {
      setSelectedMissionId(missionId);
      const data = await api.get(
        `/api/admin/GET/mission-members?missionId=${missionId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setSelectedMissionMembers((data as any)?.members || []);
    } catch (error) {
      console.error("Error fetching mission members:", error);
      setToast?.({
        title: "Error",
        description: "Failed to fetch mission members.",
        variant: "destructive",
      });
    }
  };

  // Full roster for the add-members dialog — filtered client-side in the view
  const fetchAllUsers = async () => {
    try {
      setIsLoadingUsers(true);
      const data = await api.get("/api/admin/GET/existing-users", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setAllUsers((data as any)?.users || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      setToast?.({
        title: "Error",
        description: "Failed to load user list.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleAssignMembers = async (missionId: string, userIds: string[]) => {
    try {
      await api.post(
        "/api/admin/POST/assign-mission-members",
        { missionId, userIds, action: "add" },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setToast?.({
        title: "Success",
        description: `${userIds.length} member(s) assigned to mission.`,
        variant: "default",
      });
      await fetchMissions();
      if (selectedMissionId === missionId) {
        await fetchMissionMembers(missionId);
      }
    } catch (error) {
      console.error("Error assigning members:", error);
      setToast?.({
        title: "Error",
        description: "Failed to assign members.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveMember = async (missionId: string, userId: string) => {
    try {
      await api.post(
        "/api/admin/POST/assign-mission-members",
        { missionId, userIds: [userId], action: "remove" },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setToast?.({
        title: "Success",
        description: "Member removed from mission.",
        variant: "default",
      });
      await fetchMissions();
      if (selectedMissionId === missionId) {
        await fetchMissionMembers(missionId);
      }
    } catch (error) {
      console.error("Error removing member:", error);
      setToast?.({
        title: "Error",
        description: "Failed to remove member.",
        variant: "destructive",
      });
    }
  };

  const uploadAttachment = async (missionId: string, file: File, displayName: string) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("displayName", displayName);

    const res = await fetch(`/api/missions/${missionId}/upload-attachment`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error("Upload failed");
    return res.json();
  };

  const handleUploadAttachment = async (missionId: string, file: File, displayName: string) => {
    try {
      const data = await uploadAttachment(missionId, file, displayName);
      setToast?.({
        title: "Success",
        description: "Attachment uploaded.",
        variant: "default",
      });
      return data.attachment as MissionAttachment;
    } catch (error) {
      console.error("Error uploading attachment:", error);
      setToast?.({
        title: "Error",
        description: "Failed to upload attachment.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleDeleteAttachment = async (missionId: string, attachmentId: string) => {
    try {
      await api.post(
        `/api/missions/${missionId}/delete-attachment`,
        { attachmentId },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setToast?.({
        title: "Success",
        description: "Attachment deleted.",
        variant: "default",
      });
    } catch (error) {
      console.error("Error deleting attachment:", error);
      setToast?.({
        title: "Error",
        description: "Failed to delete attachment.",
        variant: "destructive",
      });
    }
  };

  const fetchMissionAttachments = async (missionId: string): Promise<MissionAttachment[]> => {
    try {
      const data = await api.get(`/api/missions/${missionId}/attachments`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      return (data as any)?.attachments || [];
    } catch (error) {
      console.error("Error fetching attachments:", error);
      return [];
    }
  };

  const handleUploadHospitalImage = async (
    missionId: string,
    hospitalName: string,
    file: File,
  ): Promise<MissionHospitalImage | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("hospitalName", hospitalName);

      const res = await fetch(`/api/missions/${missionId}/upload-hospital-image`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      setToast?.({
        title: "Success",
        description: "Hospital image uploaded.",
        variant: "default",
      });
      return data.image as MissionHospitalImage;
    } catch (error) {
      console.error("Error uploading hospital image:", error);
      setToast?.({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload hospital image.",
        variant: "destructive",
      });
      return null;
    }
  };

  const handleDeleteHospitalImage = async (
    missionId: string,
    filePath: string,
  ): Promise<boolean> => {
    try {
      await api.post(
        `/api/missions/${missionId}/delete-hospital-image`,
        { filePath },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      setToast?.({
        title: "Success",
        description: "Hospital image deleted.",
        variant: "default",
      });
      return true;
    } catch (error) {
      console.error("Error deleting hospital image:", error);
      setToast?.({
        title: "Error",
        description: "Failed to delete hospital image.",
        variant: "destructive",
      });
      return false;
    }
  };

  return {
    missionsData,
    isLoading,
    isMutating,
    selectedMissionMembers,
    selectedMissionId,
    allUsers,
    isLoadingUsers,
    fetchAllUsers,
    fetchMissions,
    handleCreateMission,
    handleUpdateMission,
    handleDeleteMission,
    handleSetActiveIntake,
    fetchMissionMembers,
    handleAssignMembers,
    handleRemoveMember,
    handleUploadAttachment,
    handleDeleteAttachment,
    fetchMissionAttachments,
    handleUploadHospitalImage,
    handleDeleteHospitalImage,
  };
}
