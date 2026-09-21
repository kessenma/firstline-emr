// apps/web/components/auth/adminDashboard/sections/ExistingDoctorsTriageEvacView.tsx
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Minus, Edit, Search, X, Download, Mail, FileText, Globe } from 'lucide-react';
import { RoleIcon } from "@/components/ui/RoleIcon";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/Table/Table";
import { TableColumn } from "@/components/ui/Table/types";
import { Input } from "@/components/ui/input";
import { useExistingDoctorsAndTriageViewModel, User } from './ExistingDoctorsTriageEvacViewModel';
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UserProfileView } from "@/components/user-profile/UserProfileView";
import { UserProfileLogViewer } from "@/components/user-profile/UserProfileLogViewer";
import { UserCallHistory } from "@/components/user-profile/UserCallHistory";
import { UserEditLogsView } from "@/components/adminDashboard/sections/existing-users/UserEditLogsView";
import { CallLogsView } from "@/components/adminDashboard/sections/existing-users/CallLogsView";
import {UserProfileProvider} from "@/components/user-profile/UserProfileContext";
import { PendingAdminCreatedUsers } from '../../shared/PendingAdminCreatedUsers';
import { AdminCreatedUsers } from '../../shared/adminCreatedUsers';
import { MedicalLicenseModal } from '@/components/adminDashboard/MedicalLicenseModal';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/components/hooks/useToast';


export default function ExistingDoctorsTriageEvacView() {
    const {
        existingUsers,
        searchedUsers,
        loadingExistingUsers,
        handleMoveToDenied,
        isCountryVisible,
        isDoctorSpecialtyVisible,
        toggleCountryVisibility,
        toggleDoctorSpecialtyVisibility,
        searchTerm,
        setSearchTerm,
        exportToCSV,
    } = useExistingDoctorsAndTriageViewModel();

    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [isLogsExpanded, setIsLogsExpanded] = useState(false);
    const [isCallLogsExpanded, setIsCallLogsExpanded] = useState(false);

    // Mission assignment state
    const [isMissionDialogOpen, setIsMissionDialogOpen] = useState(false);
    const [missionTargetUser, setMissionTargetUser] = useState<User | null>(null);
    const [selectedMissionForAssign, setSelectedMissionForAssign] = useState('');
    const { data: session } = useSession();
    const { setToast, api } = useToast();

    const { data: missionsData } = useQuery({
        queryKey: ['missions-for-assign'],
        queryFn: async () => {
            const res = await fetch('/api/admin/GET/missions', {
                headers: { Authorization: `Bearer ${session?.user.token}` },
            });
            if (!res.ok) throw new Error('Failed to fetch missions');
            const result = await res.json();
            return result.missions as Array<{ id: string; name: string; country: string }>;
        },
        enabled: !!session?.user.token,
    });

    const handleAssignMission = async () => {
        if (!missionTargetUser || !selectedMissionForAssign) return;
        const userId = missionTargetUser._id?.toString() || (missionTargetUser as any).id?.toString();
        if (!userId) return;

        try {
            await api.post('/api/admin/POST/assign-mission-members', {
                missionId: selectedMissionForAssign,
                userIds: [userId],
                action: 'add',
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.user.token}`,
                },
            });
            setToast?.({ title: 'Success', description: 'Mission assigned successfully.', variant: 'default' });
            setIsMissionDialogOpen(false);
            setMissionTargetUser(null);
            setSelectedMissionForAssign('');
        } catch (error) {
            console.error('Error assigning mission:', error);
            setToast?.({ title: 'Error', description: 'Failed to assign mission.', variant: 'destructive' });
        }
    };

    // Medical License Modal state
    const [selectedUserForLicense, setSelectedUserForLicense] = useState<User | null>(null);
    const [isMedicalLicenseModalOpen, setIsMedicalLicenseModalOpen] = useState(false);
    const [medicalLicenses, setMedicalLicenses] = useState<any[]>([]);
    const [isLoadingLicense, setIsLoadingLicense] = useState(false);
    const [licenseError, setLicenseError] = useState<string | null>(null);

    // Medical License handling functions
    const handleViewMedicalLicense = async (user: User) => {
        if (!user._id) return;

        setSelectedUserForLicense(user);
        setIsLoadingLicense(true);
        setLicenseError(null);
        setIsMedicalLicenseModalOpen(true);

        try {
            const response = await fetch(`/api/admin/get-medical-license?userId=${user._id}`, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch medical license: ${response.status}`);
            }

            const data = await response.json();
            
            // Transform the response to match our MedicalLicense interface
            const licenses: any[] = [];
            
            if (data.medicalLicenseUrl) {
                licenses.push({
                    specialty: 'General',
                    signedUrl: data.medicalLicenseUrl,
                    uploadedAt: data.uploadedAt ? new Date(data.uploadedAt) : undefined,
                    mimeType: data.mimeType,
                });
            }

            if (data.medicalLicenses && Array.isArray(data.medicalLicenses)) {
                data.medicalLicenses.forEach((license: any) => {
                    licenses.push({
                        specialty: license.specialty || 'General',
                        signedUrl: license.signedUrl,
                        uploadedAt: license.uploadedAt ? new Date(license.uploadedAt) : undefined,
                        mimeType: license.mimeType,
                    });
                });
            }

            setMedicalLicenses(licenses);
        } catch (error) {
            console.error('Error fetching medical license:', error);
            setLicenseError(error instanceof Error ? error.message : 'Failed to load medical license');
        } finally {
            setIsLoadingLicense(false);
        }
    };

    const handleCloseMedicalLicenseModal = () => {
        setIsMedicalLicenseModalOpen(false);
        setSelectedUserForLicense(null);
        setMedicalLicenses([]);
        setLicenseError(null);
    };

    const columns: TableColumn<User>[] = [
        {
            key: 'name',
            header: 'Name',
            render: (value: any, user: User) => `${user?.firstName || ''} ${user?.lastName || ''}`
        },
        {
            key: 'email',
            header: 'Email',
            render: (value: string) => (
                <div className="flex items-center">
                    <span className="truncate max-w-[150px] sm:max-w-none">{value}</span>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="ml-2"
                        onClick={() => setSearchTerm(value)}
                    >
                        <Search className="w-4 h-4" />
                    </Button>
                </div>
            )
        },
        {
            key: 'accountType',
            header: 'User Type',
            render: (_: any, user: User) => (
                <div className="flex items-center gap-1.5">
                    <RoleIcon accountType={user.accountType} className="w-4 h-4 shrink-0" />
                    <span>{user.accountType}</span>
                </div>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (_: any, user: User) => (
                <div className="flex space-x-2">
                    <Button
                        onClick={() => handleMoveToDenied(user._id?.toString() || '')}
                        variant="outline"
                        size="sm"
                    >
                        <Minus className="w-4 h-4" />
                    </Button>
                    <Button
                        onClick={() => setEditingUser(user)}
                        variant="outline"
                        size="sm"
                    >
                        <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                        onClick={() => {
                            setMissionTargetUser(user);
                            setSelectedMissionForAssign('');
                            setIsMissionDialogOpen(true);
                        }}
                        variant="outline"
                        size="sm"
                        title="Assign Mission"
                    >
                        <Globe className="w-4 h-4" />
                    </Button>
                    {user?.accountType === 'Doctor' && (
                        <Button
                            onClick={() => handleViewMedicalLicense(user)}
                            variant="outline"
                            size="sm"
                            title="View Medical License"
                        >
                            <FileText className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            )
        },
        {
            key: 'approvalDate',
            header: 'Approval Date',
            render: (value: string | undefined) => value ? new Date(value).toLocaleDateString() : 'N/A'
        },
        {
            key: 'doctorSpecialty',
            header: 'Doctor Specialty',
            hidden: !isDoctorSpecialtyVisible,
            render: (value: string | undefined) => value || 'N/A'
        },
        {
            key: 'countries',
            header: 'Country',
            hidden: !isCountryVisible,
            render: (value: string[] | undefined) => value?.join(', ') || 'N/A'
        }
    ];

    // Handle scroll to bottom when logs are expanded
    useEffect(() => {
        if (isLogsExpanded) {
            window.scrollTo({
                top: document.body.scrollHeight,
                behavior: 'smooth'
            });
        }
    }, [isLogsExpanded]);

    // Callback to refresh data when pending users are updated
    const handleUserUpdate = React.useCallback(() => {
        // This can be used to refresh any local data if needed
        console.log('Pending users updated');
    }, []);

    return (
        <div className="container flex flex-col px-4 py-8 mx-auto min-h-screen">
            {/* Only show header and search when logs are not expanded */}
            {!isLogsExpanded && (
                <div className="flex flex-col mb-4 space-y-4 sm:flex-row sm:justify-between sm:space-y-0">
                    <div className="relative w-full sm:w-64">
                        <Input
                            type="text"
                            placeholder="Search by email"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                            className={`w-full pr-10 ${
                                isSearchFocused ? 'absolute right-0 left-0 z-10' : ''}`}
                        />
                        {searchTerm && (
                            <Button
                                onClick={() => setSearchTerm('')}
                                variant="ghost"
                                size="sm"
                                className="absolute right-2 top-1/2 transform -translate-y-1/2"
                            >
                                <X className="w-4 h-4"/>
                            </Button>
                        )}
                    </div>
                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                        <Button
                            onClick={toggleCountryVisibility}
                            variant="ghost"
                            className="w-full sm:w-auto"
                        >
                            {isCountryVisible ? 'Hide Country' : 'Show Country'}
                        </Button>
                        <Button
                            onClick={toggleDoctorSpecialtyVisibility}
                            variant="ghost"
                            className="w-full sm:w-auto"
                        >
                            {isDoctorSpecialtyVisible ? 'Hide Doctor Specialty' : 'Show Doctor Specialty'}
                        </Button>
                        <Button
                            onClick={exportToCSV}
                            variant="outline"
                            className="w-full sm:w-auto"
                        >
                            <Download className="mr-2 w-4 h-4"/>
                            Export CSV
                        </Button>
                    </div>
                </div>
            )}

            {/* Only show table when logs are not expanded */}
            {!isLogsExpanded && (
                <div className="overflow-x-auto w-full">
                    {loadingExistingUsers ? (
                        <div className="py-4 text-center bg-card text-foreground">Loading users...</div>
                    ) : existingUsers.length > 0 ? (
                        <Table
                            data={searchTerm ? searchedUsers : existingUsers}
                            columns={columns}
                            backgroundColor="background"
                            textColor="foreground"
                            borderColor="border"
                            headerBackgroundColor="muted"
                            headerTextColor="muted-foreground"
                            hoverBackgroundColor="muted/50"
                            hoverTextColor="foreground"
                            stickyHeader={true}
                        />
                    ) : (
                        <div className="py-4 text-center bg-card text-foreground">
                            No existing users found.
                        </div>
                    )}
                </div>
            )}
   {/* Pending Users Section */}
            <PendingAdminCreatedUsers
                 onUserUpdate={handleUserUpdate}
             />

            {/* Admin Created Users Section */}
            <AdminCreatedUsers />

            {editingUser && (
                <Dialog
                    open={!!editingUser}
                    onOpenChange={(open) => {
                        if (!open) setEditingUser(null);
                    }}
                >
                    <DialogContent>
                        <DialogTitle className={'text-center text-foreground'}>
                            {`Admin Edit: ${editingUser?.firstName || ''} ${editingUser?.lastName || ''}`}
                        </DialogTitle>
                        <UserProfileProvider>
                            <UserProfileView
                                isAdmin={true}
                                userId={editingUser._id?.toString() || (editingUser as any).id?.toString() || ''}
                                key={editingUser._id?.toString() || (editingUser as any).id?.toString() || 'editing-user'}
                            />
                        <UserProfileLogViewer userId={editingUser._id?.toString() || (editingUser as any).id?.toString() || ''} className="mt-8"/>
                        <UserCallHistory userId={editingUser._id?.toString() || (editingUser as any).id?.toString() || ''} className="mt-4"/>
                        </UserProfileProvider>
                    </DialogContent>
                </Dialog>
            )}

            {/* User Edit Logs Accordion */}
            <div className={`${isLogsExpanded ? "mt-4" : "mt-auto mb-12"}`}>
                <UserEditLogsView onExpandChange={setIsLogsExpanded}/>
            </div>

            {/* Staff Call Logs — same accordion precedent as UserEditLogsView,
                which is why neither needs a sectionRegistry entry. */}
            <div className="mt-4">
                <CallLogsView onExpandChange={setIsCallLogsExpanded}/>
            </div>

            {/* Add extra space at the bottom to prevent cut-off */}
            {isLogsExpanded && <div className="h-24"></div>}

            {/* Assign Mission Dialog */}
            <Dialog open={isMissionDialogOpen} onOpenChange={setIsMissionDialogOpen}>
                <DialogContent className="shadow-sm max-w-sm">
                    <DialogHeader>
                        <DialogTitle>
                            Assign Mission to {missionTargetUser?.firstName} {missionTargetUser?.lastName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Select value={selectedMissionForAssign} onValueChange={setSelectedMissionForAssign}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a mission" />
                            </SelectTrigger>
                            <SelectContent>
                                {(missionsData || []).map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                        {m.name} ({m.country})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={handleAssignMission}
                            disabled={!selectedMissionForAssign}
                            className="w-full"
                        >
                            Assign Mission
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Medical License Modal */}
            <MedicalLicenseModal
                isOpen={isMedicalLicenseModalOpen}
                onClose={handleCloseMedicalLicenseModal}
                licenses={medicalLicenses}
                userName={selectedUserForLicense ? `${selectedUserForLicense.firstName} ${selectedUserForLicense.lastName}` : ''}
                isLoading={isLoadingLicense}
                error={licenseError}
            />
        </div>
    );
}
