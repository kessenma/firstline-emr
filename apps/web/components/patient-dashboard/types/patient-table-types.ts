// apps/web/components/patient-dashboard/types/patient-table-types.ts
import type { Patient } from "@/db/schema/patients"
import type { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum"
import type { PatientWithMessages } from "../viewModel/types"
import type { CareTeamRole } from "@fajr/shared/care-team"
import {Dispatch, SetStateAction} from "react";

// Export PatientWithMessages so it can be imported from this file
export type { PatientWithMessages }

export interface PatientTableProps {
    rows: PatientWithMessages[]
    allData: PatientWithMessages[]
    session: { user: { accountType: string; email?: string } } | null
    handleStatusChange: (newStatus: Patient["status"], patient: PatientWithMessages, index: number) => void
    handleTakeCase: (index: number, role?: CareTeamRole) => void
    handleArchive: (index: number) => void
    updatePatient: (id: string, data: Partial<Patient>) => Promise<Patient>
    userType: "triage" | "doctor" | "evac"
    handleSpecialtyChangeWithNotification: (patientId: string, specialty: DoctorSpecialtyList) => Promise<void>
    loadingStates: Record<string, string | boolean>
    setLoadingStates: Dispatch<SetStateAction<Record<string, string | boolean>>>
    recentlyChangedIds?: Set<string>
}

export interface ColorScheme {
    primary: string
    lighter: string
    darker: string
}

export interface ColorMapping {
    [key: string]: ColorScheme
}

export  type AccountType = "Doctor" | "Triage" | "Evac"


