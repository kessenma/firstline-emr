// apps/mobile/src/screens/user-profile/hooks/useTranslationModels.ts
// React hook wrapping TranslationModelService with reactive state for the UI.

import { useState, useCallback, useEffect } from 'react';
import {
  TranslationModelService,
  type ModelInfo,
  type TranslationDirection,
} from '../../../services/TranslationModelService';
import { Alert } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { useTranslationModelWifiOnly } from '../../../hooks/useTranslationModelWifiOnly';
import { useDownloadProgress } from '../../../contexts/DownloadProgressContext';

interface UseTranslationModelsReturn {
  arEnModel: ModelInfo;
  enArModel: ModelInfo;
  isDownloading: boolean;
  wifiOnly: boolean;
  setWifiOnly: (wifiOnly: boolean) => Promise<void>;
  canDownloadOnCurrentNetwork: boolean;
  downloadModel: (direction: TranslationDirection) => Promise<void>;
  deleteModel: (direction: TranslationDirection) => Promise<void>;
  totalStorageUsed: number;
  refresh: () => void;
}

export function useTranslationModels(): UseTranslationModelsReturn {
  const service = TranslationModelService.getInstance();
  const netInfo = useNetInfo();
  const {
    wifiOnly,
    setWifiOnly,
  } = useTranslationModelWifiOnly();
  const dlProgress = useDownloadProgress();

  const [arEnModel, setArEnModel] = useState<ModelInfo>(() =>
    service.getModelInfo('ar-en'),
  );
  const [enArModel, setEnArModel] = useState<ModelInfo>(() =>
    service.getModelInfo('en-ar'),
  );
  const [isDownloading, setIsDownloading] = useState(false);
  const isOnWifi = netInfo.type === 'wifi';
  const canDownloadOnCurrentNetwork = !wifiOnly || isOnWifi;

  const refresh = useCallback(() => {
    setArEnModel(service.getModelInfo('ar-en'));
    setEnArModel(service.getModelInfo('en-ar'));
  }, [service]);

  // On mount, validate that "ready" models have actual files on disk, then refresh.
  useEffect(() => {
    service.validateModels().then(() => refresh());
  }, [service, refresh]);

  const downloadModel = useCallback(
    async (direction: TranslationDirection) => {
      if (!canDownloadOnCurrentNetwork) {
        Alert.alert(
          'WiFi Required',
          'Model downloads are set to WiFi only. Switch to WiFi or allow cellular downloads in settings.',
        );
        return;
      }

      const dlId = `translation-${direction}`;
      const dlLabel = direction === 'ar-en' ? 'Arabic \u2192 English' : 'English \u2192 Arabic';

      setIsDownloading(true);
      dlProgress.register({ id: dlId, label: dlLabel, progress: 0, type: 'translation' });
      try {
        await service.downloadModel(direction, (pct) => {
          // Update the relevant model state on progress
          const updated = service.getModelInfo(direction);
          if (direction === 'ar-en') {
            setArEnModel({ ...updated, progress: pct });
          } else {
            setEnArModel({ ...updated, progress: pct });
          }
          // Push to centralized download tracker (pct is 0-100, normalize to 0-1)
          dlProgress.update(dlId, pct / 100);
        });
        dlProgress.complete(dlId);
        refresh();
      } catch (err) {
        dlProgress.remove(dlId);
        refresh();
        const msg =
          err instanceof Error ? err.message : 'Download failed';
        Alert.alert('Download Error', msg);
      } finally {
        setIsDownloading(false);
      }
    },
    [service, refresh, canDownloadOnCurrentNetwork, dlProgress],
  );

  const deleteModel = useCallback(
    async (direction: TranslationDirection) => {
      Alert.alert(
        'Delete Model',
        `Are you sure you want to delete the ${direction === 'ar-en' ? 'Arabic → English' : 'English → Arabic'} translation model?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              await service.deleteModel(direction);
              refresh();
            },
          },
        ],
      );
    },
    [service, refresh],
  );

  const totalStorageUsed = arEnModel.sizeBytes + enArModel.sizeBytes;

  return {
    arEnModel,
    enArModel,
    isDownloading,
    wifiOnly,
    setWifiOnly,
    canDownloadOnCurrentNetwork,
    downloadModel,
    deleteModel,
    totalStorageUsed,
    refresh,
  };
}
