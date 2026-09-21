// apps/web/components/patient-dashboard/modals/NoSpecialtyDoctorsModal.tsx
"use client";

import * as React from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, CheckCircle } from "lucide-react";
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import { cn } from "@/lib/utils";

interface NoSpecialtyDoctorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedSpecialty: DoctorSpecialtyList | null;
  onProceedAnyway: () => void;
  onSelectAlternative: (specialty: string) => void;
  isLoadingAlternatives: boolean;
  availableSpecialties: string[];
}

export function NoSpecialtyDoctorsModal({
  isOpen,
  onClose,
  selectedSpecialty,
  onProceedAnyway,
  onSelectAlternative,
  isLoadingAlternatives,
  availableSpecialties,
}: NoSpecialtyDoctorsModalProps) {
  const [hoveredSpecialty, setHoveredSpecialty] = React.useState<string | null>(
    null,
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="No Doctors Available"
      size="md"
      footer={
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 w-full">
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="default"
              onClick={onProceedAnyway}
              className="flex-1 sm:flex-initial"
            >
              Proceed Anyway
            </Button>
          </div>
        </div>
      }
    >
      <div className="py-4 space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-foreground">
              There are currently no doctors with the{" "}
              <span className="font-semibold">{selectedSpecialty}</span>{" "}
              specialty in the system.
            </p>
          </div>
        </div>

        <div className="pl-8">
          <p className="text-sm text-muted-foreground mb-3">
            You can proceed with this specialty anyway (the triage team will be
            notified), or select one of the available specialties below:
          </p>

          {/* Loading state */}
          {isLoadingAlternatives && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Loading available specialties...
                </p>
              </div>
            </div>
          )}

          {/* Available specialties list */}
          {!isLoadingAlternatives && availableSpecialties.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                Available specialties with doctors:
              </p>
              <div className="max-h-64 overflow-y-auto border rounded-md bg-muted/30">
                <div className="p-2 space-y-1">
                  {availableSpecialties.map((specialty) => (
                    <button
                      key={specialty}
                      onClick={() => onSelectAlternative(specialty)}
                      onMouseEnter={() => setHoveredSpecialty(specialty)}
                      onMouseLeave={() => setHoveredSpecialty(null)}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md text-left transition-colors",
                        "hover:bg-primary/10 hover:border-primary/20",
                        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                        "border border-transparent",
                        hoveredSpecialty === specialty && "bg-primary/5",
                      )}
                    >
                      <CheckCircle
                        className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          hoveredSpecialty === specialty
                            ? "text-primary"
                            : "text-muted-foreground",
                        )}
                      />
                      <span
                        className={cn(
                          "text-sm transition-colors",
                          hoveredSpecialty === specialty
                            ? "text-foreground font-medium"
                            : "text-muted-foreground",
                        )}
                      >
                        {specialty}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!isLoadingAlternatives && availableSpecialties.length === 0 && (
            <div className="p-4 border rounded-md bg-muted/30">
              <p className="text-sm text-muted-foreground italic text-center">
                No doctors are currently available in the system with any
                specialty.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
