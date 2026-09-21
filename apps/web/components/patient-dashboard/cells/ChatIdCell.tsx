// apps/web/components/patient-dashboard/cells/ChatIdCell.tsx
"use client";

import { useState } from "react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChatThreadView } from "@/components/messages/ChatThreadView";

interface ChatIdCellProps {
  chatId: string;
}

export const ChatIdCell: React.FC<ChatIdCellProps> = ({ chatId }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleViewChat = () => {
    setIsDialogOpen(true);
  };

  return (
    <div className="flex items-center gap-2">
      <span className="truncate max-w-[120px]">{chatId}</span>
      <Button
        variant="outline"
        size="sm"
        onClick={handleViewChat}
        className="flex items-center gap-1"
      >
        <MessageSquare className="h-4 w-4" />
        <span>View</span>
      </Button>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl w-[90vw]">
          <DialogHeader>
            <DialogTitle>Chat Thread</DialogTitle>
          </DialogHeader>
          <ChatThreadView id={chatId} />
        </DialogContent>
      </Dialog>
    </div>
  );
};
