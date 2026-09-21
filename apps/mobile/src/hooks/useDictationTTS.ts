// Unified TTS hook for voice dictation prompts.
// Uses Kokoro TTS (via ExecuTorch) when the model is downloaded,
// falls back to iOS native AVSpeechSynthesizer otherwise.

import { useState, useCallback, useRef, useEffect } from 'react';
import { NativeModules, Platform } from 'react-native';
import { useTextToSpeech } from 'react-native-executorch';
import {
  AudioManager,
  AudioContext,
  AudioBufferSourceNode,
} from 'react-native-audio-api';
import {
  TTS_MODEL,
  TTS_VOICE,
} from '../components/patient-chart/notes/voice-dictation/constants';
import { isVoiceTTSModelDownloaded } from './useVoiceDictationModels';

const TTS_SAMPLE_RATE = 24_000;

export interface UseDictationTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isKokoroReady: boolean;
}

export function useDictationTTS(): UseDictationTTSReturn {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Only load Kokoro if the TTS model was previously downloaded
  const [kokoroRequested] = useState(() => isVoiceTTSModelDownloaded());

  const tts = useTextToSpeech({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    preventLoad: !kokoroRequested,
  });

  const isKokoroReady = tts.isReady;

  // Audio context for Kokoro playback
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const stoppedRef = useRef(false);

  useEffect(() => {
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosMode: 'spokenAudio',
      iosOptions: ['defaultToSpeaker', 'allowBluetooth', 'allowBluetoothA2DP'],
    });

    audioContextRef.current = new AudioContext({ sampleRate: TTS_SAMPLE_RATE });
    audioContextRef.current.suspend();

    return () => {
      audioContextRef.current?.close();
      audioContextRef.current = null;
    };
  }, []);

  const speakWithKokoro = useCallback(
    async (text: string): Promise<void> => {
      const audioContext = audioContextRef.current;
      if (!audioContext) return;

      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      stoppedRef.current = false;

      await tts.stream({
        text,
        onNext: async (audioVec: Float32Array) => {
          if (stoppedRef.current) return;

          return new Promise<void>((resolve) => {
            const audioBuffer = audioContext.createBuffer(
              1,
              audioVec.length,
              TTS_SAMPLE_RATE,
            );
            const channelData = audioBuffer.getChannelData(0);
            channelData.set(audioVec);

            const source = audioContext.createBufferSource();
            sourceRef.current = source;
            source.buffer = audioBuffer;
            source.connect(audioContext.destination);
            source.onEnded = () => resolve();
            source.start();
          });
        },
        onEnd: async () => {
          await audioContext.suspend();
        },
      });
    },
    [tts],
  );

  const speakWithNative = useCallback(async (text: string): Promise<void> => {
    if (Platform.OS !== 'ios') return;
    try {
      await NativeModules.NativeTTSModule.speak(text, 0.5);
    } catch {
      // native TTS unavailable — silently skip
    }
  }, []);

  const speak = useCallback(
    async (text: string): Promise<void> => {
      setIsSpeaking(true);
      try {
        if (isKokoroReady) {
          await speakWithKokoro(text);
        } else {
          await speakWithNative(text);
        }
      } finally {
        setIsSpeaking(false);
      }
    },
    [isKokoroReady, speakWithKokoro, speakWithNative],
  );

  const stop = useCallback(() => {
    stoppedRef.current = true;

    // Stop Kokoro streaming
    try {
      tts.streamStop();
    } catch {
      // ignore
    }

    // Stop current audio source
    if (sourceRef.current) {
      try {
        sourceRef.current.stop();
      } catch {
        // ignore — may already be stopped
      }
      sourceRef.current = null;
    }

    // Stop native TTS
    if (Platform.OS === 'ios') {
      try {
        NativeModules.NativeTTSModule.stop();
      } catch {
        // ignore
      }
    }

    setIsSpeaking(false);
  }, [tts]);

  return {
    speak,
    stop,
    isSpeaking,
    isKokoroReady,
  };
}
