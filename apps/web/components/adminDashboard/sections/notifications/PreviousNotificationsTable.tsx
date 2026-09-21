// apps/web/components/adminDashboard/sections/notifications/PreviousNotificationsTable.tsx
import { Table } from "@/components/ui/Table/Table"
import type { TableColumn } from "@/components/ui/Table/types"
import type { Notification } from "@/db/schema/notifications"
import {BarLoader} from "react-spinners";
import React from "react";

interface PreviousNotificationsTableProps {
    notifications: Notification[] | undefined
}

export function PreviousNotificationsTable({ notifications }: PreviousNotificationsTableProps) {
    const columns: TableColumn<Notification>[] = [
        {
            key: "type",
            header: "Type",
            render: (value) => <span>{value as string}</span>,
        },
        {
            key: "message",
            header: "Message",
            render: (value) => <span>{value as string}</span>,
        },
        {
            key: "createdAt",
            header: "Created At",
            render: (value) => <span>{new Date(value as Date).toLocaleString()}</span>,
        },
        {
            key: "emailSent",
            header: "Email Sent",
            render: (value) => (
                <span className={value ? "text-primary" : "text-destructive"}>
                    {value ? "Yes" : "No"}
                </span>
            ),
        },
    ]

    if (!notifications) {
        return <div className="py-8 flex items-center justify-center text-foreground" aria-live="polite">
            <BarLoader color="#9e1a0e"/>
        </div>
    }

    return (
        <Table<Notification>
            data={notifications}
            columns={columns}
            backgroundColor="card"
            textColor="foreground"
            borderColor="border"
            headerBackgroundColor="card"
            headerTextColor="muted-foreground"
            hoverBackgroundColor="muted"
            hoverTextColor="foreground"
            stickyHeader={true}
        />
    )
}
