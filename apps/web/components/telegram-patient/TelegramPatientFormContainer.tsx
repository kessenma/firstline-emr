// apps/web/components/telegram-patient/TelegramPatientFormContainer.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { NewPatientFormTelegramView } from "@/components/telegram-patient/container/intake-form/view/NewPatientFormTelegramView";
import ConfirmationContent from "@/components/telegram-patient/container/intake-form/confirmation/confirmation-content";
import ErrorModal from "@/components/telegram-patient/container/intake-form/ErrorModal";
import { SubmittedPatientView } from "@/components/telegram-patient/container/existing-patient/SubmittedPatientView";
import { useTelegramPatientViewModel } from "@/components/telegram-patient/container/intake-form/view-model/NewPatientFormTelegramViewModel";
import type { PartialPatientFormData } from "@/components/telegram-patient/container/intake-form/types/patient";
import { useLanguageStore } from "@/stores/useLanguageStore";
import { usePatientFormStore } from "@/stores/usePatientFormStore";
import AnimatedLogo from "@/components/telegram-patient/aboutPage/AnimatedLogo";
import { LanguageSelector } from "./container/intake-form/view/LanguageSelector";
import { LoadingSpinner } from "./container/intake-form/view/LoadinerSpinner";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import type { NewPatientFormTelegramValues } from "./container/intake-form/types/form-types";
import { languageEnumToString } from "./container/intake-form/patient-form-translations";

type TelegramPatientFormContainerProps = {
  token: string;
};

export function TelegramPatientFormContainer({
  token,
}: TelegramPatientFormContainerProps) {
  const router = useRouter();
  // Use the token directly from props, not from the patient data
  const {
    patientData,
    error,
    createOrUpdatePatient,
    invalidId,
    loading,
    tokenSubmitted,
  } = useTelegramPatientViewModel(token);

  // Use Zustand stores directly in the component
  const { language, setLanguage } = useLanguageStore();
  const {
    formData: formDataState,
    showModal,
    showErrorModal,
    submitting,
    setFormData: setFormDataState,
    setShowModal,
    setShowErrorModal,
  } = usePatientFormStore();

  // Redirect to access denied page if token is invalid
  useEffect(() => {
    if (invalidId) {
      router.push("/telegram-patient/access-denied");
    }
  }, [invalidId, router]);

  // Modified to NOT make the API call, just store the form data and show the modal
  const handleSubmitAction = async (
    formData: NewPatientFormTelegramValues,
  ): Promise<void> => {
    // Store the form data in the Zustand store
    setFormDataState(formData as any);
    // Show the confirmation modal
    setShowModal(true);
    // Return a resolved promise since we're not making an API call yet
    return Promise.resolve();
  };

  // This function will be called when the user confirms in the modal
  const handleConfirmSubmit = async (): Promise<void> => {
    if (formDataState) {
      try {
        // Now we make the API call after confirmation
        await createOrUpdatePatient(formDataState as PartialPatientFormData);
      } catch (error) {
        console.error("Error submitting form:", error);
        setShowErrorModal(true);
      }
    } else {
      console.error("No form data found to submit");
      setShowErrorModal(true);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
  };

  // Handle language change
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(languageEnumToString(newLanguage));
  };

  // If no token is provided, redirect to access denied
  if (!token) {
    router.push("/telegram-patient/access-denied");
    return null;
  }

  // Show loading state
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="w-full max-w-md mx-auto min-h-screen">
      <div className="flex flex-col items-center pt-6 pb-4">
        <AnimatedLogo />
        <LanguageSelector
          currentLanguage={language}
          onLanguageChange={handleLanguageChange}
        />
      </div>

      <div className="px-4 pb-12">
        {submitting ? (
          <LoadingSpinner message="Submitting form..." />
        ) : patientData?.hasSubmittedInfo || tokenSubmitted ? (
          <SubmittedPatientView
            patientId={patientData?.id || ""}
            telegramChatId={patientData?.telegramChatId || ""}
            patientData={{
              firstName: patientData?.firstName,
              lastName: patientData?.lastName,
            }}
            language={language}
          />
        ) : (
          <NewPatientFormTelegramView
            onSubmitAction={handleSubmitAction}
            patientId={patientData?.id || ""}
            setFormDataStateAction={setFormDataState}
            setShowModalAction={setShowModal}
          />
        )}
      </div>

      {/* Confirmation Drawer */}
      <Drawer isOpen={showModal} onClose={handleModalClose}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle></DrawerTitle>
          </DrawerHeader>
          <ConfirmationContent
            patientId={patientData?.id || ""}
            patientName={{
              firstName:
                formDataState?.firstName || patientData?.firstName || "",
              lastName: formDataState?.lastName || patientData?.lastName || "",
            }}
            onClose={handleModalClose}
            submittingFromNoSession={true}
            setSubmittingFromNoSession={() => {}}
            submit={handleConfirmSubmit}
            language={language}
          />
        </DrawerContent>
      </Drawer>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-background/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-lg max-w-md w-full mx-4">
            <ErrorModal
              errorMessage={error}
              onClose={() => setShowErrorModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
