// TypeScript wrapper for the NativeSpeechRecognition native module.
// Provides streaming speech-to-text via platform APIs:
// - iOS: SFSpeechRecognizer (on-device, auto-restart for >1min)
// - Android: SpeechRecognizer (deferred)

import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const NativeBridge = NativeModules.NativeSpeechRecognition as
  | {
      isAvailable(): Promise<boolean>;
      requestPermission(): Promise<string>;
      startListening(options: {
        onDevice: boolean;
        locale: string;
        contextualStrings: string[];
      }): Promise<void>;
      stopListening(): Promise<string>;
      cancelListening(): Promise<void>;
    }
  | undefined;

export interface SpeechRecognitionEvents {
  onPartialResult: { text: string; isFinal: boolean };
  onAudioLevel: { level: number };
  onError: { code: string; message: string };
  onSessionEnded: {
    reason: 'silence' | 'timeout' | 'cancelled' | 'error' | 'stopped';
  };
}

class NativeSpeechRecognitionService {
  private emitter: NativeEventEmitter | null = null;

  private getEmitter(): NativeEventEmitter {
    if (!this.emitter) {
      this.emitter = new NativeEventEmitter(
        NativeModules.NativeSpeechRecognition,
      );
    }
    return this.emitter;
  }

  isModuleAvailable(): boolean {
    const available = Platform.OS === 'ios' && !!NativeBridge;
    if (!available) {
      console.warn(
        '[NativeSpeechRecognition] Module not available.',
        `Platform: ${Platform.OS},`,
        `NativeBridge exists: ${!!NativeBridge}`,
      );
    }
    return available;
  }

  async isAvailable(): Promise<boolean> {
    if (!NativeBridge) {
      console.warn('[NativeSpeechRecognition] NativeBridge is null/undefined');
      return false;
    }
    try {
      const result = await NativeBridge.isAvailable();
      console.log('[NativeSpeechRecognition] isAvailable:', result);
      return result;
    } catch (err) {
      console.warn('[NativeSpeechRecognition] isAvailable error:', err);
      return false;
    }
  }

  async requestPermission(): Promise<string> {
    if (!NativeBridge) return 'unavailable';
    return NativeBridge.requestPermission();
  }

  async startListening(options: {
    onDevice?: boolean;
    locale?: string;
    contextualStrings?: string[];
  }): Promise<void> {
    if (!NativeBridge) throw new Error('NativeSpeechRecognition not available');
    return NativeBridge.startListening({
      onDevice: options.onDevice ?? true,
      locale: options.locale ?? 'en-US',
      contextualStrings: options.contextualStrings ?? [],
    });
  }

  async stopListening(): Promise<string> {
    if (!NativeBridge) throw new Error('NativeSpeechRecognition not available');
    return NativeBridge.stopListening();
  }

  async cancelListening(): Promise<void> {
    if (!NativeBridge) return;
    try {
      await NativeBridge.cancelListening();
    } catch {
      // Ignore cancel errors
    }
  }

  addListener<K extends keyof SpeechRecognitionEvents>(
    event: K,
    callback: (data: SpeechRecognitionEvents[K]) => void,
  ) {
    return this.getEmitter().addListener(event, callback);
  }
}

export const SpeechRecognition = new NativeSpeechRecognitionService();
