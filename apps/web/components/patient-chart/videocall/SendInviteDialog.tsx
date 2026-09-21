// apps/web/components/patient-chart/videocall/SendInviteDialog.tsx
//
// Asks, right after a call starts, whether to push the join link into the
// patient's Telegram thread. Starting a call the patient has no way to reach is
// the failure mode this exists to prevent — before it, the clinician had to
// notice the invite card, copy the link, and paste it into the messaging tab.
"use client";

import React from "react";
import { Loader2, Send, MessageCircle } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import type { InviteSendState } from "./VideoCallViewModel";

interface SendInviteDialogProps {
  open: boolean;
  onClose: () => void;
  patientName: string;
  /** Exactly what the patient will receive, in their language. */
  invitePreview: string;
  sendState: InviteSendState;
  onSend: () => Promise<boolean>;
}

const SendInviteDialog: React.FC<SendInviteDialogProps> = ({
  open,
  onClose,
  patientName,
  invitePreview,
  sendState,
  onSend,
}) => {
  const sending = sendState === "sending";

  const handleSend = async () => {
    const ok = await onSend();
    // Only close on success: a failure has to stay on screen, since the link
    // otherwise never reaches the patient and nothing else says so.
    if (ok) onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      size="md"
      title={`Send the join link to ${patientName}?`}
      description="The link goes straight into their Telegram chat. Your signature follows as a separate message, so the link stays tappable."
      footer={
        <div className="flex w-full justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Not now
          </Button>
          <Button variant="orange" onClick={handleSend} disabled={sending}>
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {sending ? "Sending…" : "Send on Telegram"}
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" />
          Message preview
        </div>

        <p className="whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-sm">
          {invitePreview}
        </p>

        {sendState === "failed" && (
          <p className="text-sm text-destructive" role="alert">
            Telegram send failed. Try again, or copy the link from the invite
            card.
          </p>
        )}
      </div>
    </Modal>
  );
};

export default SendInviteDialog;
