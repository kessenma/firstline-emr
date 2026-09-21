"use client"
import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { getTelegramBotName } from '@/utils/telegram'

interface TelegramExampleProps {
    initialMessage?: string;
    confirmationMessage?: string;
    patientUrl?: string;
}

export function TelegramExample({
                                    initialMessage = "مرحباً، الرجاء التسجيل بالرابط أدناه",
                                    confirmationMessage = "شكرا على التسجيل.",
                                    patientUrl = "http://localhost:3000/new-patient/telegram/67edf48fa6229bc4bec7a152-8051934548",
                                }: TelegramExampleProps) {
    const [botName, setBotName] = useState(getTelegramBotName())

    useEffect(() => {
        // Update bot name from environment variable
        setBotName(getTelegramBotName())
    }, [])

    return (
        <div className="max-w-[320px] mx-auto">
            <div className="rounded-[40px] overflow-hidden border-8 border-border bg-muted shadow-sm">
                {/* iPhone frame */}
                <div className="relative bg-background pt-12 pb-16">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/3 h-6 bg-background rounded-b-xl flex justify-center">
                        <div className="w-2 h-2 bg-muted rounded-full mt-1"></div>
                    </div>

                    {/* Telegram chat interface */}
                    <div className="bg-card h-[600px] relative overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center p-3 border-b border-border">
                            <button className="text-primary mr-3">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M15 18L9 12L15 6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </button>
                            <div className="flex items-center">
                                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center overflow-hidden">
                                    <Image
                                        src="/placeholder.svg"
                                        alt="Bot Avatar"
                                        width={40}
                                        height={40}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="ml-3">
                                    <div className="text-foreground font-medium">{botName}</div>
                                    <div className="text-muted-foreground text-xs">bot</div>
                                </div>
                            </div>
                            <div className="ml-auto flex">
                                <button className="text-primary mx-2">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                                <button className="text-primary">
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path
                                            d="M5 12H5.01M12 12H12.01M19 12H19.01M6 12C6 12.5523 5.55228 13 5 13C4.44772 13 4 12.5523 4 12C4 11.4477 4.44772 11 5 11C5.55228 11 6 11.4477 6 12ZM13 12C13 12.5523 12.5523 13 12 13C11.4477 13 11 12.5523 11 12C11 11.4477 11.4477 11 12 11C12.5523 11 13 11.4477 13 12ZM20 12C20 12.5523 19.5523 13 19 13C18.4477 13 18 12.5523 18 12C18 11.4477 18.4477 11 19 11C19.5523 11 20 11.4477 20 12Z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* Chat messages */}
                        <div className="p-3 overflow-y-auto h-[calc(100%-120px)]">
                            {/* User start command */}
                            <div className="mb-4 ml-auto max-w-[80%]">
                                <div className="bg-primary text-primary-foreground p-3 rounded-lg rounded-tr-none">
                                    <p className="text-sm">/start</p>
                                    <div className="text-xs text-muted-foreground text-right mt-1 flex items-center justify-end">
                                        10:38 PM <Check className="w-4 h-4 ml-1 text-muted-foreground" />
                                    </div>
                                </div>
                            </div>

                            {/* Bot initial message */}
                            <div className="mb-4 max-w-[80%]">
                                <div className="bg-card text-foreground p-3 rounded-lg rounded-tl-none">
                                    <p className="text-sm whitespace-pre-wrap">{initialMessage}</p>
                                    <div className="text-xs text-muted-foreground text-right mt-1">
                                        10:38 PM
                                    </div>
                                </div>
                            </div>

                            {/* Patient URL message */}
                            <div className="mb-4 max-w-[80%]">
                                <div className="bg-card text-foreground p-3 rounded-lg rounded-tl-none">
                                    <p className="text-sm text-primary break-all">
                                        {patientUrl}
                                    </p>
                                    <div className="text-xs text-muted-foreground text-right mt-1">
                                        10:38 PM
                                    </div>
                                </div>
                            </div>

                            {/* Bot confirmation message */}
                            <div className="mb-4 max-w-[80%]">
                                <div className="bg-card text-foreground p-3 rounded-lg rounded-tl-none">
                                    <p className="text-sm">{confirmationMessage}</p>
                                    <div className="text-xs text-muted-foreground text-right mt-1">
                                        10:39 PM
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Input area */}
                        <div className="absolute bottom-0 w-full bg-card border-t border-border p-2">
                            <div className="bg-muted rounded-full flex items-center px-4 py-2">
                                <input
                                    type="text"
                                    placeholder="..."
                                    className="bg-transparent text-foreground w-full outline-hidden text-sm"
                                    disabled
                                />
                                <div className="flex space-x-2 ml-2">
                                    <button className="text-muted-foreground">
                                    </button>
                                    <button className="text-muted-foreground">
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12 18.5C15.5899 18.5 18.5 15.5899 18.5 12C18.5 8.41015 15.5899 5.5 12 5.5C8.41015 5.5 5.5 8.41015 5.5 12C5.5 15.5899 8.41015 18.5 12 18.5Z" stroke="currentColor" strokeWidth="2"/>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
