// apps/web/components/user-profile/ProfileFields.tsx
"use client"
import { Info } from "lucide-react"
import { useState } from "react"
import { SingleChoiceFormField } from "@/components/form/SingleChoiceFormField"
import { MultiChoiceFormField } from "@/components/form/MultiChoiceFormField"
import { DatePickerFormField } from "@/components/form/DatePickerFormField"
import { LanguagesList } from "@/data/languages.enum"
import { CountriesList } from "@/data/countries.enum"
import Tooltip from "@/components/form/Tooltip"
import ReadOnlyField from "@/components/form/ReadOnlyField"
import type { UserProfileFormValues } from "./UserProfileViewModel"
import { ProfileField } from "./ProfileField"
import { useFormContext } from "react-hook-form"

interface ProfileFieldsProps {
    profile: UserProfileFormValues
    isEditing: boolean
    isAdmin: boolean
    register: any
}

export function ProfileFields({ profile, isEditing, isAdmin, register }: ProfileFieldsProps) {
    const { formState: { errors } } = useFormContext<UserProfileFormValues>()
    const [isHovered, setIsHovered] = useState(false)
    const formatTooltipMessage = (email: string) => {
        return `If you need to update your account type, please contact an admin with the email address you signed up with: (${email})`
    }

    return (
        <>
            <ProfileField
                label="First Name"
                value={profile.firstName}
                isEditing={isEditing}
                fieldName="firstName"
                register={register}
                email={profile.email || undefined}
                error={errors.firstName}
            />
            <ProfileField
                label="Last Name"
                value={profile.lastName}
                isEditing={isEditing}
                fieldName="lastName"
                register={register}
                email={profile.email || undefined}
                error={errors.lastName}
            />
            <div className="flex items-center">
                {isEditing ? (
                    <SingleChoiceFormField
                        fieldName="accountType"
                        fieldLabel="Account Type"
                        choices={["Doctor", "Triage" /*,"Evac"*/]}
                    />
                ) : (
                    <ProfileField label="Account Type" value={profile.accountType} isEditing={false} email={profile.email || undefined} />
                )}
                {isAdmin && (
                    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
                        <Tooltip tooltipText={formatTooltipMessage(profile.email || "")} showTooltip={isHovered}>
                            <Info className="h-4 w-4 ml-2 text-muted-foreground cursor-help" />
                        </Tooltip>
                    </div>
                )}
            </div>

            <div className="md:col-span-2">
                {isEditing ? (
                    <MultiChoiceFormField fieldName="languages" fieldLabel="Languages" choices={LanguagesList} />
                ) : (
                    <ReadOnlyField fieldName="languages" fieldLabel="Languages" value={profile.languages?.join(", ") || "N/A"} />
                )}
            </div>

            <div className="md:col-span-2">
                {isEditing ? (
                    <MultiChoiceFormField fieldName="countries" fieldLabel="Countries" choices={CountriesList} />
                ) : (
                    <ReadOnlyField fieldName="countries" fieldLabel="Countries" value={profile.countries?.join(", ") || "N/A"} />
                )}
            </div>

            {isEditing ? (
                <SingleChoiceFormField fieldName="gender" fieldLabel="Gender" choices={["Male", "Female"]} />
            ) : (
                <ProfileField label="Gender" value={profile.gender} isEditing={false} email={profile.email || undefined} />
            )}

            {isEditing ? (
                <DatePickerFormField name="dob" label="Date of Birth" type="past" />
            ) : (
                <ProfileField
                    label="Date of Birth"
                    value={profile.dob ? new Date(profile.dob).toLocaleDateString() : "N/A"}
                    isEditing={false}
                    email={profile.email || undefined}
                />
            )}
        </>
    )
}

