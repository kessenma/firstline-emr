// apps/web/components/notification-modals/NotificationModalRouter.tsx
// Central dispatcher for notification-specific modals on the web
"use client";

import { useState, useCallback } from "react";
import type { Notification } from "@/components/notifications/NotificationsViewModel";
import { NewSignupsModal } from "./NewSignupsModal";
import UnassignedSpecialtyPatientModal from "./UnassignedSpecialtyPatientModal";
import { OnboardingModal } from "./OnboardingModal";
import { AdminNotificationModal } from "./AdminNotificationModal";

/**
 * Hook that manages notification modal state and provides a click handler.
 *
 * Usage in NotificationsView:
 * ```
 * const { handleClick, modals } = useNotificationModals();
 * // handleClick returns true if a modal was opened (so caller can skip default nav)
 * ```
 */
export function useNotificationModals() {
  const [isSignupsModalOpen, setIsSignupsModalOpen] = useState(false);
  const [isUnassignedPatientModalOpen, setIsUnassignedPatientModalOpen] =
    useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    null,
  );
  const [isOnboardingModalOpen, setIsOnboardingModalOpen] = useState(false);
  const [isAdminNotifModalOpen, setIsAdminNotifModalOpen] = useState(false);
  const [selectedAdminNotification, setSelectedAdminNotification] =
    useState<Notification | null>(null);

  /**
   * Returns a customHandler callback if this notification type should open a
   * modal, or null if default navigation should apply.
   */
  const getModalHandler = useCallback(
    (notification: Notification): (() => void) | null => {
      if (
        notification.redirectTo === "/admin/new-signups" ||
        notification.type === "new_user_signup"
      ) {
        return () => setIsSignupsModalOpen(true);
      }

      if (notification.type === "specialty_no_doctors" && notification.patientId) {
        return () => {
          setSelectedPatientId(notification.patientId!);
          setIsUnassignedPatientModalOpen(true);
        };
      }

      if (notification.type === "profile_update_approved") {
        return () => setIsOnboardingModalOpen(true);
      }

      if (
        notification.type === "announcement" ||
        notification.type === "reminder" ||
        (notification.type === "alert" && notification.isAdminNotification)
      ) {
        return () => {
          setSelectedAdminNotification(notification);
          setIsAdminNotifModalOpen(true);
        };
      }

      return null;
    },
    [],
  );

  const modals = (
    <>
      <NewSignupsModal
        isOpen={isSignupsModalOpen}
        onClose={() => setIsSignupsModalOpen(false)}
      />

      <UnassignedSpecialtyPatientModal
        isOpen={isUnassignedPatientModalOpen}
        onClose={() => {
          setIsUnassignedPatientModalOpen(false);
          setSelectedPatientId(null);
        }}
        patientId={selectedPatientId}
      />

      <OnboardingModal
        isOpen={isOnboardingModalOpen}
        onClose={() => setIsOnboardingModalOpen(false)}
      />

      <AdminNotificationModal
        isOpen={isAdminNotifModalOpen}
        onClose={() => {
          setIsAdminNotifModalOpen(false);
          setSelectedAdminNotification(null);
        }}
        notification={selectedAdminNotification}
      />
    </>
  );

  return { getModalHandler, modals };
}
