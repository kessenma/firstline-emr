// apps/web/components/messages/AudioNotePlayer.tsx
"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateWaveform, formatAudioTime } from "@fajr/shared/media";

interface AudioNotePlayerProps {
  mediaUrl: string;
}

export function AudioNotePlayer({ mediaUrl }: AudioNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [bars, setBars] = useState<number[]>([]);
  const [duration, setDuration] = useState<number | null>(null);

  useEffect(() => {
    // Reset state for new mediaUrl
    setIsPlaying(false);
    setProgress(0);
    setIsLoading(true);
    setError(null);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    (async () => {
      try {
        const response = await fetch(mediaUrl);
        const data = await response.arrayBuffer();
        const audioContext = new AudioContext();

        let audioBuffer: AudioBuffer;
        try {
          // Happy path: native decode works (Chrome/Firefox for all formats, Safari for MP4/WebM/WAV)
          audioBuffer = await audioContext.decodeAudioData(data.slice(0));
        } catch {
          // Fallback: Safari can't decode OGG/Opus — lazy-load FFmpeg to convert OGG→MP4
          console.log("[AudioNotePlayer] Native decode failed, trying FFmpeg OGG→MP4 fallback...");
          const { FFmpeg } = await import("@ffmpeg/ffmpeg");
          const { fetchFile } = await import("@ffmpeg/util");

          const ffmpeg = new FFmpeg();
          await ffmpeg.load();
          await ffmpeg.writeFile("input.ogg", await fetchFile(new Blob([data])));
          await ffmpeg.exec(["-i", "input.ogg", "-c:a", "aac", "-b:a", "128k", "output.mp4"]);
          const mp4Data = await ffmpeg.readFile("output.mp4") as Uint8Array;
          ffmpeg.terminate();

          const mp4ArrayBuffer = new Uint8Array(mp4Data).buffer;
          audioBuffer = await audioContext.decodeAudioData(mp4ArrayBuffer);
        }

        // Generate waveform after decoding
        const pcmData = audioBuffer.getChannelData(0);
        const waveform = generateWaveform(pcmData, 50);
        setBars(waveform);
        setIsLoading(false);
      } catch (err) {
        console.error("[AudioNotePlayer] Error decoding audio:", err);
        setError("Failed to decode audio.");
        setIsLoading(false);
      }
    })();
  }, [mediaUrl]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  const togglePlayPause = () => {
    if (isLoading) return;

    if (isPlaying) {
      pauseAudio();
    } else {
      if (audioRef.current) {
        audioRef.current.play();
        setIsPlaying(true);
      } else {
        playAudio(mediaUrl);
      }
    }
  };

  const playAudio = (url: string) => {
    if (!audioRef.current) {
      audioRef.current = new Audio(url);
    }

    audioRef.current.onloadedmetadata = () => {
      if (audioRef.current) {
        setDuration(audioRef.current.duration);
      }
    };

    audioRef.current.onended = handleAudioEnd;
    audioRef.current.ontimeupdate = () => {
      if (audioRef.current) {
        setProgress(
          (audioRef.current.currentTime / audioRef.current.duration) * 100
        );
      }
    };

    audioRef.current.play();
    setIsPlaying(true);
  };

  const handleSliderChange = (newValue: number[]) => {
    const [newProgress] = newValue;
    if (audioRef.current) {
      const newTime = (newProgress / 100) * audioRef.current.duration;
      audioRef.current.currentTime = newTime;
      setProgress(newProgress);
    }
  };


  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleAudioEnd = () => {
    setIsPlaying(false);
    setProgress(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };


  const WaveformBars = ({
    bars,
    progress,
  }: {
    bars: number[];
    progress: number;
  }) => {
    return (
      <div className="flex justify-center items-center space-x-1 h-10 w-full">
        {bars.map((height, index) => (
          <motion.div
            key={index}
            className={`w-1 rounded-full z-10 ${
              (index / bars.length) * 100 <= progress
                ? "bg-primary"
                : "bg-muted"
            }`}
            style={{
              height: `${height * 30}px`,
              transition: "height 0.1s ease-in-out",
            }}
          />
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="relative flex flex-col items-center justify-center w-full max-w-[300px] h-[150px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-xs text-muted-foreground mt-2">Loading audio...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-col items-center justify-center w-full max-w-[300px] h-[150px]">
        <p className="text-destructive text-sm">{error}</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center space-y-4 w-full max-w-[300px] overflow-hidden">
      <motion.div
        initial={false}
        animate={{
          background: isPlaying ? "" : "transparent",
        }}
        transition={{ duration: 0.5 }}
        className="w-[300px] h-[150px] p-4 rounded-lg shadow-md relative overflow-hidden"
      >
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex justify-center mb-4"
        >
          <Button
            variant="orangeOutline"
            size="icon"
            onClick={togglePlayPause}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="z-50"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isPlaying ? (
                <motion.div
                  key="pause"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Pause className="h-6 w-6" />
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.2 }}
                >
                  <Play className="h-6 w-6" />
                </motion.div>
              )}
            </AnimatePresence>
          </Button>
        </motion.div>
        {bars.length > 0 && (
          <>
            <WaveformBars bars={bars} progress={progress} />
            <Slider
              value={[progress]}
              max={100}
              step={0.1}
              onValueChange={handleSliderChange}
              className="w-full bg-primary mt-2"
              aria-label="Audio progress"
            />
          </>
        )}
      </motion.div>
      {duration !== null && (
        <motion.div className="z-50 absolute bottom-0.5 text-center text-sm text-primary">
          {formatAudioTime(duration)}
        </motion.div>
      )}
    </div>
  );
}
