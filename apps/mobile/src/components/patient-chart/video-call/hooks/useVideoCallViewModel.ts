// apps/mobile/src/components/patient-chart/video-call/hooks/useVideoCallViewModel.ts
//
// Composed view model for the Video section: call actions come from the
// session provider, history from PowerSync via PatientChartContext.

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  buildInviteMessage,
  summarizeCallHistory,
} from '@fajr/shared/video-call';
import type {
  CallHistorySummary,
  VideoCallConnectionState,
  VideoCallSession,
} from '@fajr/shared/video-call';
import { getApiUrl } from '../../../../config';
import { getStoredToken } from '../../../../utils/storage';
import { usePatientChart } from '../../PatientChartContext';
import { useVideoCallSession } from '../VideoCallSessionProvider';
import { useCallTranscripts, type CallTranscript } from './useCallTranscripts';

export type InviteSendState = 'idle' | 'sending' | 'sent' | 'failed';

export interface VideoCallViewModel {
  patientId: string;
  patientName: string;
  canSendViaTelegram: boolean;

  /** Exactly what the patient will receive, in their recorded language. */
  invitePreview: string;
  inviteSendState: InviteSendState;
  /** True while the post-start "send the link?" prompt is up. */
  invitePromptVisible: boolean;
  dismissInvitePrompt: () => void;

  connectionState: VideoCallConnectionState;
  inCall: boolean;
  inviteUrl: string | null;
  error: string | null;
  /** False when a live call's sheet has been swiped away. */
  sheetPresented: boolean;

  history: VideoCallSession[];
  loadingHistory: boolean;

  /** Machine transcripts of past calls, newest first. */
  transcripts: CallTranscript[];
  loadingTranscripts: boolean;
  summary: CallHistorySummary;

  startCall: () => Promise<void>;
  /** Available from the section itself, so hanging up never depends on the
   *  call sheet being on screen. */
  endCall: () => Promise<void>;
  /** Brings a swiped-away call sheet back. */
  returnToCall: () => void;
  sendInviteViaTelegram: () => Promise<boolean>;
  saveCallNotes: (sessionId: string, notes: string) => Promise<boolean>;
  clearError: () => void;
}

export function useVideoCallViewModel(): VideoCallViewModel {
  const { patientInfo, videoCalls, loadingVideoCalls } = usePatientChart();
  const session = useVideoCallSession();
  const { transcripts, loading: loadingTranscripts } = useCallTranscripts(
    patientInfo?.id,
  );

  const telegramChatId = patientInfo?.telegramChatId || '';

  const [inviteSendState, setInviteSendState] =
    useState<InviteSendState>('idle');
  const [invitePromptVisible, setInvitePromptVisible] = useState(false);

  // Ask once per call, as soon as one exists. Keyed on the session id rather
  // than on a boolean edge for the same reason VideoCallSheet is: a back-to-back
  // second call would never re-trigger a false→true transition.
  const promptedSessionId = useRef<string | null>(null);
  const activeSessionId = session.activeCall?.sessionId ?? null;

  useEffect(() => {
    if (!activeSessionId) {
      promptedSessionId.current = null;
      setInvitePromptVisible(false);
      setInviteSendState('idle');
      return;
    }

    if (promptedSessionId.current === activeSessionId) return;
    promptedSessionId.current = activeSessionId;
    setInviteSendState('idle');
    // Nothing reaches the patient until the link does, so prompt rather than
    // hoping the clinician spots the invite card behind the call sheet.
    if (telegramChatId) setInvitePromptVisible(true);
  }, [activeSessionId, telegramChatId]);

  const dismissInvitePrompt = useCallback(
    () => setInvitePromptVisible(false),
    [],
  );

  const invitePreview = session.activeCall
    ? buildInviteMessage(
        session.activeCall.inviteUrl,
        session.activeCall.language,
      )
    : '';

  const sendInviteViaTelegram = useCallback(async (): Promise<boolean> => {
    if (!telegramChatId || !session.activeCall) return false;

    setInviteSendState('sending');

    try {
      const authToken = await getStoredToken();
      const response = await fetch(
        getApiUrl(`/telegram-thread/${telegramChatId}/send-text`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({
            text: buildInviteMessage(
              session.activeCall.inviteUrl,
              session.activeCall.language,
            ),
            // Keeps the link message tappable — the signature follows in its
            // own message rather than trailing the URL.
            signatureMode: 'separate',
          }),
        },
      );
      setInviteSendState(response.ok ? 'sent' : 'failed');
      return response.ok;
    } catch (err) {
      console.error('[VideoCall] telegram send failed:', err);
      setInviteSendState('failed');
      return false;
    }
  }, [telegramChatId, session.activeCall]);

  const saveCallNotes = useCallback(
    async (sessionId: string, notes: string): Promise<boolean> => {
      try {
        const authToken = await getStoredToken();
        const response = await fetch(getApiUrl(`/video-call/${sessionId}`), {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify({ callNotes: notes }),
        });
        // No local refresh needed — PowerSync syncs the row back.
        return response.ok;
      } catch (err) {
        console.error('[VideoCall] save notes failed:', err);
        return false;
      }
    },
    [],
  );

  return {
    patientId: session.patientId,
    patientName: session.patientName,
    canSendViaTelegram: Boolean(telegramChatId),

    invitePreview,
    inviteSendState,
    invitePromptVisible,
    dismissInvitePrompt,

    connectionState: session.connectionState,
    inCall:
      session.connectionState === 'connected' ||
      session.connectionState === 'connecting' ||
      session.connectionState === 'reconnecting',
    inviteUrl: session.activeCall?.inviteUrl ?? null,
    error: session.error,
    sheetPresented: session.sheetPresented,

    history: videoCalls,
    loadingHistory: loadingVideoCalls,

    transcripts,
    loadingTranscripts,
    summary: summarizeCallHistory(videoCalls),

    startCall: session.startCall,
    endCall: session.endCall,
    returnToCall: session.requestReopen,
    sendInviteViaTelegram,
    saveCallNotes,
    clearError: session.clearError,
  };
}
