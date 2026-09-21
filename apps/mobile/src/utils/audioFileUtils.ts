// Utility to save Float32Array PCM audio to WAV file on disk.
// Bridges useAudioRecorder (returns Float32Array) to sendAudio (requires file URI).
// WAV encoding logic lives in @fajr/shared/media (float32ToWavBuffer).

import { CachesDirectoryPath, writeFile } from '@dr.pogodin/react-native-fs';
import { float32ToWavBuffer } from '@fajr/shared/media';

const BASE64_CHARS =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function uint8ArrayToBase64(bytes: Uint8Array): string {
  // Manual base64 — Hermes lacks TypedArray.prototype.buffer which
  // Buffer polyfill accesses internally, so we avoid Buffer entirely.
  const len = bytes.length;
  const parts: string[] = [];
  for (let i = 0; i < len; i += 3) {
    const a = bytes[i];
    const b = i + 1 < len ? bytes[i + 1] : 0;
    const c = i + 2 < len ? bytes[i + 2] : 0;
    parts.push(
      BASE64_CHARS[a >> 2],
      BASE64_CHARS[((a & 3) << 4) | (b >> 4)],
      i + 1 < len ? BASE64_CHARS[((b & 0x0f) << 2) | (c >> 6)] : '=',
      i + 2 < len ? BASE64_CHARS[c & 0x3f] : '=',
    );
  }
  return parts.join('');
}

/**
 * Save Float32Array recording to a WAV file on disk.
 * Returns the file URI and duration in seconds.
 */
export async function saveRecordingToFile(
  samples: Float32Array,
  sampleRate: number,
): Promise<{ uri: string; durationSeconds: number }> {
  if (samples.length === 0) {
    throw new Error('No audio samples to save');
  }

  const wavBytes = float32ToWavBuffer(samples, sampleRate);
  const base64Data = uint8ArrayToBase64(wavBytes);

  const fileName = `voice_msg_${Date.now()}.wav`;
  const filePath = `${CachesDirectoryPath}/${fileName}`;

  await writeFile(filePath, base64Data, 'base64');

  const durationSeconds = samples.length / sampleRate;

  return {
    uri: `file://${filePath}`,
    durationSeconds,
  };
}
