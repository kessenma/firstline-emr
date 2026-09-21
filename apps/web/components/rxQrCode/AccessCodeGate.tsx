// apps/web/components/rxQrCode/AccessCodeGate.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import type { PatientRxTranslationKey } from '@fajr/shared/medications';
import type { RxGateError } from './PatientRxViewModel';

interface AccessCodeGateProps {
    t: (key: PatientRxTranslationKey) => string;
    dir: 'ltr' | 'rtl';
    error: RxGateError | null;
    submitting: boolean;
    networkError: string | null;
    onSubmit: (code: string) => void;
}

const CODE_LENGTH = 6;

/** mm:ss, so a cooldown reads as a wait rather than a wall. */
function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const AccessCodeGate: React.FC<AccessCodeGateProps> = ({
    t,
    dir,
    error,
    submitting,
    networkError,
    onSubmit,
}) => {
    const [code, setCode] = useState('');
    const [remainingMs, setRemainingMs] = useState(0);

    // Counts the cooldown down live. Being told "wait" with no idea how long
    // is what makes people retry, which extends the wait.
    useEffect(() => {
        if (error?.kind !== 'throttled') {
            setRemainingMs(0);
            return;
        }
        setRemainingMs(error.retryAfterMs);
        const timer = setInterval(() => {
            setRemainingMs((prev) => Math.max(0, prev - 1000));
        }, 1000);
        return () => clearInterval(timer);
    }, [error]);

    const throttled = error?.kind === 'throttled' && remainingMs > 0;
    const canSubmit = code.length === CODE_LENGTH && !submitting && !throttled;

    return (
        <Card
            dir={dir}
            className="w-full max-w-md mx-auto mt-16 mb-8 relative z-10"
            backgroundOpacity={0}
            borderSize={1}
            shadowSize="md"
        >
            <CardHeader className="flex flex-row items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle>{t('enterAccessCode')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">{t('accessCodeHelp')}</p>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (canSubmit) onSubmit(code);
                    }}
                    className="space-y-4"
                >
                    <label className="block space-y-2">
                        <span className="text-sm font-medium">{t('accessCodeLabel')}</span>
                        <input
                            // Numeric keypad on phones, which is where patients open this.
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9]*"
                            maxLength={CODE_LENGTH}
                            value={code}
                            // The code is always LTR digits even on an RTL page.
                            dir="ltr"
                            onChange={(event) =>
                                setCode(event.target.value.replace(/\D/g, '').slice(0, CODE_LENGTH))
                            }
                            className="w-full rounded-md border border-border bg-background px-4 py-3 text-center text-2xl tracking-[0.5em] text-foreground"
                            aria-label={t('accessCodeLabel')}
                        />
                    </label>

                    {error?.kind === 'wrong-code' && (
                        <p role="alert" className="text-sm text-destructive">
                            {t('wrongCode')}
                        </p>
                    )}

                    {throttled && (
                        <p role="alert" className="text-sm text-destructive">
                            {t('tooManyAttempts')} {formatCountdown(remainingMs)}
                        </p>
                    )}

                    {networkError && (
                        <p role="alert" className="text-sm text-destructive">
                            {networkError}
                        </p>
                    )}

                    <Button type="submit" variant="default" className="w-full" disabled={!canSubmit}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {t('unlock')}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

/** Shown once the lifetime failure cap is hit — only a re-send clears it. */
export const AccessLockedCard: React.FC<{
    t: (key: PatientRxTranslationKey) => string;
    dir: 'ltr' | 'rtl';
}> = ({ t, dir }) => (
    <Card
        dir={dir}
        className="w-full max-w-md mx-auto mt-16 mb-8 relative z-10"
        backgroundColor=""
        borderColor="border-destructive"
        borderSize={1}
        shadowSize="md"
    >
        <CardHeader>
            <CardTitle>{t('tooManyAttempts')}</CardTitle>
        </CardHeader>
        <CardContent>
            <p className="text-sm text-muted-foreground">{t('askDoctorForNewCode')}</p>
        </CardContent>
    </Card>
);

export default AccessCodeGate;
