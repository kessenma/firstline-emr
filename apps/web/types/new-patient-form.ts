import type { z } from "zod"
import type { newPatientFormTelegramSchema } from "@/lib/zod/new-patient-form-telegram"

export type NewPatientFormTelegramValues = z.infer<typeof newPatientFormTelegramSchema>

