// apps/web/components/user-profile/DoctorSpecialties.tsx
"use client"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"
import { SingleChoiceFormField } from "@/components/form/SingleChoiceFormField"
import { DoctorSpecialties as DoctorSpecialtiesList, type DoctorSpecialtyList } from "@/data/doctorSpecialty.enum"
import ReadOnlyField from "@/components/form/ReadOnlyField"

interface DoctorSpecialtiesProps {
    specialties: DoctorSpecialtyList[]
    isEditing: boolean
    handleSpecialtyChange: (index: number, value: DoctorSpecialtyList) => void
    handleRemoveSpecialty: (index: number) => void
    handleAddSpecialty: () => void
}

export function DoctorSpecialties({
                                      specialties,
                                      isEditing,
                                      handleSpecialtyChange,
                                      handleRemoveSpecialty,
                                      handleAddSpecialty,
                                  }: DoctorSpecialtiesProps) {
    return (
        <div className="mt-4">
            <Label>Specialties</Label>
            {isEditing
                ? specialties.map((specialty, index) => (
                    <div key={index} className="flex mt-2">
                        <div className="flex items-center space-x-2">
                            <SingleChoiceFormField
                                fieldName={`doctorSpecialty[${index}]`}
                                fieldLabel={`Specialty ${index + 1}`}
                                choices={DoctorSpecialtiesList}
                                value={specialty}
                                onChange={(value: string) => handleSpecialtyChange(index, value as DoctorSpecialtyList)}
                                className="w-full max-w-md"
                            />
                            {index === 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleRemoveSpecialty(index)}
                                    className="text-destructive"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </div>
                ))
                : specialties.map((specialty, index) => (
                    <ReadOnlyField
                        key={index}
                        fieldName={`doctorSpecialty${index + 1}`}
                        fieldLabel={`Specialty ${index + 1}`}
                        value={specialty || "N/A"}
                        className="mt-2"
                    />
                ))}
            {isEditing && specialties.length < 2 && (
                <Button type="button" variant="ghost" className="mt-2 flex items-center space-x-2" onClick={handleAddSpecialty}>
                    <Plus className="h-4 w-4" />
                    <span>Add Specialty</span>
                </Button>
            )}
        </div>
    )
}

