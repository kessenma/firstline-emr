// apps/web/components/patient-chart/Medications/med/MedOrderView.tsx
//SUBMITTING MED ORDERS

"use client";

import React, { useMemo, useState } from "react";
import { TextFormField } from "@/components/ui/TextFormField";
import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { useMedOrderViewModel } from "./MedOrderViewModel";
import { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";
import { ToastProvider } from "@/components/ui/toast";
import { ToastComponent } from "@/components/hooks/useToast";

import { usePatientDashboard } from "@/components/patient-chart/PatientViewModelContext";
import { AnimatePresence, motion } from "framer-motion";

interface User {
  firstName: string;
  lastName: string;
  doctorSpecialty: keyof typeof DoctorSpecialtyList;
}

interface MedOrderViewProps {
  user: User;
  patientId: string;
}

export default function MedOrderView({ patientId, user }: MedOrderViewProps) {
  const { patientInfo } = usePatientDashboard(); // Access patient info from context

  const {
    medOrder,
    isLoading,
    handleMedicationChange,
    addMedication,
    removeMedication,
    submitMedOrder,
  } = useMedOrderViewModel(
    patientId,
    patientInfo?.patientName || "",
    patientInfo?.city || "",
    [patientInfo?.country || ""], // Country array
    patientInfo?.phone?.phoneNumber || "", // Phone number
  );

  const isFormComplete = useMemo(
    () =>
      medOrder.medications.every(
        (medication) =>
          medication.diagnosis?.trim() &&
          medication.medication?.trim() &&
          medication.dosage?.trim() &&
          medication.frequency?.trim() &&
          medication.quantity?.trim(),
      ),
    [medOrder.medications],
  );

  return (
    <ToastProvider>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 max-w-2xl mx-auto bg-muted p-4"
      >
        <motion.fieldset
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="border rounded-lg bg-card shadow-xs"
        >
          <legend className="text-lg font-semibold px-2 bg-primary text-primary-foreground rounded-lg">
            Doctor and Patient Details
          </legend>
          <div className="space-y-4 p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextFormField
                fieldName="doctorName"
                fieldLabel="Dr."
                value={`${user.firstName} ${user.lastName}`}
                readOnly={true}
              />
              <TextFormField
                fieldName="doctorSpecialty"
                fieldLabel="Specialization"
                value={medOrder.doctorSpecialty}
                readOnly={true}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextFormField
                fieldName="patientName"
                fieldLabel="Patient's Full Name"
                value={medOrder.patientName}
                readOnly={true}
              />
              <TextFormField
                fieldName="patientCountry"
                fieldLabel="Country"
                value={medOrder.patientCountry}
                readOnly={true}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextFormField
                fieldName="patientCity"
                fieldLabel="City"
                value={medOrder.patientCity}
                readOnly={true}
              />
              <TextFormField
                fieldName="patientPhone"
                fieldLabel="Phone"
                value={medOrder.patientPhone}
                readOnly={true}
              />
            </div>
          </div>
        </motion.fieldset>
        {/* Medications Section */}
        <AnimatePresence>
          {medOrder.medications.map((medication, index) => (
            <motion.fieldset
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="border rounded-lg p-4 md:p-6 bg-card shadow-xs relative overflow-hidden"
            >
              <legend className="text-lg font-semibold px-2 flex items-center w-full bg-primary text-primary-foreground rounded-lg">
                <span>Medication {index + 1}</span>
                <div className="ml-auto flex space-x-2">
                  {index === medOrder.medications.length - 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={addMedication}
                      className="h-7 w-7 rounded-full"
                      aria-label="Add medication"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                  {medOrder.medications.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMedication(index)}
                      className="h-7 w-7 rounded-full text-primary-foreground hover:bg-accent hover:text-accent-foreground"
                      aria-label="Remove medication"
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
                  value={medication.diagnosis}
                  onChange={(e) =>
                    handleMedicationChange(index, "diagnosis", e.target.value)
                  }
                  multiline={true}
                  rows={3}
                />
                <TextFormField
                  fieldName={`medication-${index}`}
                  fieldLabel="Medication"
                  value={medication.medication}
                  onChange={(e) =>
                    handleMedicationChange(index, "medication", e.target.value)
                  }
                />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <TextFormField
                    fieldName={`dosage-${index}`}
                    fieldLabel="Dosage"
                    value={medication.dosage}
                    onChange={(e) =>
                      handleMedicationChange(index, "dosage", e.target.value)
                    }
                  />
                  <TextFormField
                    fieldName={`frequency-${index}`}
                    fieldLabel="Frequency"
                    value={medication.frequency}
                    onChange={(e) =>
                      handleMedicationChange(index, "frequency", e.target.value)
                    }
                  />
                  <TextFormField
                    fieldName={`quantity-${index}`}
                    fieldLabel="Quantity"
                    value={medication.quantity}
                    onChange={(e) =>
                      handleMedicationChange(index, "quantity", e.target.value)
                    }
                  />
                </div>
              </div>
            </motion.fieldset>
          ))}
        </AnimatePresence>
        <motion.div
          className="space-y-6 max-w-2xl mx-auto bg-muted"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Button
            onClick={submitMedOrder}
            disabled={isLoading || !isFormComplete}
            variant="submit"
            className="w-full flex justify-center items-center"
          >
            {isLoading ? "Submitting..." : "Submit Medical Order"}
          </Button>
        </motion.div>
      </motion.div>
      <ToastComponent />
    </ToastProvider>
  );
}
