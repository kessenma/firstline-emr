// apps/web/components/telegram-patient/container/intake-form/view/form-ui/PatientIdAccordion.tsx
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CopyButton } from "@/components/ui/CopyButton"

interface PatientIdAccordionProps {
    patientId?: string
}

export function PatientIdAccordion({ patientId }: PatientIdAccordionProps) {
    return (
        <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible>
                <AccordionItem className="text-muted-foreground mt-20" value="patient-id">
                    <AccordionTrigger>Patient ID</AccordionTrigger>
                    <AccordionContent>
                        <div className="flex items-center justify-center space-x-2 mt-2">
                            <p className="text-lg font-semibold text-muted-foreground">
                                <span className="text-foreground">{patientId || "Not available"}</span>
                            </p>
                            {patientId && (
                                <CopyButton 
                                    textToCopy={patientId}
                                    label="patient ID"
                                    variant="ghost"
                                    size="sm"
                                    className="p-1 hover:text-accent"
                                />
                            )}
                        </div>
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    )
}
