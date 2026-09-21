// apps/web/components/form/Medications/MedOrderViewModel.ts
//SUBMITTING MED ORDERS

import { useCallback, useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/hooks/useToast";
import type { MedOrder } from "@/db/schema/medOrders";

import { usePatientDashboard } from "@/components/patient-chart/PatientViewModelContext";

type MedOrderFormState = {
  doctorSpecialty: string;
  prescribingDr: string;
  drEmail: string;
  drId: string;
  patientName: string;
  patientPhone: string;
  patientCity: string;
  patientCountry: string;
  patientId: string;
  orderDate: Date;
  validated: boolean;
  medications: Array<{
    diagnosis: string;
    medication: string;
    dosage: string;
    frequency: string;
    quantity: string;
  }>;
};

export function useMedOrderViewModel(
  patientId: string,
  patientName: string,
  city: string,
  countries: string[],
  phone: string,
) {
  const { data: session } = useSession();
  const { setToast } = useToast();
  const { addMedOrder } = usePatientDashboard(); // Use context to add new med orders

  // Initial Med Order
  const initialMedOrder = useMemo<MedOrderFormState>(() => {
    const doctorSpecialty = Array.isArray(session?.user?.doctorSpecialty)
      ? session.user.doctorSpecialty.join(", ")
      : session?.user?.doctorSpecialty || "Not Selected";

    return {
      doctorSpecialty: doctorSpecialty.toString(),
      prescribingDr: `${session?.user?.firstName || ""} ${session?.user?.lastName || ""}`,
      drEmail: session?.user?.email || "",
      drId: session?.user?._id || "",
      patientName,
      patientPhone: phone,
      patientCity: city,
      patientCountry: countries[0] || "",
      patientId,
      orderDate: new Date(),
      validated: false,
      medications: [
        {
          diagnosis: "",
          medication: "",
          dosage: "",
          frequency: "",
          quantity: "",
        },
      ],
    };
  }, [session, patientName, phone, city, countries, patientId]);

  const [medOrder, setMedOrder] = useState<MedOrderFormState>(initialMedOrder);
  const [isLoading, setIsLoading] = useState(false);

  // Form completeness check
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

  // Handlers
  const handleInputChange = (field: keyof MedOrderFormState, value: any) => {
    setMedOrder((prevOrder) => ({
      ...prevOrder,
      [field]: value,
    }));
  };

  const handleMedicationChange = (
    index: number,
    field: keyof MedOrderFormState["medications"][number],
    value: string,
  ) => {
    setMedOrder((prevOrder) => {
      const newMedications = [...prevOrder.medications];
      newMedications[index] = { ...newMedications[index], [field]: value };
      return {
        ...prevOrder,
        medications: newMedications,
      };
    });
  };

  const addMedication = () => {
    setMedOrder((prevOrder) => ({
      ...prevOrder,
      medications: [
        ...prevOrder.medications,
        {
          diagnosis: "",
          medication: "",
          dosage: "",
          frequency: "",
          quantity: "",
        },
      ],
    }));
  };

  const removeMedication = (index: number) => {
    setMedOrder((prevOrder) => ({
      ...prevOrder,
      medications: prevOrder.medications.filter((_, idx) => idx !== index),
    }));
  };

  const submitMedOrder = useCallback(async () => {
    if (!isFormComplete) {
      setToast({
        title: "Error",
        description: "Please complete all fields before submitting.",
        variant: "error",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(
        `/api/patient/${patientId}/medications/med-order`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(medOrder),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to save Med order: ${errorText}`);
      }

      const savedMedOrder: MedOrder = await response.json();

      // Add the new MedOrder to the context
      addMedOrder(savedMedOrder);

      // Clear the form state
      setMedOrder(initialMedOrder);

      setToast({
        title: "Success",
        description: `${medOrder.medications.map((m) => m.medication).join(", ")} submitted for ${patientName}`,
        variant: "success",
      });
    } catch (error) {
      setToast({
        title: "Error",
        description: "Failed to submit Request for Unavailable Medications.",
        variant: "error",
      });
      console.error("Failed to save Med order:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    isFormComplete,
    medOrder,
    patientId,
    setToast,
    patientName,
    initialMedOrder,
    addMedOrder,
  ]);

  return {
    medOrder,
    isLoading,
    isFormComplete,
    handleInputChange,
    handleMedicationChange,
    addMedication,
    removeMedication,
    submitMedOrder,
  };
}
