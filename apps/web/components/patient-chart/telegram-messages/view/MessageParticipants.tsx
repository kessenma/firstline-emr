// apps/web/components/patient-chart/telegram-messages/view/MessageParticipants.tsx

"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

interface MessageParticipantsProps {
    participants: { _id: string }[]
}

export const MessageParticipants: React.FC<MessageParticipantsProps> = ({ participants }) => {
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
    const [userDetails, setUserDetails] = useState<any | null>(null)
    const [loading, setLoading] = useState(false)

    const handleClick = async (userId: string) => {
        setLoading(true)
        try {
            const res = await fetch(`/api/user/${userId}`)
            if (!res.ok) throw new Error("Failed to fetch user info")
            const data = await res.json()
            setUserDetails(data)
        } catch (error) {
            console.error("Error fetching user:", error)
            setUserDetails(null)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-wrap gap-2 justify-end">
            {participants.map((participant) => (
                <Dialog key={participant._id}>
                    <DialogTrigger asChild>
                        <button
                            onClick={() => {
                                setSelectedUserId(participant._id)
                                handleClick(participant._id)
                            }}
                            className="text-[10px] font-mono bg-muted px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground"
                        >
                            {participant._id.slice(0, 6)}...
                        </button>
                    </DialogTrigger>
                    <DialogContent>
                        {loading ? (
                            <div className="flex items-center gap-2">
                                <Loader2 className="animate-spin h-4 w-4" />
                                <span className="text-sm">Loading user details...</span>
                            </div>
                        ) : userDetails ? (
                            <div>
                                <p className="text-sm font-medium">
                                    {userDetails.firstName} {userDetails.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground">{userDetails.email}</p>
                                <p className="text-xs text-muted-foreground">Account Type: {userDetails.accountType}</p>
                                <p className="text-xs text-muted-foreground">
                                    Languages: {(userDetails.languages || []).join(", ")}
                                </p>
                            </div>
                        ) : (
                            <p className="text-xs">No user data available.</p>
                        )}
                    </DialogContent>
                </Dialog>
            ))}
        </div>
    )
}
