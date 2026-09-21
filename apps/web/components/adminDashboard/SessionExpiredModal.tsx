// apps/web/components/adminDashboard/SessionExpiredModal.tsx
import type React from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"

interface SessionExpiredModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccessfulLogin: () => void
}

const SessionExpiredModal: React.FC<SessionExpiredModalProps> = ({ isOpen, onClose, onSuccessfulLogin }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Your session has expired</DialogTitle>
                    <DialogDescription>Please log in again to continue.</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button onClick={onClose} variant="outline">
                        Cancel
                    </Button>
                    <Button onClick={onSuccessfulLogin}>Log in</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export { SessionExpiredModal }

