"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Trash2, Check } from "lucide-react";
import { cn } from "@/utils/classNames";
import useDashboardStore from "@/stores/useDashboardStore";
import {
  VIEW_MODES,
  CARE_TEAM_SCOPES,
  shouldShowCareTeamScope,
  getActiveFilterCount,
  DASHBOARD_PRIORITY_OPTIONS,
} from "@fajr/shared/patient-dashboard";
import { DoctorSpecialties } from "@/data/doctorSpecialty.enum";
import { PatientStatuses } from "@/data/patientStatus.enum";
import { FilterPillRow } from "./FilterPillRow";
import { MissionFilterSection } from "./MissionFilterSection";
import type { PatientWithMessages } from "../viewModel/types";
import { useMissions } from "@/hooks/useMissions";

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  allPatients: PatientWithMessages[];
  accountType?: string;
}

/** Counts via the shared `getActiveFilterCount` so the badge here, the badge on
 *  mobile, and `hasActiveFilters` in DashboardView can no longer disagree —
 *  they previously counted 11, 10 and 7 keys respectively. */
export function useActiveFilterCount(): number {
  const { filters } = useDashboardStore();
  return getActiveFilterCount(filters);
}

function ToggleCard({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative rounded-lg px-3 py-2 text-left transition-all duration-150",
        "border text-sm",
        isActive
          ? "border-primary bg-primary text-primary-foreground shadow-xs"
          : "border-border bg-background text-foreground hover:border-primary/50 cursor-pointer",
      )}
    >
      <span className="block truncate pr-5">{label}</span>
      {isActive && (
        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-primary-foreground/20 flex items-center justify-center">
          <Check className="h-3 w-3" />
        </div>
      )}
    </button>
  );
}

export function FilterSheet({
  open,
  onOpenChange,
  allPatients,
  accountType,
}: FilterSheetProps) {
  const { filters, updateFilters, clearFilters } = useDashboardStore();

  const { missions } = useMissions();
  const activeCount = useActiveFilterCount();

  // Derive unique hospital list from all missions
  const allHospitals = Array.from(
    new Set(missions.flatMap((m) => (m.hospitals || []).map((h) => typeof h === 'string' ? h : h.name))),
  );

  const showCareTeamSection = shouldShowCareTeamScope(accountType);

  const visibleScopes = CARE_TEAM_SCOPES.filter(
    (s) => !s.doctorOnly || accountType === "Doctor",
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[340px] sm:max-w-[380px] overflow-y-auto"
      >
        <SheetHeader className="pb-4">
          <div className="flex items-center justify-between pr-8">
            <div className="flex items-center gap-2">
              <SheetTitle>Filters</SheetTitle>
              {activeCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {activeCount}
                </Badge>
              )}
            </div>
            {activeCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive h-7 text-xs"
                onClick={() => clearFilters()}
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear all
              </Button>
            )}
          </div>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* View Mode */}
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-muted-foreground">
              View
            </span>
            <div className="grid grid-cols-3 gap-1.5">
              {VIEW_MODES.map((mode) => (
                <ToggleCard
                  key={mode.value}
                  label={mode.label}
                  isActive={
                    filters.viewMode === mode.value &&
                    !filters.showFollowUps &&
                    !filters.showUnassignedSpecialty
                  }
                  onClick={() =>
                    updateFilters({
                      viewMode:
                        filters.viewMode === mode.value ? "active" : mode.value,
                    })
                  }
                />
              ))}
            </div>
          </div>

          {/* Care Team Scope */}
          {showCareTeamSection && (
            <div className="space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                Care Team
              </span>
              <div
                className={cn(
                  "grid gap-1.5",
                  visibleScopes.length === 2 ? "grid-cols-2" : "grid-cols-3",
                )}
              >
                {visibleScopes.map((scope) => (
                  <ToggleCard
                    key={scope.value}
                    label={scope.label}
                    isActive={filters.careTeamScope === scope.value}
                    onClick={() =>
                      updateFilters({
                        careTeamScope:
                          filters.careTeamScope === scope.value
                            ? "all"
                            : scope.value,
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Mission Filter */}
          <MissionFilterSection allPatients={allPatients} />

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Clinical Filters */}
          <div className="space-y-4">
            <span className="text-xs font-semibold text-foreground uppercase tracking-wider">
              Clinical Filters
            </span>

            <FilterPillRow
              label="Priority"
              options={DASHBOARD_PRIORITY_OPTIONS}
              value={filters.priority}
              onChange={(v) => updateFilters({ priority: v })}
            />

            <FilterPillRow
              label="Status"
              options={PatientStatuses}
              value={filters.status}
              onChange={(v) => updateFilters({ status: v })}
            />

            <FilterPillRow
              label="Specialty"
              options={DoctorSpecialties}
              value={filters.specialty}
              onChange={(v) => updateFilters({ specialty: v })}
            />

            {allHospitals.length > 0 && (
              <FilterPillRow
                label="Hospital"
                options={allHospitals}
                value={filters.hospital}
                onChange={(v) => updateFilters({ hospital: v })}
              />
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-border" />

          {/* Advanced */}
          <Accordion type="single" collapsible>
            <AccordionItem value="advanced" className="border-b-0">
              <AccordionTrigger className="py-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                Advanced
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 pt-1">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-foreground">
                      Follow-Ups Only
                    </span>
                    <Switch
                      checked={filters.showFollowUps}
                      onCheckedChange={(v) => updateFilters({ showFollowUps: v })}
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-foreground">
                      Unassigned Specialty Only
                    </span>
                    <Switch
                      checked={filters.showUnassignedSpecialty}
                      onCheckedChange={(v) => updateFilters({ showUnassignedSpecialty: v })}
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="text-sm text-foreground">
                      Telegram Patients Only
                    </span>
                    <Switch
                      checked={filters.showTelegramOnly}
                      onCheckedChange={(v) => updateFilters({ showTelegramOnly: v })}
                    />
                  </label>

                  {accountType === "Triage" && (
                    <label className="flex items-center justify-between cursor-pointer">
                      <span className="text-sm text-foreground">
                        Conflicts Only
                      </span>
                      <Switch
                        checked={filters.showConflictsOnly}
                        onCheckedChange={(v) => updateFilters({ showConflictsOnly: v })}
                      />
                    </label>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </SheetContent>
    </Sheet>
  );
}
