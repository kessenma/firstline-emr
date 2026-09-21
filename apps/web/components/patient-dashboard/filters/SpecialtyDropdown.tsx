// apps/web/components/patient-dashboard/filters/SpecialtyDropdown.tsx
import React, { useState, useMemo } from "react";
import {
  DoctorSpecialties,
  DoctorSpecialtyList,
} from "@/data/doctorSpecialty.enum";
import { CircleLoader } from "react-spinners";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Check, ChevronsUpDown, Pencil, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import useDashboardStore from "@/stores/useDashboardStore";

interface SpecialtyDropdownProps {
  specialties?: DoctorSpecialtyList[];
  onChange?: (value: DoctorSpecialtyList[]) => void;
  isLoading: boolean;
  disabled: boolean;
  isHeader?: boolean;
  onSpecialtyChange?: (specialty: string) => void;
  availableSpecialties?: string[];
  showAvailabilityIndicators?: boolean;
}

export function SpecialtyDropdown({
  specialties = [],
  onChange,
  isHeader = false,
  isLoading = false,
  disabled = false,
  availableSpecialties = [],
  showAvailabilityIndicators = false,
}: SpecialtyDropdownProps) {
  const {
    filters,
    updateFilters,
  } = useDashboardStore();
  const [open, setOpen] = useState(false);
  const [openPopoverCode, setOpenPopoverCode] = useState<string | null>(null);
  const [tempSpecialties, setTempSpecialties] =
    useState<DoctorSpecialtyList[]>(specialties);
  const [searchQuery, setSearchQuery] = useState("");

  // Create a Set for O(1) lookup
  const availableSet = useMemo(
    () => new Set(availableSpecialties),
    [availableSpecialties],
  );

  // Check if a specialty has doctors available
  const hasAvailableDoctors = (specialty: string) =>
    availableSet.has(specialty);

  // Filter specialties based on search query
  const filteredSpecialties = useMemo(() => {
    if (!searchQuery.trim()) {
      return DoctorSpecialties;
    }
    return DoctorSpecialties.filter((specialty) =>
      specialty.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [searchQuery]);

  if (isLoading) {
    return <CircleLoader size={16} color="#888888" />;
  }

  if (isHeader) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" disabled={isLoading || disabled}>
            {isLoading ? (
              <CircleLoader size={16} color="#888888" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          style={{ maxWidth: "20rem", maxHeight: "25rem", overflowY: "auto" }}
        >
          <DropdownMenuSeparator />
          <DropdownMenuRadioGroup
            value={filters.specialty ?? ""}
            onValueChange={(value) => updateFilters({ specialty: value || undefined })}
          >
            {DoctorSpecialties.map((s) => (
              <DropdownMenuRadioItem key={s} value={s}>
                {s}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  const handleToggleSpecialty = (
    specialty: DoctorSpecialtyList,
    checked: boolean,
  ) => {
    if (checked) {
      // Add specialty if not already selected and under limit
      const isAlreadySelected = tempSpecialties.some(
        (item) => item === specialty,
      );
      if (!isAlreadySelected && tempSpecialties.length < 2) {
        setTempSpecialties([...tempSpecialties, specialty]);
      }
    } else {
      // Remove specialty
      setTempSpecialties(tempSpecialties.filter((item) => item !== specialty));
    }
  };

  const handleDone = () => {
    onChange?.(tempSpecialties);
    setOpen(false);
  };

  // Sync tempSpecialties with specialties when dialog opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setTempSpecialties([...specialties]);
    }
    setOpen(newOpen);
  };

  const handleRemove = (specialtyToRemove: DoctorSpecialtyList) => {
    onChange?.(specialties.filter((item) => item !== specialtyToRemove));
  };

  const handleClear = () => {
    setTempSpecialties([]);
  };

  // Reset search when dialog opens
  const handleOpenChangeWithReset = (newOpen: boolean) => {
    if (newOpen) {
      setTempSpecialties([...specialties]);
      setSearchQuery("");
    }
    setOpen(newOpen);
  };

  const displayValue =
    specialties.length > 0
      ? `${specialties.length} specialt${specialties.length > 1 ? "ies" : "y"} selected`
      : "Select Specialties";

  return (
    <div className="w-full">
      <Dialog open={open} onOpenChange={handleOpenChangeWithReset}>
        {/* Show dropdown button only when no specialties are selected */}
        {specialties.length === 0 && (
          <DialogTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className={cn(
                "w-full justify-between",
                disabled && "opacity-50 cursor-not-allowed",
              )}
              disabled={disabled}
            >
              <span className="truncate">{displayValue}</span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DialogTrigger>
        )}

        <DialogContent className="max-w-2xl w-[95vw] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="text-center">
              Select Specialties
            </DialogTitle>
            {showAvailabilityIndicators && availableSpecialties.length > 0 && (
              <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Doctors Available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <span>No Doctors</span>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Search Input */}
          <div className="px-1">
            <Input
              placeholder="Search specialties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="max-h-[300px] overflow-y-auto">
            <div className="p-1">
              {filteredSpecialties.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No specialties found.
                </div>
              ) : (
                filteredSpecialties.map((specialty) => {
                  const isSelected = tempSpecialties.some(
                    (item) => item === specialty,
                  );
                  const isDisabled = !isSelected && tempSpecialties.length >= 2;
                  const hasDoctors = hasAvailableDoctors(specialty);
                  return (
                    <div
                      key={specialty}
                      className={cn(
                        "flex items-center space-x-3 p-3 hover:bg-accent rounded-sm cursor-pointer",
                        isDisabled && "opacity-50 cursor-not-allowed",
                      )}
                      onClick={() =>
                        !isDisabled &&
                        handleToggleSpecialty(specialty, !isSelected)
                      }
                    >
                      {showAvailabilityIndicators && (
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full flex-shrink-0",
                            hasDoctors ? "bg-green-500" : "bg-orange-500",
                          )}
                          title={
                            hasDoctors
                              ? "Doctors available"
                              : "No doctors available"
                          }
                        />
                      )}
                      <div className="flex flex-col flex-1 min-w-0">
                        <span className="font-medium">{specialty}</span>
                      </div>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) =>
                          handleToggleSpecialty(specialty, checked as boolean)
                        }
                        className="mt-0.5 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                        disabled={isDisabled}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-2">
              <Button variant="destructive" size="sm" onClick={handleClear}>
                <X className="mr-1 h-3 w-3" />
                Clear
              </Button>
              <span className="text-sm text-muted-foreground">
                {tempSpecialties.length}/2 specialties selected
              </span>
            </div>
            <Button onClick={handleDone}>
              <Check className="mr-2 h-4 w-4" />
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Selected specialties display with edit icon */}
      {specialties.length > 0 && (
        <div className="flex items-center gap-2 mt-2 justify-center">
          <div className="flex flex-wrap gap-1">
            {specialties.map((specialty) => (
              <Popover
                key={specialty}
                open={openPopoverCode === specialty}
                onOpenChange={(open) =>
                  setOpenPopoverCode(open ? specialty : null)
                }
              >
                <PopoverTrigger asChild>
                  <Badge
                    variant="secondary"
                    className={cn(
                      "text-xs cursor-pointer hover:bg-secondary/80 transition-colors",
                      openPopoverCode === specialty &&
                        "ring-2 ring-primary bg-primary/10",
                    )}
                  >
                    <span className="truncate block max-w-[120px]">
                      {specialty}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(specialty);
                      }}
                      className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5 flex-shrink-0"
                    >
                      ×
                    </button>
                  </Badge>
                </PopoverTrigger>
                <PopoverContent className="w-auto max-w-xs" align="center">
                  <div className="space-y-2">
                    <div className="font-semibold text-sm">{specialty}</div>
                  </div>
                </PopoverContent>
              </Popover>
            ))}
          </div>
          {/* Edit icon */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setOpen(true)}
            disabled={disabled}
            className="h-10 w-10 p-0"
            title="Edit specialties"
          >
            <Pencil className="h-5 w-5 text-muted-foreground" />
          </Button>
        </div>
      )}
    </div>
  );
}
