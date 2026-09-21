// apps/web/components/patient-dashboard/followUps/FollowUpsView.tsx
"use client"

import type React from "react"
import { TableSkeleton } from "@/components/ui/Table/TableSkeleton"
import { useFollowUpsViewModel } from "./FollowUpsViewModel"
import { FollowUpDateCell } from "./../cells/FollowUpDateCell"
import { FollowUpMessageCell } from "./../cells/FollowUpMessageCell"
import { ChatIdCell } from "./../cells/ChatIdCell"

const FollowUpsView: React.FC = () => {
    const { followUps, isLoading, error } = useFollowUpsViewModel()

    if (error) {
        return <div className="p-4 text-destructive">Error: {error}</div>
    }

    if (isLoading) {
        return <TableSkeleton rowCount={8} columnCount={5} />
    }

    return (
        <div className="p-4">

            <div className="overflow-x-auto rounded-lg border border-border">
                <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted">
                        <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Chat ID
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Message
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Follow-Up Sent At
                        </th>
                        </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                    {followUps.length === 0 ? (
                        <tr>
                            <td colSpan={3} className="px-6 py-4 text-center text-sm text-muted-foreground">
                                No follow-ups found
                            </td>
                        </tr>
                    ) : (
                        followUps.map((followUp: any) => (
                            <tr key={followUp._id} className="hover:bg-muted">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                    <ChatIdCell chatId={followUp.chatId} />
                                </td>
                                <td className="px-6 py-4 text-sm text-foreground">
                                    <FollowUpMessageCell value={followUp.message} item={followUp} />
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                                    <FollowUpDateCell value={followUp.followUpSentAt} item={followUp} />
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default FollowUpsView
