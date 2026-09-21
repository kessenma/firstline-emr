// apps/mobile/src/components/patient-chart/medications/useRxOrderCancel.ts
//
// Withdrawing a prescription from the clinician's phone.
//
// Calls the same route the web drawer does, so the two clients cannot end up
// cancelling differently — the server clears the QR, messages the patient and
// notifies the care team in one call.

import { useCallback, useState } from 'react';
import type { PrescriptionCancelFailureReason } from '@fajr/shared/medications';
import { getApiUrl } from '../../../config';
import { getStoredToken } from '../../../utils/storage';

export type RxCancelState = 'idle' | 'cancelling' | 'cancelled' | 'failed';

interface UseRxOrderCancelOptions {
  patientId: string | undefined;
  rxOrderId: string | undefined;
}

export interface RxCancelResult {
  ok: boolean;
  notifiedPatient: boolean;
}

export function useRxOrderCancel({
  patientId,
  rxOrderId,
}: UseRxOrderCancelOptions) {
  const [cancelState, setCancelState] = useState<RxCancelState>('idle');
  const [failure, setFailure] =
    useState<PrescriptionCancelFailureReason | null>(null);

  const cancel = useCallback(
    async (reason: string): Promise<RxCancelResult> => {
      if (!patientId || !rxOrderId) return { ok: false, notifiedPatient: false };

      setCancelState('cancelling');
      setFailure(null);

      try {
        const authToken = await getStoredToken();
        const response = await fetch(
          getApiUrl(
            `/patient/${patientId}/medications/rx-order/${rxOrderId}/cancel`,
          ),
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${authToken}`,
            },
            body: JSON.stringify({ reason }),
          },
        );

        if (response.ok) {
          const body = await response.json().catch(() => ({} as any));
          // No local write: PowerSync syncs cancelled_at back, and the sheet
          // shows the banner from `cancelState` until it arrives.
          setCancelState('cancelled');
          return { ok: true, notifiedPatient: !!body?.notifiedPatient };
        }

        const body = await response.json().catch(() => ({} as any));
        const reasonCode = body?.reason;
        setFailure(
          reasonCode === 'already-cancelled' ||
            reasonCode === 'reason-required' ||
            reasonCode === 'not-found'
            ? reasonCode
            : 'unknown',
        );
        setCancelState('failed');
        return { ok: false, notifiedPatient: false };
      } catch (err) {
        // The chart reads offline, but this does not — say so rather than
        // reporting a generic failure the clinician would reasonably retry.
        console.error('[RxOrderCancel] cancel failed:', err);
        setFailure('offline');
        setCancelState('failed');
        return { ok: false, notifiedPatient: false };
      }
    },
    [patientId, rxOrderId],
  );

  return { cancelState, failure, cancel };
}
