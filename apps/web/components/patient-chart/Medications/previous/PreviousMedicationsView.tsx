// apps/web/components/patient-chart/Medications/previous/PreviousMedicationsView.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Ban,
  ChevronDown,
  ChevronUp,
  Share,
  ChevronsDown,
  ChevronsUp,
} from "lucide-react";
import { ScrollArea } from "../../../ui/scroll-area";
import RxOrderDrawerView from "../rx/RxOrderDrawerView";
import { Button } from "@/components/ui/button";

import { AnimatePresence, motion } from "framer-motion";
import { usePatientDashboard } from "@/components/patient-chart/PatientViewModelContext";
import {
  describePrescriptionCancellation,
  describePrescriptionDelivery,
  formatMedicationDate,
  formatMedicationDateOnly,
  getAllMedicationsSorted,
  isRxOrder,
  type AnyMedication,
  type Medication,
  type RxOrder,
} from "@fajr/shared/medications";

interface PreviousMedicationsViewProps {
  patientId: string;
  isDoctor: boolean;
}

export default function PreviousMedicationsView({
  patientId,
  isDoctor,
}: PreviousMedicationsViewProps) {
  if (!patientId) {
    console.error("Missing patientId in PreviousMedicationsView.");
  }

  const { rxOrders, medOrders, loadingMedications } = usePatientDashboard();

  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRxOrder, setSelectedRxOrder] = useState<RxOrder | null>(null);
  const [expandAll, setExpandAll] = useState(false);

  const isLoading = loadingMedications;

  const allMedications = React.useMemo(
    () => getAllMedicationsSorted(rxOrders, medOrders),
    [rxOrders, medOrders],
  );

  const updateExpandedItems = useCallback(() => {
    setExpandedItems(
      new Set(expandAll ? allMedications.map((item) => item.id ?? "") : []),
    );
  }, [expandAll, allMedications]);

  useEffect(() => {
    updateExpandedItems();
  }, [updateExpandedItems]);

  if (isLoading) {
    return (
      <p className="text-muted-foreground text-center" aria-live="polite">
        Loading medications...
      </p>
    );
  }

  const toggleItemExpansion = (itemId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const handleOpenDrawer = (rxOrder: RxOrder) => {
    setSelectedRxOrder(rxOrder);
    setIsDrawerOpen(true);
  };

  const toggleExpandAll = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setExpandAll((prev) => !prev);
  };

  const renderMedicationItem = (item: AnyMedication) => {
    const isRx = isRxOrder(item);
    const itemId = item.id?.toString() ?? "";
    const isExpanded = expandedItems.has(itemId);

    return (
      <motion.li
        key={itemId}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="bg-card text-card-foreground border border-border p-4 m-4 rounded-lg"
      >
        <div className="flex justify-between items-center">
          <div>
            <motion.button
              onClick={(e) => toggleItemExpansion(itemId, e)}
              className="text-foreground border-border border-2 pt-0.5 pl-2 pr-2 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
              aria-expanded={isExpanded}
              aria-controls={`medication-details-${itemId}`}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </motion.button>
            <h3 className="text-center bg-primary text-primary-foreground border-2 border-primary p-2 rounded-md inline-block ml-12">
              {isRx
                ? "Medication Prescription Referral"
                : "Request for Unavailable Medications"}
            </h3>
          </div>
          {isRxOrder(item) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenDrawer(item)}
            >
              <Share />
              <span className="sr-only">
                Share Medication Prescription Referral
              </span>
            </Button>
          )}
        </div>
        <p className="mt-2 text-right text-muted-foreground">
          {formatMedicationDate(
            isRxOrder(item) ? item.prescribedDate : item.orderDate,
          )}
        </p>
        {/* Delivery status, worded by the shared helper so mobile matches. */}
        {isRxOrder(item) &&
          (() => {
            const delivery = describePrescriptionDelivery(item);
            const cancellation = describePrescriptionCancellation(item);
            return (
              <>
                {/* Cancelled dominates the delivery line: the script is dead, and
                    "sent · opened" alone would read as if it were still live. */}
                {cancellation && (
                  <p className="flex items-center justify-end gap-1 text-right text-xs font-semibold text-destructive">
                    <Ban className="h-3 w-3 shrink-0" />
                    {cancellation.headline}
                    {cancellation.reason ? ` — ${cancellation.reason}` : ""}
                  </p>
                )}
                <p className="text-right text-xs text-muted-foreground">
                  {delivery.summary}
                </p>
                {delivery.warning && (
                  <p className="flex items-center justify-end gap-1 text-right text-xs text-destructive">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    {delivery.warning}
                  </p>
                )}
              </>
            );
          })()}
        <p className="mt-2 text-center text-muted-foreground">
          <i>{item.doctorSpecialty}</i>
        </p>
        <h4 className="text-left">
          Dr. <b>{item.prescribingDr}</b>
        </h4>
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              id={`medication-details-${itemId}`}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-2 p-2 bg-muted text-foreground rounded-sm overflow-hidden"
            >
              <p>
                <strong>City:</strong>{" "}
                {(isRxOrder(item) ? item.city : item.patientCity) || "Unknown"}
              </p>
              {isRxOrder(item) && (
                <p>
                  <strong>Valid Till:</strong>{" "}
                  {formatMedicationDateOnly(item.validTill)}
                </p>
              )}
              <h4 className="mt-2 font-bold">
                {isRx ? "Prescriptions:" : "Medications:"}
              </h4>
              {isRxOrder(item)
                ? (item.prescriptions ?? []).map((med, medIndex) => (
                    <motion.div
                      key={`${itemId}-med-${medIndex}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: medIndex * 0.1 }}
                      className="mt-2 p-2 bg-muted rounded-sm"
                    >
                      <p>
                        <strong>Diagnosis:</strong> {med.diagnosis}
                      </p>
                      <p>
                        <strong>Medication:</strong> {med.medication}
                      </p>
                      <p>
                        <strong>Dosage:</strong> {med.dosage}
                      </p>
                      <p>
                        <strong>Frequency:</strong> {med.frequency}
                      </p>
                    </motion.div>
                  ))
                : (item.medications ?? []).map(
                    (med: Medication, medIndex: number) => (
                    <motion.div
                      key={`${itemId}-med-${medIndex}`}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: medIndex * 0.1 }}
                      className="mt-2 p-2 bg-background rounded-sm"
                    >
                      <p>
                        <strong>Diagnosis:</strong> {med.diagnosis}
                      </p>
                      <p>
                        <strong>Medication:</strong> {med.medication}
                      </p>
                      <p>
                        <strong>Dosage:</strong> {med.dosage}
                      </p>
                      <p>
                        <strong>Frequency:</strong> {med.frequency}
                      </p>
                      <p>
                        <strong>Quantity:</strong> {med.quantity}
                      </p>
                    </motion.div>
                    ),
                  )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.li>
    );
  };

  return (
    <div className="h-full bg-background text-foreground">
      <div className="flex justify-center items-center py-2">
        <motion.button
          onClick={toggleExpandAll}
          className="text-foreground border-border border-2 pt-0.5 pl-2 pr-2 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          {expandAll ? (
            <ChevronsUp className="h-5 w-5" />
          ) : (
            <ChevronsDown className="h-5 w-5" />
          )}
        </motion.button>
      </div>
      <ScrollArea className="h-full w-full">
        {allMedications.length > 0 ? (
          <motion.ul
            className="list-none m-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {allMedications.map(renderMedicationItem)}
          </motion.ul>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-2 border-border border-2 text-foreground rounded-lg m-4 p-4 text-center bg-card"
          >
            <p>
              <strong>No previous medications found</strong> for this patient.
            </p>
          </motion.div>
        )}
      </ScrollArea>

      <RxOrderDrawerView
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        rxOrder={selectedRxOrder}
        patientId={patientId}
      />
    </div>
  );
}
