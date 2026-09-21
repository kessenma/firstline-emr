"use client";

import { useState, useEffect } from "react";
import type { MissionHospital } from "@/db/schema/missions";

export interface MissionOption {
  id: string;
  name: string;
  status: string;
  country: string;
  city: string | null;
  hospitals: MissionHospital[];
  defaultIntakeHospital: string | null;
  isActiveIntake: boolean;
}

export function useMissions() {
  const [missions, setMissions] = useState<MissionOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchMissions() {
      try {
        const response = await fetch("/api/missions");
        if (!response.ok) throw new Error("Failed to fetch missions");
        const data = await response.json();
        if (!cancelled) {
          setMissions(data.missions || []);
        }
      } catch (error) {
        console.error("Error fetching missions:", error);
        if (!cancelled) {
          setMissions([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchMissions();
    return () => {
      cancelled = true;
    };
  }, []);

  return { missions, isLoading };
}
