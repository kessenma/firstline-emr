"use client"

import React, { useState } from "react";
import { useMessageThreadViewModel } from "./MessageThreadViewModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Languages, Loader2 } from "lucide-react";

export function MessageThreadView({ chatId }: { chatId: string }) {
    const { messages, loading, error, sendMessage, translateMessages, isTranslating } = useMessageThreadViewModel(chatId);
    const [newMessage, setNewMessage] = useState("");
    const router = useRouter();

    const handleSend = () => {
        if (newMessage.trim()) {
            sendMessage(newMessage);
            setNewMessage("");
        }
    };

    if (loading) return <div>Loading chat...</div>;
    if (error) return <div>{error}</div>;

    return (
        <Card className="w-full max-w-4xl mx-auto">
            <CardHeader className="flex items-center justify-between">
                <CardTitle>
                    Chat with {messages[0]?.sender}
                </CardTitle>
                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={translateMessages}
                        disabled={isTranslating}
                        className="flex items-center gap-2"
                    >
                        {isTranslating ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Translating...
                            </>
                        ) : (
                            <>
                                <Languages className="h-4 w-4" />
                                Translate (AR → EN)
                            </>
                        )}
                    </Button>
                    <Button variant="outline" onClick={() => router.push("/messages")}>Back</Button>
                </div>
            </CardHeader>
            <CardContent>
                <ScrollArea className="h-[500px]">
                    {messages.map((message) => (
                        <div key={message._id} className="flex items-start space-x-2 mb-2">
                            <Avatar initials={(message.sender || '').trim()[0]?.toUpperCase() || 'U'} />
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="font-semibold">{message.sender}</p>
                                <div className="space-y-1">
                                    <p>{message.text}</p>
                                    {message.isTranslated && message.translatedText && (
                                        <div className="border-l-2 border-primary pl-2 bg-muted p-2 rounded">
                                            <p className="text-xs text-primary font-medium mb-1">Translation:</p>
                                            <p className="text-foreground">{message.translatedText}</p>
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {new Date(message.timestamp).toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </ScrollArea>
                <div className="mt-4 flex items-center space-x-2">
                    <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <Button onClick={handleSend}>Send</Button>
                </div>
            </CardContent>
        </Card>
    );
}
