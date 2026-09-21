// apps/web/components/notification-modals/OnboardingModal.tsx
// Welcome modal shown when a profile_update_approved notification is clicked
"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { CheckCircle, MessageCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingModal({ isOpen, onClose }: OnboardingModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  const firstName = session?.user?.firstName || "there";

  const handleContactAdmin = async () => {
    setIsCreatingThread(true);
    try {
      const res = await fetch("/api/internal-messages/contact-admin", {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to create thread");

      const { threadId } = await res.json();
      onClose();
      router.push(`/messages/${threadId}`);
    } catch {
      // Silently fail — user can try again
    } finally {
      setIsCreatingThread(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Welcome!"
      description="Your account has been approved"
    >
      <div className="flex flex-col items-center gap-6 py-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-50">
          <CheckCircle className="h-10 w-10 text-green-500" />
        </div>

        <div className="text-center space-y-2">
          <h3 className="text-xl font-semibold">Welcome, {firstName}!</h3>
          <p className="text-muted-foreground leading-relaxed max-w-md">
            Your account has been approved. You now have full access to Fajr
            Mission EMR. If you have any questions, feel free to reach out to
            the admin team below.
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <Button
            onClick={handleContactAdmin}
            disabled={isCreatingThread}
            className="w-full gap-2"
          >
            {isCreatingThread ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageCircle className="h-4 w-4" />
            )}
            Contact Admin
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            className="w-full text-muted-foreground"
          >
            Maybe later
          </Button>
        </div>
      </div>
    </Modal>
  );
}
