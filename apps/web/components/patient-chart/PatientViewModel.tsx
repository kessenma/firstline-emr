// apps/web/components/patient-chart/PatientViewModel
import { useState, useEffect, useRef, ComponentType } from 'react';
import { useReactToPrint } from 'react-to-print';
import { useRouter } from 'next/navigation';
import { PatientDashboardProvider, usePatientDashboard } from './PatientViewModelContext';
import { User, FileText, LoaderPinwheel, PanelTopOpen, PillBottle, ImageIcon, VideoIcon, FileDown, SendHorizontal, Loader2, Users } from 'lucide-react';
import PatientInfoView from './patient-info/PatientInfoView';
import { CombinedNotesView } from '@/components/patient-chart/PatientNotes/CombinedNotesView';
import { Skeleton } from '@/components/ui/skeleton';
import MedicationsView from './Medications/MedicationsView';
import ImageGallery from './media-gallery/ImageGallery';
import TelegramMessagesDoctorView from '@/components/patient-chart/telegram-messages/TelegramMessagesDoctorView';
import TelegramLinkCodeCard from '@/components/patient-chart/telegram-messages/TelegramLinkCodeCard';
import { CircleLoader } from 'react-spinners';
import { CareTeamSection } from './care-team/CareTeamSection';
import { CareTeamModal } from './care-team/CareTeamModal';
import { RequestChartAccessModal } from './care-team/RequestChartAccessModal';
import { useSession } from 'next-auth/react';
import { evaluateChartAccess } from '@fajr/shared/care-team';

import { TelegramIcon } from "@/components/icons/TelegramIcon";
import VideoCallView from './videocall/VideoCallView';
import ExportPatientChartView from './export/ExportPatientChartView';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioCard } from '@/components/ui/radio-card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/hooks/useToast';
import AdvancedExportOptions from './export/AdvancedExportOptions';
import { getAnonymizedName } from '@fajr/shared/patient-utils';
import { buildPatientCardPayload, serializePatientCard, getPrimarySpecialty, type RecipientUser } from '@fajr/shared/patient-share';
import { SendPatientRecipientPicker } from './SendPatientRecipientPicker';

type InternalThreadOption = {
    id?: string;
    _id?: string;
    slug?: string;
    title?: string | null;
    displayTitle?: string | null;
    participants?: string[];
    isGroupChat?: boolean;
};

const PatientDashboardContent: React.FC = () => {
    const router = useRouter();
    const { setToast } = useToast();
    const { data: session } = useSession();
    const {
        patientInfo,
        patientViewModel,
        loadingPatientInfo,
        fetchPatientData,
        isExpanded,
        toggleExpand,
    } = usePatientDashboard();

    const [openSections, setOpenSections] = useState<string[]>(['patient-dashboard']);
    const printRef = useRef<HTMLDivElement>(null);
    const prevStateRef = useRef<{ open: string[]; expanded: boolean } | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [exportData, setExportData] = useState<any | null>(null);
    const [exportError, setExportError] = useState<string | null>(null);
    const [exportMode, setExportMode] = useState<'full' | 'anon'>('full');
    const prevTitleRef = useRef<string | null>(null);
    const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
    const [isSendDialogOpen, setIsSendDialogOpen] = useState(false);
    const [isCareTeamModalOpen, setIsCareTeamModalOpen] = useState(false);
    const [isPostSendDialogOpen, setIsPostSendDialogOpen] = useState(false);
    const [threadOptions, setThreadOptions] = useState<InternalThreadOption[]>([]);
    const [threadsLoading, setThreadsLoading] = useState(false);
    const [threadsError, setThreadsError] = useState<string | null>(null);
    const [selectedRecipient, setSelectedRecipient] = useState<RecipientUser | null>(null);
    const [attachMessage, setAttachMessage] = useState('');
    const [isSendingToChat, setIsSendingToChat] = useState(false);
    const [sentThreadPathId, setSentThreadPathId] = useState<string | null>(null);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const patientDetailFieldKeys = ['name','dob','phone','city','country','language','hospital','priority','status','chiefComplaint','diagnosis','icd10','allergies','email'] as const;
    const additionalFieldKeys = ['genderPreference','previouslyRegistered','baselineAmbu','occupation','pmhx','pshx','famhx','smokeCount','drinkCount','otherDrugs','prevMeds','currentMeds','coordinatorId','triagedBy','careTeam'] as const;
    const defaultFieldKeys = [...patientDetailFieldKeys, ...additionalFieldKeys];
    const [selectedSections, setSelectedSections] = useState<string[]>(['patient','specialties','notes','medOrders','rxOrders','telegram','additional']);
    const [selectedFields, setSelectedFields] = useState<string[]>(defaultFieldKeys);

    const labelForField = (key: string) => {
        const map: Record<string, string> = {
            name: 'Name',
            dob: 'DOB',
            phone: 'Phone',
            city: 'City',
            country: 'Country',
            language: 'Language',
            hospital: 'Hospital',
            priority: 'Priority',
            status: 'Status',
            chiefComplaint: 'Chief Complaint',
            diagnosis: 'Diagnosis',
            icd10: 'ICD10',
            allergies: 'Allergies',
            email: 'Email',
            genderPreference: 'Gender Preference',
            previouslyRegistered: 'Previously Registered',
            baselineAmbu: 'Baseline Ambulatory',
            occupation: 'Occupation',
            pmhx: 'PMHx',
            pshx: 'PSHx',
            famhx: 'Family Hx',
            smokeCount: 'Smoke Count',
            drinkCount: 'Drink Count',
            otherDrugs: 'Other Drugs',
            prevMeds: 'Previous Meds',
            currentMeds: 'Current Meds',
            coordinatorId: 'Coordinator',
            triagedBy: 'Triaged By',
            doctor: 'Doctor',
        };
        return map[key] || key;
    };

    const toggleSectionSelect = (key: string) => {
        setSelectedSections(prev => prev.includes(key) ? prev.filter(s => s !== key) : [...prev, key]);
    };
    const toggleFieldSelect = (key: string) => {
        setSelectedFields(prev => prev.includes(key) ? prev.filter(f => f !== key) : [...prev, key]);
    };

    useEffect(() => {
        fetchPatientData();
    }, [fetchPatientData]);

    useEffect(() => {
        if (!isSendDialogOpen) return;
        const fetchInternalThreads = async () => {
            setThreadsLoading(true);
            setThreadsError(null);
            try {
                const res = await fetch('/api/internal-messages', { credentials: 'include' });
                if (!res.ok) {
                    throw new Error('Failed to load internal chats');
                }
                const data = await res.json();
                setThreadOptions(data?.threads || []);
            } catch (err) {
                console.error('Failed loading internal threads:', err);
                setThreadsError(err instanceof Error ? err.message : 'Failed to load internal chats');
            } finally {
                setThreadsLoading(false);
            }
        };

        fetchInternalThreads();
    }, [isSendDialogOpen]);

    const toggleSection = (section: string) => {
        if (openSections.includes(section)) {
            if (section === 'patient-dashboard') {
                toggleExpand();
            } else {
                setOpenSections(prev => prev.filter(s => s !== section));
            }
        } else {
            setOpenSections(prev => [...prev, section]);
        }
    };

    const patientId = patientViewModel?.getPrimaryDetails().patientID?.toString() || '';
    const exportDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

    const renderSectionContent = (section: string) => {
        if (section === 'patient-dashboard') {
            if (!patientViewModel || loadingPatientInfo) {
                return null;
            }
            return isExpanded ? (
                <>
                    <PatientInfoView isExpanded={isExpanded} />
                    <div className="px-4 pb-4">
                        <CareTeamSection patientId={patientId} />
                    </div>
                </>
            ) : null;
        } else if (section === 'notes') {
            return <CombinedNotesView patientId={patientViewModel?.getPrimaryDetails().patientID?.toString() || ''} />;
        } else if (section === 'medications') {
            return <MedicationsView patientId={patientViewModel?.getPrimaryDetails().patientID?.toString() || ''} />;
        } else if (section === 'images') {
            return <ImageGallery />;
        } else if (section === 'contact') {
            return (
                <div className="bg-gradient-to-b from-secondary to-background h-full">
                    {patientInfo?.telegramChatId ? (
                        <TelegramMessagesDoctorView languageUsed={patientInfo.language} telegramChatId={patientInfo.telegramChatId} doctorEmail={patientInfo.doctorEmail ?? ''} />
                    ) : (
                        <TelegramLinkCodeCard
                            patientId={patientInfo?.patientID?.toString() || ''}
                            patientName={patientInfo?.patientName?.trim() || 'this patient'}
                            patientLanguage={patientInfo?.language}
                        />
                    )}
                </div>
            );
        } else if (section === 'video') {
            return <VideoCallView />;
        }
    };

    type Section = {
        id: string;
        icon: ComponentType<any>; // Accepts any component type
        label: string;
        color: string;
        textColor: string;
    };

    const sections: Section[] = [
        {
            id: 'patient-dashboard',
            icon: User,
            label: 'Patient Info',
            color: 'bg-card border border-border',
            textColor: 'text-primary'
        },
        {
            id: 'notes',
            icon: FileText,
            label: 'Notes',
            color: 'bg-card border border-border',
            textColor: 'text-primary'
        },
        {
            id: 'medications',
            icon: PillBottle,
            label: 'Medications',
            color: 'bg-primary',
            textColor: 'text-primary-foreground'
        },
        {
            id: 'images',
            icon: ImageIcon,
            label: 'Media',
            color: 'bg-card border border-border',
            textColor: 'text-primary'
        },
    ];

    const contactSections: Section[] = [
        {
            id: 'contact',
            icon: TelegramIcon,
            label: 'Messaging',
            color: 'bg-secondary',
            textColor: 'text-secondary-foreground'
        },
        {
            id: 'video',
            icon: VideoIcon,
            label: 'Video',
            color: 'bg-accent',
            textColor: 'text-accent-foreground'
        }
    ]

    if (patientInfo?.telegramChatId) {
        sections.push(...contactSections);
    }

    const handleBeforePrint = () => {
        if (isExporting) {
            // For export mode, set a mode-specific document title and skip UI expansion
            prevTitleRef.current = document.title;
            const newTitle = exportMode === 'anon' ? `patient_anon_${exportDate}` : `${patientId || 'patient'}_${exportDate}`;
            document.title = newTitle;
            return Promise.resolve();
        }
        // Save current state
        prevStateRef.current = { open: openSections, expanded: isExpanded };
        // Open all sections and expand patient info before printing
        const allSectionIds = sections.map(s => s.id);
        setOpenSections(allSectionIds);
        if (!isExpanded) {
            toggleExpand();
        }
        // Small delay to allow DOM to update
        return new Promise<void>(resolve => setTimeout(resolve, 300));
    };

    const handleAfterPrint = () => {
        if (isExporting) {
            if (prevTitleRef.current) {
                document.title = prevTitleRef.current;
                prevTitleRef.current = null;
            }
            setIsExporting(false);
            setExportError(null);
            setExportData(null);
            return;
        }
        const prev = prevStateRef.current;
        if (prev) {
            setOpenSections(prev.open);
            if (prev.expanded !== isExpanded) {
                toggleExpand();
            }
            prevStateRef.current = null;
        }
    };

    const triggerPrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${patientId || 'patient'}_${exportDate}`,
        pageStyle: "@page { size: auto; margin: 12mm; }\n* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }",
        onBeforePrint: handleBeforePrint,
        onAfterPrint: handleAfterPrint,
    });

    const handleExportClick = async () => {
        if (!patientId) return;
        setIsExporting(true);
        setExportError(null);
        try {
            const res = await fetch(`/api/patient/${patientId}/export?mode=${exportMode}`, { method: 'GET' });
            if (!res.ok) {
                const text = await res.text();
                throw new Error(text || 'Failed to export data');
            }
            const json = await res.json();
            const payload = {
                ...json,
                included: {
                    sections: selectedSections,
                    fields: selectedFields,
                },
            };
            setExportData(payload);
            // Ensure the export view mounts before printing
            setTimeout(() => {
                triggerPrint();
            }, 0);
        } catch (err: any) {
            console.error('Export failed:', err);
            setExportError(err?.message || 'Export failed');
            setIsExporting(false);
        }
    };

    const getThreadApiId = (thread: InternalThreadOption) => (
        thread.id || thread._id || ''
    );

    const getThreadPathId = (thread: InternalThreadOption) => (
        thread.slug || thread.id || thread._id || ''
    );

    const getThreadLabel = (thread: InternalThreadOption) => {
        const title = (thread.displayTitle || thread.title || '').trim();
        if (title) return title;
        if (thread.isGroupChat) return 'Group Chat';
        return 'Direct Chat';
    };

    const handleSendPatientToChat = async () => {
        if (!selectedRecipient) {
            setThreadsError('Please choose who to send this patient to.');
            return;
        }
        const patient = patientViewModel?.patient;
        const cardPayload = patient ? buildPatientCardPayload(patient) : null;
        if (!cardPayload) {
            setThreadsError('Patient data is still loading. Please try again.');
            return;
        }

        setIsSendingToChat(true);
        setThreadsError(null);
        try {
            // Resolve the chosen person to a DM thread, creating one if they've
            // never been messaged. getOrCreateDirectThread dedupes server-side.
            const dmRes = await fetch('/api/internal-messages/direct', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ participantId: selectedRecipient.id }),
            });
            if (!dmRes.ok) {
                throw new Error('Could not open a chat with that person');
            }
            const { thread } = await dmRes.json();
            const targetId: string = thread?.id;
            if (!targetId) {
                throw new Error('Could not open a chat with that person');
            }

            const cardData = serializePatientCard(cardPayload);

            const sendCardRes = await fetch(`/api/internal-messages/${encodeURIComponent(targetId)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ text: cardData, type: 'patient-card' }),
            });

            if (!sendCardRes.ok) {
                throw new Error('Failed to send patient card');
            }

            const extraMessage = attachMessage.trim();
            if (extraMessage) {
                const sendTextRes = await fetch(`/api/internal-messages/${encodeURIComponent(targetId)}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ text: extraMessage, type: 'text' }),
                });

                if (!sendTextRes.ok) {
                    throw new Error('Patient card sent, but attached message failed to send');
                }
            }

            setToast({
                title: 'Patient sent',
                description: `Patient card was sent to ${[selectedRecipient.firstName, selectedRecipient.lastName].filter(Boolean).join(' ') || selectedRecipient.email}.`,
                variant: 'success',
            });
            setSentThreadPathId(thread?.slug || targetId);
            setIsSendDialogOpen(false);
            setIsPostSendDialogOpen(true);
            setSelectedRecipient(null);
            setAttachMessage('');
        } catch (err) {
            console.error('Failed sending patient to chat:', err);
            setThreadsError(err instanceof Error ? err.message : 'Failed to send patient to chat');
            setToast({
                title: 'Send failed',
                description: err instanceof Error ? err.message : 'Failed to send patient to chat',
                variant: 'destructive',
            });
        } finally {
            setIsSendingToChat(false);
        }
    };

    // Gate the chart itself, not just the links into it. This is the one place
    // that also covers a pasted /patient/{id} URL, browser history, and the
    // "View Chart" buttons on shared patient cards — all of which bypass the
    // dashboard's own gate.
    const chartAccess = evaluateChartAccess({
        accountType: (session?.user as any)?.accountType,
        userId: (session?.user as any)?.id,
        userEmail: session?.user?.email,
        doctorSpecialties: (session?.user as any)?.doctorSpecialty,
        patient: {
            specialties: patientViewModel?.patient?.specialties,
            careTeam: patientViewModel?.patient?.careTeam as any,
        },
    });
    const chartBlocked = !loadingPatientInfo && !!patientViewModel && !chartAccess.allowed;

    if (chartBlocked) {
        return (
            <div className="container mx-auto px-4 py-8 pt-24">
                <RequestChartAccessModal
                    open={true}
                    onOpenChange={(open) => {
                        if (!open) router.push('/patient-dashboard');
                    }}
                    patientId={patientId || ''}
                    patientName={
                        patientViewModel?.patient
                            ? getAnonymizedName(
                                  patientViewModel.patient.firstName,
                                  patientViewModel.patient.lastName,
                              )
                            : undefined
                    }
                    message={chartAccess.message}
                    onGranted={() => fetchPatientData?.()}
                />
            </div>
        );
    }

    return (
        <div ref={printRef} className="container mx-auto px-4 py-8 overflow-hidden pt-24">
            <div className="flex justify-end gap-2 mb-4 print:hidden">
                <button
                    type="button"
                    onClick={() => setIsCareTeamModalOpen(true)}
                    disabled={!patientId || loadingPatientInfo}
                    className="inline-flex items-center px-4 py-2 rounded-md border border-border bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    aria-label="View care team"
                >
                    <Users className="w-5 h-5 mr-2" />
                    Care Team
                </button>
                <button
                    type="button"
                    onClick={() => setIsSendDialogOpen(true)}
                    disabled={!patientId || loadingPatientInfo || isExporting}
                    className="inline-flex items-center px-4 py-2 rounded-md border border-border bg-background text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    aria-label="Send patient card to chat"
                >
                    <SendHorizontal className="w-5 h-5 mr-2" />
                    Send to Chat
                </button>
                <button
                    type="button"
                    onClick={() => setIsExportDialogOpen(true)}
                    disabled={!patientId || loadingPatientInfo}
                    className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    aria-label="Export patient chart as PDF"
                >
                    <FileDown className="w-5 h-5 mr-2" />
                    Export PDF
                </button>
            </div>

            {/* Care Team Modal */}
            <CareTeamModal
                patientId={patientId}
                patientName={patientViewModel?.patient ? getAnonymizedName(patientViewModel.patient.firstName, patientViewModel.patient.lastName) : undefined}
                isOpen={isCareTeamModalOpen}
                onClose={() => setIsCareTeamModalOpen(false)}
            />

            {/* Send To Chat Dialog */}
            <Dialog open={isSendDialogOpen} onOpenChange={(open) => {
                setIsSendDialogOpen(open);
                if (!open) {
                    setThreadsError(null);
                    setSelectedRecipient(null);
                    setAttachMessage('');
                }
            }}>
                <DialogContent size="md">
                    <DialogHeader>
                        <DialogTitle>Send Patient To Chat</DialogTitle>
                        <DialogDescription>
                            Choose who to send this patient to, and optionally add a follow-up message.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        <SendPatientRecipientPicker
                            missionId={patientViewModel?.patient?.missionId}
                            specialty={getPrimarySpecialty(patientViewModel?.patient?.specialties)}
                            selectedUserId={selectedRecipient?.id ?? null}
                            onSelect={setSelectedRecipient}
                            disabled={isSendingToChat}
                        />

                        <div className="space-y-2">
                            <div className="text-sm font-medium text-foreground">Attach Message (Optional)</div>
                            <Textarea
                                value={attachMessage}
                                onChange={(e) => setAttachMessage(e.target.value)}
                                placeholder="Add context after the patient card..."
                                className="min-h-[84px]"
                            />
                        </div>

                        {threadsError && (
                            <div className="text-sm text-destructive">{threadsError}</div>
                        )}
                    </div>

                    <DialogFooter>
                        <button
                            type="button"
                            className="px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            onClick={() => setIsSendDialogOpen(false)}
                            disabled={isSendingToChat}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="inline-flex items-center px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={handleSendPatientToChat}
                            disabled={isSendingToChat || !selectedRecipient}
                        >
                            {isSendingToChat ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Send'
                            )}
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Post-Send Navigation Prompt */}
            <Dialog open={isPostSendDialogOpen} onOpenChange={setIsPostSendDialogOpen}>
                <DialogContent size="sm">
                    <DialogHeader>
                        <DialogTitle>Patient Sent</DialogTitle>
                        <DialogDescription>
                            Do you want to go to that chat now or stay on this patient chart?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <button
                            type="button"
                            className="px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            onClick={() => setIsPostSendDialogOpen(false)}
                        >
                            Stay on Chart
                        </button>
                        <button
                            type="button"
                            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={!sentThreadPathId}
                            onClick={() => {
                                if (!sentThreadPathId) return;
                                setIsPostSendDialogOpen(false);
                                router.push(`/messages/${encodeURIComponent(sentThreadPathId)}`);
                            }}
                        >
                            Go to Chat
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Export Mode Dialog */}
            <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
                <DialogContent size="md">
                    <DialogHeader>
                        <DialogTitle>Export Patient Chart</DialogTitle>
                        <DialogDescription>Select export mode and continue.</DialogDescription>
                    </DialogHeader>
                    <RadioCard.Root value={exportMode} onValueChange={(v) => setExportMode(v as 'full' | 'anon')} className="gap-3">
                        <RadioCard.Item value="full">
                            <div className="space-y-1">
                                <div className="text-sm font-medium">Full export</div>
                                <div className="text-xs text-muted-foreground">Includes patient name, phone, and email.</div>
                            </div>
                        </RadioCard.Item>
                        <RadioCard.Item value="anon">
                            <div className="space-y-1">
                                <div className="text-sm font-medium">Anonymous export</div>
                                <div className="text-xs text-muted-foreground">Masks identity: only initials, no phone or email.</div>
                            </div>
                        </RadioCard.Item>
                    </RadioCard.Root>
                    <div className="mt-3">
                        <button
                            type="button"
                            className="text-sm text-primary hover:underline"
                            aria-expanded={advancedOpen}
                            onClick={() => setAdvancedOpen((v) => !v)}
                        >
                            {advancedOpen ? 'Hide advanced options' : 'Advanced options'}
                        </button>
                        {advancedOpen && (
                            <AdvancedExportOptions
                                selectedSections={selectedSections}
                                selectedFields={selectedFields}
                                toggleSectionSelect={toggleSectionSelect}
                                toggleFieldSelect={toggleFieldSelect}
                            />
                        )}
                    </div>
                    <DialogFooter>
                        <button
                            type="button"
                            className="px-4 py-2 rounded-md border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                            onClick={() => setIsExportDialogOpen(false)}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => { setIsExportDialogOpen(false); handleExportClick(); }}
                        >
                            Continue
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {isExporting ? (
                <div className="bg-background rounded-lg shadow-md overflow-hidden">
                    {exportError ? (
                        <div className="p-4 text-destructive">{exportError}</div>
                    ) : (
                        <ExportPatientChartView data={exportData} exportDateISO={new Date().toISOString()} />
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {sections.map((section) => (
                        <div key={section.id} className="bg-card rounded-lg shadow-md overflow-hidden border border-border">
                            <div
                                className={`flex justify-between items-center cursor-pointer p-4 ${section.color}`}
                                onClick={() => toggleSection(section.id)}
                            >
                                <div className="flex items-center">
                                    {section.id === 'patient-dashboard' && loadingPatientInfo ? (
                                        <LoaderPinwheel className={`w-6 h-6 mr-2 ${section.textColor} animate-spin`} />
                                    ) : (
                                        <section.icon className={`w-6 h-6 mr-2 ${section.textColor}`} />
                                    )}
                                    <h2 className={`text-2xl font-semibold ${section.textColor}`}>
                                        {section.id === 'patient-dashboard' ? (
                                            !patientViewModel || loadingPatientInfo ? (
                                                <Skeleton className="w-32 h-8" />
                                            ) : (
                                                patientViewModel.getPrimaryDetails()?.patientName || "Patient Info"
                                            )
                                        ) : (
                                            section.label
                                        )}
                                    </h2>
                                </div>
                                <span
                                    className={`transform transition-transform ${
                                        openSections.includes(section.id) ? 'rotate-180' : ''
                                    } ${section.textColor}`}
                                >
                                    <PanelTopOpen />
                                </span>
                            </div>
                            {openSections.includes(section.id) && (
                                <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'border-t border-border' : ''}`}>
                                    <div className={`p-0 bg-transparent`}>
                                        {renderSectionContent(section.id)}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const PatientViewModel: React.FC = () => (
    <PatientDashboardProvider>
        <PatientDashboardContent />
    </PatientDashboardProvider>
);

export default PatientViewModel;
