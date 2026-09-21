"use client";

interface Props {
  filteredCount: number;
  totalCount: number;
  hasActiveFilters: boolean;
}

export function ResultCount({ filteredCount, totalCount, hasActiveFilters }: Props) {
  if (totalCount === 0) return null;

  return (
    <div className="text-sm text-muted-foreground px-4 py-1">
      {filteredCount === totalCount
        ? `${totalCount} patient${totalCount === 1 ? "" : "s"}`
        : `Showing ${filteredCount} of ${totalCount} patient${totalCount === 1 ? "" : "s"}`}
      {filteredCount === 0 && hasActiveFilters && (
        <span className="ml-2 text-destructive">
          No matches — try removing a filter.
        </span>
      )}
    </div>
  );
}
