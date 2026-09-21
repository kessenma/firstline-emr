// apps/web/components/patient-chart/Medications/MedicationsView.tsx

import React, { useState, useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { RadioCard } from "@/components/ui/radio-card";
import RXOrderView from "./rx/RXOrderView";
import MedOrderView from "@/components/patient-chart/Medications/med/MedOrderView";
import PreviousMedicationsView from "./previous/PreviousMedicationsView";
import RxOrderDrawerView from "./rx/RxOrderDrawerView";
import { usePatientDashboard } from "@/components/patient-chart/PatientViewModelContext";
import { BarLoader } from "react-spinners";
import { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import { AlertTriangle, Ban, ChevronDown, ChevronUp, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  formatMedicationDate,
  formatMedicationDateOnly,
  getAllMedicationsSorted,
  describePrescriptionCancellation,
  describePrescriptionDelivery,
  isRxOrder as isRxOrderGuard,
  type RxOrder,
} from "@fajr/shared/medications";

import { useSession } from "next-auth/react";
import { AnimatePresence, motion } from "framer-motion";

interface MedicationsViewProps {
  patientId: string;
}

export default function MedicationsView({ patientId }: MedicationsViewProps) {
  const { data: session } = useSession();
  const { rxOrders, medOrders, loadingMedications, refreshMedications } =
    usePatientDashboard();
  const handleScreenResize = () => {
    setIsMobile(window.innerWidth < 768);
  };
  useEffect(() => {
    handleScreenResize();
    window.addEventListener("resize", handleScreenResize);
    return () => {
      window.removeEventListener("resize", handleScreenResize);
    };
  }, []);

  useEffect(() => {
    refreshMedications();
  }, [refreshMedications]);

  const { patientInfo, addRxOrder } = usePatientDashboard();

  const [templateType, setTemplateType] = useState<"rxOrder" | "medOrder">(
    "rxOrder",
  );
  const [isMobile, setIsMobile] = useState(false);
  const [showAllMedications, setShowAllMedications] = useState(false);
  const [isLatestExpanded, setIsLatestExpanded] = useState(false);
  const [isShareDrawerOpen, setIsShareDrawerOpen] = useState(false);
  const [selectedRxOrder, setSelectedRxOrder] = useState<RxOrder | null>(null);

  const handleOpenShareDrawer = (rxOrder: RxOrder) => {
    setSelectedRxOrder(rxOrder);
    setIsShareDrawerOpen(true);
  };

  const methods = useForm({
    defaultValues: {
      rxOrders: rxOrders || [],
      medOrders: medOrders || [],
    },
  });

  const allMedications = React.useMemo(
    () => getAllMedicationsSorted(rxOrders, medOrders),
    [rxOrders, medOrders],
  );

  // No placeholder object here. A synthetic "latest" with an empty
  // `prescriptions` array reads as a real prescription to the type guard, which
  // is how a share drawer with no link (and no QR) got opened at all.
  const latestMedication = allMedications[0] ?? null;
  const isRxOrder = latestMedication ? isRxOrderGuard(latestMedication) : false;

  const handleValueChange = (value: "rxOrder" | "medOrder") => {
    if (value !== templateType) {
      setTemplateType(value);
      methods.reset({
        rxOrders: value === "rxOrder" ? rxOrders : [],
        medOrders: value === "medOrder" ? medOrders : [],
      });
    }
  };

  const toggleAllMedications = (event: React.MouseEvent) => {
    event.preventDefault();
    setShowAllMedications(!showAllMedications);
  };

  const toggleLatestExpanded = (event: React.MouseEvent) => {
    event.preventDefault();
    setIsLatestExpanded(!isLatestExpanded);
  };

  if (loadingMedications) {
    return (
      <div
        className="flex items-center justify-center h-screen bg-background text-foreground"
        aria-live="polite"
      >
        <BarLoader color="hsl(var(--foreground))" />
        <span className="sr-only">Loading medications...</span>
      </div>
    );
  }

  const isDoctor = session?.user?.accountType === "Doctor";
  const isTriage = session?.user?.accountType === "Triage";

  return (
    <FormProvider {...methods}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col h-screen overflow-hidden bg-background text-foreground"
      >
        <div className="grow overflow-auto border-t-2 border-border rounded-lg">
          {!isTriage && latestMedication && (
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="p-4 border-b border-border rounded-lg"
            >
              <div className="text-foreground">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <motion.button
                      onClick={toggleLatestExpanded}
                      className="text-foreground border-border border-2 pt-0.5 pl-2 pr-2 rounded-full hover:bg-accent hover:text-accent-foreground transition-colors"
                      aria-expanded={isLatestExpanded}
                      type="button"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      {isLatestExpanded ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </motion.button>
                    <div className="inline-block p-2 mb-2 text-muted-foreground">
                      Latest:
                    </div>
                    <div className="text-center bg-primary text-primary-foreground border-2 border-primary p-2 rounded-md">
                      {isRxOrder
                        ? "Medication Prescription Referral"
                        : "Request for Unavailable Medications"}
                    </div>
                  </div>
                  {isRxOrder && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        handleOpenShareDrawer(latestMedication as RxOrder)
                      }
                    >
                      <Share />
                      <span className="sr-only">
                        Share Medication Prescription Referral
                      </span>
                    </Button>
                  )}
                </div>
                <p className="text-right text-muted-foreground">
                  {formatMedicationDate(
                    isRxOrderGuard(latestMedication)
                      ? latestMedication.prescribedDate
                      : latestMedication.orderDate,
                  )}
                </p>
                {/* Delivery status, worded by the shared helper so mobile matches. */}
                {isRxOrderGuard(latestMedication) &&
                  (() => {
                    const delivery = describePrescriptionDelivery(latestMedication);
                    const cancellation =
                      describePrescriptionCancellation(latestMedication);
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
                  <i>{latestMedication.doctorSpecialty}</i>
                </p>
                <p className="text-left">
                  Dr. <b>{latestMedication.prescribingDr}</b>
                </p>

                <AnimatePresence>
                  {isLatestExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-2 p-2 bg-card text-card-foreground border border-border rounded-sm overflow-hidden"
                    >
                      <p>
                        <strong>City:</strong>{" "}
                        {(isRxOrderGuard(latestMedication)
                          ? latestMedication.city
                          : latestMedication.patientCity) || "Unknown"}
                      </p>
                      {isRxOrderGuard(latestMedication) && (
                        <p>
                          <strong>Valid Till:</strong>{" "}
                          {formatMedicationDateOnly(latestMedication.validTill)}
                        </p>
                      )}
                      <h4 className="mt-2 font-bold">
                        {isRxOrder ? "Prescriptions:" : "Medications:"}
                      </h4>
                      {isRxOrderGuard(latestMedication) ? (
                        (latestMedication.prescriptions ?? []).length > 0 ? (
                          (latestMedication.prescriptions ?? []).map(
                            (med, medIndex) => (
                              <motion.div
                                key={`latest-med-${medIndex}`}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                  duration: 0.2,
                                  delay: medIndex * 0.1,
                                }}
                                className="mt-2 p-2 bg-muted text-muted-foreground rounded-sm"
                              >
                                <p>
                                  <strong>Diagnosis:</strong>{" "}
                                  {med.diagnosis || "N/A"}
                                </p>
                                <p>
                                  <strong>Medication:</strong>{" "}
                                  {med.medication || "N/A"}
                                </p>
                                <p>
                                  <strong>Dosage:</strong> {med.dosage || "N/A"}
                                </p>
                                <p>
                                  <strong>Frequency:</strong>{" "}
                                  {med.frequency || "N/A"}
                                </p>
                              </motion.div>
                            ),
                          )
                        ) : (
                          <p>No prescriptions available.</p>
                        )
                      ) : (latestMedication.medications ?? []).length ? (
                        (latestMedication.medications ?? []).map(
                          (med, medIndex) => (
                            <motion.div
                              key={`latest-med-${medIndex}`}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                duration: 0.2,
                                delay: medIndex * 0.1,
                              }}
                              className="mt-2 p-2 bg-muted text-muted-foreground rounded-sm"
                            >
                              <p>
                                <strong>Diagnosis:</strong>{" "}
                                {med.diagnosis || "N/A"}
                              </p>
                              <p>
                                <strong>Medication:</strong>{" "}
                                {med.medication || "N/A"}
                              </p>
                              <p>
                                <strong>Dosage:</strong> {med.dosage || "N/A"}
                              </p>
                              <p>
                                <strong>Frequency:</strong>{" "}
                                {med.frequency || "N/A"}
                              </p>
                              <p>
                                <strong>Quantity:</strong>{" "}
                                {med.quantity || "N/A"}
                              </p>
                            </motion.div>
                          ),
                        )
                      ) : (
                        <p>No medications available.</p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {!isTriage && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="sticky bottom-0 w-full p-4 bg-background border-t border-border"
            >
              <Button
                variant="outline"
                className="w-full border-2 transition-colors pt-4 pb-4"
                onClick={toggleAllMedications}
                type="button"
              >
                {showAllMedications ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Hide previous medications
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    All previous medications
                  </>
                )}
              </Button>
            </motion.div>
          )}

          <AnimatePresence>
            {showAllMedications && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <PreviousMedicationsView
                  patientId={patientId}
                  isDoctor={isDoctor}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {!showAllMedications && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="p-4"
            >
              {isDoctor && (
                <>
                  {/* The checked/unchecked colours come from RadioCard itself,
                      which pairs each background with its own foreground token.
                      Overriding only one half of a pair here is what rendered
                      the inactive tab as same-on-same in both themes. */}
                  <RadioCard.Root
                    defaultValue={templateType}
                    onValueChange={handleValueChange}
                    className="flex w-full mb-4 gap-2"
                  >
                    <RadioCard.Item value="rxOrder" className="flex-1">
                      Create Medication Prescription Referral
                    </RadioCard.Item>
                    <RadioCard.Item value="medOrder" className="flex-1">
                      Make Request for Unavailable Medications
                    </RadioCard.Item>
                  </RadioCard.Root>

                  <AnimatePresence mode="wait">
                    {templateType === "rxOrder" && (
                      <motion.div
                        key="rxOrder"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <RXOrderView
                          user={{
                            firstName: session?.user?.firstName || "",
                            lastName: session?.user?.lastName || "",
                            doctorSpecialty:
                              (session?.user
                                ?.doctorSpecialty as unknown as keyof typeof DoctorSpecialtyList) ||
                              "NOT_SELECTED",
                          }}
                          patientId={patientId}
                          patientInfo={{
                            patientName: patientInfo?.patientName || "",
                            phoneNumber: patientInfo?.phone?.phoneNumber || "",
                            dob: patientInfo?.dob
                              ? new Date(patientInfo.dob)
                              : new Date(),
                            city: patientInfo?.city || "",
                          }}
                          onNewRxOrderSaved={addRxOrder}
                        />
                      </motion.div>
                    )}
                    {templateType === "medOrder" && (
                      <motion.div
                        key="medOrder"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                      >
                        <MedOrderView
                          patientId={patientId}
                          user={{
                            firstName: session?.user?.firstName || "",
                            lastName: session?.user?.lastName || "",
                            doctorSpecialty:
                              (session?.user
                                ?.doctorSpecialty as unknown as keyof typeof DoctorSpecialtyList) ||
                              "NOT_SELECTED",
                          }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </>
              )}
              {isTriage && (
                <PreviousMedicationsView
                  patientId={patientId}
                  isDoctor={isDoctor}
                />
              )}
              {!isDoctor && !isTriage && (
                <motion.p
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5 }}
                  className="text-muted-foreground mb-4"
                >
                  You do not have permission to view or place requests for
                  unavailable medications.
                </motion.p>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
      <RxOrderDrawerView
        isOpen={isShareDrawerOpen}
        onClose={() => setIsShareDrawerOpen(false)}
        rxOrder={selectedRxOrder}
        patientId={patientId}
      />
    </FormProvider>
  );
}
