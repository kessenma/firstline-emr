export type NewPatientFormTelegramValues = {
    firstName: string
    lastName: string
    dob: string
    city: string
    phone: { countryCode: string; phoneNumber: string }
    country: string
    genderPreference: string
    chiefComplaint: string
    preferredLanguage: string
    isPatientFields: {
        isPatient: boolean
        patientRelation?: string
    }
    [key: string]: any
}

