// packages/shared/src/media/audio-utils.ts
// Pure audio utility functions (no React / platform dependencies)

import { WAV_HEADER_SIZE } from './audio-constants';

/**
 * Generate waveform bar heights from PCM audio data.
 * Chunks PCM into `numBars` segments, computes average absolute amplitude
 * per segment, scales by 10×, and clamps to [0.1, 1.0].
 */
export function generateWaveform(pcmData: Float32Array, numBars: number): number[] {
  if (!pcmData || pcmData.length === 0) return new Array(numBars).fill(0.1);
  const chunkSize = Math.floor(pcmData.length / numBars);
  const bars: number[] = [];
  for (let i = 0; i < numBars; i++) {
    let sum = 0;
    const start = i * chunkSize;
    const end = start + chunkSize;
    for (let j = start; j < end; j++) {
      sum += Math.abs(pcmData[j]);
    }
    const avg = sum / chunkSize;
    bars.push(Math.min(Math.max(avg * 10, 0.1), 1));
  }
  return bars;
}

/**
 * Format seconds as "M:SS" for audio duration display.
 */
export function formatAudioTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Convert Float32Array PCM samples (-1.0 to 1.0) to a WAV file buffer.
 * Outputs 16-bit PCM WAV (mono). Pure math — no platform dependencies.
 */
export function float32ToWavBuffer(
  samples: Float32Array,
  sampleRate: number,
): Uint8Array {
  const numChannels = 1;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(WAV_HEADER_SIZE + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * bytesPerSample, true);
  view.setUint16(32, numChannels * bytesPerSample, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM samples: clamp Float32 to [-1,1], scale to Int16
  let offset = WAV_HEADER_SIZE;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return new Uint8Array(buffer);
}
