import { useEffect, useState } from "react";
import { useFormContext, useWatch } from "react-hook-form";

interface FormProgressOptions {
    requiredFields: string[];
    nestedFields?: Record<string, string[]>;
    conditionalFields?: Record<string, (values: any) => boolean>;
}

// Helper function to safely access nested properties
function getNestedValue(obj: any, path: string, defaultValue: any = undefined) {
    if (!obj) return defaultValue;

    const keys = path.split('.');
    let result = obj;

    for (const key of keys) {
        if (result === undefined || result === null) {
            return defaultValue;
        }
        result = result[key];
    }

    return result !== undefined ? result : defaultValue;
}

export function useFormProgress({
                                    requiredFields,
                                    nestedFields = {},
                                    conditionalFields = {}
                                }: FormProgressOptions) {
    const [progress, setProgress] = useState(0);
    const [isComplete, setIsComplete] = useState(false);
    const form = useFormContext();

    // Watch all form values
    const values = useWatch({ control: form.control });

    useEffect(() => {
        if (!values) return;

        let completedFields = 0;
        let totalFields = requiredFields.length;

        // Check required fields
        requiredFields.forEach(field => {
            const value = getNestedValue(values, field);
            if (value !== undefined && value !== null && value !== "") {
                completedFields++;
            }
        });

        // Check nested fields
        Object.entries(nestedFields).forEach(([parentField, childFields]) => {
            const parent = getNestedValue(values, parentField);
            if (parent) {
                totalFields += childFields.length;
                childFields.forEach(childField => {
                    const fullPath = `${parentField}.${childField}`;
                    const value = getNestedValue(values, fullPath);
                    if (value !== undefined && value !== null && value !== "") {
                        completedFields++;
                    }
                });
            }
        });

        // Check conditional fields
        Object.entries(conditionalFields).forEach(([field, condition]) => {
            if (condition(values)) {
                totalFields++;
                const value = getNestedValue(values, field);
                if (value !== undefined && value !== null && value !== "") {
                    completedFields++;
                }
            }
        });

        // Special handling for patientRelation field
        const isPatient = getNestedValue(values, "isPatientFields.isPatient", true);
        if (isPatient === false) {
            // If not patient, check if relation field is filled
            const patientRelation = getNestedValue(values, "isPatientFields.patientRelation", "");
            if (!patientRelation || patientRelation.trim() === "") {
                // If relation field is not filled, don't count it as complete
                completedFields--;
            }
        }

        // Calculate progress percentage
        const calculatedProgress = totalFields > 0 ? (completedFields / totalFields) * 100 : 0;
        setProgress(Math.min(100, Math.max(0, calculatedProgress)));
        setIsComplete(calculatedProgress >= 100);

    }, [values, requiredFields, nestedFields, conditionalFields]);

    return { progress, isComplete };
}