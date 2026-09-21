// apps/web/components/patient-chart/telegram-messages/TelegramMessagesDoctorView.tsx

    "use client"

    import React, { useEffect, useRef } from "react"
    import useTelegramMessagesViewModel from "./TelegramMessagesViewModel"
    import { TelegramMessagesView } from "./TelegramMessagesView"
    import { CircleLoader } from "react-spinners"
    import { ToastProvider } from "@/components/ui/toast"
    import { ToastComponent } from "@/components/hooks/useToast"
    import { usePatientDashboard } from "@/components/patient-chart/PatientViewModelContext"


    const TelegramMessagesDoctorView: React.FC<{ telegramChatId: string; doctorEmail: string; languageUsed: string }> = ({
                                                                                                                             telegramChatId,
                                                                                                                             doctorEmail,
                                                                                                                             languageUsed,
                                                                                                                         }) => {
        const { patientInfo } = usePatientDashboard();

        const {
            messages,
            newMessage,
            setNewMessage,
            sendMessage,
            sendWithTranslation,
            translateText,
            isLanguageMismatch,
            sendImage,
            sendAudioMessage,
            loadMessages,
            isLoading,
            setMessages,
            threadInfo,
            translateMessages,
            isTranslating,
            toggleTranslation,
        } = useTelegramMessagesViewModel(patientInfo?.patientID || "", telegramChatId, languageUsed);

        const [isLoadingMessages, setIsLoadingMessages] = React.useState(true);
        const scrollAreaRef = useRef<HTMLDivElement | null>(null);

        useEffect(() => {
            if (telegramChatId) {
                setIsLoadingMessages(true);
                loadMessages()
                    .then(() => {
                        // messages are now loaded into viewModel's messages state
                    })
                    .finally(() => setIsLoadingMessages(false));
            }
        }, [loadMessages, telegramChatId]);

        return (
            <ToastProvider>
                <div className="w-full h-full">
                    {isLoadingMessages ? (
                        <div className="flex justify-center items-center h-64">
                            <CircleLoader color="hsl(var(--primary))" />
                        </div>
                    ) : (
                        <TelegramMessagesView
                            scrollAreaRef={scrollAreaRef}
                            telegramChatId={telegramChatId}
                            messages={messages}
                            setMessages={setMessages}
                            newMessage={newMessage}
                            setNewMessage={setNewMessage}
                            sendMessage={sendMessage}
                            sendWithTranslation={sendWithTranslation}
                            translateText={translateText}
                            isLanguageMismatch={isLanguageMismatch}
                            sendImage={sendImage}
                            sendAudioMessage={sendAudioMessage}
                            isLoading={isLoading}
                            isLoadingMessages={isLoadingMessages}
                            doctorEmail={doctorEmail}
                            threadInfo={threadInfo}
                            translateMessages={translateMessages}
                            isTranslating={isTranslating}
                            toggleTranslation={toggleTranslation}
                        />
                    )}
                </div>
                <ToastComponent />
            </ToastProvider>
        );
    };

    export default TelegramMessagesDoctorView
