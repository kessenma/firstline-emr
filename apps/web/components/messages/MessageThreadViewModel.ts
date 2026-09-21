"use client"

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface Message {
    _id: string;
    text: string;
    sender: string;
    timestamp: Date;
    translatedText?: string;
    isTranslated?: boolean;
}

export function useMessageThreadViewModel(chatId: string) {
    const { data: session } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const response = await fetch(`/api/messages/${chatId}`);
                if (!response.ok) {
                    throw new Error("Failed to fetch chat");
                }
                const data = await response.json();
                setMessages(data.messages);
            } catch (err) {
                setError("Failed to load chat. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [chatId]);

    const sendMessage = async (text: string) => {
        try {
            const response = await fetch(`/api/messages/${chatId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, senderId: session?.user?.id }),
            });
            if (!response.ok) throw new Error("Failed to send message");

            const newMessage = await response.json();
            setMessages((prev) => [...prev, newMessage]);
        } catch (err) {
            console.error(err);
        }
    };

    const translateMessages = async () => {
        if (isTranslating) return;
        
        setIsTranslating(true);
        try {
            const updatedMessages = await Promise.all(
                messages.map(async (message) => {
                    // Skip if already translated or empty text
                    if (message.isTranslated || !message.text.trim()) {
                        return message;
                    }

                    try {
                        const response = await fetch("/api/translate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                text: message.text,
                                targetLang: "English",
                            }),
                        });

                        if (response.ok) {
                            const result = await response.json();
                            return {
                                ...message,
                                translatedText: result.translatedText,
                                isTranslated: true,
                            };
                        }
                    } catch (err) {
                        console.error("Translation failed for message:", message._id, err);
                    }

                    return message;
                })
            );

            setMessages(updatedMessages);
        } catch (err) {
            console.error("Translation error:", err);
            setError("Failed to translate messages. Please try again.");
        } finally {
            setIsTranslating(false);
        }
    };

    return { messages, loading, error, sendMessage, translateMessages, isTranslating };
}