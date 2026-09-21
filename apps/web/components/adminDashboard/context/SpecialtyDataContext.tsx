// apps/web/components/adminDashboard/context/SpecialtyDataContext.tsx
"use client"

import type React from "react"
import { createContext, useContext } from "react"
import axios from "axios"
import { useQuery } from "@tanstack/react-query"

interface SpecialtyBreakdown {
    specialty: string
    count: number
}

interface SpecialtyDataContextProps {
    doctorSpecialties: SpecialtyBreakdown[]
    patientSpecialties: SpecialtyBreakdown[]
    isLoading: boolean
    error: Error | null
}

const SpecialtyDataContext = createContext<SpecialtyDataContextProps | undefined>(undefined)

export const SpecialtyDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const {
        data: doctorData,
        isLoading: loadingDoctors,
        error: doctorError,
    } = useQuery<SpecialtyBreakdown[]>({
        queryKey: ["doctorSpecialtyBreakdown"],
        queryFn: async () => {
            const response = await axios.get("/api/admin/GET/statistics/doctor-specialty-spread")
            return response.data.specialtyBreakdown
        },
    })

    const {
        data: patientData,
        isLoading: loadingPatients,
        error: patientError,
    } = useQuery<SpecialtyBreakdown[]>({
        queryKey: ["patientSpecialtyBreakdown"],
        queryFn: async () => {
            const response = await axios.get("/api/admin/GET/statistics/patient-specialty-spread")
            return response.data.specialtyBreakdown
        },
    })

    const contextValue: SpecialtyDataContextProps = {
        doctorSpecialties: doctorData || [],
        patientSpecialties: patientData || [],
        isLoading: loadingDoctors || loadingPatients,
        error: doctorError || patientError || null,
    }

    return <SpecialtyDataContext.Provider value={contextValue}>{children}</SpecialtyDataContext.Provider>
}

export const useSpecialtyData = (): SpecialtyDataContextProps => {
    const context = useContext(SpecialtyDataContext)
    if (!context) {
        throw new Error("useSpecialtyData must be used within a SpecialtyDataProvider")
    }
    return context
}

