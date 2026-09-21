// apps/web/components/patient-chart/Medications/rx/RXOrderView.tsx
"use client";

import React, { useState } from "react";
import { TextFormField } from "@/components/ui/TextFormField";
import { Button } from "@/components/ui/button";
import { ClipLoader } from "react-spinners";
import { useRXOrderViewModel } from "./RXOrderViewModel";
import { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import { Plus, Minus } from "lucide-react";
import { DatePickerFormField } from "@/components/form/DatePickerFormField";
import { toDate, type RxOrder } from "@fajr/shared/medications";
import { ToastComponent } from "@/components/hooks/useToast";
import { ToastProvider } from "@/components/ui/toast";

interface User {
  firstName: string;
  lastName: string;
  doctorSpecialty: keyof typeof DoctorSpecialtyList;
}

interface RXOrderViewProps {
  user: User;
  patientId: string | undefined;
  patientInfo: {
    patientName: string;
    phoneNumber: string;
    dob: Date;
    city: string;
  };
  onNewRxOrderSaved: (rxOrder: RxOrder) => void;
}

export default function RXOrderView({
  patientId,
  patientInfo,
  onNewRxOrderSaved,
}: RXOrderViewProps) {
  const {
    rxOrder,
    submitRxOrder,
    isLoading,
    isFormComplete,
    handleInputChange,
    handlePrescriptionChange,
    addPrescription,
    removePrescription,
  } = useRXOrderViewModel(patientId, patientInfo.city, patientInfo.patientName);

  const orange300 = "#ffa270";

  return (
    <ToastProvider>
      <div className="space-y-6 max-w-2xl mx-auto bg-background text-foreground p-4">
        <fieldset className="border border-border rounded-lg bg-card text-card-foreground shadow-xs object-center justify-center center -ml-2 p-4">
          <legend className="text-lg font-semibold px-2 bg-primary text-primary-foreground rounded-lg">
            Prescriber and Patient Details
          </legend>
          <div className="space-y-4">
            <TextFormField
              fieldName="prescribingDoctor"
              fieldLabel="Dr."
              value={rxOrder.prescribingDr ?? undefined}
              readOnly={true}
            />
            <TextFormField
              fieldName="doctorSpecialty"
              fieldLabel="Specialization"
              value={rxOrder.doctorSpecialty ?? undefined}
              readOnly={true}
              className={"pb-4 rounded-2xl border-b-2 border-border"}
            />
            <TextFormField
              fieldName="patientName"
              fieldLabel="Patient's Full Name"
              value={patientInfo.patientName}
              readOnly={true}
              className={"pt-4 rounded-2xl border-t-2 border-border"}
            />
            <TextFormField
              fieldName="city"
              fieldLabel="Patient City"
              value={patientInfo.city}
              readOnly={true}
            />
          </div>
          <hr className="my-6 border-border" />
          {/* This block used to be bg-primary inside a bg-card fieldset, which
              inverted it against its own container and hid the label. */}
          <div className="space-y-4 flex flex-col items-center justify-center text-center border-2 border-border bg-muted text-foreground rounded-3xl p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Valid Till
            </div>
            <DatePickerFormField
              name="validTill"
              type="future"
              value={toDate(rxOrder.validTill)}
              onChange={(date) => handleInputChange("validTill", date)}
            />
          </div>
        </fieldset>

        {rxOrder.prescriptions?.map((prescription, index) => (
          <fieldset
            key={index}
            className="border border-border rounded-lg p-6 bg-card text-card-foreground shadow-xs relative overflow-hidden"
          >
            <legend className="text-lg font-semibold px-2 flex items-center w-full bg-primary text-primary-foreground rounded-lg">
              <span>Prescription {index + 1}</span>
              <div className="ml-auto flex space-x-2">
                {index === (rxOrder.prescriptions?.length ?? 0) - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={addPrescription}
                    className="h-9 w-9 p-2 rounded-full text-primary-foreground hover:bg-accent hover:text-accent-foreground"
                    aria-label="Add prescription"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                )}
                {(rxOrder.prescriptions?.length ?? 0) > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removePrescription(index)}
                    className="h-7 w-7 rounded-full text-primary-foreground hover:bg-accent hover:text-accent-foreground"
                    aria-label="Remove prescription"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </legend>
            <div className="space-y-4 mt-4">
              <TextFormField
                fieldName={`diagnosis-${index}`}
                fieldLabel="Diagnosis"
                value={prescription.diagnosis}
                onChange={(e) =>
                  handlePrescriptionChange(index, "diagnosis", e.target.value)
                }
                multiline={true}
                rows={3}
              />
              <TextFormField
                fieldName={`medication-${index}`}
                fieldLabel="Medication"
                value={prescription.medication}
                onChange={(e) =>
                  handlePrescriptionChange(index, "medication", e.target.value)
                }
              />
              <div className="grid grid-cols-2 gap-4">
                <TextFormField
                  fieldName={`dosage-${index}`}
                  fieldLabel="Dosage"
                  value={prescription.dosage}
                  onChange={(e) =>
                    handlePrescriptionChange(index, "dosage", e.target.value)
                  }
                />
                <TextFormField
                  fieldName={`frequency-${index}`}
                  fieldLabel="Frequency"
                  value={prescription.frequency}
                  onChange={(e) =>
                    handlePrescriptionChange(index, "frequency", e.target.value)
                  }
                />
              </div>
            </div>
          </fieldset>
        ))}

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* The `submit` variant is text-primary on bg-background. Forcing
              bg-primary on top of it painted the label in its own background
              colour. Let the variant own both halves of the pair. */}
          <Button
            onClick={submitRxOrder}
            disabled={isLoading || !isFormComplete}
            className="w-full"
            variant="submit"
          >
            {isLoading ? (
              <ClipLoader size={24} color={orange300} loading={isLoading} />
            ) : (
              "Submit Medication Prescription Referral"
            )}
          </Button>
        </div>
      </div>
      <ToastComponent />
    </ToastProvider>
  );
}
