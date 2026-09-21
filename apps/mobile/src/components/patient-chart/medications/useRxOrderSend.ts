// apps/mobile/src/components/patient-chart/medications/useRxOrderSend.ts
//
// Sends a prescription link into the patient's messaging thread.
//
// Modelled on `sendInviteViaTelegram` in the video-call view model, and calls
// a single server route that both delivers the message and records the send —
// so the button and the record can never disagree about whether the patient
// has the script.

import { useCallback, useState } from 'react';
import type { PrescriptionSendFailureReason } from '@fajr/shared/medications';
import { getApiUrl } from '../../../config';
import { getStoredToken } from '../../../utils/storage';

export type RxSendState = 'idle' | 'sending' | 'sent' | 'failed';

interface UseRxOrderSendOptions {
  patientId: string | undefined;
  rxOrderId: string | undefined;
}

export function useRxOrderSend({ patientId, rxOrderId }: UseRxOrderSendOptions) {
  const [sendState, setSendState] = useState<RxSendState>('idle');
  const [failure, setFailure] = useState<PrescriptionSendFailureReason | null>(null);

  const send = useCallback(async (): Promise<boolean> => {
    if (!patientId || !rxOrderId) return false;

    setSendState('sending');
    setFailure(null);

    try {
      const authToken = await getStoredToken();
      const response = await fetch(
        getApiUrl(
          `/patient/${patientId}/medications/rx-order/${rxOrderId}/send-to-patient`,
        ),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
          },
        },
      );

      if (response.ok) {
        // No local write: PowerSync syncs `patient_link_sent_at` back, and the
        // sheet greys itself out from `sendState` in the meantime.
        setSendState('sent');
        return true;
      }

      const body = await response.json().catch(() => ({} as any));
      const reason = body?.reason;

      setFailure(
        reason === 'no-channel' || reason === 'no-thread' || reason === 'missing-link'
          ? reason
          : 'unknown',
      );
      setSendState('failed');
      return false;
    } catch (err) {
      // The chart reads from PowerSync and works offline, but this send does
      // not — say so rather than reporting a generic failure the clinician
      // would reasonably retry.
      console.error('[RxOrderSend] send failed:', err);
      setFailure('offline');
      setSendState('failed');
      return false;
    }
  }, [patientId, rxOrderId]);

  return { sendState, failure, send };
}
