// apps/web/components/rxQrCode/PharmacyView.tsx

'use client';

import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table } from "@/components/ui/Table/Table";
import {TableColumn} from "@/components/ui/Table/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Skeleton } from "@/components/ui/skeleton"
import { Ban, Loader2 } from 'lucide-react'
import type { RxOrder } from '@/db/schema/patients';

// Import the IRxOrder interface from your patient model
import { TextFormField } from "@/components/ui/TextFormField";
import { PharmacyIdentityGate, type PharmacyGateError } from './PharmacyIdentityGate';
import CancelPrescriptionDialog from '@/components/patient-chart/Medications/rx/CancelPrescriptionDialog';
import { describePrescriptionCancellation } from '@fajr/shared/medications';

const PharmacyView = ({ uuid }: { uuid: string }) => {
    const [rxOrder, setRxOrder] = useState<RxOrder | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [patientId, setPatientId] = useState<string | null>(null);
    const [initialStatus, setInitialStatus] = useState<string | null>(null);
    // The identity gate. `unlocked` starts false and only a successful
    // last-name + DOB check flips it, so nothing about the prescription is
    // fetched until the pharmacist has confirmed who is standing there.
    const [unlocked, setUnlocked] = useState(false);
    const [gateError, setGateError] = useState<PharmacyGateError | null>(null);
    const [gateSubmitting, setGateSubmitting] = useState(false);
    const [gateNetworkError, setGateNetworkError] = useState<string | null>(null);
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelling, setCancelling] = useState(false);

    const cancellation = describePrescriptionCancellation(rxOrder ?? {});
    const isEditable = initialStatus !== 'completed' && !cancellation;
    const isSaveDisabled = !isEditable && rxOrder?.rxStatus !== 'completed';

    // Resumes within the 30-minute cookie window so a reload mid-dispense does
    // not send the pharmacist back to the form. 401 is the expected answer for
    // everyone else, and simply shows the gate.
    useEffect(() => {
        const resume = async () => {
            setLoading(true);
            try {
                const response = await fetch(`/api/rx-order-qr-code/pharmacy/${uuid}`);
                if (response.ok) {
                    const data = await response.json();
                    setRxOrder(data.rxOrder);
                    setInitialStatus(data.rxOrder.rxStatus);
                    setPatientId(data.patientId);
                    setUnlocked(true);
                }
            } catch {
                // Falls through to the gate.
            } finally {
                setLoading(false);
            }
        };

        resume();
    }, [uuid]);

    const submitIdentity = async (lastName: string, dob: string) => {
        setGateSubmitting(true);
        setGateNetworkError(null);

        try {
            const response = await fetch(`/api/rx-order-qr-code/pharmacy/${uuid}/unlock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lastName, dob }),
            });

            if (response.ok) {
                const data = await response.json();
                setRxOrder(data.rxOrder);
                setInitialStatus(data.rxOrder.rxStatus);
                setPatientId(data.patientId);
                setGateError(null);
                setUnlocked(true);
                return;
            }

            if (response.status === 429) {
                const body = await response.json().catch(() => ({}));
                setGateError({
                    kind: 'throttled',
                    retryAfterMs: Number(body?.retryAfterMs) || 0,
                });
                return;
            }

            // One rejection for a wrong name, a wrong date and a prescription
            // that does not exist — the endpoint will not confirm which.
            setGateError({ kind: 'rejected' });
        } catch {
            setGateNetworkError('Could not reach the server. Check your connection.');
        } finally {
            setGateSubmitting(false);
        }
    };

    useEffect(() => {
        if (rxOrder?.rxStatus === 'completed') {
            setSuccessMessage(null);
        }
    }, [rxOrder?.rxStatus]);

    /**
     * Refusing the prescription outright.
     *
     * Distinct from setting rxStatus to "declined", which is inert: it clears
     * no QR, notifies nobody, and the prescribing doctor never sees it. This
     * withdraws the script, kills the QR, messages the patient the reason and
     * tells the whole care team.
     */
    const handleCancel = async (reason: string) => {
        setCancelling(true);
        try {
            const response = await fetch(`/api/rx-order-qr-code/pharmacy/${uuid}/cancel`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });

            if (!response.ok) {
                const body = await response.json().catch(() => ({}));
                throw new Error(body.error || 'Failed to cancel prescription');
            }

            const data = await response.json();
            if (data.rxOrder) setRxOrder(data.rxOrder);
            setCancelOpen(false);
            setSuccessMessage('Prescription cancelled. The patient has been told.');
            setError(null);
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setCancelling(false);
        }
    };

    const handleSave = async () => {
        if (initialStatus === 'completed') {
            setError('This RX order has already been completed and cannot be modified.');
            return;
        }

        if (!rxOrder?.rxDispenserName || !rxOrder.rxDispenserContact) {
            setError('RX dispenser name and contact information are required.');
            return;
        }

        try {
            // A narrow, cookie-gated endpoint rather than PATCH /api/patient/{id}:
            // that route takes the whole patient record and requires a staff
            // session, neither of which suits a pharmacist holding only a name
            // and a date of birth.
            const response = await fetch(`/api/rx-order-qr-code/pharmacy/${uuid}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rxStatus: rxOrder.rxStatus,
                    rxDispenserName: rxOrder.rxDispenserName,
                    rxDispenserContact: rxOrder.rxDispenserContact,
                    partialRxNotes: rxOrder.partialRxNotes,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save RX order');
            }

            const data = await response.json();
            if (data.rxOrder) setRxOrder(data.rxOrder);
            if (rxOrder.rxStatus) {
                setInitialStatus(rxOrder.rxStatus);
            } else {
                setInitialStatus(null);
            }            setSuccessMessage('RX order updated successfully');
            setError(null); // Clear any previous errors
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        }
    };

    const prescriptionColumns: TableColumn<Omit<RxOrder['prescriptions'][0], 'diagnosis'>>[] = [
        { key: 'medication', header: 'Medication' },
        { key: 'dosage', header: 'Dosage' },
        { key: 'frequency', header: 'Frequency' },
    ];

    if (loading) {
        return (
            <Card className="w-full max-w-4xl mx-auto">
                <CardHeader>
                    <CardTitle>
                        <Skeleton className="h-8 w-3/4" />
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-40 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-1/2" />
                </CardContent>
            </Card>
        );
    }

    if (!unlocked || !rxOrder) {
        return (
            <PharmacyIdentityGate
                error={gateError}
                submitting={gateSubmitting}
                networkError={gateNetworkError}
                onSubmit={submitIdentity}
            />
        );
    }

    if (error) return <div className="text-destructive">Error: {error}</div>;

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader>
                <CardTitle>Pharmacist RX View</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Diagnosis and Prescription Info */}
                <div className="space-y-4">
                    {rxOrder.prescriptions.length > 0 && (
                        <div>
                            <Label>Diagnosis</Label>
                            <div className="border-border p-2 rounded-md border-t-2 border-r-2">
                                <p>{rxOrder.prescriptions[0].diagnosis}</p>
                            </div>
                        </div>
                    )}
                    <Table
                        data={rxOrder.prescriptions.map(({ diagnosis, ...rest }) => rest)}
                        columns={prescriptionColumns}
                        backgroundColor="bg-background"
                        textColor="text-foreground"
                        borderColor="border-border"
                        headerBackgroundColor="bg-muted"
                        headerTextColor="text-foreground"
                        hoverBackgroundColor="hover:bg-accent/50"
                        hoverTextColor="hover:text-foreground"
                    />
                </div>

                {/* Administrative Info inside Accordion */}
                <Accordion type="single" collapsible className="w-full bg-primary text-primary-foreground rounded-2xl pl-4 pr-4">
                    <AccordionItem value="admin-details">
                        <AccordionTrigger className=" justify-center text-center">Administrative Details</AccordionTrigger>
                        <AccordionContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Prescribing Doctor</Label>
                                    <div className="border-border p-2 rounded-md border-t-2 border-r-2">
                                        <p>{rxOrder.prescribingDr}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label>Doctor Specialty</Label>
                                    <div className="border-border p-2 rounded-md border-t-2 border-r-2">
                                        <p>{rxOrder.doctorSpecialty}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label>Prescribed Date</Label>
                                    <div className="border-border p-2 rounded-md border-t-2 border-r-2">
                                        <p>{new Date(rxOrder.prescribedDate).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label>Valid Till</Label>
                                    <div className="border-border p-2 rounded-md border-t-2 border-r-2">
                                        <p>{new Date(rxOrder.validTill).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label>City</Label>
                                    <div className="border-border p-2 rounded-md border-t-2 border-r-2">
                                        <p>{rxOrder.city}</p>
                                    </div>
                                </div>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <div className="space-y-4">
                    <div>
                        <Label>RX Status</Label>
                        <Select
                            value={rxOrder?.rxStatus || ''}
                            onValueChange={(value) =>
                                setRxOrder({ ...rxOrder, rxStatus: value as RxOrder['rxStatus'] })
                            }
                            disabled={!isEditable}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select RX Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="not reviewed">Not Reviewed</SelectItem>
                                <SelectItem value="partially filled">Partially Filled</SelectItem>
                                <SelectItem value="declined">Declined</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {rxOrder?.rxStatus === 'partially filled' && (
                        <TextFormField
                            fieldName="partialRxNotes"
                            fieldLabel="Partial RX Notes"
                            multiline
                            rows={3}
                            value={rxOrder?.partialRxNotes || ''}
                            onChange={(e) =>
                                setRxOrder({ ...rxOrder, partialRxNotes: e.target.value })
                            }
                            disabled={!isEditable}
                        />
                    )}
                    <div>
                        <TextFormField
                            fieldName="rxDispenserName"
                            fieldLabel="Name of RX Dispenser"
                            value={rxOrder?.rxDispenserName || ''}
                            onChange={(e) =>
                                setRxOrder({ ...rxOrder, rxDispenserName: e.target.value })
                            }
                            error={
                                !rxOrder?.rxDispenserName && !rxOrder?.submitted
                                    ? 'RX Dispenser Name is required.'
                                    : undefined
                            }
                            readOnly={!isEditable}
                        />
                        <TextFormField
                            fieldName="rxDispenserContact"
                            fieldLabel="RX Dispenser Contact Info"
                            value={rxOrder?.rxDispenserContact || ''}
                            onChange={(e) =>
                                setRxOrder({ ...rxOrder, rxDispenserContact: e.target.value })
                            }
                            error={
                                !rxOrder?.rxDispenserContact && !rxOrder?.submitted
                                    ? 'RX Dispenser Contact Info is required.'
                                    : undefined
                            }
                            readOnly={!isEditable}
                        />
                    </div>
                    {cancellation ? (
                        // Replaces the form outright: a cancelled script must not
                        // be dispensed, so offering the fields at all is wrong.
                        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-center">
                            <p className="flex items-center justify-center gap-2 font-semibold text-destructive">
                                <Ban className="h-4 w-4 shrink-0" />
                                {cancellation.headline}
                            </p>
                            {cancellation.reason && (
                                <p className="mt-1 text-sm text-muted-foreground">
                                    &ldquo;{cancellation.reason}&rdquo;
                                </p>
                            )}
                            <p className="mt-2 text-sm text-muted-foreground">
                                Do not dispense this prescription.
                            </p>
                        </div>
                    ) : (
                        <Button
                            onClick={() => setCancelOpen(true)}
                            className="w-full"
                            variant="outline"
                            disabled={!isEditable || cancelling}
                        >
                            <Ban className="mr-2 h-4 w-4" />
                            Cannot fill — cancel this prescription
                        </Button>
                    )}
                    <Button
                        onClick={handleSave}
                        className="w-full"
                        variant="submit"
                        disabled={
                            isSaveDisabled ||
                            !!cancellation ||
                            !rxOrder?.rxDispenserName ||
                            !rxOrder?.rxDispenserContact
                        }
                        title={
                            isSaveDisabled
                                ? 'RX order has been completed and cannot be edited.'
                                : 'Complete all required fields to save.'
                        }
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            'Save Changes'
                        )}
                    </Button>
                    {successMessage && (
                        <div className="text-primary-foreground bg-primary text-center">
                            {successMessage}
                        </div>
                    )}
                </div>
            </CardContent>
            <CancelPrescriptionDialog
                open={cancelOpen}
                onOpenChange={setCancelOpen}
                role="pharmacist"
                submitting={cancelling}
                onConfirm={handleCancel}
            />
        </Card>
    );
};

export default PharmacyView;
