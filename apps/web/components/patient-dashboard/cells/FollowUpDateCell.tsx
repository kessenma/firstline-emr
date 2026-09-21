"use client"

import type React from "react"

interface FollowUpDateCellProps {
    value: string
    item: any
}

export const FollowUpDateCell: React.FC<FollowUpDateCellProps> = ({ value, item }) => {
    // Format the date for display
    const formattedDate = new Date(value).toLocaleString()

    return <div className="whitespace-nowrap text-sm">{formattedDate}</div>
}

