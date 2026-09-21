// apps/web/components/patient-dashboard/cells/NotesCell.tsx
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useForm, FormProvider } from "react-hook-form"
import { useSession } from "next-auth/react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Check, Edit, FileText, X } from "lucide-react"
import { TextFormField } from "@/components/ui/TextFormField"
import { cn } from "@/utils/classNames"

// Define AccountType directly in the component
type AccountType = "Doctor" | "Triage" | "Evac"

interface NotesCellProps {
    notes: string
    onUpdate: (notes: string) => void
    drawerColor?: string
    badgeColor?: string
    iconTextColor?: string
    iconBackgroundColor?: string
    inMobileDrawer?: boolean // New prop to indicate if it's already in a mobile drawer
}

export const NotesCell: React.FC<NotesCellProps> = ({
                                                        notes,
                                                        onUpdate,
    badgeColor = "destructive",
    iconTextColor = "foreground",
    iconBackgroundColor = "card",
                                                        inMobileDrawer = false,
                                                    }) => {
    const { data: session } = useSession()
    const accountType = session?.user?.accountType as AccountType

    const [isOpen, setIsOpen] = useState(false)
    const [savedNote, setSavedNote] = useState(notes)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const methods = useForm({
        defaultValues: { notes },
    })

    useEffect(() => {
        setSavedNote(notes)
        methods.reset({ notes })
    }, [notes, methods])

    const handleOpen = () => {
        setIsOpen(true)
    }

    const handleClose = () => setIsOpen(false)

    const handleSave = async (data: { notes: string }) => {
        if (accountType === "Triage") {
            setIsSubmitting(true)
            try {
                await onUpdate(data.notes)
                setSavedNote(data.notes)
            } catch (error) {
                console.error("Failed to update notes:", error)
            } finally {
                setIsSubmitting(false)
            }
        }
        handleClose()
    }

    // Determine permissions based on account type
    const isDoctor = accountType === "Doctor"
    const isTriage = accountType === "Triage"

    // If we're already in a mobile drawer, render the content directly
    if (inMobileDrawer) {
        return (
            <FormProvider {...methods}>
                <form onSubmit={methods.handleSubmit(handleSave)}>
                    <div className="p-4">
                        <h3 className="text-lg font-semibold mb-4">{isTriage ? "Edit Notes" : "View Notes"}</h3>

                        {savedNote && (
                            <div className="mb-4 p-3 border border-border rounded-md bg-muted">
                                <strong>{isTriage ? "Previously Saved Note:" : "Note from Triage:"}</strong>
                                <p>{savedNote}</p>
                            </div>
                        )}

                        {isTriage && (
                            <TextFormField
                                fieldName="notes"
                                fieldLabel="Notes"
                                multiline
                                rows={5}
                                value={methods.watch("notes")}
                                onChange={(e) => methods.setValue("notes", e.target.value)}
                            />
                        )}
                    </div>
                    <div className="flex justify-end gap-2 p-4 border-t">
                        {isTriage && (
                            <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? (
                            <span className="flex items-center">
                    <svg
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                    >
                      <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                      ></circle>
                      <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Saving...
                  </span>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Save
                                    </>
                                )}
                            </Button>
                        )}
                    </div>
                </form>
            </FormProvider>
        )
    }

    // Regular view with drawer
    return (
        <>
            <div className="relative flex-1 flex items-center justify-center">
                <Button
                    size="sm"
                    variant="ghost"
                    className={cn(
                        "group inline-flex items-center justify-center rounded-md border-2 border-border p-2",
                        iconBackgroundColor === "card" ? "bg-card" : `bg-${iconBackgroundColor}`,
                        iconTextColor === "foreground" ? "text-foreground" : `text-${iconTextColor}`,
                        "hover:bg-accent hover:text-accent-foreground hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:bg-card dark:hover:bg-muted/80"
                    )}
                    onClick={handleOpen}
                >
                    {savedNote ? (
                        <>
                            <FileText className={cn("h-5 w-5", iconTextColor === "foreground" ? "text-foreground dark:text-white" : `text-${iconTextColor}`, "group-hover:text-accent-foreground")} />
                            <div
                                className={cn(
                                    "absolute -top-2 -right-2 flex items-center justify-center rounded-full",
                                    badgeColor === "destructive" ? "bg-destructive text-destructive-foreground" : `bg-${badgeColor} text-${badgeColor}-foreground`
                                )}
                                style={{ width: "18px", height: "18px" }}
                            >
                                <span className="text-xs font-bold">!</span>
                            </div>
                        </>
                    ) : (
                        <Edit className={cn("h-5 w-5", iconTextColor === "foreground" ? "text-foreground dark:text-white" : `text-${iconTextColor}`, "group-hover:text-accent-foreground")} />
                    )}
                </Button>
            </div>

            <Drawer isOpen={isOpen} onClose={handleClose}>
                <DrawerContent size="80%" className={`bg-card`}>
                    <FormProvider {...methods}>
                        <form onSubmit={methods.handleSubmit(handleSave)}>
                            <DrawerHeader>
                                <DrawerTitle>{isTriage ? "Edit Notes" : "View Notes"}</DrawerTitle>
                            </DrawerHeader>
                            <div className="p-4">
                                {savedNote && (
                                    <div className="mb-4 p-3 border border-border rounded-md bg-muted">
                                        <strong>{isTriage ? "Previously Saved Note:" : "Note from Triage:"}</strong>
                                        <p>{savedNote}</p>
                                    </div>
                                )}

                                {isTriage && (
                                    <TextFormField
                                        fieldName="notes"
                                        fieldLabel="Notes"
                                        multiline
                                        rows={5}
                                        value={methods.watch("notes")}
                                        onChange={(e) => methods.setValue("notes", e.target.value)}
                                    />
                                )}
                            </div>
                            <DrawerFooter>
                                <Button type="button" variant="outline" onClick={handleClose}>
                                    <X className="mr-2 h-4 w-4" />
                                    {isTriage ? "Cancel" : "Close"}
                                </Button>
                                {isTriage && (
                                    <Button className={"mb-4"} type="submit" disabled={isSubmitting}>
                                        {isSubmitting ? (
                                            <span className="flex items-center">
                        <svg
                            className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary-foreground"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                        >
                          <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                          ></circle>
                          <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving...
                      </span>
                                        ) : (
                                            <>
                                                <Check className="mr-2 h-4 w-4" />
                                                Save
                                            </>
                                        )}
                                    </Button>
                                )}
                            </DrawerFooter>
                        </form>
                    </FormProvider>
                </DrawerContent>
            </Drawer>
        </>
    )
}
