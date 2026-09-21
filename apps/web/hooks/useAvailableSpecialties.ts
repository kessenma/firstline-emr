// apps/web/hooks/useAvailableSpecialties.ts
"use client";

import { useQuery } from "@tanstack/react-query";
import axios from "axios";

interface AvailableSpecialtiesResponse {
  availableSpecialties: string[];
  doctorCount: number;
}

/**
 * Hook to fetch and cache available doctor specialties
 * Uses React Query for caching with 10-minute stale time
 */
export function useAvailableSpecialties() {
  const { data, isLoading, error, refetch } = useQuery<AvailableSpecialtiesResponse>({
    queryKey: ["availableSpecialties"],
    queryFn: async () => {
      const response = await axios.get<AvailableSpecialtiesResponse>(
        "/api/doctors/available-specialties",
      );
      return response.data;
    },
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
    gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus (data doesn't change often)
    refetchOnMount: false, // Use cached data if available
  });

  return {
    availableSpecialties: data?.availableSpecialties ?? [],
    doctorCount: data?.doctorCount ?? 0,
    isLoading,
    error,
    refetch,
  };
}

/**
 * Hook to check if a specific specialty has doctors
 * Returns a Set for O(1) lookup performance
 */
export function useSpecialtyAvailability() {
  const { availableSpecialties, isLoading } = useAvailableSpecialties();

  const availabilitySet = new Set(availableSpecialties);

  return {
    hasSpecialty: (specialty: string) => availabilitySet.has(specialty),
    availableSpecialties,
    isLoading,
  };
}
