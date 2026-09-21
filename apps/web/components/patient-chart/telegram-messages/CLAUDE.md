# Telegram Messaging Guardrails

This folder is the clinician-facing Telegram chart UI. It sits in the middle of a larger system that also includes:

- `apps/web/app/api/telegram-thread/*`
- `apps/web/lib/telegram-db-helpers.ts`
- `apps/web/components/patient-chart/media-gallery/*`
- `apps/mobile/src/components/patient-chart/messaging/*`
- `apps/notifications-server/*`

The Telegram system is in transition from a legacy `chatId == patient thread` model to a safer `telegram account != patient thread` model.

## Core Rule

For clinician workflows, do not treat `telegramChatId` as the primary identifier for a conversation.

- `telegramChatId` identifies the shared Telegram account/chat
- `threadId` identifies the patient-specific conversation
- `patientId` identifies the chart owner

If a Telegram account is linked to multiple patients, chart UI and clinician APIs must operate on `threadId` or `patientId`, not raw `chatId`.

## Current Risk Areas

- Web Telegram chart still loads and sends by `telegramChatId`
- Web gallery still lists media by `chatId`
- Mobile offline queue still keys queued sends by `telegramChatId`
- Bot inbound routing still only knows `chatId`
- Some web code still reads legacy `telegram_threads.messages` JSON while mobile reads normalized `telegram_messages`

Any change in this folder must consider those dependencies.

## Desired Data Model

- `telegram_accounts`
  - one row per Telegram chat/account
  - owns `chat_id`
  - tracks `active_patient_id`
- `patient_telegram_links`
  - maps a Telegram account to one or more patients
- `telegram_threads`
  - one row per patient conversation
  - belongs to a Telegram account
- `telegram_messages`
  - one row per message
  - belongs to a patient thread

`patients.telegramChatId` is compatibility data during migration, not the long-term routing key.

## UX Rules

### Clinician outbound messages

When a Telegram account is linked to more than one patient:

- outbound messages must be tagged with a localized prefix like `Message for {patientName}:`
- the chart must clearly show which patient thread the clinician is in
- message sends must target the selected patient thread while delivering to the shared Telegram account

### Caregiver inbound messages

Routing precedence should be:

1. Telegram reply target
2. single linked patient
3. active patient context on the Telegram account
4. explicit chooser prompt

Do not require per-message confirmation for every inbound caregiver message.

## Web UI Rules

- Prefer `threadId` in component props, cache keys, and API calls
- `telegramChatId` may still be displayed in headers for support/debugging
- Message caches and realtime subscriptions should be thread-scoped
- Media galleries must not merge media across sibling patients on a shared Telegram account

## API Rules

- Bot-facing inbound APIs may remain `chatId`-based where Telegram requires it
- Clinician-facing APIs should migrate to `threadId`-based endpoints
- Avoid adding new clinician features that depend on `/{telegramChatId}/...`

## Storage Rules

Do not store or delete Telegram media purely by `chatId` once multi-patient linking is enabled.

Preferred future shape:

- `telegram/photos/{threadId}/...`
- `telegram/audio/{threadId}/...`

or

- `telegram/{patientId}/{threadId}/...`

This prevents deleting or displaying one child's media from another child's chart.

## Mobile Offline Rules

Mobile offline queue entries for Telegram messaging should eventually carry:

- `threadId`
- `telegramAccountId` or `chatId`
- `patientId`
- payload data

Do not rely on `record_id = telegramChatId` as the long-term offline routing key.

## Migration Rules

- Keep old behavior working for single-patient Telegram accounts during rollout
- Prefer additive schema changes first
- Move reads to normalized `telegram_messages` before removing legacy JSON reliance
- Do not delete shared Telegram assets or shared account state when unlinking one patient

## If You Touch This Folder

Check these areas before finalizing changes:

- web chart messaging UI
- web media gallery
- telegram thread APIs
- bot routing in `apps/notifications-server`
- mobile Telegram messaging and offline queue
- intake token validation and patient delete flows

If a change assumes `chatId` is unique to one patient, it is likely wrong for the target architecture.
