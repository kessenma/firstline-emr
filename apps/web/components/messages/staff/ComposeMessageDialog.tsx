"use client";

import React, { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle2 } from "lucide-react";
import { UserSearchInput } from "./UserSearchInput";
import { threadListCache } from "@/lib/messageCache";
import { useSession } from "next-auth/react";

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  image?: string;
}

interface ComposeMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ComposeMessageDialog({
  open,
  onOpenChange,
}: ComposeMessageDialogProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupTitle, setGroupTitle] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isCreatingRef = useRef(false);

  // Auto-detect mode based on number of selected users
  const isGroupChat = selectedUsers.length > 1;

  const handleUserSelect = useCallback((user: User) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, user]);
    }
    setError(null);
  }, [selectedUsers]);

  const handleRemoveUser = useCallback((userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const handleStartConversation = async () => {
    if (selectedUsers.length === 0) {
      setError("Please select at least one user");
      return;
    }

    // Ref-based guard against double-clicks
    if (isCreatingRef.current) return;
    isCreatingRef.current = true;

    setIsCreating(true);
    setError(null);

    try {
      let threadId: string;

      if (selectedUsers.length === 1) {
        // Create or find 1:1 thread
        const res = await fetch("/api/internal-messages/direct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantId: selectedUsers[0].id }),
        });

        if (!res.ok) {
          throw new Error("Failed to start conversation");
        }

        const data = await res.json();
        threadId = data.thread.id;
      } else {
        // Create group thread
        const res = await fetch("/api/internal-messages/group", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            participantIds: selectedUsers.map((u) => u.id),
            title: groupTitle || undefined,
          }),
        });

        if (!res.ok) {
          throw new Error("Failed to create group chat");
        }

        const data = await res.json();
        threadId = data.thread.id;
      }

      // Invalidate cache so thread list refreshes
      if (session?.user?.id) {
        threadListCache.delete(`internal-threads-${session.user.id}`);
      }

      // Show success animation before navigating
      setIsSuccess(true);

      // Wait for animation then navigate
      setTimeout(() => {
        onOpenChange(false);
        router.push(`/messages/${threadId}`);
      }, 600);
    } catch (err) {
      console.error("Error starting conversation:", err);
      setError("Failed to start conversation. Please try again.");
      setIsCreating(false);
      isCreatingRef.current = false;
    }
  };

  const handleClose = () => {
    if (isCreating) return; // Prevent closing while creating
    onOpenChange(false);
    // Reset state after close animation
    setTimeout(() => {
      setSelectedUsers([]);
      setGroupTitle("");
      setError(null);
      setIsCreating(false);
      setIsSuccess(false);
      isCreatingRef.current = false;
    }, 200);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent size="md" scrollable={false}>
        <AnimatePresence mode="wait">
          {isSuccess ? (
            // Success state
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex flex-col items-center justify-center py-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </motion.div>
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 text-lg font-medium"
              >
                {isGroupChat ? "Group created!" : "Starting conversation..."}
              </motion.p>
            </motion.div>
          ) : (
            // Form state
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <DialogHeader>
                <DialogTitle>New Message</DialogTitle>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Teams-style To: field */}
                <UserSearchInput
                  selectedUsers={selectedUsers}
                  onUserSelect={handleUserSelect}
                  onUserRemove={handleRemoveUser}
                  placeholder="Enter name, email or tag"
                  disabled={isCreating}
                />

                {/* Group Title (only shown when 2+ users selected) */}
                <AnimatePresence>
                  {isGroupChat && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2 overflow-hidden"
                    >
                      <Label>Group Name (optional)</Label>
                      <Input
                        type="text"
                        placeholder="Enter a name for this group..."
                        value={groupTitle}
                        onChange={(e) => setGroupTitle(e.target.value)}
                        disabled={isCreating}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Error Message */}
                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-sm text-destructive"
                    >
                      {error}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleStartConversation}
                  disabled={isCreating || selectedUsers.length === 0}
                >
                  {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {isGroupChat ? "Create Group" : "Start Conversation"}
                </Button>
              </DialogFooter>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
