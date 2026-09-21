'use client'

'use client'

import React, { useEffect } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v3";
import { TextFormField } from "@/components/ui/TextFormField";
import { useSignupContext } from '../container/SignupContext';
import { DatePickerFormField } from "@/components/form/DatePickerFormField"
import { MultiChoiceFormField } from "@/components/form/MultiChoiceFormField"
import { LanguagesList } from "@/data/languages.enum"
import { CountriesList } from "@/data/countries.enum"

const triageSignupSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dob: z.string()
        .refine((value) => {
            const date = new Date(value);
            return !isNaN(date.getTime()) && date < new Date();
        }, {
            message: "Please enter a valid date of birth in the past",
        }),
    languages: z.array(z.string()).min(1, "At least one language is required"),
    countries: z.array(z.string()).min(1, "At least one country is required"),
});

export type TriageSignupFormValues = z.infer<typeof triageSignupSchema>;

const TriageSignupForm: React.FC = () => {
    const { formData, setFormData, updateAnsweredQuestions, setTriageSignupFormCompleted } = useSignupContext();
    const methods = useForm<TriageSignupFormValues>({
        resolver: zodResolver(triageSignupSchema),
        defaultValues: {
            firstName: formData.firstName || '',
            lastName: formData.lastName || '',
            dob: formData.dob || '',
            languages: formData.languages || [],
            countries: formData.countries || [],
        },
        mode: "onChange",
    });

    useEffect(() => {
        const subscription = methods.watch((data) => {
            setFormData((prevData) => ({
                ...prevData,
                ...data,
                languages: Array.isArray(data.languages)
                    ? (data.languages.filter((lang): lang is string => !!lang) as string[])
                    : [],
                countries: Array.isArray(data.countries)
                    ? (data.countries.filter((country): country is string => !!country) as string[])
                    : [],
            }));

            const filledFields = [
                data.firstName,
                data.lastName,
                data.dob,
                data.languages && data.languages.length > 0,
                data.countries && data.countries.length > 0,
            ].filter(Boolean).length;
            
            updateAnsweredQuestions(3, filledFields);
            const isFormComplete = filledFields === 5;
            setTriageSignupFormCompleted(isFormComplete);
        });

        return () => subscription.unsubscribe();
    }, [methods, setFormData, setTriageSignupFormCompleted, updateAnsweredQuestions]);

    return (
        <div className="max-w-md mx-auto px-2 pb-24 pt-4" id="signup-form-container">
            <FormProvider {...methods}>
                <form className="space-y-10">
                    <TextFormField
                        fieldName="firstName"
                        fieldLabel="First Name"
                        id="firstName"
                        autoComplete="given-name"
                        className="mb-8 mt-4"
                    />
                    <TextFormField
                        fieldName="lastName"
                        fieldLabel="Last Name"
                        id="lastName"
                        autoComplete="family-name"
                        className="mb-8"
                    />
                    <DatePickerFormField
                        name="dob"
                        label="Date of Birth"
                        type="past"
                        className="mb-8"
                    />
                    <MultiChoiceFormField
                        fieldName="languages"
                        fieldLabel="Languages"
                        choices={LanguagesList}
                        className="mb-8" 
                    />
                    <MultiChoiceFormField
                        fieldName="countries"
                        fieldLabel="Select Which Countries In Which You Would Like to Consult Patients"
                        choices={CountriesList}
                    />
                </form>
            </FormProvider>
        </div>
    );
};

export default TriageSignupForm;