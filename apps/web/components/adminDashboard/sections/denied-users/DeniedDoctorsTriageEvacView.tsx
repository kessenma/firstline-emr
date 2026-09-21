// apps/web/components/auth/adminDashboard/sections/DeniedDoctorsTriageEvacView.tsx

'use client';

import React, { useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, CheckSquare, UserRoundPlus } from "lucide-react";
import InfiniteScroll from '@/components/ui/infiniteScroll';
import { Table } from "@/components/ui/Table/Table";
import { useDeniedDoctorsAndTriageViewModel, User } from './DeniedDoctorsTriageEvacViewModel';
import { useSession } from 'next-auth/react';
import {TableColumn} from "@/components/ui/Table/types";

export default function DeniedDoctorsTriageEvacView() {
    const {
        deniedUsers,
        loadingDeniedUsers,
        hasMoreDeniedUsers,
        nextDeniedUsers,
        selectedUsers,
        handleCheckboxChange,
        handleReApproveUsers,
        isCountryVisible,
        isDoctorSpecialtyVisible,
        toggleCountryVisibility,
        toggleDoctorSpecialtyVisibility,
    } = useDeniedDoctorsAndTriageViewModel();

    useEffect(() => {
        console.log("Denied Users Data:", deniedUsers);
    }, [deniedUsers]);

    const toggleSelectUser = (userId: string) => {
        handleCheckboxChange(userId);
    };

    const columns: TableColumn<User>[] = [
        {
            key: 'select',
            header: '',
            render: (_: any, user: User) => (
                <Checkbox
                    checked={selectedUsers.includes(user._id?.toString() || '')}
                    onCheckedChange={() => toggleSelectUser(user._id?.toString() || '')}
                />
            ),
        },
        { key: 'firstName', header: 'First Name', width: 'w-1/4' },
        { key: 'lastName', header: 'Last Name', width: 'w-1/4' },
        { key: 'email', header: 'Email', width: 'w-1/4' },
        { key: 'accountType', header: 'User Type', width: 'w-1/4' },
        {
            key: 'denialDate',
            header: 'Denial Date',
            width: 'w-1/4',
            render: (value: string) => (value ? new Date(value).toLocaleDateString() : 'N/A')
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (_: any, user: User) => (
                <Button
                    variant="outline"
                    size="icon"
                    onClick={() => handleReApproveUsers([user._id?.toString() || ''])}
                >
                    <UserRoundPlus className="w-5 h-5" />
                </Button>
            ),
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

    const { data: session } = useSession();
    useEffect(() => {
        if (session) {
            console.log("Session Data:", session);
        } else {
            console.log("No session data found");
        }
    }, [session]);

    return (
        <div className="space-y-4">
            <div className="flex justify-end mb-4 space-x-2">
                <Button
                    onClick={toggleCountryVisibility}
                    variant="outline"
                >
                    {isCountryVisible ? 'Hide Country' : 'Show Country'}
                </Button>
                <Button
                    onClick={toggleDoctorSpecialtyVisibility}
                    variant="outline"
                >
                    {isDoctorSpecialtyVisible ? 'Hide Doctor Specialty' : 'Show Doctor Specialty'}
                </Button>
            </div>
            <InfiniteScroll
                dataLength={deniedUsers.length}
                next={nextDeniedUsers}
                hasMore={!!hasMoreDeniedUsers}
                isLoading={loadingDeniedUsers}
            >
                <Table
                    data={deniedUsers}
                    columns={columns}
                    onRowClick={(item) => console.log('Clicked user:', item)}
                    backgroundColor="card"
                    textColor="foreground"
                    borderColor="border"
                    headerBackgroundColor="card"
                    headerTextColor="muted-foreground"
                    hoverBackgroundColor="muted"
                    hoverTextColor="foreground"
                    stickyHeader={true}
                />
            </InfiniteScroll>

            {loadingDeniedUsers && (
                <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-foreground"/>
                </div>
            )}

            {!hasMoreDeniedUsers && deniedUsers.length > 0 && (
                <p className="text-center py-4">No more denied users to load.</p>
            )}

            {deniedUsers.length === 0 && !loadingDeniedUsers && (
                <p className="text-center py-4">No Denied Users found.</p>
            )}

            {selectedUsers.length > 0 && (
                <div className="flex justify-center mt-6">
                    <Button
                        onClick={() => handleReApproveUsers()}
                        variant="submit"
                    >
                        <CheckSquare className="w-5 h-5 mr-2"/> Re-Approve Selected
                    </Button>
                </div>
            )}
        </div>
    );
}
