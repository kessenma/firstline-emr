"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Users, AlertTriangle, Loader2, Crown } from "lucide-react";

interface CareTeamMember {
  id: string;
  patientId: string;
  userId: string;
  role: string;
  isLead: boolean;
  assignedAt: string;
  userName: string | null;
  userEmail: string | null;
  userAccountType: string | null;
}

const ROLE_COLORS: Record<string, string> = {
  surgeon: "bg-blue-100 text-blue-800",
  assistant: "bg-green-100 text-green-800",
  consulting: "bg-purple-100 text-purple-800",
  triage: "bg-amber-100 text-amber-800",
  coordinator: "bg-gray-100 text-gray-800",
};

export function CareTeamSection({ patientId }: { patientId: string }) {
  const [careTeam, setCareTeam] = useState<CareTeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCareTeam = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/patient/care-team?patientId=${encodeURIComponent(patientId)}`,
      );
      if (!res.ok) throw new Error("Failed to fetch care team");
      const data = await res.json();
      setCareTeam(data.careTeam || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading care team");
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    fetchCareTeam();
  }, [fetchCareTeam]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading care team...
      </div>
    );
  }

  if (error || careTeam.length === 0) return null;

  return (
    <div className="border rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Users className="h-4 w-4 text-primary" />
        Care Team ({careTeam.length})
      </div>
      <div className="space-y-1.5">
        {careTeam.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              {member.isLead && (
                <Crown className="h-3.5 w-3.5 text-amber-500" />
              )}
              <span className={member.isLead ? "font-medium" : ""}>
                {member.userName || member.userEmail || "Unknown"}
              </span>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                ROLE_COLORS[member.role] || "bg-gray-100 text-gray-800"
              }`}
            >
              {member.role}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
