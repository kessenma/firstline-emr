// apps/web/components/messages/InternalMessageInput.tsx
"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Send, Image, Plus, Mic, Square, Loader, FileText, UserSearch } from "lucide-react";
import { AutoExpandingInput } from "@/components/ui/auto-expanding-input";
import { PatientSearchDialog, type PatientSearchResult } from "./PatientSearchDialog";

interface InternalMessageInputProps {
  newMessage: string;
  setNewMessage: (message: string) => void;
  sendMessage: () => void;
  sendImage: (file: File) => void;
  sendAudioMessage: (file: Blob, duration: number) => void;
  sendDocument: (file: File) => void;
  onSendPatientCard?: (patient: PatientSearchResult) => void;
  isLoading: boolean;
  threadId: string;
}

export const InternalMessageInput: React.FC<InternalMessageInputProps> = ({
  newMessage,
  setNewMessage,
  sendMessage,
  sendImage,
  sendAudioMessage,
  sendDocument,
  onSendPatientCard,
  isLoading,
  threadId,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = React.useState(false);
  const [isRecording, setIsRecording] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(60);
  const [stream, setStream] = React.useState<MediaStream | null>(null);

  const mediaRecorder = React.useRef<MediaRecorder | null>(null);
  const audioChunks = React.useRef<Blob[]>([]);
  const startTimeRef = React.useRef<number | null>(null);
  const timerRef = React.useRef<NodeJS.Timeout | null>(null);

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB limit for images
  const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024; // 10MB limit for documents

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_IMAGE_SIZE) {
        alert("File size exceeds the limit. Please upload a smaller file.");
        return;
      }
      sendImage(file);
    }
  };

  const handleDocumentUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      if (file.size > MAX_DOCUMENT_SIZE) {
        alert("File size exceeds the limit. Please upload a smaller file.");
        return;
      }
      sendDocument(file);
    }
  };

  const startRecording = React.useCallback(async () => {
    try {
      const userMediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setStream(userMediaStream);

      const mimeType = MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "audio/webm";
      console.log("[InternalMessageInput] Using MIME type:", mimeType);

      mediaRecorder.current = new MediaRecorder(userMediaStream, { mimeType });
      startTimeRef.current = Date.now();

      mediaRecorder.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.current.push(event.data);
        }
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: mimeType });
        audioChunks.current = [];

        const duration = startTimeRef.current
          ? Math.round((Date.now() - startTimeRef.current) / 1000)
          : 0;

        setIsProcessing(true);

        try {
          // Convert WebM to MP4 so mobile player can decode it
          let finalBlob = audioBlob;
          if (mimeType.includes('webm')) {
            try {
              console.log('[InternalMessageInput] Converting WebM→MP4 for mobile compatibility...');
              const { FFmpeg } = await import('@ffmpeg/ffmpeg');
              const { fetchFile } = await import('@ffmpeg/util');
              const ffmpeg = new FFmpeg();
              await ffmpeg.load();
              await ffmpeg.writeFile('input.webm', await fetchFile(audioBlob));
              await ffmpeg.exec(['-i', 'input.webm', '-c:a', 'aac', '-b:a', '128k', 'output.mp4']);
              const mp4Data = await ffmpeg.readFile('output.mp4') as Uint8Array;
              ffmpeg.terminate();
              finalBlob = new Blob([new Uint8Array(mp4Data)], { type: 'audio/mp4' });
              console.log('[InternalMessageInput] Conversion complete:', finalBlob.size, 'bytes');
            } catch (convErr) {
              console.warn('[InternalMessageInput] WebM→MP4 conversion failed, using original:', convErr);
            }
          }

          console.log("[InternalMessageInput] Audio ready:", {
            type: finalBlob.type,
            size: finalBlob.size,
          });

          sendAudioMessage(finalBlob, duration);
        } catch (error) {
          console.error("Error processing audio:", error);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.current.start();
      setIsRecording(true);
      setTimeLeft(60);
    } catch (error) {
      console.error("Error starting recording:", error);
    }
  }, [sendAudioMessage]);

  const stopRecording = React.useCallback(() => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    }
  }, [isRecording, stream]);

  React.useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            stopRecording();
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isRecording, stopRecording, stream]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        sendMessage();
      }}
      className="flex flex-col w-full gap-2"
    >
      <div className="flex items-end gap-2">
        <AutoExpandingInput
          placeholder="Type your message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          minRows={1}
          maxRows={5}
          className="grow"
        />
        <div className="flex gap-2">
          <Button
            type="button"
            size="icon"
            variant="outline"
            onClick={() => setExpanded((prev) => !prev)}
            className="rounded-full h-10 w-10"
          >
            <Plus
              className={`h-4 w-4 transform transition-transform ${expanded ? "rotate-45" : ""}`}
            />
            <span className="sr-only">Toggle Options</span>
          </Button>

          {expanded && (
            <div className="flex gap-2 transition-all duration-300">
              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() =>
                  document.getElementById("internal-image-upload")?.click()
                }
                disabled={isLoading}
                className="rounded-full h-10 w-10"
              >
                <Image className="h-4 w-4" aria-label="Upload Image" />
                <span className="sr-only">Upload Image</span>
              </Button>

              <input
                id="internal-image-upload"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              <Button
                type="button"
                size="icon"
                variant="outline"
                onClick={() =>
                  document.getElementById("internal-document-upload")?.click()
                }
                disabled={isLoading}
                className="rounded-full h-10 w-10"
              >
                <FileText className="h-4 w-4" aria-label="Upload Document" />
                <span className="sr-only">Upload Document</span>
              </Button>

              <input
                id="internal-document-upload"
                type="file"
                accept=".pdf,.doc,.docx,.txt,.csv,.xlsx,.xls"
                onChange={handleDocumentUpload}
                className="hidden"
              />

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading || isProcessing}
                aria-label={isRecording ? "Stop recording" : "Start recording"}
                className="rounded-full h-10 w-10"
              >
                {isLoading || isProcessing ? (
                  <Loader className="animate-spin h-4 w-4" />
                ) : isRecording ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>

              {onSendPatientCard && (
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  onClick={() => setPatientSearchOpen(true)}
                  disabled={isLoading}
                  className="rounded-full h-10 w-10"
                >
                  <UserSearch className="h-4 w-4" aria-label="Search Patient" />
                  <span className="sr-only">Search Patient</span>
                </Button>
              )}
            </div>
          )}

          {onSendPatientCard && (
            <PatientSearchDialog
              open={patientSearchOpen}
              onOpenChange={setPatientSearchOpen}
              onSelectPatient={onSendPatientCard}
            />
          )}

          <Button
            variant="orange"
            type="submit"
            size="icon"
            disabled={isLoading || newMessage.trim().length === 0}
            className="rounded-full h-10 w-10 transition-colors hover:bg-primary"
          >
            <Send className="h-4 w-4" />
            <span className="sr-only">Send</span>
          </Button>
        </div>
      </div>
    </form>
  );
};
