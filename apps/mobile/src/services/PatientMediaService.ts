// apps/mobile/src/services/PatientMediaService.ts
// Patient photo fetching (delegates to MediaService) and upload functionality.

import { getApiUrl } from '../config';
import { getStoredToken } from '../utils/storage';
import {
  getSignedUrl as mediaGetSignedUrl,
  fetchMedia,
  type DbService,
} from './MediaService';

/**
 * Get a signed URL for a patient photo.
 * Delegates to the centralized MediaService.
 */
export async function getPatientPhotoSignedUrl(
  _patientId: string,
  filePath: string,
): Promise<string | null> {
  return mediaGetSignedUrl(filePath);
}

/**
 * Download a patient photo and cache it for offline access.
 * Delegates to the centralized MediaService.
 */
export async function downloadAndCachePatientPhoto(
  _patientId: string,
  filePath: string,
  service: DbService,
): Promise<string | null> {
  return fetchMedia(filePath, service);
}

/**
 * Upload a patient photo via the API.
 * Returns { filePath, signedUrl } on success.
 */
export async function uploadPatientPhoto(
  patientId: string,
  fileUri: string,
  fileName?: string,
): Promise<{ filePath: string; signedUrl: string } | null> {
  if (!patientId || !fileUri) return null;

  try {
    const token = await getStoredToken();
    if (!token) return null;

    const name = fileName || `photo_${Date.now()}.jpg`;
    const mimeType = name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      type: mimeType,
      name,
    } as any);

    const response = await fetch(
      getApiUrl(`/patient/${patientId}/upload-photo`),
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[PatientMedia] Upload failed:', response.status, errorText);
      return null;
    }

    const data = await response.json();
    return {
      filePath: data.filePath,
      signedUrl: data.signedUrl,
    };
  } catch (err) {
    console.error('[PatientMedia] Upload error:', err);
    return null;
  }
}
