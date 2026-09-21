// apps/web/components/patient-chart/telegram-messages/view-model/http-polling-service.ts
"use client"

import type { TelegramMessage } from "./types"

class HttpPollingService {
    private pollingIntervals: Map<string, NodeJS.Timeout> = new Map()
    private messageHandlers: Map<string, ((message: TelegramMessage) => void)[]> = new Map()
    private lastMessageIds: Map<string, string> = new Map()
    private pollingInterval = 10000 // Poll every 10 seconds
    private apiBaseUrl: string

    constructor() {
        // Determine the API base URL
        this.apiBaseUrl = typeof window !== "undefined"
            ? (process.env.NEXT_PUBLIC_WEBSOCKET_URL?.replace('ws://', 'http://').replace('wss://', 'https://') || 'http://localhost:3001')
            : 'http://websocket-server:3001'
    }

    startPolling(telegramChatId: string): void {
        // console.log(`Starting polling for chat: ${telegramChatId}`)

        // Stop any existing polling for this chat
        this.stopPolling(telegramChatId)

        // Start a new polling interval
        const intervalId = setInterval(() => {
            this.pollMessages(telegramChatId)
        }, this.pollingInterval)

        this.pollingIntervals.set(telegramChatId, intervalId)

        // Do an immediate poll
        this.pollMessages(telegramChatId)
    }

    stopPolling(telegramChatId: string): void {
        console.log(`Stopping polling for chat: ${telegramChatId}`)

        const intervalId = this.pollingIntervals.get(telegramChatId)
        if (intervalId) {
            clearInterval(intervalId)
            this.pollingIntervals.delete(telegramChatId)
        }
    }

    private async pollMessages(telegramChatId: string): Promise<void> {
        try {
            const response = await fetch(`/api/messages/${telegramChatId}`)

            if (!response.ok) {
                console.error(`Error polling messages: ${response.status} ${response.statusText}`)
                return
            }

            const data = await response.json()
            const messages: TelegramMessage[] = data.messages || []

            // Get the last message ID we've seen
            const lastMessageId = this.lastMessageIds.get(telegramChatId)

            // Find new messages (ones we haven't seen before)
            const newMessages = lastMessageId
                ? messages.filter(msg => msg._id > lastMessageId)
                : messages

            if (newMessages.length > 0) {
                console.log(`Received ${newMessages.length} new messages for chat ${telegramChatId}`)

                // Update the last message ID
                const latestMessage = messages[messages.length - 1]
                if (latestMessage && latestMessage._id) {
                    this.lastMessageIds.set(telegramChatId, latestMessage._id)
                }

                // Notify handlers of new messages
                const handlers = this.messageHandlers.get(telegramChatId) || []
                newMessages.forEach(message => {
                    handlers.forEach(handler => handler(message))
                })
            }
        } catch (error) {
            console.error(`Error polling messages for chat ${telegramChatId}:`, error)
        }
    }

    subscribeToMessages(telegramChatId: string, handler: (message: TelegramMessage) => void): void {
        console.log(`Subscribing to messages for chat: ${telegramChatId}`)

        // Add the handler to our map
        const handlers = this.messageHandlers.get(telegramChatId) || []
        handlers.push(handler)
        this.messageHandlers.set(telegramChatId, handlers)

        // Start polling if not already polling
        if (!this.pollingIntervals.has(telegramChatId)) {
            this.startPolling(telegramChatId)
        }
    }

    unsubscribeFromMessages(telegramChatId: string): void {
        console.log(`Unsubscribing from messages for chat: ${telegramChatId}`)
        this.messageHandlers.delete(telegramChatId)
        this.stopPolling(telegramChatId)
    }

    // Method to send a message via HTTP
    async sendMessage(telegramChatId: string, message: any): Promise<boolean> {
        try {
            // Ensure message has an _id
            if (!message._id) {
                message._id = new Date().getTime().toString()
            }

            console.log(`Sending message to chat: ${telegramChatId}`)

            const response = await fetch(`${this.apiBaseUrl}/api/send-message`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    telegramChatId,
                    message
                })
            })

            if (!response.ok) {
                console.error(`Error sending message: ${response.status} ${response.statusText}`)
                return false
            }

            return true
        } catch (error) {
            console.error(`Error sending message to chat ${telegramChatId}:`, error)
            return false
        }
    }
}

// Create a singleton instance
const httpPollingService = new HttpPollingService()
export default httpPollingService
