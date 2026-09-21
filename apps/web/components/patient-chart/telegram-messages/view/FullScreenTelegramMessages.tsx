"use client"

import React, { useRef, useEffect, useState } from "react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from 'lucide-react';
import { MessageInput } from "./MessageInput";
import { MessageList } from "./MessageList";
import { TelegramHeader } from "./TelegramHeader";

interface FullScreenTelegramMessagesProps {
    messages: any[];
    newMessage: string;
    setNewMessage: (message: string) => void;
    sendMessage: () => void;
    sendImage: (file: File) => void;
    sendAudioMessage: (file: Blob, duration: number) => void;
    isLoading: boolean;
    telegramChatId: string;
    isLoadingMessages: boolean;
    toggleFullScreen: () => void;
    translateMessages?: () => Promise<{ translatedCount: number }>;
    isTranslating?: boolean;
    threadInfo?: {
        patientId?: string
        participants?: Array<{
            _id: string
            firstName: string
            lastName: string
            email: string
            image?: string
        }>
    }
}

export const FullScreenTelegramMessages: React.FC<FullScreenTelegramMessagesProps> = ({
                                                                                          messages,
                                                                                          newMessage,
                                                                                          setNewMessage,
                                                                                          sendMessage,
                                                                                          sendImage,
                                                                                          sendAudioMessage,
                                                                                          isLoading,
                                                                                          telegramChatId,
                                                                                          isLoadingMessages,
                                                                                          toggleFullScreen,
                                                                                          translateMessages,
                                                                                          isTranslating,
                                                                                          threadInfo,
                                                                                      }) => {
    const [decryptedImages, setDecryptedImages] = useState<{ [key: string]: string }>({});
    const scrollAreaRef = useRef<HTMLDivElement | null>(null);
    const [messageScale, setMessageScale] = useState(1);

    // Zoom functions
    const zoomIn = () => setMessageScale(prev => Math.min(prev + 0.1, 1.5));
    const zoomOut = () => setMessageScale(prev => Math.max(prev - 0.1, 0.5));

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                toggleFullScreen();
            }
        };

        document.addEventListener('keydown', handleEscapeKey);

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [toggleFullScreen]);

    return (
        <div className="flex fixed inset-0 z-50 justify-center items-center p-4 bg-background">
            <Card className="flex flex-col mx-auto w-full max-w-4xl h-full shadow-lg bg-background">
                <CardHeader className="p-0 border-b">
                     <div className="flex justify-between items-center p-4">
                         <TelegramHeader
                             threadInfo={threadInfo}
                             toggleFullScreen={toggleFullScreen}
                             telegramChatId={telegramChatId}
                             translateMessages={translateMessages}
                             isTranslating={isTranslating}
                         />
                         <div className="flex gap-2 items-center">
                             <Button variant="darkBlueOutline" size="icon" onClick={zoomOut}>
                                 <ZoomOut className="w-4 h-4" />
                             </Button>
                             <Button variant="darkBlueOutline" size="icon" onClick={zoomIn}>
                                 <ZoomIn className="w-4 h-4" />
                             </Button>
                         </div>
                     </div>
                 </CardHeader>
                <CardContent className="overflow-hidden grow p-0">
                    <div
                        style={{
                            transform: `scale(${messageScale})`,
                            transformOrigin: "center top",
                            height: "100%",
                        }}
                    >
                        <MessageList
                            messages={messages}
                            isLoadingMessages={isLoadingMessages}
                            threadInfo={threadInfo}
                            decryptedImages={decryptedImages}
                            scrollAreaRef={scrollAreaRef}
                        />
                    </div>
                </CardContent>
                <CardFooter className="p-4 border-t">
                    <MessageInput
                        newMessage={newMessage}
                        setNewMessage={setNewMessage}
                        sendMessage={sendMessage}
                        sendImage={sendImage}
                        sendAudioMessage={sendAudioMessage}
                        isLoading={isLoading}
                        telegramChatId={telegramChatId}
                    />
                </CardFooter>
            </Card>
        </div>
    );
};
