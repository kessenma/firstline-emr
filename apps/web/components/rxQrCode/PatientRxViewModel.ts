// apps/web/components/rxQrCode/PatientRxViewModel.ts

import { useCallback, useEffect, useState } from 'react';
import type {
    PatientRxPublicView,
    PatientCancellationReasonCode,
} from '@fajr/shared/medications';

/** What the gate is currently telling the patient. */
export type RxGateState =
    | { status: 'checking' }
    | { status: 'locked' }
    | { status: 'needs-code'; error: RxGateError | null }
    | { status: 'unlocked' };

export type RxGateError =
    | { kind: 'wrong-code' }
    | { kind: 'throttled'; retryAfterMs: number }
    | { kind: 'locked' };

export function usePatientViewModel(uuid: string) {
    // Typed against the same shared contract the API route `satisfies`, rather
    // than against the Drizzle row. The previous cast to the Drizzle type was
    // what let the endpoint return `PharmacyQrCode` while this page read
    // `pharmacyQrCode` — `response.json()` is `any`, so nothing objected.
    const [rxOrder, setRxOrder] = useState<PatientRxPublicView | null>(null);
    const [gate, setGate] = useState<RxGateState>({ status: 'checking' });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cancelled, setCancelled] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    // A reload inside the cookie's 30-minute window should not ask again. This
    // 401s for everyone else, which is the intended resting state — the page
    // ships no prescription data until a code has been entered.
    useEffect(() => {
        let cancelled = false;

        const resume = async () => {
            try {
                const response = await fetch(`/api/rx-order-qr-code/patient/${uuid}`);
                if (cancelled) return;

                if (response.ok) {
                    setRxOrder((await response.json()) as PatientRxPublicView);
                    setGate({ status: 'unlocked' });
                    return;
                }
                setGate({ status: 'needs-code', error: null });
            } catch {
                if (!cancelled) setGate({ status: 'needs-code', error: null });
            }
        };

        void resume();
        return () => {
            cancelled = true;
        };
    }, [uuid]);

    const submitCode = useCallback(
        async (code: string) => {
            setSubmitting(true);
            setError(null);

            try {
                const response = await fetch(
                    `/api/rx-order-qr-code/patient/${uuid}/unlock`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code }),
                    },
                );

                if (response.ok) {
                    setRxOrder((await response.json()) as PatientRxPublicView);
                    setGate({ status: 'unlocked' });
                    return;
                }

                if (response.status === 423) {
                    setGate({ status: 'locked' });
                    return;
                }

                if (response.status === 429) {
                    const body = await response.json().catch(() => ({}));
                    setGate({
                        status: 'needs-code',
                        error: {
                            kind: 'throttled',
                            retryAfterMs: Number(body?.retryAfterMs) || 0,
                        },
                    });
                    return;
                }

                // Everything else is one indistinguishable rejection by design:
                // the server will not say whether this prescription exists.
                setGate({ status: 'needs-code', error: { kind: 'wrong-code' } });
            } catch {
                setError('Could not reach the server. Check your connection.');
            } finally {
                setSubmitting(false);
            }
        },
        [uuid],
    );

    /**
     * The patient withdrawing their own script.
     *
     * On success the page flips to the cancelled banner from local state rather
     * than refetching: the server has already cleared the QR, so a refetch would
     * render a prescription with a hole in it before the banner appeared.
     */
    const cancelPrescription = useCallback(
        async (reasonCode: PatientCancellationReasonCode, note: string) => {
            setCancelling(true);
            setCancelError(null);

            try {
                const response = await fetch(
                    `/api/rx-order-qr-code/patient/${uuid}/cancel`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ reasonCode, note }),
                    },
                );

                if (response.ok) {
                    setCancelled(true);
                    return;
                }
                setCancelError('failed');
            } catch {
                setCancelError('failed');
            } finally {
                setCancelling(false);
            }
        },
        [uuid],
    );

    return {
        rxOrder,
        gate,
        submitCode,
        submitting,
        error,
        cancelled,
        cancelling,
        cancelError,
        cancelPrescription,
    };
}

export const prescriptionColumns = [
    { key: 'medication', header: 'Medication' },
    { key: 'dosage', header: 'Dosage' },
    { key: 'frequency', header: 'Frequency' },
];
