// apps/web/components/patient-chart/Medications/rx/RxOrderDrawerView.tsx

import React, { useRef, useState } from "react";
import Image from "next/image";

import {
  Mail,
  Hash,
  Phone,
  MapPin,
  User,
  Activity,
  Clock9,
  Clock,
  Hourglass,
  Tablets,
  PillBottleIcon as PillBottle,
  BadgeAlert,
  Ear,
  MapPinned,
  BadgeIcon as IdCard,
  AlertTriangle,
  Ban,
  Loader2,
  View,
} from "lucide-react";
import { Drawer, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { usePatientDashboard } from "@/components/patient-chart/PatientViewModelContext";
import { useRxOrderDrawerViewModel } from "./RxOrderDrawerViewModel";
import { ToastProvider } from "@/components/ui/toast";
import { ToastComponent } from "@/components/hooks/useToast";
import {
  formatMedicationDateOnly,
  hasPharmacyQrCode,
  type RxOrder,
} from "@fajr/shared/medications";
import { MESSAGING_CHANNELS, getPatientChannel } from "@fajr/shared/messaging";
import { TelegramIcon } from "@/components/icons/TelegramIcon";
import Tooltip from "@/components/form/Tooltip";
import CancelPrescriptionDialog from "./CancelPrescriptionDialog";

interface RxOrderDrawerViewProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string | undefined;
  rxOrder: RxOrder | null;
}

function RxOrderDrawerContent({
  isOpen,
  onClose,
  patientId,
  rxOrder,
}: RxOrderDrawerViewProps) {
  const { patientInfo, refreshMedications } = usePatientDashboard();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Pass rxOrder directly to the view model
  const {
    copyLink,
    sendToPatient,
    patientRxUrl,
    delivery,
    alreadySent,
    sendState,
    cancellation,
    cancelled,
    cancelState,
    cancelPrescription,
  } =
    useRxOrderDrawerViewModel(rxOrder, patientId, patientInfo?.telegramChatId);

  const [cancelOpen, setCancelOpen] = useState(false);

  // A disabled <button> fires no mouse events in some browsers, so the hover
  // state lives on the wrapper and the button is dimmed rather than disabled.
  const [hoveringSend, setHoveringSend] = useState(false);

  const channel = getPatientChannel(patientInfo);
  const descriptor = channel ? MESSAGING_CHANNELS[channel] : null;

  if (!patientInfo || !rxOrder) {
    return null;
  }

  const sendLabel = !descriptor
    ? "No messaging channel"
    : sendState === "sending"
      ? descriptor.sendingLabel
      : sendState === "failed"
        ? descriptor.failedLabel
        : alreadySent
          ? descriptor.sentLabel
          : descriptor.sendLabel;

  return (
    <Drawer isOpen={isOpen} onClose={onClose}>
      <DrawerContent direction="bottom" size="75%" title="Export Rx">
        <DrawerHeader className="border-b border-border z-50 mb-4">
          <div className="flex flex-wrap justify-center space-x-4 mt-4">
            <button
              onClick={copyLink}
              disabled={!patientRxUrl}
              className="flex flex-col items-center justify-center text-foreground hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-foreground"
            >
              <div className="rounded-full p-3 bg-muted hover:bg-muted/80 transition-colors">
                <View className="h-5 w-5 transition-colors text-current" />
              </div>
              <span className="mt-1 text-xs">Copy Link</span>
            </button>
            <div
              onMouseEnter={() => setHoveringSend(true)}
              onMouseLeave={() => setHoveringSend(false)}
              className="w-fit"
            >
              <Tooltip
                showTooltip={hoveringSend && alreadySent}
                tooltipText={`${delivery.summary}. Click again to send it once more.`}
              >
                <button
                  onClick={() => void sendToPatient()}
                  disabled={
                    !patientRxUrl ||
                    !descriptor ||
                    cancelled ||
                    sendState === "sending"
                  }
                  className={`flex flex-col items-center justify-center text-foreground hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-foreground ${
                    alreadySent ? "opacity-50" : ""
                  }`}
                >
                  <div className="rounded-full p-3 bg-muted hover:bg-muted/80 transition-colors">
                    {sendState === "sending" ? (
                      <Loader2 className="h-5 w-5 animate-spin text-current" />
                    ) : (
                      <TelegramIcon className="h-5 w-5" />
                    )}
                  </div>
                  <span className="mt-1 text-xs">{sendLabel}</span>
                </button>
              </Tooltip>
            </div>

            {/* Withdraw. Hidden once cancelled — the banner below says so, and
                a second press would only 409. */}
            {!cancelled && (
              <button
                onClick={() => setCancelOpen(true)}
                disabled={cancelState === "cancelling"}
                className="flex flex-col items-center justify-center text-foreground transition-colors hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
              >
                <div className="rounded-full bg-muted p-3 transition-colors hover:bg-muted/80">
                  {cancelState === "cancelling" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-current" />
                  ) : (
                    <Ban className="h-5 w-5 text-current transition-colors" />
                  )}
                </div>
                <span className="mt-1 text-xs">Cancel Rx</span>
              </button>
            )}
          </div>

          {cancellation && (
            <div className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-center">
              <p className="flex items-center justify-center gap-1 text-xs font-semibold text-destructive">
                <Ban className="h-3 w-3 shrink-0" />
                {cancellation.headline}
              </p>
              {cancellation.reason && (
                <p className="mt-1 text-xs text-muted-foreground">
                  &ldquo;{cancellation.reason}&rdquo;
                </p>
              )}
            </div>
          )}

          <p className="mt-3 text-center text-xs text-muted-foreground">
            {delivery.summary}
          </p>

          {delivery.warning && (
            <p className="mt-1 flex items-center justify-center gap-1 text-center text-xs text-destructive">
              <AlertTriangle className="h-3 w-3 shrink-0" />
              {delivery.warning}
            </p>
          )}

          {!patientRxUrl && (
            <p className="mt-3 text-center text-xs text-destructive">
              This prescription has no patient link, so it cannot be shared.
              Re-create it to generate one.
            </p>
          )}

          {patientRxUrl && !descriptor && (
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {MESSAGING_CHANNELS.telegram.unreachableLabel}.
            </p>
          )}
        </DrawerHeader>
        <ScrollArea className="grow mt-16">
          <div
            ref={drawerRef}
            className="p-6 space-y-6 bg-primary text-primary-foreground rounded-lg"
          >
            {/* Patient Information */}
            <div className="bg-card p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-4 text-center text-foreground border-b border-border pb-2">
                Patient Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="flex items-center">
                  <User className="h-4 w-4 mr-2 text-primary" />
                  <strong className="text-card-foreground mr-2">
                    Name:
                  </strong>{" "}
                  {patientInfo.patientName}
                </p>
                <p className="flex items-center">
                  <Hash className="h-4 w-4 mr-2 text-primary" />
                  <strong className="text-card-foreground mr-2">
                    DoB:
                  </strong>{" "}
                  {patientInfo.dob.toLocaleDateString()}
                </p>
                <p className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-primary" />
                  <strong className="text-card-foreground mr-2">
                    Phone:
                  </strong>{" "}
                  {`${patientInfo.phone?.countryCode || ""} ${patientInfo.phone?.phoneNumber || ""}`}
                </p>
                <p className="flex items-center">
                  <Ear className="h-4 w-4 mr-2 text-primary" />
                  <strong className="text-card-foreground mr-2">
                    Language:
                  </strong>{" "}
                  {patientInfo.language}
                </p>
                <p className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-primary" />
                  <strong className="text-card-foreground mr-2">
                    Country:
                  </strong>{" "}
                  {patientInfo.country}
                </p>
                <p className="flex items-center">
                  <MapPinned className="h-4 w-4 mr-2 text-primary" />
                  <strong className="text-card-foreground mr-2">
                    City:
                  </strong>{" "}
                  {patientInfo.city}
                </p>
              </div>
            </div>

            {/* Prescribing Doctor */}
            <div className="bg-card p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-4 text-center text-card-foreground border-b border-border pb-2">
                Prescribing Doctor
              </h3>
              <p className="flex items-center justify-center mb-4">
                <Mail className="h-4 w-4 mr-2 text-primary" />
                <strong className="text-card-foreground mr-2">
                  Email:
                </strong>{" "}
                {rxOrder.drEmail}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <p className="flex items-center">
                  <Activity className="h-4 w-4 mr-2 text-primary" />
                  <strong className="text-card-foreground mr-2">
                    Prescribed By:
                  </strong>{" "}
                  Dr. {rxOrder.prescribingDr}
                </p>
                <p className="flex items-center">
                  <IdCard className="h-4 w-4 mr-2 text-primary" />
                  <strong className="text-card-foreground mr-2">
                    Specialization:
                  </strong>{" "}
                  {rxOrder.doctorSpecialty}
                </p>
                <p className="flex items-center">
                  <Clock9 className="h-4 w-4 mr-2 text-primary" />
                  <strong className="text-card-foreground mr-2">
                    Prescribed Date:
                  </strong>{" "}
                  {formatMedicationDateOnly(rxOrder.prescribedDate)}
                </p>
                <p className="flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-primary" />
                  <strong className="text-card-foreground mr-2">
                    Valid Till:
                  </strong>{" "}
                  {formatMedicationDateOnly(rxOrder.validTill)}
                </p>
              </div>
            </div>

            {/* QR Code */}
            {hasPharmacyQrCode(rxOrder) && (
              <div className="bg-card p-4 rounded-lg flex flex-col justify-center items-center">
                <h3 className="font-semibold text-lg mb-4 text-center text-card-foreground border-b border-border pb-2">
                  Prescription QR Code
                </h3>
                <Image
                  src={rxOrder.pharmacyQrCode as string}
                  alt="Prescription QR Code"
                  width={160} // Equivalent to the w-40 class
                  height={160} // Equivalent to the h-40 class
                  className="rounded"
                  unoptimized
                />
              </div>
            )}

            {/* Medications */}
            <div className="bg-card p-4 rounded-lg">
              <h3 className="font-semibold text-lg mb-4 text-center text-card-foreground border-b border-border pb-2">
                Medications
              </h3>
              <div className="space-y-4">
                {(rxOrder.prescriptions ?? []).map(
                  (
                    prescription: {
                      diagnosis: string;
                      medication: string;
                      dosage: string;
                      frequency: string;
                    },
                    index: number,
                  ) => (
                    <div
                      key={index}
                      className="bg-background p-4 rounded-lg border border-border"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col flex-1">
                            <strong className="text-card-foreground mb-1">
                              Diagnosis:
                            </strong>
                            <p className="break-words">
                              {prescription.diagnosis}
                            </p>
                          </div>
                          <div className="flex items-center h-full">
                            <BadgeAlert className="text-primary w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col flex-1">
                            <strong className="text-card-foreground mb-1">
                              Medication:
                            </strong>
                            <p className="break-words">
                              {prescription.medication}
                            </p>
                          </div>
                          <div className="flex items-center h-full">
                            <PillBottle className="text-primary w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="flex flex-col flex-1">
                            <strong className="text-card-foreground mb-1">
                              Dosage:
                            </strong>
                            <p className="break-words">{prescription.dosage}</p>
                          </div>
                          <div className="flex items-center h-full">
                            <Tablets className="text-primary w-5 h-5" />
                          </div>
                        </div>
                        <div className="flex justify-between items items-center">
                          <div className="flex flex-col flex-1">
                            <strong className="text-card-foreground mb-1">
                              Frequency:
                            </strong>
                            <p className="break-words">
                              {prescription.frequency}
                            </p>
                          </div>
                          <div className="flex items-center h-full">
                            <Hourglass className="text-primary w-5 h-5" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <CancelPrescriptionDialog
          open={cancelOpen}
          onOpenChange={setCancelOpen}
          role="doctor"
          submitting={cancelState === "cancelling"}
          onConfirm={async (reason) => {
            // The lists read from context, not from this drawer's local copy,
            // so they need refreshing or they keep showing it as live.
            const ok = await cancelPrescription(reason, refreshMedications);
            if (ok) setCancelOpen(false);
          }}
        />
      </DrawerContent>
    </Drawer>
  );
}

export default function RxOrderDrawerView(props: RxOrderDrawerViewProps) {
  return (
    <ToastProvider>
      <RxOrderDrawerContent {...props} />
      <ToastComponent />
    </ToastProvider>
  );
}
