// apps/web/components/patient-dashboard/followUps/FollowUpsTable.tsx
"use client"

import type React from "react"
import { Table } from "@/components/ui/Table/Table"
import { TableSkeleton } from "@/components/ui/Table/TableSkeleton"
import { useFollowUpsViewModel } from "./FollowUpsViewModel"
import type { TableColumn } from "@/components/ui/Table/types"
import { Button } from "@/components/ui/button"
import { RefreshCw } from "lucide-react"
import { ChatIdCell } from "./../cells/ChatIdCell"

export const FollowUpsTable: React.FC = () => {
    const { followUps, isLoading, error, refetch } = useFollowUpsViewModel()

    // Define columns for the follow-ups table
    const columns: TableColumn<any>[] = [
        {
            key: "chatId",
            header: "Telegram Chat ID",
            render: (value: string) => <ChatIdCell chatId={value} />,
        },
        {
            key: "message",
            header: "Message",
        },
        {
            key: "followUpSentAt",
            header: "Follow-Up Sent At",
        },
    ]

    if (error) {
        return <div className="p-4 text-destructive">Error: {error}</div>
    }

    if (isLoading) {
        return <TableSkeleton rowCount={8} columnCount={3} />
    }

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Patient Follow-Ups</h2>
                <Button onClick={refetch} variant="outline" className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>
            <Table
                data={followUps}
                columns={columns}
                backgroundColor="white"
                borderColor="gray-200"
                stickyHeader={true}
                headerBackgroundColor={"darkBlue"}
                headerTextColor={"white"}
            />
        </div>
    )
}

export default FollowUpsTable
