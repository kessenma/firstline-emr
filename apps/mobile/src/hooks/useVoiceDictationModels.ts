// React hook for managing voice dictation model downloads (LLM + TTS only).
// STT now uses native platform APIs — no model download needed.

import { useState, useCallback, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useLLM, useTextToSpeech } from 'react-native-executorch';
import { BareResourceFetcher } from 'react-native-executorch-bare-resource-fetcher';
import { useTranslationModelWifiOnly } from './useTranslationModelWifiOnly';
import { useDownloadProgress } from '../contexts/DownloadProgressContext';
import { storage } from '../utils/mmkv';
import {
  getPendingVoiceModelDownloads,
  setPendingVoiceModelDownloads,
} from '../utils/dataOnboarding';
import {
  LLM_MODEL,
  TTS_MODEL,
  TTS_VOICE,
  MMKV_KEYS,
} from '../components/patient-chart/notes/voice-dictation/constants';

// STT uses native platform APIs — always available, no download required.
export function isVoiceSTTModelDownloaded(): boolean {
  return true;
}
export function isVoiceLLMModelDownloaded(): boolean {
  return storage.getString(MMKV_KEYS.LLM_STATUS) === 'ready';
}
export function isVoiceTTSModelDownloaded(): boolean {
  return storage.getString(MMKV_KEYS.TTS_STATUS) === 'ready';
}

export interface VoiceDictationModelStatus {
  isReady: boolean;
  isDownloading: boolean;
  downloadProgress: number; // 0-1
  error: string | null;
}

interface UseVoiceDictationModelsReturn {
  sttModel: VoiceDictationModelStatus;
  llmModel: VoiceDictationModelStatus;
  ttsModel: VoiceDictationModelStatus;
  isSTTReady: boolean;
  isLLMReady: boolean;
  isTTSReady: boolean;
  wifiOnly: boolean;
  setWifiOnly: (wifiOnly: boolean) => Promise<void>;
  canDownloadOnCurrentNetwork: boolean;
  downloadSTT: () => void;
  downloadLLM: () => void;
  downloadTTS: () => void;
  deleteSTT: () => void;
  deleteLLM: () => void;
  deleteTTS: () => void;
  totalStorageUsed: number;
}

export function useVoiceDictationModels(): UseVoiceDictationModelsReturn {
  const netInfo = useNetInfo();
  const { wifiOnly, setWifiOnly } = useTranslationModelWifiOnly();
  const downloadProgress = useDownloadProgress();
  const isOnWifi = netInfo.type === 'wifi';
  const canDownloadOnCurrentNetwork = !wifiOnly || isOnWifi;

  // Track whether user has triggered download for each model.
  const [llmLoadRequested, setLlmLoadRequested] = useState(
    () => isVoiceLLMModelDownloaded(),
  );
  const [ttsLoadRequested, setTtsLoadRequested] = useState(
    () => isVoiceTTSModelDownloaded(),
  );

  const [llmIsNewDownload, setLlmIsNewDownload] = useState(false);
  const [ttsIsNewDownload, setTtsIsNewDownload] = useState(false);

  // Consume pending voice model downloads from onboarding
  useEffect(() => {
    if (!canDownloadOnCurrentNetwork) return;
    const pending = getPendingVoiceModelDownloads();
    if (pending.length === 0) return;

    // Skip 'stt' — no longer needs a download
    if (pending.includes('tts') && !ttsLoadRequested) { setTtsLoadRequested(true); setTtsIsNewDownload(true); }
    if (pending.includes('llm') && !llmLoadRequested) { setLlmLoadRequested(true); setLlmIsNewDownload(true); }

    setPendingVoiceModelDownloads([]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canDownloadOnCurrentNetwork]);

  // ExecuTorch hooks — preventLoad controls download/load
  const llm = useLLM({
    model: LLM_MODEL,
    preventLoad: !llmLoadRequested,
  });

  const ttsHook = useTextToSpeech({
    model: TTS_MODEL,
    voice: TTS_VOICE,
    preventLoad: !ttsLoadRequested,
  });

  // Persist MMKV flags when models become ready
  const prevLlmReady = useRef(llm.isReady);
  const prevTtsReady = useRef(ttsHook.isReady);

  useEffect(() => {
    if (llm.isReady && !prevLlmReady.current) {
      storage.set(MMKV_KEYS.LLM_STATUS, 'ready');
    }
    prevLlmReady.current = llm.isReady;
  }, [llm.isReady]);

  useEffect(() => {
    if (ttsHook.isReady && !prevTtsReady.current) {
      storage.set(MMKV_KEYS.TTS_STATUS, 'ready');
    }
    prevTtsReady.current = ttsHook.isReady;
  }, [ttsHook.isReady]);

  // Clear MMKV flags on errors
  useEffect(() => {
    if (llm.error && llmLoadRequested) {
      storage.remove(MMKV_KEYS.LLM_STATUS);
      setLlmLoadRequested(false);
    }
  }, [llm.error, llmLoadRequested]);

  useEffect(() => {
    if (ttsHook.error && ttsLoadRequested) {
      storage.remove(MMKV_KEYS.TTS_STATUS);
      setTtsLoadRequested(false);
    }
  }, [ttsHook.error, ttsLoadRequested]);

  // Push LLM download progress to centralized download tracker
  useEffect(() => {
    if (!llmIsNewDownload) return;
    const isDownloading = llmLoadRequested && !llm.isReady && !llm.error;
    if (isDownloading) {
      downloadProgress.register({ id: 'voice-llm', label: 'Smart Note Extraction', progress: llm.downloadProgress, type: 'voice' });
    } else if (llm.isReady) {
      downloadProgress.complete('voice-llm');
      setLlmIsNewDownload(false);
    } else if (llm.error) {
      downloadProgress.remove('voice-llm');
      setLlmIsNewDownload(false);
    }
  }, [llm.downloadProgress, llm.isReady, llm.error, llmLoadRequested, llmIsNewDownload]);

  // Push TTS download progress to centralized download tracker
  useEffect(() => {
    if (!ttsIsNewDownload) return;
    const isDownloading = ttsLoadRequested && !ttsHook.isReady && !ttsHook.error;
    if (isDownloading) {
      downloadProgress.register({ id: 'voice-tts', label: 'Voice Prompts', progress: ttsHook.downloadProgress, type: 'voice' });
    } else if (ttsHook.isReady) {
      downloadProgress.complete('voice-tts');
      setTtsIsNewDownload(false);
    } else if (ttsHook.error) {
      downloadProgress.remove('voice-tts');
      setTtsIsNewDownload(false);
    }
  }, [ttsHook.downloadProgress, ttsHook.isReady, ttsHook.error, ttsLoadRequested, ttsIsNewDownload]);

  // STT: native APIs — always ready, no model to manage
  const sttModel: VoiceDictationModelStatus = {
    isReady: true,
    isDownloading: false,
    downloadProgress: 1,
    error: null,
  };

  const llmModel: VoiceDictationModelStatus = {
    isReady: llm.isReady || isVoiceLLMModelDownloaded(),
    isDownloading: llmIsNewDownload && llmLoadRequested && !llm.isReady && !llm.error,
    downloadProgress: llm.downloadProgress,
    error: llm.error?.message ?? null,
  };

  const ttsModel: VoiceDictationModelStatus = {
    isReady: ttsHook.isReady || isVoiceTTSModelDownloaded(),
    isDownloading: ttsIsNewDownload && ttsLoadRequested && !ttsHook.isReady && !ttsHook.error,
    downloadProgress: ttsHook.downloadProgress,
    error: ttsHook.error?.message ?? null,
  };

  // STT download/delete are no-ops now
  const downloadSTT = useCallback(() => {}, []);
  const deleteSTT = useCallback(() => {}, []);

  const downloadLLM = useCallback(() => {
    if (!canDownloadOnCurrentNetwork) {
      Alert.alert(
        'WiFi Required',
        'AI model downloads are set to WiFi only. Switch to WiFi or allow cellular downloads in settings.',
      );
      return;
    }
    setLlmIsNewDownload(true);
    setLlmLoadRequested(true);
  }, [canDownloadOnCurrentNetwork]);

  const downloadTTS = useCallback(() => {
    if (!canDownloadOnCurrentNetwork) {
      Alert.alert(
        'WiFi Required',
        'AI model downloads are set to WiFi only. Switch to WiFi or allow cellular downloads in settings.',
      );
      return;
    }
    setTtsIsNewDownload(true);
    setTtsLoadRequested(true);
  }, [canDownloadOnCurrentNetwork]);

  const deleteLLM = useCallback(() => {
    Alert.alert(
      'Delete Model',
      'Are you sure you want to delete the Smart Note Extraction model?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await BareResourceFetcher.deleteResources(
                LLM_MODEL.modelSource,
                LLM_MODEL.tokenizerSource,
                LLM_MODEL.tokenizerConfigSource!,
              );
            } catch (err) {
              console.warn('[VoiceDictation] Error deleting LLM resources:', err);
            }
            storage.remove(MMKV_KEYS.LLM_STATUS);
            setLlmLoadRequested(false);
          },
        },
      ],
    );
  }, []);

  const deleteTTS = useCallback(() => {
    Alert.alert(
      'Delete Model',
      'Are you sure you want to delete the Voice Prompts model?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await BareResourceFetcher.deleteResources(
                TTS_MODEL.durationPredictorSource,
                TTS_MODEL.synthesizerSource,
                TTS_VOICE.voiceSource,
                TTS_VOICE.extra!.taggerSource,
                TTS_VOICE.extra!.lexiconSource,
              );
            } catch (err) {
              console.warn('[VoiceDictation] Error deleting TTS resources:', err);
            }
            storage.remove(MMKV_KEYS.TTS_STATUS);
            setTtsLoadRequested(false);
          },
        },
      ],
    );
  }, []);

  // Rough storage estimate (STT is 0 — no model)
  const llmSize = llm.isReady ? 900 * 1024 * 1024 : 0;
  const ttsSize = ttsHook.isReady ? 50 * 1024 * 1024 : 0;

  return {
    sttModel,
    llmModel,
    ttsModel,
    isSTTReady: true, // Native STT is always ready
    isLLMReady: llm.isReady,
    isTTSReady: ttsHook.isReady,
    wifiOnly,
    setWifiOnly,
    canDownloadOnCurrentNetwork,
    downloadSTT,
    downloadLLM,
    downloadTTS,
    deleteSTT,
    deleteLLM,
    deleteTTS,
    totalStorageUsed: llmSize + ttsSize,
  };
}
