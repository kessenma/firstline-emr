// apps/web/components/patient-chart/videocall/VideoCallView.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Video, VideoIcon, Loader2, PhoneOff } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/CopyButton";
import VideoCallInterface from "./VideoCallInterface";
import CallHistoryList from "./CallHistoryList";
import DoctorPhotoCaptureLayer from "./DoctorPhotoCaptureLayer";
import SendInviteDialog from "./SendInviteDialog";
import { useVideoCallViewModel } from "./VideoCallViewModel";

const VideoCallView: React.FC = () => {
  const {
    patientId,
    patientName,
    canSendViaTelegram,
    activeCall,
    starting,
    error,
    history,
    loadingHistory,
    invitePreview,
    inviteSendState,
    invitePromptOpen,
    dismissInvitePrompt,
    startCall,
    endCall,
    sendInviteViaTelegram,
    saveCallNotes,
  } = useVideoCallViewModel();

  return (
    <div className="min-h-screen bg-gradient-to-b from-accent to-background pb-24 pt-12">
      <div className="mx-auto max-w-4xl space-y-6">
        <Card backgroundOpacity={50}>
          <CardHeader>
            <CardTitle className="text-primary">Video consult</CardTitle>
            <CardDescription className="text-primary/80">
              Start a call and share the link with {patientName}. The link
              expires in 2 hours.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {!activeCall ? (
              <Button
                onClick={startCall}
                disabled={starting}
                className="w-full"
                variant="orange"
              >
                {starting ? (
                  <Loader2 className="mr-4 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-4" size={16} />
                )}
                Start call
                <VideoIcon className="ml-4" size={16} />
              </Button>
            ) : (
              <Button onClick={endCall} className="w-full" variant="destructive">
                <PhoneOff className="mr-4" size={16} />
                End call
              </Button>
            )}

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <AnimatePresence>
              {activeCall && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="flex flex-col space-y-2 rounded-md bg-muted p-4"
                >
                  <p className="text-xs font-medium text-muted-foreground">
                    Patient join link
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="mr-2 flex-1 truncate text-sm">
                      {activeCall.inviteUrl}
                    </span>
                    <CopyButton
                      textToCopy={activeCall.inviteUrl}
                      label="Link"
                      variant="outline"
                      size="sm"
                      className="flex items-center"
                    />
                  </div>

                  {canSendViaTelegram && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="self-start"
                      onClick={() => void sendInviteViaTelegram()}
                      disabled={
                        inviteSendState === "sending" ||
                        inviteSendState === "sent"
                      }
                    >
                      {inviteSendState === "sending" && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      {inviteSendState === "sent"
                        ? "Sent via Telegram"
                        : inviteSendState === "failed"
                          ? "Send failed — retry"
                          : "Send via Telegram"}
                    </Button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {activeCall && (
          <div className="rounded-lg bg-card p-4 shadow-md">
            <h2 className="mb-4 flex items-center justify-center gap-2 text-xl font-bold text-primary">
              <Video className="h-5 w-5" />
              Live call
            </h2>
            {/* The capture button and photo strip anchor themselves to
                CallStage, which is the positioning parent inside the interface —
                so they sit over the video, clear of the controls row. */}
            <div>
              <VideoCallInterface
                token={activeCall.token}
                serverUrl={activeCall.serverUrl}
                onDisconnected={endCall}
              >
                <DoctorPhotoCaptureLayer
                  sessionId={activeCall.sessionId}
                  patientId={patientId}
                />
              </VideoCallInterface>
            </div>
          </div>
        )}

        <Card backgroundOpacity={50}>
          <CardHeader>
            <CardTitle className="text-primary">Call history</CardTitle>
          </CardHeader>
          <CardContent>
            <CallHistoryList
              sessions={history}
              loading={loadingHistory}
              onSaveNotes={saveCallNotes}
            />
          </CardContent>
        </Card>
      </div>

      <SendInviteDialog
        open={invitePromptOpen}
        onClose={dismissInvitePrompt}
        patientName={patientName}
        invitePreview={invitePreview}
        sendState={inviteSendState}
        onSend={sendInviteViaTelegram}
      />
    </div>
  );
};

export default VideoCallView;
