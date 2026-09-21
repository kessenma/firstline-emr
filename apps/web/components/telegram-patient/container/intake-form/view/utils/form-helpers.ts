// apps/web/components/telegram-patient/container/intake-form/view/utils/form-helpers.ts
import type { UseFormReturn } from "react-hook-form"

/**
 * Preserves form-ui values when changing language
 * @param form The form-ui instance
 * @param language The new language
 * @returns The current form-ui values
 */
export function preserveFormValues(form: UseFormReturn<any>, language: string) {
    // Get current form-ui values
    const currentValues = form.getValues()

    // Update only the language field
    form.setValue("preferredLanguage", language, {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false,
    })

    // Return the current values for reference
    return currentValues
}

/**
 * Checks if all required fields are filled
 * @param formValues The form-ui values
 * @param requiredFields Array of required field names
 * @returns Boolean indicating if all required fields are filled
 */
export function checkRequiredFields(formValues: any, requiredFields: string[]) {
    return requiredFields.every((field) => {
        const value = field.split(".").reduce((obj, key) => (obj as any)?.[key], formValues as any)
        return value !== undefined && value !== null && value !== ""
    })
}

/**
 * Validates form-ui completeness
 * @param form The form-ui instance
 * @param requiredFields Array of required field names
 * @param formErrors Form errors object
 * @returns Boolean indicating if form-ui is valid
 */
export function validateFormCompleteness(form: UseFormReturn<any>, requiredFields: string[]) {
    const formValues = form.getValues()
    const formErrors = form.formState.errors

    // Check if there are any errors
    const hasErrors = Object.keys(formErrors).length > 0

    // Check if all required fields are filled
    const allRequiredFieldsFilled = checkRequiredFields(formValues, requiredFields)

    // Check phone fields
    const phoneComplete = formValues.phone?.countryCode && formValues.phone?.phoneNumber

    // Check patient relation logic
    const isPatientValue = formValues.isPatientFields?.isPatient
    const patientRelation = formValues.isPatientFields?.patientRelation || ""
    const patientRelationComplete = isPatientValue || patientRelation.trim() !== ""

    // Form is valid if all conditions are met
    return !hasErrors && allRequiredFieldsFilled && Boolean(phoneComplete) && patientRelationComplete
}

