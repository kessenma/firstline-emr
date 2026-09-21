// apps/web/components/patient-chart/telegram-messages/view/TelegramHeader.tsx
"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { getAnonymizedName } from "@fajr/shared/patient-utils";
import { Button } from "@/components/ui/button";
import { CardTitle } from "@/components/ui/card";
import {
  Loader2,
  Maximize2,
  Settings,
  Users,
  IdCard,
  MessageSquareCode,
  Languages,
  Copy,
  Check,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { MessageParticipants } from "./MessageParticipants";
import { BarLoader } from "react-spinners";
import { useToast } from "@/components/hooks/useToast";

interface TelegramHeaderProps {
  toggleFullScreen: () => void;
  telegramChatId: string;
  translateMessages?: () => Promise<{ translatedCount: number }>;
  isTranslating?: boolean;
  patientDetails?: {
    firstName: string;
    lastName: string;
    id: string;
  };
  threadInfo?: {
    patientId?: string;
    participants?: Array<{
      _id: string;
      firstName: string;
      lastName: string;
      email: string;
      image?: string;
    }>;
  };
  hideTitle?: boolean;
}

export const TelegramHeader: React.FC<TelegramHeaderProps> = ({
  toggleFullScreen,
  telegramChatId,
  translateMessages,
  isTranslating,
  threadInfo,
  patientDetails,
  hideTitle,
}) => {
  const { setToast } = useToast();
  const [copiedPatientId, setCopiedPatientId] = useState(false);
  const [copiedChatId, setCopiedChatId] = useState(false);

  const handleCopyPatientId = async () => {
    if (threadInfo?.patientId) {
      await navigator.clipboard.writeText(threadInfo.patientId);
      setCopiedPatientId(true);
      setTimeout(() => setCopiedPatientId(false), 2000);
    }
  };

  const handleCopyChatId = async () => {
    await navigator.clipboard.writeText(telegramChatId);
    setCopiedChatId(true);
    setTimeout(() => setCopiedChatId(false), 2000);
  };
  const [patientName, setPatientName] = useState<string>("");

  // Fetch patient name if needed
  useEffect(() => {
    const fetchPatientName = async () => {
      if (!threadInfo?.patientId) return;

      try {
        const response = await fetch(`/api/patient/${threadInfo.patientId}`);
        if (response.ok) {
          const data = await response.json();
          const patient = data.patient;
          setPatientName(
            getAnonymizedName(patient.firstName, patient.lastName),
          );
        }
      } catch (error) {
        console.error("Error fetching patient name:", error);
      }
    };

    fetchPatientName();
  }, [threadInfo?.patientId]);

  return (
    <div className="space-y-2">
      {/* Header with patient ID, settings button, and fullscreen button */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          {!hideTitle && (
            <CardTitle className="text-sm font-medium max-w-[180px]">
              {patientDetails
                ? `${getAnonymizedName(patientDetails.firstName, patientDetails.lastName)} - ${patientDetails.id}`
                : patientName ||
                  (threadInfo?.patientId ? (
                    `Patient: ${String(threadInfo.patientId)}`
                  ) : (
                    <div
                      className="flex justify-center items-center"
                      aria-live="polite"
                    >
                      <BarLoader color={"hsl(var(--primary))"} />
                    </div>
                  ))}
            </CardTitle>
          )}
        </div>
        <div className="flex gap-2 items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-7 h-7 rounded-full border border-input bg-background shadow-xs hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center whitespace-normal break-words rounded-md text-sm font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed p-0">
                <Settings className="h-3.5 w-3.5 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              side="bottom"
              align="end"
              className="w-80 max-w-md z-[9999]"
              sideOffset={8}
            >
              <div className="space-y-2">
                {/* Chat Information */}
                {(threadInfo?.participants &&
                  threadInfo.participants.length > 0) ||
                threadInfo?.patientId ? (
                  <div className="space-y-2">
                    {/* Patient ID */}
                    {threadInfo?.patientId && (
                      <div className="flex justify-between items-center p-2 bg-muted rounded-md">
                        <div className="flex gap-2 items-center">
                          <div className="bg-primary/10 p-1.5 rounded-md">
                            <IdCard className="h-3.5 w-3.5 text-primary" />
                          </div>
                          <span className="text-xs font-medium">
                            Patient ID
                          </span>
                        </div>
                        <div className="flex gap-2 items-center">
                          <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                            {threadInfo.patientId}
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="p-0 w-6 h-6 hover:bg-muted"
                            onClick={handleCopyPatientId}
                          >
                            {copiedPatientId ? (
                              <Check className="w-4 h-4 text-success" />
                            ) : (
                              <Copy className="w-4 h-4 text-primary" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                    {/* Participants */}
                    {threadInfo?.participants &&
                      threadInfo.participants.length > 0 && (
                        <div className="p-2 bg-muted rounded-md">
                          <div className="flex gap-2 items-center mb-2">
                            <div className="bg-success/10 p-1.5 rounded-md">
                              <Users className="h-3.5 w-3.5 text-success" />
                            </div>
                            <span className="text-xs font-medium">
                              Participants ({threadInfo.participants.length})
                            </span>
                          </div>
                          <MessageParticipants
                            participants={threadInfo.participants}
                          />
                        </div>
                      )}
                  </div>
                ) : null}

                {/* Translate Messages Option */}
                {translateMessages && (
                  <div className="flex justify-between items-center p-2 bg-card rounded-md shadow-xs">
                    <div className="flex gap-2 items-center">
                      <div className="bg-primary/10 p-1.5 rounded-md">
                        <Languages className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex items-center">
                        <span className="text-xs font-medium">
                          translate thread
                        </span>
                        <span className="ml-1 text-xs text-muted-foreground">
                          (AR → EN)
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        console.log(
                          "🖱️  [TelegramHeader] Translate button clicked",
                        );
                        if (translateMessages) {
                          try {
                            const result = await translateMessages();
                            if (result?.translatedCount > 0) {
                              setToast({
                                title: "Translation Complete",
                                description: `Successfully translated ${result.translatedCount} message${result.translatedCount === 1 ? "" : "s"} from Arabic to English.`,
                                variant: "success",
                              });
                            } else {
                              setToast({
                                title: "No Messages Translated",
                                description: "No Arabic messages found to translate.",
                                variant: "default",
                              });
                            }
                          } catch (error) {
                            console.error(
                              "❌ [TelegramHeader] Translation error:",
                              error,
                            );
                            setToast({
                              title: "Translation Failed",
                              description:
                                error instanceof Error
                                  ? error.message
                                  : "Failed to translate messages. Please try again.",
                              variant: "error",
                            });
                          }
                        } else {
                          console.error(
                            "❌ [TelegramHeader] translateMessages is undefined!",
                          );
                          setToast({
                            title: "Translation Error",
                            description: "Translation function is not available.",
                            variant: "error",
                          });
                        }
                      }}
                      disabled={isTranslating}
                      className="px-3 h-7 text-xs"
                    >
                      {isTranslating ? (
                        <>
                          <Loader2 className="mr-1 w-3 h-3 animate-spin" />
                          Translating...
                        </>
                      ) : (
                        "Translate"
                      )}
                    </Button>
                  </div>
                )}

                {/* Chat ID */}
                <div className="flex justify-between items-center p-2 bg-card rounded-md shadow-xs">
                  <div className="flex gap-2 items-center">
                    <div className="bg-primary/10 p-1.5 rounded-md">
                      <MessageSquareCode className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <span className="text-xs font-medium">chat ID</span>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground truncate max-w-[120px]">
                      {telegramChatId}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="p-0 w-6 h-6 hover:bg-muted/50"
                      onClick={handleCopyChatId}
                    >
                      {copiedChatId ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="orangeOutline"
            size="icon"
            onClick={toggleFullScreen}
            className="w-7 h-7"
          >
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
};
