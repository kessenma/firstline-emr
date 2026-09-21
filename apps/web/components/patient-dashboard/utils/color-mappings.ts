import type { ColorMapping } from "../types/patient-table-types"

export const userTypeColors: ColorMapping = {
    triage: {
        primary: "yellow-500",
        lighter: "yellow-50",
        darker: "yellow-900",
    },
    doctor: {
        primary: "orange-500",
        lighter: "orange-50",
        darker: "orange-900",
    },
    evac: {
        primary: "red-500",
        lighter: "red-50",
        darker: "red-900",
    },
}

export const getColorScheme = (userType: string) => {
    return (
        userTypeColors[userType] || {
            primary: "gray-500",
            lighter: "gray-100",
            darker: "gray-900",
        }
    )
}

