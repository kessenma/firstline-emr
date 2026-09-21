// apps/web/components/rxQrCode/PatientRxView.tsx
'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { usePatientViewModel, prescriptionColumns } from './PatientRxViewModel';
import { AccessCodeGate, AccessLockedCard } from './AccessCodeGate';
import PatientCancelSection from './PatientCancelSection';
import {
    hasPharmacyQrCode,
    describePrescriptionCancellation,
    getPatientRxTranslator,
    isRtlLanguage,
    type PatientRxTranslationKey,
} from '@fajr/shared/medications';
import { Languages, LanguagesList, normalizeLanguage } from '@fajr/shared/constants/languages';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table } from "@/components/ui/Table/Table";
import { Dialog, DialogContent, DialogDescription, DialogTrigger, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Expand, ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {cn} from "@/lib/utils";

interface QRCodeDisplayProps {
    uuid: string;
}

/** Each language names itself in its own script, via the shared table. */
const LANGUAGE_LABEL_KEY: Record<Languages, PatientRxTranslationKey> = {
    [Languages.ENGLISH]: 'english',
    [Languages.ARABIC]: 'arabic',
    [Languages.PASHTO]: 'pashto',
    [Languages.FARSI]: 'farsi',
    [Languages.TURKISH]: 'turkish',
    [Languages.URDU]: 'urdu',
    [Languages.SPANISH]: 'spanish',
    [Languages.FRENCH]: 'french',
};

const PatientRxView: React.FC<QRCodeDisplayProps> = ({ uuid }) => {
    const {
        rxOrder,
        gate,
        submitCode,
        submitting,
        error,
        cancelled,
        cancelling,
        cancelError,
        cancelPrescription,
    } = usePatientViewModel(uuid);
    // The message that carried this link appended ?lang=, so the page opens in
    // the language the patient was written to in. normalizeLanguage falls back
    // to English for anything unrecognised, and the picker still overrides.
    const searchParams = useSearchParams();
    const [language, setLanguage] = useState<Languages>(() =>
        normalizeLanguage(searchParams?.get('lang')),
    );
    const [isAccordionOpen, setIsAccordionOpen] = useState(false);

    const t = getPatientRxTranslator(language);
    const dir = isRtlLanguage(language) ? 'rtl' : 'ltr';

    // A dispensed prescription has no QR *by design* — the patient PATCH route
    // nulls pharmacyQrCode/pharmacyQrUrl once `submitted` is set, so the code
    // cannot be presented twice. Saying "not available" there reads as a fault.
    const missingQrKey: PatientRxTranslationKey = rxOrder?.submitted
        ? 'qrCodeDispensed'
        : 'qrCodeNotAvailable';

    // Nullable on the wire, and an order can legitimately carry none.
    const prescriptions = rxOrder?.prescriptions ?? [];

    if (gate.status === 'checking') {
        return (
            <Card className="w-full max-w-4xl mx-auto" dir={dir}>
                <CardHeader>
                    <CardTitle>{t('loading')}</CardTitle>
                </CardHeader>
            </Card>
        );
    }

    if (gate.status === 'locked') {
        return <AccessLockedCard t={t} dir={dir} />;
    }

    // Nothing about the prescription is rendered — or fetched — until the code
    // is entered. Shipping it behind a hidden element would defeat the gate.
    if (gate.status === 'needs-code' || !rxOrder) {
        return (
            <AccessCodeGate
                t={t}
                dir={dir}
                error={gate.status === 'needs-code' ? gate.error : null}
                submitting={submitting}
                networkError={error}
                onSubmit={submitCode}
            />
        );
    }

    return (
        <Card
            dir={dir}
            className={cn(
                "w-full max-w-4xl mx-auto relative z-10",
                isAccordionOpen ? "mb-72" : "mb-8 mt-16"
            )}
            backgroundOpacity={0}
            borderSize={1}
            shadowSize="md"
        >
            <CardHeader className="flex flex-row items-center justify-between">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="default">
                            {t('selectLanguage')} <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        {LanguagesList.map((option) => (
                            <DropdownMenuItem
                                key={option}
                                onClick={() => setLanguage(option)}
                            >
                                {LANGUAGE_LABEL_KEY[option] ? t(LANGUAGE_LABEL_KEY[option]) : option}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                <div className="flex items-center space-x-4">
                    <Image
                        src="/assets/images/fajr-logo.svg"
                        alt="Mena Health Logo"
                        width={80}
                        height={80}
                        className=""
                    />
                    <CardTitle>{t('prescriptionDetails')}</CardTitle>
                </div>
            </CardHeader>
            <CardContent className="space-y-6">
                {cancelled || describePrescriptionCancellation(rxOrder ?? {}) ? (
                    // Replaces the prescription outright: a cancelled script
                    // must not be presented at a pharmacy, so showing the QR
                    // and the medication list would be actively misleading.
                    <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-center">
                        <p className="font-semibold text-destructive">
                            {t('cancelledTitle')}
                        </p>
                        <p className="mt-1">{t('cancelledBody')}</p>
                    </div>
                ) : rxOrder.rxStatus === 'completed' ? (
                    <div className="text-center bg-accent/10 text-primary p-4 rounded-md border border-primary/20">
                        <p className="font-semibold">{t('rxOrderCompleted')}</p>
                        <p>{t('contactDoctorRefill')}</p>
                    </div>
                ) : (
                    <>
                        <div className="flex justify-center">
                            <div className="relative inline-block">
                                <Dialog>
                                    <DialogTrigger asChild>
                                        <Button
                                            variant="outline"
                                            className="absolute -top-4 -right-4 bg-background text-primary hover:bg-primary hover:text-primary-foreground shadow-md rounded-full p-1 z-10"
                                        >
                                            <Expand className="h-4 w-4"/>
                                            <span className="sr-only">{t('expandQrCode')}</span>
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="sm:max-w-md">
                                        <DialogHeader>
                                            <DialogTitle>{t('qrCode')}</DialogTitle>
                                            <DialogDescription>{t('scanQrCode')}</DialogDescription>
                                        </DialogHeader>
                                        <div className="flex items-center justify-center p-6">
                                            {hasPharmacyQrCode(rxOrder) ? (
                                                <Image
                                                    src={rxOrder.pharmacyQrCode as string}
                                                    alt={t('qrCode')}
                                                    width={300}
                                                    height={300}
                                                    className="max-w-full h-auto"
                                                    unoptimized
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center w-[300px] h-[300px] bg-muted text-muted-foreground text-center p-4">
                                                    {t(missingQrKey)}
                                                </div>
                                            )}
                                        </div>
                                    </DialogContent>
                                </Dialog>

                                {hasPharmacyQrCode(rxOrder) ? (
                                    <Image
                                        src={rxOrder.pharmacyQrCode as string}
                                        alt={t('qrCode')}
                                        width={200}
                                        height={200}
                                        className="border rounded-lg shadow-md"
                                        unoptimized
                                    />
                                ) : (
                                    <div className="w-[200px] h-[200px] flex items-center justify-center text-center p-4 bg-muted text-muted-foreground border rounded-lg shadow-md">
                                        {t(missingQrKey)}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4">
                            {prescriptions.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold mb-2">{t('diagnosis')}</h3>
                                    <div className="border-border p-2 rounded-md border">
                                        <p>{prescriptions[0].diagnosis}</p>
                                    </div>
                                </div>
                            )}
                            <h3 className="text-lg font-semibold mb-2">{t('prescriptions')}</h3>
                            <Table
                                data={prescriptions.map(({diagnosis, ...rest}) => rest)}
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

                        <Accordion
                            type="single"
                            collapsible
                            className="w-full bg-primary text-primary-foreground rounded-2xl px-4"
                            onValueChange={(value) => setIsAccordionOpen(!!value)}
                        >
                            <AccordionItem value="order-details">
                                <AccordionTrigger className="justify-center text-center">
                                    {t('orderDetails')}
                                </AccordionTrigger>
                                <AccordionContent>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-lg">{t('patientInformation')}</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <h5 className="font-semibold border-b pb-1">{t('name')}</h5>
                                                    <p>{rxOrder.patientName || t('notSpecified')}</p>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold border-b pb-1">{t('dateOfBirth')}</h5>
                                                    <p>{rxOrder.patientDob ? new Date(rxOrder.patientDob).toLocaleDateString() : t('notSpecified')}</p>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold border-b pb-1">{t('country')}</h5>
                                                    <p>{rxOrder.patientCountry || t('notSpecified')}</p>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold border-b pb-1">{t('city')}</h5>
                                                    <p>{rxOrder.patientCity || t('notSpecified')}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            <h4 className="font-semibold text-lg">{t('doctorInformation')}</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div>
                                                    <h5 className="font-semibold border-b pb-1">{t('doctorSpecialty')}</h5>
                                                    <p>{rxOrder.doctorSpecialty || t('notSpecified')}</p>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold border-b pb-1">{t('prescribingDoctor')}</h5>
                                                    <p>{rxOrder.prescribingDr || t('notSpecified')}</p>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold border-b pb-1">{t('prescribedDate')}</h5>
                                                    <p>{rxOrder.prescribedDate ? new Date(rxOrder.prescribedDate).toLocaleDateString() : t('notSpecified')}</p>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold border-b pb-1">{t('validTill')}</h5>
                                                    <p>{rxOrder.validTill ? new Date(rxOrder.validTill).toLocaleDateString() : t('notSpecified')}</p>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold border-b pb-1">{t('city')}</h5>
                                                    <p>{rxOrder.city || t('notSpecified')}</p>
                                                </div>
                                                <div>
                                                    <h5 className="font-semibold border-b pb-1">{t('rxStatus')}</h5>
                                                    <p>{rxOrder.rxStatus || t('notSpecified')}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        </Accordion>

                        <PatientCancelSection
                            t={t}
                            language={language}
                            submitting={cancelling}
                            error={cancelError ? t('cancelFailed') : null}
                            onCancel={cancelPrescription}
                        />
                    </>
                )}
            </CardContent>
        </Card>
    );
};

export default PatientRxView;
