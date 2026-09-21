// apps/web/components/auth/DoctorSignupForm.tsx
"use client"

import type React from "react"
import { useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod/v3"
import { TextFormField } from "../../../ui/TextFormField"
import { MultiChoiceFormField } from "@/components/form/MultiChoiceFormField"
import { SingleChoiceFormField } from "@/components/form/SingleChoiceFormField"
import { DatePickerFormField } from "@/components/form/DatePickerFormField"
import { DoctorSpecialties } from "@/data/doctorSpecialty.enum"
import { LanguagesList } from "@/data/languages.enum"
import { CountriesList } from "@/data/countries.enum"
import { useSignupContext } from "../container/SignupContext"

const doctorSignupSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dob: z.string().refine(
        (value) => {
            const date = new Date(value)
            return !isNaN(date.getTime()) && date < new Date()
        },
        {
            message: "Please enter a valid date of birth in the past",
        },
    ),
    doctorSpecialty: z.array(z.string()).min(1, "At least one specialty is required"),
    languages: z.array(z.string()).min(1, "At least one language is required"),
    countries: z.array(z.string()).min(1, "At least one country is required"),
    gender: z.enum(["Male", "Female"]),
})

export type DoctorSignupFormValues = z.infer<typeof doctorSignupSchema>

const DoctorSignupForm: React.FC = () => {
    const { formData, setFormData, updateAnsweredQuestions, setDoctorSignupFormCompleted } = useSignupContext()

    const methods = useForm<DoctorSignupFormValues>({
        resolver: zodResolver(doctorSignupSchema),
        defaultValues: {
            firstName: formData.firstName || "",
            lastName: formData.lastName || "",
            dob: formData.dob || "",
            doctorSpecialty: formData.doctorSpecialty || [],
            languages: formData.languages || [],
            countries: formData.countries || [],
            gender: formData.gender || undefined,
        },
        mode: "onChange",
    })

    useEffect(() => {
        const subscription = methods.watch((data) => {
            setFormData((prevData) => ({
                ...prevData,
                ...data,
                doctorSpecialty: Array.isArray(data.doctorSpecialty)
                    ? (data.doctorSpecialty.filter((specialty): specialty is string => !!specialty) as string[])
                    : [],
                languages: Array.isArray(data.languages)
                    ? (data.languages.filter((lang): lang is string => !!lang) as string[])
                    : [],
                countries: Array.isArray(data.countries)
                    ? (data.countries.filter((country): country is string => !!country) as string[])
                    : [],
            }))

            const filledFields = [
                data.firstName,
                data.lastName,
                data.dob,
                data.doctorSpecialty && data.doctorSpecialty.length > 0,
                data.languages && data.languages.length > 0,
                data.countries && data.countries.length > 0,
                data.gender,
            ].filter(Boolean).length

            updateAnsweredQuestions(3, filledFields)

            const isFormComplete = filledFields === 7
            setDoctorSignupFormCompleted(isFormComplete)
        })

        return () => subscription.unsubscribe()
    }, [methods, setFormData, updateAnsweredQuestions, setDoctorSignupFormCompleted])

    useEffect(() => {
        // Scroll to the top of the container when the component mounts
        const container = document.getElementById("signup-form-container")
        if (container) {
            container.scrollTop = 0
        }
    }, [])

    return (
        <div className="max-w-md mx-auto px-2 pb-24 pt-4" id="signup-form-container">
            <FormProvider {...methods}>
                <form className="space-y-10">
                    <TextFormField fieldName="firstName" fieldLabel="First Name" autoComplete="given-name" />
                    <TextFormField fieldName="lastName" fieldLabel="Last Name" autoComplete="family-name" />
                    <DatePickerFormField name="dob" label="Date of Birth" type="past" />
                    <MultiChoiceFormField fieldName="languages" fieldLabel="Languages" choices={LanguagesList} />
                    <MultiChoiceFormField
                        fieldName="countries"
                        fieldLabel="Select Which Countries In Which You Would Like to Consult Patients"
                        choices={CountriesList}
                    />
                    <MultiChoiceFormField
                        fieldName="doctorSpecialty"
                        fieldLabel="Doctor Specialty"
                        choices={DoctorSpecialties}
                        limit={2}
                        // onChange={(value) => methods.setValue("doctorSpecialty", value ? [value] : [])}
                    />
                    <SingleChoiceFormField fieldName="gender" fieldLabel="Gender" choices={["Male", "Female"]} />
                </form>
            </FormProvider>
        </div>
    )
}

export default DoctorSignupForm
