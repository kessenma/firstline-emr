// apps/web/components/messages/InternalChatHeader.tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, RefreshCw, UserPlus, Loader2, Users, LogOut } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UserSearchInput } from "./staff/UserSearchInput";
import { ParticipantMarquee } from "./ParticipantMarquee";

interface Participant {
  _id?: string;
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  image?: string;
  accountType?: string;
  doctorSpecialty?: string[];
}

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  accountType: string;
  image?: string;
}

interface ThreadInfo {
  title?: string;
  participants?: Participant[];
  _id?: string;
}

type HistoryOption = "none" | "days" | "all";

interface AddParticipantsOptions {
  historyOption: HistoryOption;
  historyDays?: number;
}

interface InternalChatHeaderProps {
  threadTitle: string;
  participantCount: number;
  isRevalidating: boolean;
  isLoading: boolean;
  threadInfo?: ThreadInfo;
  onBack: () => void;
  onAddParticipants?: (userIds: string[], options: AddParticipantsOptions) => Promise<void>;
  onLeaveThread?: () => Promise<void>;
  isSystemGroup?: boolean;
}

export function InternalChatHeader({
  threadTitle,
  participantCount,
  isRevalidating,
  isLoading,
  threadInfo,
  onBack,
  onAddParticipants,
  onLeaveThread,
  isSystemGroup,
}: InternalChatHeaderProps) {
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [isAddingParticipants, setIsAddingParticipants] = useState(false);

  // Chat history options
  const [historyOption, setHistoryOption] = useState<HistoryOption>("none");
  const [historyDays, setHistoryDays] = useState(1);

  // Reset form when popover closes
  useEffect(() => {
    if (!isAddSheetOpen) {
      setSelectedUsers([]);
      setHistoryOption("none");
      setHistoryDays(1);
    }
  }, [isAddSheetOpen]);

  const getParticipantId = (participant: Participant, index: number): string => {
    return participant._id || participant.id || participant.email || `participant-${index}`;
  };

  const getParticipantInitials = (participant: Participant): string => {
    const firstName = participant.firstName || "";
    const lastName = participant.lastName || "";

    if (firstName && lastName) {
      return `${firstName[0].toUpperCase()}${lastName[0].toUpperCase()}`;
    } else if (firstName) {
      return firstName[0].toUpperCase();
    } else if (participant.email) {
      return participant.email[0].toUpperCase();
    }
    return "?";
  };

  const getParticipantName = (participant: Participant): string => {
    const fullName =
      `${participant.firstName || ""} ${participant.lastName || ""}`.trim();
    return fullName || participant.email || "Unknown User";
  };

  // Get existing participant IDs for exclusion
  const existingParticipantIds = threadInfo?.participants?.map(
    (p) => p._id || p.id || ""
  ).filter(Boolean) || [];

  const handleUserSelect = useCallback((user: User) => {
    if (!selectedUsers.find((u) => u.id === user.id)) {
      setSelectedUsers((prev) => [...prev, user]);
    }
  }, [selectedUsers]);

  const handleRemoveUser = useCallback((userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  }, []);

  const handleAddParticipants = async () => {
    if (selectedUsers.length === 0 || !onAddParticipants) return;

    setIsAddingParticipants(true);
    try {
      await onAddParticipants(selectedUsers.map((u) => u.id), {
        historyOption,
        historyDays: historyOption === "days" ? historyDays : undefined,
      });
      setIsAddSheetOpen(false);
    } catch (error) {
      console.error("Failed to add participants:", error);
    } finally {
      setIsAddingParticipants(false);
    }
  };

  return (
    <div className="p-2 border-b">
      <div className="flex items-center gap-2">
        {/* Left: Back button and title */}
        <Button
          variant="orangeOutline"
          size="icon"
          onClick={onBack}
          className="w-8 h-8 flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="text-sm font-medium flex-shrink-0">{threadTitle}</div>
        {isRevalidating && !isLoading && (
          <RefreshCw className="w-3 h-3 text-muted-foreground animate-spin flex-shrink-0" />
        )}

        {/* Center: Participant marquee */}
        {!isLoading && threadInfo?.participants && threadInfo.participants.length > 0 && (
          <ParticipantMarquee
            participants={threadInfo.participants}
            speed={30}
            pauseOnHover={true}
          />
        )}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Right: Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Add Participants Popover */}
          {onAddParticipants && (
            <Popover open={isAddSheetOpen} onOpenChange={setIsAddSheetOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-8 h-8"
                  title="Add participants"
                >
                  <UserPlus className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-4">
                <div className="space-y-4">
                  <h4 className="font-medium text-sm">Add Participants</h4>

                  {/* User Search */}
                  <UserSearchInput
                    selectedUsers={selectedUsers}
                    onUserSelect={handleUserSelect}
                    onUserRemove={handleRemoveUser}
                    placeholder="Search by name or email"
                    disabled={isAddingParticipants}
                    excludeUserIds={existingParticipantIds}
                  />

                  {/* Chat History Options */}
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">
                      Chat History for New Participants
                    </Label>
                    <RadioGroup
                      value={historyOption}
                      onValueChange={(value) => setHistoryOption(value as HistoryOption)}
                      disabled={isAddingParticipants}
                      className="space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="none" id="history-none" />
                        <Label htmlFor="history-none" className="text-xs font-normal cursor-pointer">
                          Don&apos;t include chat history
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="days" id="history-days" />
                        <Label htmlFor="history-days" className="text-xs font-normal cursor-pointer flex items-center gap-1">
                          Include past
                          <Input
                            type="number"
                            min={1}
                            max={365}
                            value={historyDays}
                            onChange={(e) => setHistoryDays(Math.max(1, parseInt(e.target.value) || 1))}
                            onClick={() => setHistoryOption("days")}
                            disabled={isAddingParticipants}
                            className="w-12 h-6 text-center text-xs"
                          />
                          days
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="all" id="history-all" />
                        <Label htmlFor="history-all" className="text-xs font-normal cursor-pointer">
                          Include all chat history
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsAddSheetOpen(false)}
                      disabled={isAddingParticipants}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleAddParticipants}
                      disabled={selectedUsers.length === 0 || isAddingParticipants}
                    >
                      {isAddingParticipants && (
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      )}
                      Add
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}

          {/* View Participants Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 h-8 px-2"
              >
                <Users className="w-4 h-4" />
                <span className="text-xs">{participantCount}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Participants ({participantCount})
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {threadInfo?.participants?.map((participant, index) => (
                  <div
                    key={getParticipantId(participant, index)}
                    className="flex items-center gap-2 p-1.5 rounded hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-muted text-[9px] font-medium text-muted-foreground flex-shrink-0">
                      {getParticipantInitials(participant)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {getParticipantName(participant)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {onLeaveThread && !isSystemGroup && (
                <div className="mt-2 pt-2 border-t">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={onLeaveThread}
                  >
                    <LogOut className="w-3 h-3 mr-1" />
                    Leave Thread
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
