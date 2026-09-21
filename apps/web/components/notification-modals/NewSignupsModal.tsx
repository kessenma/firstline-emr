// apps/web/components/notification-modals/NewSignupsModal.tsx
// Extracted from NotificationsView — modal wrapper for NewSignupsView
"use client";

import { Modal } from "@/components/ui/modal";
import NewSignupsView from "@/components/adminDashboard/sections/new-signups/NewSignupsView";
import { useRouter } from "next/navigation";

interface NewSignupsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewSignupsModal({ isOpen, onClose }: NewSignupsModalProps) {
  const router = useRouter();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New User Signups"
      description="Review and approve or deny pending user registrations"
      size="full"
      showExternalLink
      externalLinkText="Open Full Dashboard"
      onExternalLinkClick={() => router.push("/admin")}
      noPadding={true}
      className="p-0"
    >
      <NewSignupsView isDialog={true} />
    </Modal>
  );
}
