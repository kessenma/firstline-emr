"use client";

import { cn } from "@/utils/classNames";
import useDashboardStore from "@/stores/useDashboardStore";
import { CARE_TEAM_SCOPES, shouldShowCareTeamScope } from "@fajr/shared/patient-dashboard";

interface Props {
  accountType: string | undefined;
}

export function CareTeamScopeToggle({ accountType }: Props) {
  const { filters, updateFilters } = useDashboardStore();

  if (!shouldShowCareTeamScope(accountType)) return null;

  const visibleScopes = CARE_TEAM_SCOPES.filter(
    (s) => !s.doctorOnly || accountType === "Doctor",
  );

  return (
    <div className="inline-flex items-center gap-1">
      {visibleScopes.map((scope) => {
        const isActive = filters.careTeamScope === scope.value;
        return (
          <button
            key={scope.value}
            onClick={() =>
              updateFilters({ careTeamScope: isActive ? "all" : scope.value })
            }
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap text-xs font-medium rounded-full px-3 py-1.5 transition-all",
              "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {scope.label}
          </button>
        );
      })}
    </div>
  );
}