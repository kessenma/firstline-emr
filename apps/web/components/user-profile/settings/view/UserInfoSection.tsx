import ReadOnlyField from "@/components/form/ReadOnlyField"
import { RoleIcon } from "@/components/ui/RoleIcon"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Bell } from "lucide-react"
import { CardContent, CardTitle } from "@/components/ui/card"

type UserInfoSectionProps = {
    name: string
    email: string
    accountType: string
    doctorSpecialty?: string[]
    userType?: string
    countries?: string[]
    languages?: string[]
}

export default function UserInfoSection({
                                            name,
                                            email,
                                            accountType,
                                            doctorSpecialty = [""],
                                            userType,
                                            countries = [""],
                                            languages = [""],
                                        }: UserInfoSectionProps) {
    const formatSpecialties = (specialties?: string[]) => {
        if (!specialties || specialties.length === 0) return "Not Selected"
        const filtered = specialties.filter((s) => s !== "Not Selected")
        return filtered.length > 0 ? filtered.join(", ") : "Not Selected"
    }

    const formatCountries = (countries?: string[]) => {
        if (!countries || countries.length === 0) return "Not Selected"
        return countries.join(", ")
    }

    const formatLangugaes = (languges?: string[]) => {
        if (!languges || languges.length === 0) return "Not Selected"
        return languges.join(", ")
    }

    return (
        <Accordion
            type="single"
            className="mt-4 border-border border-b-2 border-l-2 border-r-2"
            collapsible
        >
            <AccordionItem value="logs" className="border-none">
                <AccordionTrigger className="px-6 py-4 ">
                    <div className="flex items-center gap-2 transition-colors hover:border-accent/50 border-border border-b-2 border-2 p-2 rounded-2xl hover:text-accent hover:bg-accent/10">
                        <Bell className="h-5 w-5 text-accent" />
                        <CardTitle className="text-lg">Notification Information</CardTitle>
                    </div>
                </AccordionTrigger>
                <AccordionContent>
                    <CardContent>
                        <div className="space-y-4">
                            <ReadOnlyField
                                fieldName="name"
                                fieldLabel="Name"
                                value={name || ""}
                                className="mb-2"
                            />
                            <ReadOnlyField
                                fieldName="email"
                                fieldLabel="Email"
                                value={email || ""}
                                className="mb-2"
                            />
                            <ReadOnlyField
                                fieldName="countries"
                                fieldLabel="Countries"
                                value={formatCountries(countries)}
                                className="mb-2"
                            />
                            <ReadOnlyField
                                fieldName="languages"
                                fieldLabel="languages"
                                value={formatLangugaes(languages)}
                                className="mb-2"
                            />
                            <ReadOnlyField
                                fieldName="accountType"
                                fieldLabel="Account Type"
                                value={accountType || ""}
                                icon={
                                    accountType ? (
                                        <RoleIcon accountType={accountType} className="w-4 h-4 shrink-0" />
                                    ) : undefined
                                }
                                className="mb-2"
                            />
                            {userType === "Doctor" && (
                                <ReadOnlyField
                                    fieldName="doctorSpecialty"
                                    fieldLabel="Specialties"
                                    value={formatSpecialties(doctorSpecialty)}
                                    className="mb-2"
                                />
                            )}
                        </div>
                    </CardContent>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    )
}