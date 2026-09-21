// apps/web/components/patient-dashboard/DashboardView.tsx
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { ToastProvider } from "@/components/ui/toast";
import { PatientTable } from "./PatientTable";
import * as Toast from "@radix-ui/react-toast";
import { useDashboardViewModel } from "./DashboardViewModel";
import { RefreshCw, Info, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Session } from "next-auth";
import { FilterBar } from "./FilterBar";
import { ViewModeTabs } from "./filters/ViewModeTabs";
import { CareTeamScopeToggle } from "./filters/CareTeamScopeToggle";
import { ResultCount } from "./filters/ResultCount";
import { FilterSheetTrigger } from "./filters/FilterSheetTrigger";
import { PresetChips } from "./filters/PresetChips";
import { TableSkeleton } from "../ui/Table/TableSkeleton";
import { EmptyPatientsState } from "./EmptyPatientsState";
import { DashboardHelpDialog } from "./DashboardHelpDialog";
import { getActiveFilterCount } from "@fajr/shared/patient-dashboard";
import FollowUpsView from "./followUps/FollowUpsView";
import type { PatientWithMessages } from "./viewModel/types";
import type { ServerPatient } from "@/lib/server/patients";
import { useSearchParams } from "next/navigation";
import { useRealtimePatientDashboard } from "./hooks/useRealtimePatientDashboard";
import useDashboardStore from "@/stores/useDashboardStore";
import { useConflictCount } from "@/hooks/useConflictCount";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";

interface Props {
  session: Session | null;
  isLoadingInitial: boolean;
  initialPatients?: ServerPatient[];
}

const DashboardView: React.FC<Props> = ({
  session,
  isLoadingInitial,
  initialPatients,
}) => {
  const searchParams = useSearchParams();
  const {
    rows,
    patients,
    session: viewModelSession,
    isLoading,
    error,
    handleStatusChange,
    handleTakeCase,
    handleArchive,
    updatePatient,
    open,
    setOpen,
    message,
    router,
    showArchived,
    showBoth,
    showUnassignedSpecialty,
    showFollowUps,
    sortedAndFilteredRows,
    handleSpecialtyChange,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    loadingStates,
    setLoadingStates,
  } = useDashboardViewModel(initialPatients);

  const { filters, updateFilters } = useDashboardStore();

  // Real-time patient dashboard updates via SSE
  const { recentlyChangedIds } = useRealtimePatientDashboard({ enabled: true });

  // Conflict count for triage users
  const { count: conflictCount } = useConflictCount(session?.user?.accountType);

  // Deep links from notifications/bookmarks. All five legacy values must keep
  // working. Applied once on mount only — this used to re-run on every
  // searchParams change and stomp filters the user had just set by hand.
  const deepLinkAppliedRef = React.useRef(false);
  React.useEffect(() => {
    if (deepLinkAppliedRef.current) return;
    const filterParam = searchParams.get("filter");
    if (!filterParam) return;
    deepLinkAppliedRef.current = true;

    if (filterParam === "followups") {
      updateFilters({ showFollowUps: true });
    } else if (filterParam === "unassigned") {
      updateFilters({ showUnassignedSpecialty: true });
    } else if (filterParam === "archived" || filterParam === "discharged") {
      updateFilters({ viewMode: "discharged" });
    } else if (filterParam === "both") {
      updateFilters({ viewMode: "all" });
    } else {
      updateFilters({ viewMode: "active" });
    }
  }, [searchParams, updateFilters]);

  // Infinite scroll observer target
  const observerTarget = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleObserver: IntersectionObserverCallback = (entries) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    };

    const element = observerTarget.current;
    if (!element) return;

    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "100px",
      threshold: 0.1,
    });

    observer.observe(element);

    return () => {
      if (element) {
        observer.unobserve(element);
      }
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (error) {
    return <div>Error: {error}</div>;
  }

  if (isLoading && !rows.length && !showFollowUps) {
    return <TableSkeleton rowCount={8} columnCount={5} />;
  }

  const getPageTitle = () => {
    if (showFollowUps) return "Patient Follow-Ups";
    if (showUnassignedSpecialty) return "Unassigned Specialty Patients";
    // showArchived ('discharged') and showBoth ('all') are mutually exclusive
    // now that 'all' fetches from the active endpoint with scope=all.
    if (showBoth) return "All Patients";
    if (showArchived) return "Discharged Patients";
    return "Patient Dashboard";
  };

  const showAlternativeView = showFollowUps;

  const helpView = showFollowUps
    ? "follow-ups"
    : showUnassignedSpecialty
      ? "unassigned-specialty"
      : "dashboard";

  // Same shared counter the filter badge uses, so they can't disagree.
  const hasActiveFilters = getActiveFilterCount(filters) > 0;

  return (
    <ToastProvider>
      <div className="w-full h-screen px-0 relative dashboard-page">
        {/* Header */}
        <div className="relative flex flex-col py-4">
          {/* Desktop layout */}
          <div className="hidden md:flex items-center justify-between px-4">
            {/* Left: View tabs + Care team toggle + Refresh */}
            <div className="flex items-center gap-3">
              <ViewModeTabs />
              <CareTeamScopeToggle accountType={session?.user?.accountType} />
              <FilterSheetTrigger
                allPatients={patients as PatientWithMessages[]}
                accountType={session?.user?.accountType}
              />
              {conflictCount > 0 && session?.user?.accountType === "Triage" && (
                <button
                  onClick={() => updateFilters({ showConflictsOnly: true })}
                  className="flex items-center gap-1"
                >
                  <Badge variant="destructive" className="text-xs px-2 py-0.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {conflictCount} conflict{conflictCount !== 1 ? "s" : ""}
                  </Badge>
                </button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (!showFollowUps && !showUnassignedSpecialty) {
                    refetch();
                  }
                }}
                disabled={isLoading}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                <span className="sr-only">Refresh</span>
              </Button>
            </div>

            {/* Center: Title + Info */}
            <div className="flex items-center">
              <h1 className="text-center font-bold text-[22px]">
                <span className="text-foreground">{getPageTitle()}</span>
              </h1>
              <DashboardHelpDialog
                className="ml-2"
                accountType={session?.user?.accountType}
                view={helpView}
              />
            </div>

            {/* Right: Create Patient */}
            {!showAlternativeView &&
              ["Triage", "Doctor"].includes(
                session?.user?.accountType ?? "",
              ) ? (
              <Button
                onClick={() => router.replace("/create-patient")}
                variant="default"
              >
                <Plus size={16} />
              </Button>
            ) : (
              <div className="w-9" />
            )}
          </div>

          {/* Mobile layout */}
          <div className="flex md:hidden flex-col gap-3 px-4">
            <div className="flex justify-center">
              <ViewModeTabs />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CareTeamScopeToggle
                  accountType={session?.user?.accountType}
                />
                <FilterSheetTrigger
                  allPatients={patients as PatientWithMessages[]}
                  accountType={session?.user?.accountType}
                />
                <DashboardHelpDialog
                  accountType={session?.user?.accountType}
                  view={helpView}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    if (!showFollowUps && !showUnassignedSpecialty) {
                      refetch();
                    }
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                  />
                  <span className="sr-only">Refresh</span>
                </Button>
              </div>

              {!showAlternativeView &&
                ["Triage", "Doctor"].includes(
                  session?.user?.accountType ?? "",
                ) && (
                  <Button
                    onClick={() => router.push("/create-patient")}
                    variant="default"
                  >
                    <Plus />
                  </Button>
                )}
            </div>
          </div>
        </div>

        {/* Preset chips + Filter bar + Result count */}
        {!showAlternativeView && (
          <>
            <PresetChips />
            <FilterBar />
            <ResultCount
              filteredCount={sortedAndFilteredRows.length}
              totalCount={patients.length}
              hasActiveFilters={hasActiveFilters}
            />
          </>
        )}

        {/* Main content */}
        <div className="h-[calc(100vh-10rem)] w-full">
          {showFollowUps ? (
            <FollowUpsView />
          ) : isLoading && patients.length === 0 ? (
            <TableSkeleton rowCount={8} columnCount={5} />
          ) : !showArchived &&
            !showUnassignedSpecialty &&
            patients.length === 0 ? (
            // Truly no patients visible — guide toward mission enrollment
            <EmptyPatientsState />
          ) : (
            <>
              <PatientTable
                rows={sortedAndFilteredRows}
                allData={patients as PatientWithMessages[]}
                session={viewModelSession}
                handleStatusChange={handleStatusChange}
                handleTakeCase={handleTakeCase}
                handleArchive={handleArchive}
                updatePatient={updatePatient}
                userType={
                  viewModelSession?.user?.accountType === "Triage"
                    ? "triage"
                    : viewModelSession?.user?.accountType === "Doctor"
                      ? "doctor"
                      : "triage"
                }
                handleSpecialtyChangeWithNotification={handleSpecialtyChange}
                loadingStates={loadingStates}
                setLoadingStates={setLoadingStates}
                recentlyChangedIds={recentlyChangedIds}
              />
              <div
                ref={observerTarget}
                className="h-10 flex items-center justify-center"
              >
                {isFetchingNextPage && (
                  <div className="text-sm text-muted-foreground">
                    Loading more patients...
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <Toast.Provider>
        <Toast.Root
          className="bg-primary text-primary-foreground p-3 rounded-lg shadow-lg"
          open={open}
          onOpenChange={setOpen}
          duration={3000}
        >
          <Toast.Title>{message}</Toast.Title>
        </Toast.Root>
        <Toast.Viewport className="fixed bottom-5 left-1/2 transform -translate-x-1/2" />
      </Toast.Provider>
    </ToastProvider>
  );
};

export default DashboardView;
