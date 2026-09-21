import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface MissionInfo {
  id: string;
  name: string;
  status: string;
  country: string;
  city: string | null;
}

interface MissionRequestInfo {
  id: string;
  missionId: string;
  status: string;
  missionName: string;
  missionCountry: string;
  createdAt: string;
}

export function useMissionJoinRequests(userMissions: string[] | null | undefined) {
  const { data: session } = useSession();
  const [allMissions, setAllMissions] = useState<MissionInfo[]>([]);
  const [myRequests, setMyRequests] = useState<MissionRequestInfo[]>([]);
  const [isRequestMode, setIsRequestMode] = useState(false);
  const [selectedMissionIds, setSelectedMissionIds] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [missionsRes, requestsRes] = await Promise.all([
        fetch("/api/missions"),
        fetch("/api/missions/request-join"),
      ]);

      if (missionsRes.ok) {
        const data = await missionsRes.json();
        setAllMissions(data.missions || []);
      }
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setMyRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Error fetching mission data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (session) {
      fetchData();
    }
  }, [session, fetchData]);

  // Available = planned/active missions that user is NOT a member of and has no pending request for
  const currentMissions = userMissions || [];
  const pendingMissionIds = new Set(
    myRequests.filter((r) => r.status === "pending").map((r) => r.missionId),
  );

  const availableMissions = allMissions.filter(
    (m) =>
      (m.status === "planned" || m.status === "active") &&
      !currentMissions.includes(m.id) &&
      !pendingMissionIds.has(m.id),
  );

  const pendingRequests = myRequests.filter((r) => r.status === "pending");

  const toggleRequestMode = () => {
    setIsRequestMode((prev) => !prev);
    setSelectedMissionIds(new Set());
  };

  const toggleMission = (missionId: string) => {
    setSelectedMissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(missionId)) {
        next.delete(missionId);
      } else {
        next.add(missionId);
      }
      return next;
    });
  };

  const submitRequests = async () => {
    if (selectedMissionIds.size === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/missions/request-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ missionIds: Array.from(selectedMissionIds) }),
      });
      if (res.ok) {
        setIsRequestMode(false);
        setSelectedMissionIds(new Set());
        await fetchData();
      }
    } catch (err) {
      console.error("Error submitting mission requests:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    availableMissions,
    pendingRequests,
    isRequestMode,
    selectedMissionIds,
    isSubmitting,
    isLoading,
    toggleRequestMode,
    toggleMission,
    submitRequests,
  };
}
