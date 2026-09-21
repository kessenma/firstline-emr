# Firstline EMR

Monorepo: `apps/web` (Next.js), `apps/mobile` (React Native), `apps/notifications-server` (Go), `apps/powersync-server`, `packages/shared`

## Area Guides

| Area | CLAUDE.md | What it covers |
|------|-----------|----------------|
| Web Admin Dashboard | [apps/web/components/adminDashboard/](apps/web/components/adminDashboard/CLAUDE.md) | Section registry, View+ViewModel pattern, contexts, API conventions |
| Mobile Admin Dashboard | [apps/mobile/src/screens/admin/](apps/mobile/src/screens/admin/CLAUDE.md) | MVVM pattern, accordion UI, AdminContext, API client |
| Web Patient Chart | [apps/web/components/patient-chart/](apps/web/components/patient-chart/CLAUDE.md) | Context-based state, accordion sections, export, care team |
| Mobile Patient Chart | [apps/mobile/src/components/patient-chart/](apps/mobile/src/components/patient-chart/CLAUDE.md) | PowerSync offline-first, tabs vs dashboard, BottomSheet gotchas |
| Web Patient Dashboard | [apps/web/components/patient-dashboard/](apps/web/components/patient-dashboard/CLAUDE.md) | Server prefetch, infinite scroll, SSE real-time, 3-level filtering |
| Mobile Patient Dashboard | [apps/mobile/src/screens/patient-dashboard/](apps/mobile/src/screens/patient-dashboard/CLAUDE.md) | PowerSync queries, device-adaptive rendering, offline mutations |
| Notifications Server | [apps/notifications-server/](apps/notifications-server/CLAUDE.md) | Go microservice, Gorush, APNs, Docker setup |
| Shared Media & Audio | [packages/shared/src/media/](packages/shared/src/media/CLAUDE.md) | Types, constants, audio utils, waveform generation |
| PowerSync Offline Sync | [apps/mobile/src/services/powersync/](apps/mobile/src/services/powersync/CLAUDE.md) | Two-token auth, sync rules, schema, upload pipeline, encryption, gotchas |

The cross-cutting systems (Notifications, Media & Audio, Telegram) are documented below since they span the entire monorepo. PowerSync is documented in the mobile app since that's its primary consumer.

## Notifications System

Notifications span the entire monorepo. This section is the map.

### End-to-End Flow

```
Trigger (API route or backend helper)
  → DB: notifications + user_notifications + notification_recipients
  → Push: web pushNotificationService → notifications-server (Go) → Gorush → APNs/FCM
  → Display: web NotificationsView / mobile NotificationsScreen
```

### Database Tables (`apps/web/db/schema/`)

| Table | Purpose |
|-------|---------|
| `notifications` | Central content (message, type, patientId, redirectTo) |
| `user_notifications` | Per-user read/dismiss status (junction table) |
| `notification_recipients` | Intended recipients log |
| `admin_notifications` | Admin broadcasts (announcement/alert/reminder, supports rich content: description, links, images) |
| `push_devices` | Device token registry (userId, platform, token, environment, isActive) |

**Notification types**: message, alert, profile_update_approved, profile_update_denied, profile_update_request, patient_update, system_notification, new_user_signup, specialty_no_doctors

### Creating Notifications (Server-Side)

- **Helper**: `apps/web/utils/notifications.ts` — `createNotificationForUser()`, `createNotificationForMultipleUsers()`, `createNotificationForAccountType()`
- **DB helpers**: `apps/web/lib/notification-helpers.ts` — `createNotificationWithRecipients()`, `markNotificationAsRead()`, `getUnreadNotificationCount()`
- **Push client**: `apps/web/lib/pushNotifications.ts` — singleton `pushNotificationService`, calls notifications-server `/api/push/send` and `/api/push/send-batch`

### API Routes (`apps/web/app/api/notifications/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/notifications/[userId]` | GET | Paginated notifications (skip/limit) |
| `/notifications/[userId]` | POST | Create notification |
| `/notifications/[id]` | PATCH | Mark as read |
| `/notifications/mark-all-read/[userId]` | PATCH | Mark all read |
| `/notifications/unread-count/[userId]` | GET | Unread count |
| `/notifications/admin` | POST | Create admin notification (targets by accountType) |

### Push Delivery Chain

```
pushNotificationService.sendNotificationToUsers()
  → POST notifications-server:8080/api/push/send-batch
  → Go: GetMultipleUsersDeviceTokens() from push_devices (active, prod)
  → Go: pusher.SendToiOS() / SendToAndroid()
  → POST gorush:8088/api/push
  → APNs / FCM
```

### Notifications Server (`apps/notifications-server/`)

Go microservice. See [its own CLAUDE.md](apps/notifications-server/CLAUDE.md) for details.

- `main.go` — HTTP server, health endpoints, Telegram bot
- `push.go` — device token queries, push dispatch
- `pusher.go` — Gorush API client (platform routing)
- Docker: `docker-compose.notifications.yml` (gorush-init decodes AuthKey.p8 from `APNS_KEY_BASE64`, gorush runs on 8088, notifications-server on 8080)

### Web Frontend (`apps/web/components/notifications/`)

- `NotificationsViewModel.ts` — `useInfiniteQuery` for paginated fetch, merges regular + admin notifications, optimistic read mutations
- `NotificationsView.tsx` — tabs (All/Unread/Read/Admin), infinite scroll, framer-motion animations
- `AdminNotificationsView.tsx` — admin broadcast list with load-more
- `notification-modals/NotificationModalRouter.tsx` — dispatches type-specific modals (NewSignupsModal, UnassignedSpecialtyPatientModal, OnboardingModal, AdminNotificationModal)

### Mobile Frontend

- `viewModels/NotificationsViewModel.ts` — same pattern as web, 2-min refetch interval, uses `getApiUrl()` + `storageUtils.getToken()`
- `screens/NotificationsScreen.tsx` — tabs (All/Unread/Read/Admin), FlatList, pull-to-refresh
- `utils/notificationRouting.ts` — `shouldOpenSheet()` (inline sheets vs navigation), `getNotificationRoute()` (React Navigation params), `getNotificationActionText()`
- `components/notification-sheets/NotificationSheetRouter.tsx` — dispatches sheets: NewSignupsSheet, UnassignedPatientSheet, OnboardingSheet, MissionUpdateSheet, AdminNotificationSheet, FeedbackAlertSheet
- `hooks/useUnreadNotificationCount.ts` — polls unread count every 2 min
- `services/PushNotificationService.ts` — APNs token registration (polls native `APNsDiagnostics` module), handles user-change re-registration, foreground/background notification handlers
- `services/APNsDiagnostics.ts` — native iOS module for entitlements, authorization status, connectivity checks
- `components/DeviceRegistration.tsx` — debug UI for force-registering device tokens with full APNs diagnostics

### Mobile Push Notification Deep Linking

Push tap → `PushNotificationService.handleNotificationTap()`:
- `message` → Messages tab
- `new_user_signup` → Admin > AdminDashboard (initialSection: newSignups)
- `profile_update_request` → Admin > AdminDashboard (initialSection: profileUpdateRequests)
- `account_approved` → no-op (WaitingRoomScreen auto-detects)
- `patient_update` / `specialty_no_doctors` → Dashboard > PatientChart (if patientId)
- Default → Notifications tab

## Media & Audio System

Media storage and audio recording/playback span both platforms. Shared types/utils live in `packages/shared/src/media/` (see [its CLAUDE.md](packages/shared/src/media/CLAUDE.md)).

### Upload Flow

```
User selects/captures file
  → API route (FormData + Bearer token)
  → storageService.upload() (apps/web/lib/storage/storage-service.ts)
  → S3 PutObjectCommand to RustFS
  → Returns { filePath, signedUrl }
  → DB record created (patientMedia, internalMessages, etc.)
```

All uploads go through the centralized `StorageService` — 7 endpoints migrated (telegram photos/audio, internal messages photos/audio/docs, patient photos, license uploads).

### Signed URL Strategy

| Layer | TTL | Notes |
|-------|-----|-------|
| S3 presigned URL | 1 hour | Generated by `storageService` |
| Web memory cache (`lib/media/media-cache.ts`) | 45 min | In-flight dedup, batch support |
| Mobile memory cache (`services/MediaService.ts`) | Session | Base64 data URIs |
| Mobile SQLite cache (`MEDIA_CACHE` table) | Indefinite | Survives app restart, explicit clear |
| Mobile failure cooldown | 60 sec | Prevents retry spam |

- **Web**: `GET /api/media/get-signed-url?filePath=...` (also supports `proxy=true` for streaming through server)
- **Mobile**: `MediaService.fetchMedia()` → three-tier cache (memory → SQLite → network)

### Audio Recording (Mobile)

- Uses `react-native-audio-api` at 16kHz mono (shared `AUDIO_SAMPLE_RATE`)
- Adaptive silence detection: calibrates on ambient noise (~1s), threshold = multiplier × ambient RMS
- Auto-stop after 3s silence, 7s no-speech, or 20s hard cap
- Returns `Float32Array` → `float32ToWavBuffer()` → WAV file → upload

### Audio Playback

- **Web**: `AudioNotePlayer.tsx` — Web Audio API + FFmpeg fallback for OGG→MP4 (Safari)
- **Mobile**: `InlineAudioPlayer.tsx` — `react-native-audio-api`, gesture-based scrubbing
- Both use shared `generateWaveform()` for visualization

### Key Upload API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/patient/{id}/upload-photo` | Patient media |
| `POST /api/internal-messages/{id}/upload-audio` | Internal message audio |
| `POST /api/telegram-thread/{chatId}/upload-audio` | Telegram audio |
| `GET /api/media/get-signed-url` | Unified signed URL retrieval |

## Telegram Bot & Patient Messaging

Two purposes: (1) patient intake via bot-generated form links, (2) bidirectional doctor-patient messaging. The Go bot lives in `apps/notifications-server/`, messaging UI in both web and mobile patient charts.

### Architecture

```
Patient ↔ Telegram ↔ Go Bot (polling) ↔ Web API routes ↔ PostgreSQL
                                                          ↕
                                              Doctor (web or mobile UI)
```

- **Go bot** (`apps/notifications-server/`): `main.go` runs Telegram polling + health server. `handlers.go` dispatches text/photo/video/audio. `api.go` calls web backend. `storage.go` uploads media to S3
- **Bot auth**: `MEDFLOW_KEY` bearer token for Go → web backend calls
- **Doctor auth**: NextAuth (web) or JWT (mobile) for doctor → web backend calls

### Patient Intake Flow

```
Patient messages bot → bot creates patient record + thread
  → patient sends /url → bot calls GET /telegram-thread/{chatId}/get-intake-url
  → generates 64-char hex token in telegram_intake_tokens table
  → bot sends link: {PUBLIC_URL}/telegram-patient/{token}
  → patient opens form in browser (apps/web/components/telegram-patient/)
  → POST /api/telegram-intake-form/{token} submits form data
  → updates patient record, tags with active mission + default hospital
  → sends thank-you message via Telegram (multi-language)
  → creates triage notification for staff
```

Token table: `telegram_intake_tokens` (token, patientId, telegramChatId, isValid, submitted, expiresAt)

### Message Flow

**Patient → Doctor**:
```
Telegram message → Go bot → PATCH /telegram-thread/{chatId}/save-message (MEDFLOW_KEY)
  → INSERT telegram_messages + append to telegram_threads.messages JSON
  → INCREMENT unread_count → PostgreSQL NOTIFY → SSE to web doctors
```

**Doctor → Patient**:
```
Doctor types message → POST /telegram-thread/{chatId}/send-text (NextAuth/JWT)
  → appends signature "-- Dr. Name" (unless omitSignature)
  → POST to Telegram Bot API /sendMessage
  → INSERT telegram_messages + append to telegram_threads.messages JSON
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `telegram_threads` | Thread per patient chat (chat_id, patient_id, participants, unread_count, status) |
| `telegram_messages` | Normalized messages (text, sender, type, media_url, translated_text) |
| `telegram_thread_participants` | Doctor membership in threads |
| `telegram_intake_tokens` | Secure intake form tokens (64-char hex, one per patient) |
| `patient_follow_ups` | Scheduled follow-up messages |

Message types: text, image, video, file, reply, forward, audio

### Real-Time Updates (Web)

- SSE endpoint: `GET /api/telegram-thread/realtime?chatId=...&patientId=...`
- Uses PostgreSQL LISTEN/NOTIFY via shared `pgNotificationHub` (no per-client DB connection)
- 30s heartbeat, auto-reconnect with exponential backoff (max 5 attempts)
- Hook: `useRealtimeMessages` subscribes to `thread-update` events

### Web Messaging UI (`apps/web/components/patient-chart/telegram-messages/`)

- `TelegramMessagesView.tsx` — card with header, message list, input, full-screen toggle
- `TelegramMessagesDoctorView.tsx` — doctor-private message view
- ViewModels in `view-model/`: `useMessageLoading`, `useMessageHandling`, `useMediaHandling`, `useRealtimeMessages`
- Language mismatch detection → translate-before-send dialog
- In-memory message cache with timestamps

### Mobile Messaging (`apps/mobile/src/components/patient-chart/messaging/`)

- Offline-first: reads from PowerSync (`telegram_messages` table), sends via API when online
- Hooks: `useTelegramMessagesViewModel` (main), `useTelegramMessageSending` (offline queue), `useTelegramRealtime` (polling fallback), `useTelegramTranslation`
- `TelegramMessageCache` singleton: messages TTL 5min, media TTL 30min, auto-cleanup every 5min

### Multi-Language Support

- Intake form: multi-language UI
- Post-registration messages: English, Arabic, Farsi, Pashto, Turkish, Urdu, Spanish, French (`utils/telegram/postRegistrationConfirmation.ts`)
- Doctor messaging: detects language mismatch, offers translate-before-send
- Message-level translation: `translatedText` + `isTranslated` fields, toggle per message

### Key API Routes (`apps/web/app/api/telegram-thread/`)

| Route | Method | Auth | Purpose |
|-------|--------|------|---------|
| `/{chatId}/send-text` | POST | NextAuth/JWT | Doctor sends text to patient |
| `/{chatId}/save-message` | PATCH | MEDFLOW_KEY | Bot saves incoming patient message |
| `/{chatId}/get` | GET | NextAuth | Fetch thread + messages |
| `/{chatId}/get-intake-url` | GET | MEDFLOW_KEY | Generate intake token for /url command |
| `/{chatId}/send-photo` | POST | NextAuth/JWT | Send photo to patient |
| `/{chatId}/upload-audio` | POST | NextAuth/JWT | Upload + send audio |
| `/{chatId}/update-translations` | PATCH | NextAuth | Translate messages |
| `/{chatId}/reset-unread-count` | POST | NextAuth | Mark as read |
| `/realtime` | GET | JWT | SSE for real-time updates |
| `/save-follow-up` | POST | NextAuth | Create scheduled follow-up |
| `/CRON/v1-chat-follow-up` | POST | MEDFLOW_KEY | Cron job for follow-ups |
