// apps/mobile/src/components/patient-chart/media-gallery/hooks/useMediaUpload.ts
// Camera/gallery picker + upload with progress tracking + offline queuing

import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { pick, isErrorWithCode, errorCodes } from '@react-native-documents/picker';
import { usePatientChart } from '../../PatientChartContext';
import { usePowerSync, useSyncConnection } from '../../../../hooks/powersync';
import { TABLES } from '../../../../db/powerSyncSchema';
import { uploadPatientPhoto } from '../../../../services/PatientMediaService';

export interface UploadingItem {
  id: string;
  localUri: string;
  fileName: string;
  progress: number;
  status: 'pending' | 'uploading' | 'complete' | 'error';
  error?: string;
}

interface UseMediaUploadReturn {
  pickFromCamera: () => Promise<void>;
  pickFromGallery: () => Promise<void>;
  pickDocument: () => Promise<void>;
  uploadingItems: UploadingItem[];
  isUploading: boolean;
  cancelUpload: (id: string) => void;
  retryUpload: (id: string) => void;
}

export function useMediaUpload(): UseMediaUploadReturn {
  const { patientInfo, setPatientPhotos } = usePatientChart();
  const { service } = usePowerSync();
  const { isConnected } = useSyncConnection();

  const [uploadingItems, setUploadingItems] = useState<UploadingItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const patientId = patientInfo?.id || '';

  const processUpload = useCallback(
    async (item: UploadingItem) => {
      if (!patientId) return;

      // Update status to uploading
      setUploadingItems(prev =>
        prev.map(i => (i.id === item.id ? { ...i, status: 'uploading' as const, progress: 25 } : i)),
      );

      // Offline: queue for later
      if (!isConnected) {
        try {
          const queueId = `queue-patient-photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await service.execute(
            `INSERT INTO ${TABLES.OFFLINE_QUEUE} (id, operation, table_name, record_id, data, retry_count, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              queueId,
              'upload_patient_photo',
              'patient_media',
              patientId,
              JSON.stringify({ localUri: item.localUri, fileName: item.fileName }),
              0,
              new Date().toISOString(),
            ],
          );

          setUploadingItems(prev =>
            prev.map(i =>
              i.id === item.id ? { ...i, status: 'complete' as const, progress: 100 } : i,
            ),
          );

          Alert.alert('Queued', 'Photo will be uploaded when you reconnect.');
        } catch {
          setUploadingItems(prev =>
            prev.map(i =>
              i.id === item.id ? { ...i, status: 'error' as const, error: 'Failed to queue' } : i,
            ),
          );
        }
        return;
      }

      // Online: upload directly
      try {
        setUploadingItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, progress: 50 } : i)),
        );

        const result = await uploadPatientPhoto(patientId, item.localUri, item.fileName);

        if (!result) throw new Error('Upload failed');

        setUploadingItems(prev =>
          prev.map(i => (i.id === item.id ? { ...i, status: 'complete' as const, progress: 100 } : i)),
        );

        // Add to local photos for immediate display
        setPatientPhotos(prev => [
          ...prev,
          { url: result.filePath, uploadedAt: new Date() },
        ]);

        // Remove completed item after brief delay
        setTimeout(() => {
          setUploadingItems(prev => prev.filter(i => i.id !== item.id));
        }, 1500);
      } catch (caughtError) {
        // Extract error message before closure — Hermes has issues
        // with catch block bindings captured in closures
        const errorMessage = caughtError instanceof Error ? caughtError.message : 'Upload failed';
        setUploadingItems(prev =>
          prev.map(i =>
            i.id === item.id
              ? { ...i, status: 'error' as const, error: errorMessage }
              : i,
          ),
        );
      }
    },
    [patientId, isConnected, service, setPatientPhotos],
  );

  const handleFilesSelected = useCallback(
    async (assets: Array<{ uri: string; fileName?: string; fileSize?: number }>) => {
      const newItems: UploadingItem[] = assets.map(asset => ({
        id: `upload-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        localUri: asset.uri,
        fileName: asset.fileName || `photo_${Date.now()}.jpg`,
        progress: 0,
        status: 'pending' as const,
      }));

      setUploadingItems(prev => [...prev, ...newItems]);
      setIsUploading(true);

      // Upload sequentially
      for (const item of newItems) {
        await processUpload(item);
      }

      setIsUploading(false);
    },
    [processUpload],
  );

  const pickFromCamera = useCallback(async () => {
    try {
      const result = await launchCamera({
        mediaType: 'photo',
        quality: 0.8,
        cameraType: 'back',
        saveToPhotos: false,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Error', 'Failed to take photo. Please try again.');
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please take a photo smaller than 5MB.');
        return;
      }

      await handleFilesSelected([{ uri: asset.uri, fileName: asset.fileName, fileSize: asset.fileSize }]);
    } catch (err) {
      console.error('[MediaUpload] Camera error:', err);
      Alert.alert('Error', 'Failed to take photo.');
    }
  }, [handleFilesSelected]);

  const pickFromGallery = useCallback(async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        selectionLimit: 5,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Error', 'Failed to pick images. Please try again.');
        return;
      }

      const assets = result.assets?.filter(a => a.uri) || [];
      if (assets.length === 0) return;

      // Check file sizes
      const oversized = assets.find(a => a.fileSize && a.fileSize > 5 * 1024 * 1024);
      if (oversized) {
        Alert.alert('File Too Large', 'Please select images smaller than 5MB each.');
        return;
      }

      await handleFilesSelected(
        assets.map(a => ({ uri: a.uri!, fileName: a.fileName, fileSize: a.fileSize })),
      );
    } catch (err) {
      console.error('[MediaUpload] Gallery error:', err);
      Alert.alert('Error', 'Failed to pick images.');
    }
  }, [handleFilesSelected]);

  const pickDocument = useCallback(async () => {
    try {
      const [doc] = await pick({
        type: ['application/pdf'],
        allowMultiSelection: false,
      });

      if (!doc?.uri) return;

      if (doc.size && doc.size > 10 * 1024 * 1024) {
        Alert.alert('File Too Large', 'Please select a document smaller than 10MB.');
        return;
      }

      await handleFilesSelected([{ uri: doc.uri, fileName: doc.name || `document_${Date.now()}.pdf`, fileSize: doc.size || undefined }]);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === errorCodes.OPERATION_CANCELED) return;
      console.error('[MediaUpload] Document picker error:', err);
      Alert.alert('Error', 'Failed to pick document.');
    }
  }, [handleFilesSelected]);

  const cancelUpload = useCallback((id: string) => {
    setUploadingItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const retryUpload = useCallback(
    (id: string) => {
      const item = uploadingItems.find(i => i.id === id);
      if (item) {
        setUploadingItems(prev =>
          prev.map(i => (i.id === id ? { ...i, status: 'pending' as const, progress: 0, error: undefined } : i)),
        );
        processUpload({ ...item, status: 'pending', progress: 0, error: undefined });
      }
    },
    [uploadingItems, processUpload],
  );

  return {
    pickFromCamera,
    pickFromGallery,
    pickDocument,
    uploadingItems,
    isUploading,
    cancelUpload,
    retryUpload,
  };
}
