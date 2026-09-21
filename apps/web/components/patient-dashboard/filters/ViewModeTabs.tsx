"use client";

import { cn } from "@/utils/classNames";
import useDashboardStore from "@/stores/useDashboardStore";
import { VIEW_MODES, type ViewMode } from "@fajr/shared/patient-dashboard";

export function ViewModeTabs() {
  const { filters, updateFilters } = useDashboardStore();

  // When follow-ups or unassigned specialty is active, no view tab is selected
  const effectiveValue =
    filters.showFollowUps || filters.showUnassignedSpecialty
      ? null
      : filters.viewMode;

  const handleClick = (value: ViewMode) => {
    // Clicking the active tab resets to default
    updateFilters({ viewMode: effectiveValue === value ? "active" : value });
  };

  return (
    <div className="inline-flex items-center gap-1">
      {VIEW_MODES.map((mode) => {
        const isActive = effectiveValue === mode.value;
        return (
          <button
            key={mode.value}
            onClick={() => handleClick(mode.value)}
            className={cn(
              "inline-flex items-center justify-center whitespace-nowrap text-xs font-medium rounded-full px-3 py-1.5 transition-all",
              "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              isActive
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}
