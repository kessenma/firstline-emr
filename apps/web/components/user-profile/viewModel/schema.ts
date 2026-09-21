import { z } from 'zod/v3';
import { DoctorSpecialtyList } from "@/data/doctorSpecialty.enum";

export const userProfileSchema = z.object({
    id: z.string(),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    dob: z.string().refine((value) => {
        const date = new Date(value);
        return !isNaN(date.getTime()) && date < new Date();
    }, {
        message: "Please enter a valid date of birth in the past",
    }),
    countries: z.array(z.string()).min(1, "At least one country is required"),
    gender: z.enum(['Male', 'Female']),
    image: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    accountType: z.enum(['Doctor', 'Triage', 'Evac']),
    doctorSpecialty: z.array(z.nativeEnum(DoctorSpecialtyList)).nullable().optional(),
    languages: z.array(z.string()).min(1, "At least one language is required"),
    missions: z.array(z.string()).nullable().optional(),
});
