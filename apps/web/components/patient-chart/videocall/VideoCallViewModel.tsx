// apps/web/components/patient-chart/videocall/VideoCallViewModel.tsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { usePatientDashboard } from "../PatientViewModelContext";
import { buildInviteMessage } from "@fajr/shared/video-call";
import type {
  StartCallResponse,
  VideoCallSession,
} from "@fajr/shared/video-call";

export type InviteSendState = "idle" | "sending" | "sent" | "failed";

export interface VideoCallViewModel {
  patientId: string;
  patientName: string;
  canSendViaTelegram: boolean;

  activeCall: StartCallResponse | null;
  starting: boolean;
  error: string | null;

  history: VideoCallSession[];
  loadingHistory: boolean;

  /** The invite text the patient will receive, in their language. */
  invitePreview: string;
  inviteSendState: InviteSendState;
  /** True while the post-start "send the link?" prompt is up. */
  invitePromptOpen: boolean;
  dismissInvitePrompt: () => void;

  startCall: () => Promise<void>;
  endCall: () => Promise<void>;
  sendInviteViaTelegram: () => Promise<boolean>;
  saveCallNotes: (sessionId: string, notes: string) => Promise<boolean>;
  refreshHistory: () => Promise<void>;
}

export const useVideoCallViewModel = (): VideoCallViewModel => {
  const { patientInfo } = usePatientDashboard();

  const patientId = patientInfo?.patientID || "";
  const patientName = patientInfo?.patientName || "Patient";
  const telegramChatId = patientInfo?.telegramChatId || "";

  const [activeCall, setActiveCall] = useState<StartCallResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [history, setHistory] = useState<VideoCallSession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [inviteSendState, setInviteSendState] =
    useState<InviteSendState>("idle");
  const [invitePromptOpen, setInvitePromptOpen] = useState(false);

  const dismissInvitePrompt = useCallback(() => setInvitePromptOpen(false), []);

  const refreshHistory = useCallback(async () => {
    if (!patientId) return;

    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/video-call/patient/${patientId}`);
      if (!response.ok) throw new Error("Failed to load call history");

      const data = await response.json();
      setHistory(data.sessions ?? []);
    } catch (err) {
      console.error("[VideoCall] history load failed:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [patientId]);

  useEffect(() => {
    void refreshHistory();
  }, [refreshHistory]);

  const startCall = useCallback(async () => {
    if (!patientId) {
      setError("No patient loaded.");
      return;
    }

    setStarting(true);
    setError(null);

    try {
      const response = await fetch("/api/video-call/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientId }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "Failed to start the call");
      }

      setActiveCall((await response.json()) as StartCallResponse);

      // Nothing reaches the patient until the link does, and the link is
      // useless sitting in the clinician's UI — so ask right here instead of
      // relying on them noticing the card below.
      setInviteSendState("idle");
      if (telegramChatId) setInvitePromptOpen(true);

      void refreshHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start the call");
    } finally {
      setStarting(false);
    }
  }, [patientId, telegramChatId, refreshHistory]);

  const endCall = useCallback(async () => {
    const sessionId = activeCall?.sessionId;
    setActiveCall(null);
    setInvitePromptOpen(false);
    setInviteSendState("idle");

    if (!sessionId) return;

    try {
      await fetch("/api/video-call/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
    } catch (err) {
      // Non-fatal: the LiveKit webhook closes out the log regardless.
      console.error("[VideoCall] end call failed:", err);
    } finally {
      void refreshHistory();
    }
  }, [activeCall, refreshHistory]);

  const invitePreview = activeCall
    ? buildInviteMessage(activeCall.inviteUrl, activeCall.language)
    : "";

  const sendInviteViaTelegram = useCallback(async (): Promise<boolean> => {
    if (!telegramChatId || !activeCall) return false;

    setInviteSendState("sending");

    try {
      const response = await fetch(
        `/api/telegram-thread/${telegramChatId}/send-text`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: buildInviteMessage(activeCall.inviteUrl, activeCall.language),
            // Keeps the link message tappable — the signature follows in its
            // own message rather than trailing the URL.
            signatureMode: "separate",
          }),
        },
      );
      setInviteSendState(response.ok ? "sent" : "failed");
      return response.ok;
    } catch (err) {
      console.error("[VideoCall] telegram send failed:", err);
      setInviteSendState("failed");
      return false;
    }
  }, [telegramChatId, activeCall]);

  const saveCallNotes = useCallback(
    async (sessionId: string, notes: string): Promise<boolean> => {
      try {
        const response = await fetch(`/api/video-call/${sessionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ callNotes: notes }),
        });

        if (response.ok) void refreshHistory();
        return response.ok;
      } catch (err) {
        console.error("[VideoCall] save notes failed:", err);
        return false;
      }
    },
    [refreshHistory],
  );

  return {
    patientId,
    patientName,
    canSendViaTelegram: Boolean(telegramChatId),
    activeCall,
    starting,
    error,
    history,
    loadingHistory,
    invitePreview,
    inviteSendState,
    invitePromptOpen,
    dismissInvitePrompt,
    startCall,
    endCall,
    sendInviteViaTelegram,
    saveCallNotes,
    refreshHistory,
  };
};
