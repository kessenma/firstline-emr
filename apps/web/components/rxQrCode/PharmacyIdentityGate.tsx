// apps/web/components/rxQrCode/PharmacyIdentityGate.tsx
//
// What a pharmacist sees before the prescription: confirm the patient's last
// name and date of birth. Both are things they can read off the person in
// front of them, and neither is in the QR code — so a photographed or
// forwarded code on its own is not enough to open the record.
'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck } from 'lucide-react';

export type PharmacyGateError =
    | { kind: 'rejected' }
    | { kind: 'throttled'; retryAfterMs: number };

interface PharmacyIdentityGateProps {
    error: PharmacyGateError | null;
    submitting: boolean;
    networkError: string | null;
    onSubmit: (lastName: string, dob: string) => void;
}

function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export const PharmacyIdentityGate: React.FC<PharmacyIdentityGateProps> = ({
    error,
    submitting,
    networkError,
    onSubmit,
}) => {
    const [lastName, setLastName] = useState('');
    const [dob, setDob] = useState('');
    const [remainingMs, setRemainingMs] = useState(0);

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
    const canSubmit = !!lastName.trim() && !!dob && !submitting && !throttled;

    return (
        <Card className="w-full max-w-md mx-auto">
            <CardHeader className="flex flex-row items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <CardTitle>Verify the patient</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Enter the patient&apos;s last name and date of birth to open this
                    prescription.
                </p>

                <form
                    onSubmit={(event) => {
                        event.preventDefault();
                        if (canSubmit) onSubmit(lastName.trim(), dob);
                    }}
                    className="space-y-4"
                >
                    <div className="space-y-2">
                        <Label htmlFor="pharmacy-last-name">Last name</Label>
                        <input
                            id="pharmacy-last-name"
                            type="text"
                            autoComplete="off"
                            value={lastName}
                            onChange={(event) => setLastName(event.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pharmacy-dob">Date of birth</Label>
                        <input
                            id="pharmacy-dob"
                            type="date"
                            value={dob}
                            onChange={(event) => setDob(event.target.value)}
                            className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                        />
                    </div>

                    {error?.kind === 'rejected' && (
                        <p role="alert" className="text-sm text-destructive">
                            Those details do not match this prescription.
                        </p>
                    )}

                    {throttled && (
                        <p role="alert" className="text-sm text-destructive">
                            Too many attempts. Try again in {formatCountdown(remainingMs)}.
                        </p>
                    )}

                    {networkError && (
                        <p role="alert" className="text-sm text-destructive">
                            {networkError}
                        </p>
                    )}

                    <Button type="submit" variant="default" className="w-full" disabled={!canSubmit}>
                        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Open prescription
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
};

export default PharmacyIdentityGate;
