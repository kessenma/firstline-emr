// apps/web/components/patient-dashboard/DashboardViewModel.ts
"use client";

import { useReducer, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import useFilterStore from "@/stores/useDashboardStore";
import { updatePatient } from "@/lib/api";
import { usePatientQueries } from "./viewModel/usePatientQueries";
import { usePatientMutations } from "./viewModel/usePatientMutations";
import { useFilteredPatients } from "./viewModel/useFilteredPatients";
import { useConflictCount } from "@/hooks/useConflictCount";
import type { PatientWithMessages } from "./viewModel/types";
import type { ServerPatient } from "@/lib/server/patients";

// State type — only keeps non-filter concerns (toast, loading, error)
type State = {
  error: string | null;
  message: string;
  loadingStates: Record<string, string | boolean>;
  open: boolean;
};

type Action =
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "SET_MESSAGE"; payload: string }
  | { type: "SET_LOADING"; payload: Record<string, string | boolean> }
  | { type: "SET_OPEN"; payload: boolean };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "SET_ERROR":
      return { ...state, error: action.payload };
    case "SET_MESSAGE":
      return { ...state, message: action.payload };
    case "SET_LOADING":
      return { ...state, loadingStates: action.payload };
    case "SET_OPEN":
      return { ...state, open: action.payload };
    default:
      return state;
  }
}

const initialState: State = {
  error: null,
  message: "",
  loadingStates: {},
  open: false,
};

export function useDashboardViewModel(
  initialPatients?: ServerPatient[] | PatientWithMessages[],
) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { filters, clearFilters } = useFilterStore();
  const { viewMode, showUnassignedSpecialty, showFollowUps } = filters;

  const [state, dispatch] = useReducer(reducer, initialState);

  const triggerToast = useCallback((msg: string) => {
    dispatch({ type: "SET_MESSAGE", payload: msg });
  }, []);

  // 'discharged' swaps to the archived endpoint; 'all' asks the active endpoint
  // to include discharged patients instead. Previously 'all' set showArchived,
  // so "All Patients" actually returned ONLY discharged ones.
  const showArchived = viewMode === "discharged";
  const showBoth = viewMode === "all";

  // Get patient data from queries with infinite scroll
  const {
    patients,
    isLoading,
    error: queryError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    archivedFetched,
  } = usePatientQueries(
    status === "authenticated",
    session?.user?._id,
    showArchived,
    showUnassignedSpecialty,
    initialPatients as PatientWithMessages[] | undefined,
    showBoth,
  );

  // Set error state if query fails
  if (queryError) {
    dispatch({
      type: "SET_ERROR",
      payload: "Failed to fetch patients. Please try again.",
    });
    triggerToast("Failed to fetch patients. Please try again.");
  }

  // Create a setLoadingStates function that matches the expected type
  const setLoadingStates: React.Dispatch<
    React.SetStateAction<Record<string, string | boolean>>
  > = useCallback(
    (value) => {
      if (typeof value === "function") {
        const newLoadingStates = value(state.loadingStates);
        dispatch({ type: "SET_LOADING", payload: newLoadingStates });
      } else {
        dispatch({ type: "SET_LOADING", payload: value });
      }
    },
    [state.loadingStates],
  );

  // Create a setOpen function for the Toast state
  const setOpen: React.Dispatch<React.SetStateAction<boolean>> = useCallback(
    (value) => {
      if (typeof value === "function") {
        const newValue = value(state.open);
        dispatch({ type: "SET_OPEN", payload: newValue });
      } else {
        dispatch({ type: "SET_OPEN", payload: value });
      }
    },
    [state.open],
  );

  // Conflict patient IDs for triage filtering
  const { conflictPatientIds } = useConflictCount(session?.user?.accountType);

  // Get filtered patients
  const { sortedAndFilteredRows } = useFilteredPatients(
    patients,
    session,
    conflictPatientIds,
  );

  // Get patient mutation handlers
  const {
    handleSpecialtyChange,
    handleStatusChange,
    handleTakeCase,
    handleArchive,
    handleDoctorNoteSave,
  } = usePatientMutations(
    session,
    setLoadingStates,
    sortedAndFilteredRows,
    triggerToast,
  );

  return {
    session,
    status,
    rows: sortedAndFilteredRows,
    isLoading,
    error: state.error,
    filters,
    clearFilters,
    handleStatusChange,
    handleTakeCase,
    handleArchive,
    handleDoctorNoteSave,
    updatePatient,
    message: state.message,
    showArchived,
    showUnassignedSpecialty,
    sortedAndFilteredRows,
    handleSpecialtyChange,
    loadingStates: state.loadingStates,
    setLoadingStates,
    patients,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    showBoth,
    showFollowUps,
    open: state.open,
    setOpen,
    router,
  };
}
