// apps/web/components/user-profile/UserProfileView.tsx
"use client"

import { useState, useEffect } from "react"
import { FormProvider } from "react-hook-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {Pencil, Settings2, User, X, FileText, Fingerprint, Globe, Clock, Loader2, MessageSquare, ShieldCheck, ChevronDown, ChevronUp, Bell} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum"
import { useUserProfileViewModel, type UserProfileFormValues, type UserProfileViewModel } from "./UserProfileViewModel"
import { useUserProfileAdminViewModel } from "@/components/adminDashboard/sections/userProfileAdminViewModel"
import { UserProfileSkeleton } from "@/components/user-profile/userProfileSkeleton"
import { ProfileHeader } from "./ProfileHeader"
import { ProfileFields } from "./ProfileFields"
import { DoctorSpecialties } from "./DoctorSpecialties"
import { MedicalLicenseModal } from "@/components/adminDashboard/MedicalLicenseModal"
import { ConfirmModal } from "@/components/ui/modal"
import { MedicalLicenseUploadModal } from "@/components/user-profile/MedicalLicenseUploadModal"
import { UserPhotoUploadModal } from "@/components/user-profile/UserPhotoUploadModal"
import { PasskeyManagement } from "./PasskeyManagement"
import { TotpManagement } from "./TotpManagement"
import { AudioRecorderTest } from "./AudioRecorderTest"
import { FeedbackSubmissionModal } from "./FeedbackSubmissionModal"
import { NotificationSettings } from "./NotificationSettings"
import { MyFeedbackList } from "./MyFeedbackList"
import { useMissionJoinRequests } from "./useMissionJoinRequests"
import { MissionInfoSheet } from "./MissionInfoSheet"
import type { MissionUrl, MissionHospital } from "@/db/schema/missions"

interface UserProfileViewProps {
    isAdmin?: boolean
    userId?: string
}

export function UserProfileView({ isAdmin = false, userId }: UserProfileViewProps) {
    const vmUser: UserProfileViewModel = useUserProfileViewModel()
    const vmAdmin: UserProfileViewModel = useUserProfileAdminViewModel(userId)
    const vm: UserProfileViewModel = isAdmin ? vmAdmin : vmUser
    const [isPhotoUploadModalOpen, setIsPhotoUploadModalOpen] = useState(false)
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
    const [isMyFeedbackOpen, setIsMyFeedbackOpen] = useState(false)
    const [is2faExpanded, setIs2faExpanded] = useState(false)
    const [isNotificationsExpanded, setIsNotificationsExpanded] = useState(false)
    const specialties = vm.methods.watch("doctorSpecialty") || []
    const profileMissions = (vm.profile as any)?.missions as string[] | null | undefined

    interface MissionData {
        id: string;
        name: string;
        country: string;
        city: string | null;
        hospitals: MissionHospital[] | null;
        description: string | null;
        status: string;
        startDate: string | null;
        endDate: string | null;
        urls: MissionUrl[] | null;
    }
    const [selectedMissionForInfo, setSelectedMissionForInfo] = useState<MissionData | null>(null)
    const [missionToLeave, setMissionToLeave] = useState<{ id: string; name: string } | null>(null)
    const [isLeavingMission, setIsLeavingMission] = useState(false)
    const joinRequests = useMissionJoinRequests(profileMissions)

    const handleLeaveMission = async () => {
        if (!missionToLeave) return
        setIsLeavingMission(true)
        try {
            const res = await fetch(`/api/missions/${missionToLeave.id}/leave`, { method: "POST" })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.message || "Failed to leave mission")
            }
            // Reload so profile + session reflect the change (same approach as photo upload)
            window.location.reload()
        } catch (err) {
            console.error("Error leaving mission:", err)
            setIsLeavingMission(false)
            setMissionToLeave(null)
        }
    }

    // Fetch missions data from public API
    const [missionsMap, setMissionsMap] = useState<Record<string, MissionData>>({})
    useEffect(() => {
        if (!profileMissions || profileMissions.length === 0) return
        fetch("/api/missions")
            .then((res) => res.ok ? res.json() : { missions: [] })
            .then((data) => {
                const map: Record<string, MissionData> = {}
                for (const m of data.missions || []) {
                    map[m.id] = m
                }
                setMissionsMap(map)
            })
            .catch(() => {})
    }, [profileMissions])

    if (vm.status === "unauthenticated") {
        return <div>Access Denied</div>
    }

    if (vm.status === "error") {
        return <div>Error loading profile.</div>
    }

    if (vm.status === "loading" || !vm.profile) {
        return <UserProfileSkeleton />
    }

    const handlePhotoUploadSuccess = () => {
        // Close modal
        setIsPhotoUploadModalOpen(false);
        // Reload page to reflect changes (simplest way to ensure session and profile are in sync)
        window.location.reload();
    }

    const handleAddSpecialty = () => {
        if (specialties.length < 2) {
            vm.methods.setValue("doctorSpecialty", [...specialties, DoctorSpecialtyList.HAND])
        }
    }

    const handleRemoveSpecialty = (index: number) => {
        const updated = specialties.filter((_, i) => i !== index)
        vm.methods.setValue("doctorSpecialty", updated)
    }

    return (
        <>
        <FormProvider {...vm.methods}>
            <form 
                onSubmit={(e) => {
                    console.log("Form onSubmit triggered");
                    vm.methods.handleSubmit(
                        (data) => {
                            console.log("Validation successful", data);
                            vm.handleSubmit(data);
                        },
                        (errors) => {
                            console.error("Validation failed", errors);
                        }
                    )(e);
                }}
            >
                <Card backgroundOpacity={50} className={`mx-auto w-full max-w-3xl`} backgroundColor="card" shadowSize="lg">
                    <CardHeader className="relative">
                        <CardTitle className="flex gap-2 justify-center items-center text-2xl font-medium text-center text-foreground">
                            {isAdmin ? "User Profile" : ""}
                        </CardTitle>
                        {!vm.isEditing && (
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="absolute top-2 right-2"
                                onClick={vm.handleEdit}
                            >
                                <Pencil className="w-4 h-4 text-primary" />
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent>
                        <ProfileHeader
                            profile={vm.profile}
                            isAdmin={isAdmin}
                            isCopied={vm.isCopied}
                            isEditing={vm.isEditing}
                            onPhotoUploadClick={() => setIsPhotoUploadModalOpen(true)}
                            copyToClipboard={vm.copyToClipboard}
                        />

                        <div className="grid grid-cols-1 gap-4 mt-8 md:grid-cols-2">
                            <ProfileFields
                                profile={vm.profile}
                                isEditing={vm.isEditing}
                                isAdmin={isAdmin}
                                register={vm.methods.register}
                            />

                            {vm.profile.accountType === "Doctor" && (
                            <DoctorSpecialties
                                specialties={specialties}
                                isEditing={vm.isEditing}
                                handleSpecialtyChange={vm.handleSpecialtyChange}
                                handleRemoveSpecialty={handleRemoveSpecialty}
                                handleAddSpecialty={handleAddSpecialty}
                            />
                        )}

                        {/* Missions Section */}
                        {profileMissions && profileMissions.length > 0 && (
                            <div className="md:col-span-2">
                                <div className="flex items-center gap-2 mb-2">
                                    <Globe className="h-5 w-5 text-primary" />
                                    <h3 className="text-lg font-medium text-foreground">My Missions</h3>
                                </div>
                                <p className="text-xs text-muted-foreground mb-2">Click a mission to see team members</p>
                                <div className="flex flex-wrap gap-2">
                                    {profileMissions.map((missionId) => {
                                        const m = missionsMap[missionId]
                                        return (
                                            <span
                                                key={missionId}
                                                className="inline-flex items-center rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => m && setSelectedMissionForInfo(m)}
                                                    className="pl-3 pr-1 py-1 rounded-l-full hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors cursor-pointer"
                                                >
                                                    {m ? `${m.name} (${m.country})` : missionId}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setMissionToLeave({ id: missionId, name: m?.name || missionId })}
                                                    className="pl-1 pr-2 py-1 rounded-r-full hover:text-destructive transition-colors"
                                                    title="Leave mission"
                                                    aria-label={`Leave ${m?.name || "mission"}`}
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Available Missions + Join Requests Section */}
                        {!isAdmin && (
                            <div className="md:col-span-2 mt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <Globe className="h-5 w-5 text-primary" />
                                        <h3 className="text-lg font-medium text-foreground">Available Missions</h3>
                                    </div>
                                    {joinRequests.availableMissions.length > 0 && (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={joinRequests.toggleRequestMode}
                                        >
                                            {joinRequests.isRequestMode ? "Cancel" : "Request to Join"}
                                        </Button>
                                    )}
                                </div>

                                {/* Pending requests as amber badges */}
                                {joinRequests.pendingRequests.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mb-3">
                                        {joinRequests.pendingRequests.map((req) => (
                                            <span
                                                key={req.id}
                                                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                            >
                                                <Clock className="w-3 h-3 mr-1" />
                                                {req.missionName} ({req.missionCountry}) - Pending
                                            </span>
                                        ))}
                                    </div>
                                )}

                                {joinRequests.isLoading ? (
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <Loader2 className="w-4 h-4 animate-spin" /> Loading missions...
                                    </div>
                                ) : joinRequests.availableMissions.length === 0 ? (
                                    <p className="text-sm text-muted-foreground">No available missions to join at this time.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {joinRequests.availableMissions.map((mission) => (
                                            <div
                                                key={mission.id}
                                                className="flex items-center gap-3 p-2 rounded border border-border"
                                            >
                                                {joinRequests.isRequestMode && (
                                                    <Checkbox
                                                        checked={joinRequests.selectedMissionIds.has(mission.id)}
                                                        onCheckedChange={() => joinRequests.toggleMission(mission.id)}
                                                    />
                                                )}
                                                <div className="flex-1">
                                                    <p className="text-sm font-medium">{mission.name}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {mission.country}{mission.city ? `, ${mission.city}` : ""}
                                                    </p>
                                                </div>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    mission.status === "active"
                                                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                                        : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                                                }`}>
                                                    {mission.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {joinRequests.isRequestMode && joinRequests.selectedMissionIds.size > 0 && (
                                    <Button
                                        type="button"
                                        variant="submit"
                                        className="mt-3"
                                        onClick={joinRequests.submitRequests}
                                        disabled={joinRequests.isSubmitting}
                                    >
                                        {joinRequests.isSubmitting ? (
                                            <>
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...
                                            </>
                                        ) : (
                                            `Submit Request (${joinRequests.selectedMissionIds.size})`
                                        )}
                                    </Button>
                                )}
                            </div>
                        )}

                        {/* Medical License Section for Doctors */}
                        {vm.profile.accountType === "Doctor" && (
                            <div className="md:col-span-2">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-lg font-medium text-foreground">Medical License</h3>
                                <div className="flex gap-2">
                                        {(() => {
                                            const hasLicense = Boolean((vm.profile as any)?.medicalLicense) || (((vm.profile as any)?.medicalLicenses || []).length > 0)
                                            return (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={vm.handleViewMedicalLicense}
                                                    className="flex gap-2 items-center"
                                                    disabled={vm.isLoadingLicense || !hasLicense}
                                                    title={hasLicense ? undefined : "Upload your medical license to view"}
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    {vm.isLoadingLicense ? "Loading..." : "View License"}
                                                </Button>
                                            )
                                        })()}
                                        {!isAdmin && (
                                            <Button
                                                type="button"
                                                variant="submit"
                                                onClick={vm.handleOpenMedicalLicenseUploadModal}
                                                className="flex gap-2 items-center"
                                            >
                                                <FileText className="w-4 h-4" />
                                                Upload License
                                            </Button>
                                        )}
                                    </div>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    View or upload your medical license documents
                                </p>
                            </div>
                        )}

                        {/* Manage 2FA Section */}
                        {!isAdmin && (
                            <div className="md:col-span-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIs2faExpanded(prev => !prev)}
                                    className="flex items-center justify-between w-full p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-primary" />
                                        <div className="text-left">
                                            <h3 className="text-lg font-medium text-foreground">Manage 2FA</h3>
                                            <p className="text-sm text-muted-foreground">Passkeys & authenticator app</p>
                                        </div>
                                    </div>
                                    {is2faExpanded ? (
                                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </button>

                                {is2faExpanded && (
                                    <div className="mt-4 space-y-6 pl-2 border-l-2 border-primary/20 ml-2">
                                        {/* Passkey Authentication */}
                                        <div className="pl-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <Fingerprint className="h-5 w-5 text-primary" />
                                                <h3 className="text-lg font-medium text-foreground">Passkey Authentication</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Set up passkeys for faster, more secure sign-in using Face ID, Touch ID, or fingerprint.
                                            </p>
                                            <PasskeyManagement
                                                passkeys={vm.passkeys}
                                                isLoading={vm.isLoadingPasskeys}
                                                error={vm.passkeyError}
                                                isSupported={vm.passkeySupported}
                                                isAdding={vm.isAddingPasskey}
                                                deletingId={vm.deletingPasskeyId}
                                                userEmail={vm.profile.email ?? ""}
                                                onAddPasskey={vm.handleAddPasskey}
                                                onDeletePasskey={vm.handleDeletePasskey}
                                                onClearError={vm.clearPasskeyError}
                                            />
                                        </div>

                                        {/* Authenticator App */}
                                        <div className="pl-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <ShieldCheck className="h-5 w-5 text-primary" />
                                                <h3 className="text-lg font-medium text-foreground">Authenticator App</h3>
                                            </div>
                                            <p className="text-sm text-muted-foreground mb-4">
                                                Use an authenticator app (Microsoft Authenticator, Authy, Google Authenticator) for two-factor authentication.
                                            </p>
                                            <TotpManagement
                                                userEmail={vm.profile.email ?? ""}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Notification Settings Section */}
                        {!isAdmin && (
                            <div className="md:col-span-2 mt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsNotificationsExpanded(prev => !prev)}
                                    className="flex items-center justify-between w-full p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Bell className="h-5 w-5 text-primary" />
                                        <div className="text-left">
                                            <h3 className="text-lg font-medium text-foreground">Notification Settings</h3>
                                            <p className="text-sm text-muted-foreground">Push notifications, quiet hours & preferences</p>
                                        </div>
                                    </div>
                                    {isNotificationsExpanded ? (
                                        <ChevronUp className="h-5 w-5 text-muted-foreground" />
                                    ) : (
                                        <ChevronDown className="h-5 w-5 text-muted-foreground" />
                                    )}
                                </button>

                                {isNotificationsExpanded && (
                                    <div className="mt-4 pl-2 border-l-2 border-primary/20 ml-2">
                                        <div className="pl-4">
                                            <NotificationSettings />
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Feedback & Support Section */}
                        {!isAdmin && (
                            <div className="md:col-span-2 mt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <MessageSquare className="h-5 w-5 text-primary" />
                                    <h3 className="text-lg font-medium text-foreground">Feedback & Support</h3>
                                </div>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Submit bug reports, feature requests, or general feedback. You can attach screenshots and videos.
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant="submit"
                                        onClick={() => setIsFeedbackModalOpen(true)}
                                        className="flex gap-2 items-center"
                                    >
                                        <MessageSquare className="w-4 h-4" />
                                        Submit Feedback
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setIsMyFeedbackOpen(true)}
                                    >
                                        View My Submissions
                                    </Button>
                                </div>
                            </div>
                        )}
                        </div>

                        {vm.isEditing && (
                            <div className="fixed bottom-6 right-4 md:bottom-auto md:top-24 md:right-6 z-40 flex flex-col gap-2 items-end">
                                <Button
                                    type="submit"
                                    variant="submit"
                                    size="lg"
                                    disabled={vm.isLoading}
                                    className="px-8 py-4 shadow-2xl"
                                >
                                    {vm.isLoading ? "Updating..." : "Submit"}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    disabled={vm.isLoading}
                                    onClick={vm.handleCancelEdit}
                                    className="h-8 w-8 rounded-full shadow-lg bg-background mr-1"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </form>
            {/* Medical License Modal */}
            <MedicalLicenseModal
                isOpen={vm.isMedicalLicenseModalOpen}
                onClose={vm.handleCloseMedicalLicenseModal}
                licenses={vm.medicalLicenses}
                userName={`${vm.profile.firstName} ${vm.profile.lastName}`}
                isLoading={vm.isLoadingLicense}
                error={vm.licenseError}
            />

            {/* Medical License Upload Modal */}
            {!isAdmin && vm.profile.accountType === "Doctor" && (
                <MedicalLicenseUploadModal
                    isOpen={vm.isMedicalLicenseUploadModalOpen}
                    onClose={vm.handleCloseMedicalLicenseUploadModal}
                    userId={vm.profile.id}
                    userName={`${vm.profile.firstName} ${vm.profile.lastName}`}
                    onUploadSuccess={vm.handleUploadSuccess}
                />
            )}

            {/* User Photo Upload Modal */}
            <UserPhotoUploadModal
                isOpen={isPhotoUploadModalOpen}
                onClose={() => setIsPhotoUploadModalOpen(false)}
                userId={vm.profile.id}
                userName={`${vm.profile.firstName} ${vm.profile.lastName}`}
                currentPhotoUrl={vm.profile.image}
                onUploadSuccess={handlePhotoUploadSuccess}
            />
            {/* Feedback Submission Modal */}
            <FeedbackSubmissionModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                onSuccess={() => setIsFeedbackModalOpen(false)}
            />

            {/* My Feedback List Modal */}
            <MyFeedbackList
                isOpen={isMyFeedbackOpen}
                onClose={() => setIsMyFeedbackOpen(false)}
            />

            {/* Leave Mission Confirmation */}
            <ConfirmModal
                isOpen={!!missionToLeave}
                onClose={() => setMissionToLeave(null)}
                title="Leave Mission"
                message={`Leave "${missionToLeave?.name}"? You will be removed from its group chat. You can request to rejoin later.`}
                confirmText="Leave Mission"
                confirmVariant="destructive"
                onConfirm={handleLeaveMission}
                isLoading={isLeavingMission}
            />

            {/* Mission Info Sheet */}
            {selectedMissionForInfo && (
                <MissionInfoSheet
                    missionId={selectedMissionForInfo.id}
                    missionName={selectedMissionForInfo.name}
                    description={selectedMissionForInfo.description}
                    country={selectedMissionForInfo.country}
                    city={selectedMissionForInfo.city}
                    hospitals={selectedMissionForInfo.hospitals}
                    status={selectedMissionForInfo.status}
                    startDate={selectedMissionForInfo.startDate}
                    endDate={selectedMissionForInfo.endDate}
                    urls={selectedMissionForInfo.urls}
                    isOpen={!!selectedMissionForInfo}
                    onClose={() => setSelectedMissionForInfo(null)}
                />
            )}
        </FormProvider>

        {!isAdmin && (
            <div className="mx-auto w-full max-w-3xl mt-6">
                <details className="group">
                    <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                        Developer Tools
                    </summary>
                    <div className="mt-4 space-y-4">
                        <AudioRecorderTest />
                    </div>
                </details>
            </div>
        )}
        </>
    )
}
