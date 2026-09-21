// Streaming speech-to-text engine using native platform APIs.
// iOS: SFSpeechRecognizer (on-device). Android: deferred.
//
// Replaces the old batch ExecuTorch Whisper wrapper.
// Key difference: partial results arrive in real-time as the user speaks.

import { useState, useEffect, useCallback, useRef } from 'react';
import { SpeechRecognition } from '../../../../native/NativeSpeechRecognition';
import { ORTHOPEDIC_VOCABULARY } from './medicalVocabulary';

export type SessionEndReason = 'silence' | 'timeout' | 'cancelled' | 'error' | 'stopped';

export interface UseSpeechToTextEngineReturn {
  /** Whether native STT is available on this device */
  isReady: boolean;
  /** Whether an active recognition session is running */
  isListening: boolean;
  /** Live partial transcript (updates in real-time) */
  partialResult: string;
  /** Audio level 0-1 from native engine (for UI visualization) */
  audioLevel: number;
  /** Error from recognition */
  error: string | null;
  /** Start a streaming recognition session */
  startListening: () => Promise<void>;
  /** Stop listening and return the final accumulated transcript */
  stopListening: () => Promise<string>;
  /** Cancel without returning results */
  cancelListening: () => void;
}

interface UseSTTOptions {
  /** Called when the session ends (silence, timeout, etc.) */
  onSessionEnded?: (reason: SessionEndReason, finalText: string) => void;
}

export function useSpeechToTextEngine(options?: UseSTTOptions): UseSpeechToTextEngineReturn {
  const [isReady, setIsReady] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [partialResult, setPartialResult] = useState('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Refs for callbacks in event handlers
  const onSessionEndedRef = useRef(options?.onSessionEnded);
  onSessionEndedRef.current = options?.onSessionEnded;
  const latestTextRef = useRef('');

  // Check availability on mount
  useEffect(() => {
    if (!SpeechRecognition.isModuleAvailable()) {
      setIsReady(false);
      return;
    }

    let mounted = true;
    SpeechRecognition.isAvailable().then((available) => {
      if (mounted) setIsReady(available);
    });
    return () => { mounted = false; };
  }, []);

  // Subscribe to native events
  useEffect(() => {
    if (!SpeechRecognition.isModuleAvailable()) return;

    const partialSub = SpeechRecognition.addListener('onPartialResult', (data) => {
      setPartialResult(data.text);
      latestTextRef.current = data.text;
    });

    const levelSub = SpeechRecognition.addListener('onAudioLevel', (data) => {
      setAudioLevel(data.level);
    });

    const errorSub = SpeechRecognition.addListener('onError', (data) => {
      setError(`${data.code}: ${data.message}`);
    });

    const endedSub = SpeechRecognition.addListener('onSessionEnded', (data) => {
      console.log(`[STTEngine] onSessionEnded: reason=${data.reason}, latestText="${latestTextRef.current}"`);
      setIsListening(false);
      setAudioLevel(0);
      onSessionEndedRef.current?.(data.reason as SessionEndReason, latestTextRef.current);
    });

    return () => {
      partialSub.remove();
      levelSub.remove();
      errorSub.remove();
      endedSub.remove();
    };
  }, []);

  const startListening = useCallback(async () => {
    setError(null);
    setPartialResult('');
    setAudioLevel(0);
    latestTextRef.current = '';

    // Request permission if needed
    const permission = await SpeechRecognition.requestPermission();
    if (permission !== 'authorized') {
      setError(
        permission === 'mic_denied'
          ? 'Microphone access denied. Enable it in Settings.'
          : 'Speech recognition not authorized. Enable it in Settings.',
      );
      return;
    }

    try {
      await SpeechRecognition.startListening({
        onDevice: true,
        locale: 'en-US',
        contextualStrings: ORTHOPEDIC_VOCABULARY,
      });
      setIsListening(true);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to start speech recognition');
    }
  }, []);

  const stopListening = useCallback(async (): Promise<string> => {
    try {
      const finalText = await SpeechRecognition.stopListening();
      setIsListening(false);
      setAudioLevel(0);
      return finalText;
    } catch {
      setIsListening(false);
      setAudioLevel(0);
      return latestTextRef.current;
    }
  }, []);

  const cancelListening = useCallback(() => {
    SpeechRecognition.cancelListening();
    setIsListening(false);
    setPartialResult('');
    setAudioLevel(0);
    latestTextRef.current = '';
  }, []);

  return {
    isReady,
    isListening,
    partialResult,
    audioLevel,
    error,
    startListening,
    stopListening,
    cancelListening,
  };
}
