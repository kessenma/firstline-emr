"use client";

import type React from "react";
import { useState } from "react";
import { useMissions } from "@/hooks/useMissions";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { useToast } from "@/components/hooks/useToast";

interface HospitalCellProps {
  hospital: string | null;
  patientId: string;
  missionId: string | null;
  isLoading: boolean;
  disabled?: boolean;
  loadingState?: string | boolean;
  onChange: () => Promise<void>;
}

export const HospitalCell: React.FC<HospitalCellProps> = ({
  hospital,
  patientId,
  missionId,
  isLoading,
  disabled = false,
  loadingState,
  onChange,
}) => {
  const { missions } = useMissions();
  const { setToast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);

  // Get hospitals from the patient's assigned mission
  const mission = missions.find((m) => m.id === missionId);
  const hospitalOptions = (mission?.hospitals || []).map((h) => typeof h === 'string' ? h : h.name);

  const handleChange = async (newHospital: string) => {
    const value = newHospital === "" ? null : newHospital;
    if (value === hospital) return;

    setIsUpdating(true);
    try {
      await axios.patch(`/api/patient/${patientId}/triage`, {
        hospital: value,
      });
      await onChange();
    } catch (error) {
      console.error("Error updating hospital:", error);
      setToast({
        title: "Error",
        description: "Failed to update hospital.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const isDisabledState = disabled || isLoading || isUpdating;

  if (isLoading || isUpdating) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Updating...</span>
      </div>
    );
  }

  if (hospitalOptions.length === 0) {
    return (
      <span className="text-sm text-muted-foreground">
        {hospital || "—"}
      </span>
    );
  }

  return (
    <select
      value={hospital || ""}
      onChange={(e) => handleChange(e.target.value)}
      disabled={isDisabledState}
      className="w-full h-8 rounded border border-input bg-background px-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="">Not Assigned</option>
      {hospitalOptions.map((h) => (
        <option key={h} value={h}>
          {h}
        </option>
      ))}
    </select>
  );
};
