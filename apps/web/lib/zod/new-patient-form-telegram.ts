import { z } from "zod"

export const newPatientFormTelegramSchema = z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    phone: z.object({
        countryCode: z.string().min(1, "Country code is required"),
        phoneNumber: z.string().min(1, "Phone number is required"),
    }),
    dob: z.string().refine(
        (date) => {
            const parsedDate = new Date(date)
            return parsedDate >= new Date("1900-01-01") && parsedDate <= new Date()
        },
        { message: "Date of birth must be between 1900 and today" },
    ),
    country: z.string().min(1, "Country is required"),
    city: z.string().min(1, "City is required"),
    chiefComplaint: z.string().min(1, "Please enter the main reason you seek medical care"),
    genderPreference: z.string(),
    isPatientFields: z
        .object({
            isPatient: z.boolean(),
            patientRelation: z.string().optional(),
        })
        .superRefine((data, context) => {
            if (!data.isPatient && (!data.patientRelation || data.patientRelation.trim() === "")) {
                context.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Patient relation is required",
                    path: ["patientRelation"],
                })
            }
        }),
    createdAt: z.date(),
    preferredLanguage: z.string().optional(),
})

