// apps/web/components/patient-chart/telegram-messages/AudioRecorder.tsx
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, Loader } from 'lucide-react';

interface AudioRecorderProps {
    onRecordingComplete: (file: Blob, duration: number) => void;
    isUploading: boolean;
    chatId: string;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({
                                                         onRecordingComplete,
                                                         isUploading,
                                                         chatId,
                                                     }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [timeLeft, setTimeLeft] = useState(60);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const audioChunks = useRef<Blob[]>([]);
    const startTimeRef = useRef<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = useCallback(async () => {
        try {
            const userMediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            setStream(userMediaStream);

            const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm';
            console.log('[AudioRecorder] Using MIME type:', mimeType);

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

                // Convert WebM to MP4 so mobile player can decode it
                let finalBlob = audioBlob;
                if (mimeType.includes('webm')) {
                    try {
                        console.log('[AudioRecorder] Converting WebM→MP4 for mobile compatibility...');
                        const { FFmpeg } = await import('@ffmpeg/ffmpeg');
                        const { fetchFile } = await import('@ffmpeg/util');
                        const ffmpeg = new FFmpeg();
                        await ffmpeg.load();
                        await ffmpeg.writeFile('input.webm', await fetchFile(audioBlob));
                        await ffmpeg.exec(['-i', 'input.webm', '-c:a', 'aac', '-b:a', '128k', 'output.mp4']);
                        const mp4Data = await ffmpeg.readFile('output.mp4') as Uint8Array;
                        ffmpeg.terminate();
                        finalBlob = new Blob([new Uint8Array(mp4Data)], { type: 'audio/mp4' });
                        console.log('[AudioRecorder] Conversion complete:', finalBlob.size, 'bytes');
                    } catch (convErr) {
                        console.warn('[AudioRecorder] WebM→MP4 conversion failed, using original:', convErr);
                    }
                }

                console.log("[AudioRecorder] Recording complete:", {
                    type: finalBlob.type,
                    size: finalBlob.size,
                    duration,
                });

                onRecordingComplete(finalBlob, duration);
            };

            mediaRecorder.current.start();
            setIsRecording(true);
            setTimeLeft(60);
        } catch (error) {
            console.error("Error starting recording:", error);
        }
    }, [onRecordingComplete]);

    const stopRecording = useCallback(() => {
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

    useEffect(() => {
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
        <Button
            variant="outline"
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isUploading}
            aria-label={isRecording ? "Stop recording" : "Start recording"}
        >
            {isUploading ? (
                <Loader className="animate-spin h-4 w-4" />
            ) : isRecording ? (
                <Square className="h-4 w-4" />
            ) : (
                <Mic className="h-4 w-4" />
            )}
        </Button>
    );
};

export default AudioRecorder;