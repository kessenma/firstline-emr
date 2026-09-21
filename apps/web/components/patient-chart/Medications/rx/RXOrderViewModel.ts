// apps/web/components/patient-chart/Medications/rx/RXOrderViewModel.ts
import { useCallback, useState, useMemo, useContext } from "react";
import { useSession } from "next-auth/react"; // Import the session hook
import { ToastContext } from "@/components/hooks/useToast";
import type {
  CreateRxOrderResponse,
  Prescription,
  RxOrder,
} from "@fajr/shared/medications";

import { usePatientDashboard } from "@/components/patient-chart/PatientViewModelContext";

export function useRXOrderViewModel(
  patientId: string | undefined,
  city: string,
  patientName: string,
) {
  const { data: session } = useSession();
  const { addRxOrder, refreshMedications } = usePatientDashboard();
  const { api } = useContext(ToastContext);

  const initialRxOrder = useMemo(
    () => ({
      rxOrderId: "", // Placeholder value for new orders
      doctorSpecialty: Array.isArray(session?.user?.doctorSpecialty)
        ? session.user.doctorSpecialty.join(", ") // Convert array to comma-separated string
        : session?.user?.doctorSpecialty || "Not Selected",
      prescribingDr: `${session?.user?.firstName || ""} ${session?.user?.lastName || ""}`,
      drEmail: session?.user?.email || "",
      drId: session?.user?._id || "",
      prescribedDate: new Date(),
      validTill: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      city,
      prescriptions: [
        { diagnosis: "", medication: "", dosage: "", frequency: "" },
      ],
    }),
    [session, city],
  );

  const [rxOrder, setRxOrder] = useState<Partial<RxOrder>>(initialRxOrder);
  const [isLoading, setIsLoading] = useState(false);

  const isFormComplete = useMemo(() => {
    return (
      rxOrder.prescriptions?.every(
        (prescription) =>
          prescription.diagnosis &&
          prescription.medication &&
          prescription.dosage &&
          prescription.frequency,
      ) ?? false
    );
  }, [rxOrder.prescriptions]);

  const handleInputChange = (field: keyof RxOrder, value: any) => {
    setRxOrder((prevOrder) => ({
      ...prevOrder,
      [field]: value,
    }));
  };

  const handlePrescriptionChange = (
    index: number,
    field: keyof Prescription,
    value: string,
  ) => {
    setRxOrder((prevOrder) => {
      const newPrescriptions = [...(prevOrder.prescriptions || [])];
      newPrescriptions[index] = { ...newPrescriptions[index], [field]: value };

      return {
        ...prevOrder,
        prescriptions: newPrescriptions,
      };
    });
  };

  const addPrescription = () => {
    setRxOrder((prevOrder) => ({
      ...prevOrder,
      prescriptions: [
        ...(prevOrder.prescriptions || []),
        { diagnosis: "", medication: "", dosage: "", frequency: "" },
      ],
    }));
  };

  const removePrescription = (index: number) => {
    setRxOrder((prevOrder) => ({
      ...prevOrder,
      prescriptions: (prevOrder.prescriptions || []).filter(
        (_, i) => i !== index,
      ),
    }));
  };

  const submitRxOrder = useCallback(async () => {
    if (!isFormComplete) {
      return;
    }

    setIsLoading(true);

    try {
      // The server generates patientRxUrl / pharmacyQrUrl / pharmacyQrCode.
      // Sending blank placeholders for them only invited them to be echoed back
      // as empty strings, so they are omitted entirely.
      const response: CreateRxOrderResponse = await api.post(
        `/api/patient/${patientId}/medications/rx-order`,
        { ...rxOrder, city },
      );

      // Add the persisted row — it carries the generated link and QR code.
      // Adding the raw HTTP envelope here is what previously put an object with
      // no patientRxUrl at the top of the list and shared it as "undefined".
      if (response?.rxOrder) {
        addRxOrder(response.rxOrder);
      }
      await refreshMedications(); // Refresh medications after adding

      // Reset form after saving
      setRxOrder({
        prescribedDate: new Date(),
        validTill: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        prescriptions: [
          { diagnosis: "", medication: "", dosage: "", frequency: "" },
        ],
        rxOrderId: "",
        doctorSpecialty: Array.isArray(session?.user?.doctorSpecialty)
          ? session.user.doctorSpecialty.join(", ")
          : session?.user?.doctorSpecialty || "Not Selected",
        prescribingDr: `${session?.user?.firstName || ""} ${session?.user?.lastName || ""}`,
        drEmail: session?.user?.email || "",
        drId: session?.user?._id || "",
        city,
      });
    } catch (error) {
      console.error("Failed to save RX order:", error);
    } finally {
      setIsLoading(false);
    }
  }, [
    api,
    rxOrder,
    patientId,
    addRxOrder,
    refreshMedications,
    isFormComplete,
    city,
    initialRxOrder,
  ]);

  return {
    rxOrder,
    setRxOrder,
    submitRxOrder,
    isLoading,
    isFormComplete,
    handleInputChange,
    handlePrescriptionChange,
    addPrescription,
    removePrescription,
  };
}
