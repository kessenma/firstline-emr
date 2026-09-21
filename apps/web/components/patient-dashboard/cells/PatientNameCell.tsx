// apps/web/components/patient-dashboard/cells/PatientNameCell.tsx
"use client"

import type React from "react"
import { getAnonymizedName } from "@fajr/shared/patient-utils"

interface PatientNameCellProps {
    firstName?: string
    lastName?: string
}

export const PatientNameCell: React.FC<PatientNameCellProps> = ({ firstName, lastName }) => {
    return <span>{getAnonymizedName(firstName, lastName)}</span>
}


