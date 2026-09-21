// apps/web/components/patient-dashboard/ChatThreadModal.tsx
"use client";

import { Modal } from "@/components/ui/modal";
import { ChatThreadView } from "@/components/messages/ChatThreadView";
import type { PatientWithMessages } from "./types/patient-table-types";
import { getAnonymizedName } from "@fajr/shared/patient-utils";

interface ChatThreadModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientWithMessages | null;
  language?: string;
}

export function ChatThreadModal({
  isOpen,
  onClose,
  patient,
  language,
}: ChatThreadModalProps) {
  console.log("🔍 ChatThreadModal received patient:", {
    id: patient?.id,
    firstName: patient?.firstName,
    lastName: patient?.lastName,
    telegramChatId: patient?.telegramChatId,
    isOpen,
  });

  if (!patient?.telegramChatId) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={getAnonymizedName(patient.firstName, patient.lastName)}
      size="xl"
      className="!h-[90vh] !max-h-[90vh]"
      scrollable={false}
      noPadding={true}
      contentClassName="!p-0 !overflow-hidden !flex-1"
    >
      <ChatThreadView
        id={patient.telegramChatId}
        language={language}
        patientDetails={{
          firstName: patient.firstName || "",
          lastName: patient.lastName || "",
          id: String(patient.id),
        }}
        isEmbedded={true}
      />
    </Modal>
  );
}
