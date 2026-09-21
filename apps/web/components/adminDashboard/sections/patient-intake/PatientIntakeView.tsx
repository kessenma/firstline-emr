// apps/web/components/adminDashboard/sections/patient-intake/PatientIntakeView.tsx
"use client"

import { usePatientIntake } from "./PatientIntakeViewModel"
import { Button } from "@/components/ui/button"
import { Table } from "@/components/ui/Table/Table"
import { Checkbox } from "@/components/ui/checkbox"
import { TelegramExample } from "./telegram-example"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SingleChoiceFormField } from "@/components/form/SingleChoiceFormField"
import { defaultTelegramPrompts } from "./default-telegram-prompts"
import { Info } from "lucide-react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import type { TableColumn } from "@/components/ui/Table/types"
import { useState, useEffect, useCallback } from "react"
import type { SupportedLanguage } from "@/data/languages.enum"
import { Languages } from "@/data/languages.enum"

export function PatientIntakeView() {
    const {
        intakeMessage,
        setIntakeMessage,
        confirmationMessage,
        setConfirmationMessage,
        updatePatientIntake,
        loading,
        patientIntakes,
        setMode,
        mode,
    } = usePatientIntake()

    const [useCustomConfirmation, setUseCustomConfirmation] = useState(false)
    const [patientUrl, setPatientUrl] = useState("")
    const [useDefaultIntake, setUseDefaultIntake] = useState(mode === "default")
    const [isInfoDrawerOpen, setIsInfoDrawerOpen] = useState(false)
    const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(Languages.ENGLISH)

    const availableLanguages = Object.keys(defaultTelegramPrompts.intakeMessage)

    // Create a callback function that accepts a string parameter and updates the selectedLanguage state
    const handleLanguageChange = useCallback((value: string) => {
        setSelectedLanguage(value as SupportedLanguage)
    }, [])

    useEffect(() => {
        // Use the NEXTAUTH_URL environment variable if available, otherwise fall back to current origin
        const baseUrl = process.env.NEXT_PUBLIC_NEXTAUTH_URL || (typeof window !== 'undefined' ? window.location.origin : '')
        setPatientUrl(`${baseUrl}/new-patient/telegram/67edf48fa6229bc4bec7a152-8051934548`)
    }, [])

    useEffect(() => {
        // Initialize the custom confirmation checkbox based on whether there's a confirmation message
        setUseCustomConfirmation(!!confirmationMessage && mode === "custom")
        setUseDefaultIntake(mode === "default")
    }, [confirmationMessage, mode])

    // Update intake message when default is selected and language changes
    useEffect(() => {
        if (useDefaultIntake && selectedLanguage) {
            setIntakeMessage(defaultTelegramPrompts.intakeMessage[selectedLanguage])
        }
    }, [useDefaultIntake, selectedLanguage, setIntakeMessage])

    // Update confirmation message when default is selected and language changes
    useEffect(() => {
        if (useDefaultIntake && selectedLanguage) {
            setConfirmationMessage(defaultTelegramPrompts.confirmationMessage[selectedLanguage])
        }
    }, [useDefaultIntake, selectedLanguage, setConfirmationMessage])

    // Handle toggle of default/custom intake
    const handleDefaultIntakeToggle = (checked: boolean) => {
        setUseDefaultIntake(checked)
        setMode(checked ? "default" : "custom")

        if (checked) {
            // If switching to default, set the message to the selected language
            setIntakeMessage(defaultTelegramPrompts.intakeMessage[selectedLanguage])
        }
    }

    const columns: TableColumn<any>[] = [
        {
            key: "intakeMessage",
            header: "Intake Message",
            render: (value) => (
                <span className="max-w-[200px] truncate block" title={value as string}>
          {value as string}
        </span>
            ),
        },
        {
            key: "confirmationMessage",
            header: "Confirmation Message",
            render: (value) => (
                <span className="max-w-[200px] truncate block" title={value as string}>
          {value as string}
        </span>
            ),
        },
        {
            key: "mode",
            header: "Mode",
            render: (value) => (
                <span className={value === "default" ? "text-foreground font-medium" : "text-primary font-medium"}>
          {value === "default" ? "Default (Multi-language)" : "Custom"}
        </span>
            ),
        },
        {
            key: "updatedBy",
            header: "Updated By",
            render: (value, row) => {
                if (!value) return <span className="text-muted-foreground">System</span>

                // If updatedBy is populated with user object
                if (typeof value === "object" && value !== null) {
                    const user = value as any
                    return (
                        <div className="flex flex-col">
              <span className="font-medium">
                {user.firstName} {user.lastName}
              </span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                        </div>
                    )
                }

                // If it's just the ID
                return <span className="text-muted-foreground">User ID: {value as string}</span>
            },
        },
        {
            key: "updatedAt",
            header: "Updated At",
            render: (value) => <span>{new Date(value as string).toLocaleString()}</span>,
        },
    ]

    return (
        <div className="p-6 border-border border-l-2 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Patient Intake Settings</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Update Patient Intake Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                <div className="flex items-center space-x-2 mb-4">
                                    <Checkbox
                                        id="default-intake"
                                        checked={useDefaultIntake}
                                        onCheckedChange={(checked) => handleDefaultIntakeToggle(checked as boolean)}
                                    />
                                    <label
                                        htmlFor="default-intake"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Use Default intake message
                                    </label>
                                    <button
                                        onClick={() => setIsInfoDrawerOpen(true)}
                                        className="ml-1 text-muted-foreground hover:text-foreground"
                                        aria-label="More information about message modes"
                                    >
                                        <Info className="h-4 w-4" />
                                    </button>
                                </div>

                                {useDefaultIntake && (
                                    <div className="mb-4">
                                        <label className="block mb-2 font-medium">Select Language</label>
                                        <SingleChoiceFormField
                                            fieldName="language"
                                            choices={availableLanguages}
                                            value={selectedLanguage}
                                            onChange={handleLanguageChange}
                                        />
                                    </div>
                                )}

                                <div>
                                    <label className="block mb-2 font-medium">Intake Message</label>
                                    <textarea
                                        value={intakeMessage}
                                        onChange={(e) => {
                                            setIntakeMessage(e.target.value)
                                            if (useDefaultIntake) {
                                                setUseDefaultIntake(false)
                                                setMode("custom")
                                            }
                                        }}
                                        className="w-full p-2 border rounded-md min-h-[120px]"
                                        placeholder="Enter patient intake message..."
                                        dir="auto" // Automatically detect text direction (RTL/LTR)
                                        disabled={useDefaultIntake}
                                    />
                                </div>

                                <div className="flex items-center space-x-2 mb-4">
                                    <Checkbox
                                        id="custom-confirmation"
                                        checked={useCustomConfirmation}
                                        onCheckedChange={(checked) => {
                                            setUseCustomConfirmation(checked as boolean)
                                            if (checked && useDefaultIntake) {
                                                // If enabling custom confirmation while in default mode
                                                setUseDefaultIntake(false)
                                                setMode("custom")
                                            }
                                        }}
                                    />
                                    <label
                                        htmlFor="custom-confirmation"
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        Send Custom Confirmation Message
                                    </label>
                                    <button
                                        onClick={() => setIsInfoDrawerOpen(true)}
                                        className="ml-1 text-muted-foreground hover:text-foreground"
                                        aria-label="More information about confirmation messages"
                                    >
                                        <Info className="h-4 w-4" />
                                    </button>
                                </div>

                                {useCustomConfirmation && (
                                    <div>
                                        <label className="block mb-2 font-medium">Confirmation Message</label>
                                        <textarea
                                            value={confirmationMessage}
                                            onChange={(e) => {
                                                setConfirmationMessage(e.target.value)
                                                if (useDefaultIntake) {
                                                    setUseDefaultIntake(false)
                                                    setMode("custom")
                                                }
                                            }}
                                            className="w-full p-2 border rounded-md min-h-[120px]"
                                            placeholder="Enter confirmation message..."
                                            dir="auto" // Automatically detect text direction (RTL/LTR)
                                        />
                                    </div>
                                )}

                                <Button onClick={updatePatientIntake} disabled={loading} variant="submit" className="w-full">
                                    {loading ? "Updating..." : "Update Settings"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>Previous Patient Intake Settings</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {patientIntakes ? (
                                <Table
                                    data={patientIntakes}
                                    columns={columns}
                                    backgroundColor="background"
                                    textColor="foreground"
                                    borderColor="border"
                                    headerBackgroundColor="muted"
                                    headerTextColor="muted-foreground"
                                    hoverBackgroundColor="muted/50"
                                    hoverTextColor="foreground"
                                    stickyHeader={true}
                                />
                            ) : (
                                <p>Loading previous settings...</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div>
                    <Card>
                        <CardHeader>
                            <CardTitle>Telegram Preview</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <TelegramExample
                                initialMessage={intakeMessage || undefined}
                                confirmationMessage={useCustomConfirmation ? confirmationMessage : undefined}
                                patientUrl={patientUrl}
                            />
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Information Drawer */}
            <Drawer isOpen={isInfoDrawerOpen} onClose={() => setIsInfoDrawerOpen(false)}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Message Settings Information</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-6">
                        <h3 className="text-lg font-semibold mb-4">Default Multi-language Messages</h3>
                        <p className="mb-4">
                            When <strong>Default Multi-language Messages</strong> is selected, the system will automatically send
                            messages in the patients selected language. This means:
                        </p>
                        <ul className="list-disc pl-6 mb-6 space-y-2">
                            <li>Patients will receive messages in their preferred language</li>
                            <li>
                                The system supports 8 languages: English, Arabic, Farsi, Pashto, Turkish, Urdu, Spanish, and French
                            </li>
                            <li>You can preview each languages message by selecting it from the dropdown</li>
                            <li>All language versions are maintained by the system</li>
                        </ul>

                        <h3 className="text-lg font-semibold mb-4">Custom Messages</h3>
                        <p className="mb-4">
                            When you choose to use <strong>Custom Messages</strong>:
                        </p>
                        <ul className="list-disc pl-6 mb-6 space-y-2">
                            <li>The exact same message will be sent to all patients regardless of their language preference</li>
                            <li>You have complete control over the content of the message</li>
                            <li>You will need to provide translations manually if you want to support multiple languages</li>
                            <li>The message will be sent exactly as entered in the text area</li>
                        </ul>

                        <h3 className="text-lg font-semibold mb-4">Confirmation Messages</h3>
                        <p className="mb-4">
                            The <strong>Custom Confirmation Message</strong> option allows you to:
                        </p>
                        <ul className="list-disc pl-6 space-y-2">
                            <li>Send a follow-up message after the patient completes registration</li>
                            <li>Customize the thank you message that patients receive</li>
                            <li>When using default messages, confirmation messages are also translated automatically</li>
                            <li>When using custom messages, the same confirmation text is sent to all patients</li>
                        </ul>
                    </div>
                </DrawerContent>
            </Drawer>
        </div>
    )
}
