// apps/web/components/patient-dashboard/cells/TakeCaseCell.tsx
"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { Button } from "@/components/ui/button"
import { getInitials } from "@/utils/patientUtils"
import Box from "@/components/ui/box"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form"
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu"
import { DoctorSpecialties as DOCTOR_SPECIALTIES } from "@/data/doctorSpecialty.enum"
import {Loader2, MapPinPlusInside, NotebookPen, Users, UserPlus} from "lucide-react"
import { Status } from "@/public/assets/icons/patient-dashboard/Status"
import { Priority } from "@/public/assets/icons/patient-dashboard/Priority"
import type React from "react"
import type { PatientWithMessages } from "../viewModel/types"
import { useQueryClient } from "@tanstack/react-query"
import { getRolesForAccountType, ROLE_LABELS, type CareTeamRole } from "@fajr/shared/care-team"
import { ROLE_BADGE_TAILWIND } from "@/lib/care-team-tailwind"

interface TakeCaseCellProps {
    status: string
    careTeam?: { userId: string; firstName: string; lastName: string; email: string; role: string; isLead: boolean }[] | null
    session: { user: { accountType: string; email?: string } } | null
    onTakeCase: (role: string) => void
    index: number
    rows: PatientWithMessages[]
    handleArchive: () => void
    loading?: boolean
    careTeamCount?: number
}

export const TakeCaseCell: React.FC<TakeCaseCellProps> = ({
                                                              status,
                                                              careTeam,
                                                              session,
                                                              onTakeCase,
                                                              rows,
                                                              index,
                                                              handleArchive,
                                                              loading = false,
                                                              careTeamCount = 0,
                                                          }) => {
    const [modalOpen, setModalOpen] = useState(false)
    const queryClient = useQueryClient()
    const form = useForm({
        defaultValues: {
            specialty: "",
        },
    })

    const availableRoles = getRolesForAccountType(session?.user?.accountType || "")
    const leadSurgeon = careTeam?.find(m => m.isLead && m.role === "surgeon")
    const doctorInitials = leadSurgeon?.firstName && leadSurgeon?.lastName
        ? getInitials(leadSurgeon.firstName, leadSurgeon.lastName)
        : ""

    const handleReferSubmit = async (data: { specialty: string }) => {
        setModalOpen(false)

        try {
            await fetch("/api/patient/", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    id: rows[index]["id"],
                    status: "Pre-Op / Cleared",
                    specialty: data.specialty,
                }),
            })

            // Invalidate queries to refresh data
            queryClient.invalidateQueries({ queryKey: ["patients", "active"] })
            queryClient.invalidateQueries({ queryKey: ["patients", "archived"] })
        } catch (error) {
            console.log(error)
        }
    }

    if (status === "Pre-Op / Not Cleared") {
        return null
    }

    // For surgical/post-op statuses: show doctor initials + care team count
    if (
        status === "Peri-Op / In Surgery" ||
        status === "Post-Op / Discharged" ||
        status === "Post-Op / In-Patient"
    ) {
        return (
            <span className="flex items-center gap-1.5">
                {doctorInitials}
                {careTeamCount > 1 && (
                    <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />{careTeamCount}
                    </span>
                )}
                {/* Allow joining team even on active cases */}
                {availableRoles.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-1" disabled={loading}>
                                {loading ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <UserPlus className="h-3 w-3" />
                                )}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {availableRoles.map((role) => (
                                <DropdownMenuItem key={role} onSelect={() => onTakeCase(role)}>
                                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mr-2 ${ROLE_BADGE_TAILWIND[role]}`}>
                                        {role}
                                    </span>
                                    {ROLE_LABELS[role]}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </span>
        )
    }

    // Pre-Op / Cleared — show role picker for users with available roles
    if (status === "Pre-Op / Cleared") {
        if (availableRoles.length > 0) {
            return (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="default" disabled={loading} size="sm">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                <>
                                    <UserPlus className="mr-1 h-3.5 w-3.5" />
                                    Join Team
                                </>
                            )}
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {availableRoles.map((role) => (
                            <DropdownMenuItem key={role} onSelect={() => onTakeCase(role)}>
                                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium mr-2 ${ROLE_BADGE_TAILWIND[role]}`}>
                                    {role}
                                </span>
                                {ROLE_LABELS[role]}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
        // No available roles — show doctor initials if assigned
        return <span>{doctorInitials}</span>
    }

    // Fallback: Post-Op / In-Patient for doctors — show actions dropdown
    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline">Actions</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem onSelect={() => setModalOpen(true)}>Refer</DropdownMenuItem>
                    <DropdownMenuItem onSelect={handleArchive}>Archive</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {modalOpen && (
                <Box className="fixed inset-0 bg-background/80 flex items-center justify-center">
                    <Box className="bg-card p-6 rounded-lg w-96 shadow-sm">
                        <h2 className="text-xl font-bold mb-4">Refer to Specialty</h2>
                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleReferSubmit)}>
                                <FormField
                                    control={form.control}
                                    name="specialty"
                                    render={({field}) => (
                                        <FormItem>
                                            <FormLabel>Specialty</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select a specialty"/>
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {DOCTOR_SPECIALTIES.map((specialty) => (
                                                        <SelectItem key={specialty} value={specialty}>
                                                            {specialty}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FormItem>
                                    )}
                                />
                                <Box className="mt-4 flex justify-end gap-2">
                                    <Button onClick={() => setModalOpen(false)} variant="secondary" type="button">
                                        Cancel
                                    </Button>
                                    <Button type="submit" variant="default">
                                        Status <Status/>
                                        Priority <Priority/>
                                        Specialty <MapPinPlusInside/>
                                        Notes <NotebookPen/>
                                        Submit
                                    </Button>
                                </Box>
                            </form>
                        </Form>
                    </Box>
                </Box>
            )}
        </>
    );

}
