# Shared Media & Audio Package

Central types, constants, and utilities for media storage and audio recording/playback across web and mobile.

## Exports

### Media Core
- **types.ts** — `MediaType` (image/video/pdf/audio/file), `MediaItem`, `MediaFilter`, `UploadStatus`, `UploadingMediaItem`
- **constants.ts** — `MAX_IMAGE_SIZE` (5MB), `MAX_DOCUMENT_SIZE` (10MB), `MEDIA_GRID_COLUMNS` (3), accepted MIME types
- **utils.ts** — `inferMediaTypeFromUrl()`, `inferMediaTypeFromMime()`, `mapApiMediaType()`, `matchesMediaFilter()` (all pure, no platform deps)

### Audio
- **audio-types.ts** — `AudioPlayerState`, `AudioRecorderState`, `AudioRecorderConfig` (silence detection params), `VoiceSensitivity`
- **audio-constants.ts** — `AUDIO_SAMPLE_RATE` (16kHz), `MAX_RECORDING_DURATION_S` (60), `DEFAULT_WAVEFORM_BARS` (40), `WAV_HEADER_SIZE` (44), `AUDIO_MIME_TYPES`, `SENSITIVITY_MULTIPLIERS` (adaptive: 1.8, high: 1.5, normal: 2.0, low: 3.0)
- **audio-utils.ts** — `generateWaveform()` (PCM → bar heights), `formatAudioTime()` (seconds → "M:SS"), `float32ToWavBuffer()` (Float32Array → WAV Uint8Array, 16-bit PCM mono)

### Web-Only Components (in `apps/web/components/ui/`)
- **MediaThumbnail.tsx** — Next.js Image with type-specific icons and loading states
- **MediaGrid.tsx** — Responsive CSS grid with skeleton loading and empty state

## Adding a New Audio/Media Utility

1. If pure (no React/platform deps) → add to this package
2. Export from `index.ts`
3. Import as `@fajr/shared/media` in consumers
4. If platform-specific → keep in the respective app, import shared types only
