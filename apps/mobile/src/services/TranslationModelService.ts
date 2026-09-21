// apps/mobile/src/services/TranslationModelService.ts
// Singleton service for managing on-device translation model downloads and storage.
// Models are CTranslate2 int8 quantized archives (~75MB each) hosted in RustFS.

import { storageHelpers } from '../utils/mmkv';
import { getApiUrl, TRANSLATION_CONFIG } from '../config';
import { getStoredToken } from '../utils/storage';

// Lazy-load native modules to avoid crashing app startup if not linked yet.
type RNFS = typeof import('@dr.pogodin/react-native-fs');
let _rnfs: RNFS | null = null;
function getRNFS(): RNFS {
  if (!_rnfs) {
    _rnfs = require('@dr.pogodin/react-native-fs');
  }
  return _rnfs!;
}

type ZipArchive = typeof import('react-native-zip-archive');
let _zip: ZipArchive | null = null;
function getZip(): ZipArchive {
  if (!_zip) {
    _zip = require('react-native-zip-archive');
  }
  return _zip!;
}

export type TranslationDirection = 'ar-en' | 'en-ar';

export interface ModelInfo {
  direction: TranslationDirection;
  status: 'not-downloaded' | 'downloading' | 'ready' | 'error';
  progress: number; // 0-100
  sizeBytes: number; // on-disk size
  downloadedAt?: string; // ISO timestamp
  error?: string;
}

const MMKV_KEY_PREFIX = 'translation_model_';
const DEFAULT_MODEL_INFO = (
  direction: TranslationDirection,
): ModelInfo => ({
  direction,
  status: 'not-downloaded',
  progress: 0,
  sizeBytes: 0,
});

/**
 * Singleton service for downloading, storing, and managing CTranslate2 translation models.
 *
 * Download flow:
 * 1. GET /api/translation-models/download-url?direction=ar-en (with JWT auth)
 * 2. Download zip from signed URL to disk via downloadFile()
 * 3. Unzip to DocumentDirectoryPath/translation-models/{direction}/
 * 4. Store metadata in MMKV
 */
export class TranslationModelService {
  private static instance: TranslationModelService;
  private inflightDownloads = new Map<TranslationDirection, number>(); // jobId for cancellation
  private _modelsBasePath: string | null = null;

  private get modelsBasePath(): string {
    if (!this._modelsBasePath) {
      this._modelsBasePath = `${getRNFS().DocumentDirectoryPath}/${TRANSLATION_CONFIG.MODELS_DIR}`;
    }
    return this._modelsBasePath;
  }

  private constructor() {}

  static getInstance(): TranslationModelService {
    if (!TranslationModelService.instance) {
      TranslationModelService.instance = new TranslationModelService();
    }
    return TranslationModelService.instance;
  }

  /**
   * Get persisted model info from MMKV, or default if none stored.
   */
  getModelInfo(direction: TranslationDirection): ModelInfo {
    const raw = storageHelpers.getString(
      `${MMKV_KEY_PREFIX}${direction}`,
    );
    if (raw) {
      try {
        return JSON.parse(raw) as ModelInfo;
      } catch {
        // corrupted data – reset
      }
    }
    return DEFAULT_MODEL_INFO(direction);
  }

  isModelReady(direction: TranslationDirection): boolean {
    return this.getModelInfo(direction).status === 'ready';
  }

  /**
   * Validate that models marked as "ready" in MMKV actually have extracted files on disk.
   * Resets status to "not-downloaded" for any model missing required files (e.g. old
   * downloads from before the unzip step was added).
   * Also resets stale "downloading" state when no actual download is in progress
   * (e.g. app was killed mid-download).
   */
  async validateModels(): Promise<void> {
    const rnfs = getRNFS();
    for (const direction of TRANSLATION_CONFIG.DIRECTIONS) {
      const info = this.getModelInfo(direction);

      // Reset stale "downloading" state — the in-memory inflightDownloads map
      // is empty after an app restart, so if MMKV says downloading but nothing
      // is actually in flight, it's stuck.
      if (info.status === 'downloading' && !this.inflightDownloads.has(direction)) {
        console.warn(
          `[TranslationModel] ${direction} stuck in downloading state — resetting`,
        );
        // Clean up any partial zip
        const zipPath = `${this.modelsBasePath}/${direction}.zip`;
        try {
          if (await rnfs.exists(zipPath)) await rnfs.unlink(zipPath);
        } catch { /* ignore */ }
        this.persistModelInfo(DEFAULT_MODEL_INFO(direction));
        continue;
      }

      if (info.status !== 'ready') continue;

      const modelDir = this.getModelPath(direction);
      const spmPath = `${modelDir}/source.spm`;
      const exists = await rnfs.exists(spmPath);
      if (!exists) {
        console.warn(
          `[TranslationModel] ${direction} marked ready but source.spm missing — resetting`,
        );
        // Clean up stale directory (may contain only model.zip)
        try {
          if (await rnfs.exists(modelDir)) await rnfs.unlink(modelDir);
        } catch { /* ignore */ }
        this.persistModelInfo(DEFAULT_MODEL_INFO(direction));
      }
    }
  }

  getModelPath(direction: TranslationDirection): string {
    return `${this.modelsBasePath}/${direction}`;
  }

  getTotalStorageUsed(): number {
    let total = 0;
    for (const dir of TRANSLATION_CONFIG.DIRECTIONS) {
      total += this.getModelInfo(dir).sizeBytes;
    }
    return total;
  }

  /**
   * Download a model from RustFS and extract to local filesystem.
   */
  async downloadModel(
    direction: TranslationDirection,
    onProgress?: (pct: number) => void,
  ): Promise<void> {
    // Prevent duplicate downloads
    if (this.inflightDownloads.has(direction)) {
      console.log(
        `[TranslationModel] Download already in progress for ${direction}`,
      );
      return;
    }

    this.persistModelInfo({
      direction,
      status: 'downloading',
      progress: 0,
      sizeBytes: 0,
    });

    const zipPath = `${this.modelsBasePath}/${direction}.zip`;
    const extractDir = this.getModelPath(direction);

    const rnfs = getRNFS();

    try {
      // Ensure directories exist
      await rnfs.mkdir(this.modelsBasePath);

      // Clean up any previous partial download or extraction
      if (await rnfs.exists(zipPath)) {
        await rnfs.unlink(zipPath);
      }
      if (await rnfs.exists(extractDir)) {
        await rnfs.unlink(extractDir);
      }

      // 1. Get signed download URL from API
      const token = await getStoredToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiUrl = getApiUrl(
        `${TRANSLATION_CONFIG.DOWNLOAD_URL_PATH}?direction=${direction}`,
      );
      console.log(`[TranslationModel] Fetching download URL for ${direction}`);

      const urlResponse = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!urlResponse.ok) {
        throw new Error(
          `Failed to get download URL: ${urlResponse.status}`,
        );
      }

      const { signedUrl } = await urlResponse.json();

      // 2. Download zip file with progress
      console.log(`[TranslationModel] Downloading ${direction} model...`);
      const downloadResult = rnfs.downloadFile({
        fromUrl: signedUrl,
        toFile: zipPath,
        progressInterval: 500,
        progress: (res: { contentLength: number; bytesWritten: number }) => {
          const pct =
            res.contentLength > 0
              ? Math.round((res.bytesWritten / res.contentLength) * 100)
              : 0;
          this.persistModelInfo({
            direction,
            status: 'downloading',
            progress: pct,
            sizeBytes: 0,
          });
          onProgress?.(pct);
        },
      });

      this.inflightDownloads.set(direction, downloadResult.jobId);
      const result = await downloadResult.promise;

      this.inflightDownloads.delete(direction);

      if (result.statusCode !== 200) {
        throw new Error(
          `Download failed with status ${result.statusCode}`,
        );
      }

      console.log(
        `[TranslationModel] Downloaded ${direction} (${(result.bytesWritten / 1024 / 1024).toFixed(1)} MB)`,
      );

      // 3. Unzip the model files (CTranslate2 needs raw files: model.bin, source.spm, etc.)
      console.log(`[TranslationModel] Extracting ${direction} model...`);
      const { unzip } = getZip();
      await unzip(zipPath, extractDir);
      console.log(`[TranslationModel] Extracted to ${extractDir}`);

      // Remove zip after extraction to save disk space
      await rnfs.unlink(zipPath);

      // Calculate total extracted size
      const files = await rnfs.readDir(extractDir);
      let sizeBytes = 0;
      for (const f of files) {
        sizeBytes += Number(f.size);
      }

      // 4. Persist metadata
      this.persistModelInfo({
        direction,
        status: 'ready',
        progress: 100,
        sizeBytes,
        downloadedAt: new Date().toISOString(),
      });

      console.log(`[TranslationModel] ${direction} model ready!`);
    } catch (err) {
      this.inflightDownloads.delete(direction);

      const errorMsg =
        err instanceof Error ? err.message : 'Unknown error';
      console.error(
        `[TranslationModel] Download failed for ${direction}:`,
        errorMsg,
      );

      this.persistModelInfo({
        direction,
        status: 'error',
        progress: 0,
        sizeBytes: 0,
        error: errorMsg,
      });

      // Clean up partial files
      try {
        if (await rnfs.exists(zipPath)) await rnfs.unlink(zipPath);
        if (await rnfs.exists(extractDir)) await rnfs.unlink(extractDir);
      } catch {
        // ignore cleanup errors
      }

      throw err;
    }
  }

  /**
   * Delete a downloaded model and free disk space.
   */
  async deleteModel(direction: TranslationDirection): Promise<void> {
    const rnfs = getRNFS();

    // Cancel in-flight download if any
    const jobId = this.inflightDownloads.get(direction);
    if (jobId) {
      rnfs.stopDownload(jobId);
      this.inflightDownloads.delete(direction);
    }

    const modelDir = this.getModelPath(direction);
    try {
      if (await rnfs.exists(modelDir)) {
        await rnfs.unlink(modelDir);
        console.log(`[TranslationModel] Deleted ${direction} model`);
      }
    } catch (err) {
      console.error(
        `[TranslationModel] Error deleting ${direction}:`,
        err,
      );
    }

    // Also clean up any stale zip
    const zipPath = `${this.modelsBasePath}/${direction}.zip`;
    try {
      if (await rnfs.exists(zipPath)) await rnfs.unlink(zipPath);
    } catch {
      // ignore
    }

    this.persistModelInfo(DEFAULT_MODEL_INFO(direction));
  }

  private persistModelInfo(info: ModelInfo): void {
    storageHelpers.set(
      `${MMKV_KEY_PREFIX}${info.direction}`,
      JSON.stringify(info),
    );
  }
}
