# Telegram Family Account Rollout Plan

## Goal

Ship support for linking multiple family members to one Telegram account before launch, without forcing a risky post-launch migration.

This document is the working plan and checklist for the rollout.

## Outcome We Want

- A parent or guardian can link multiple patients to one Telegram account
- Each patient still has a separate clinician thread and chart history
- Doctors clearly know which patient they are messaging
- Caregiver replies route to the correct patient thread with minimal friction
- Mobile offline mode still works and does not queue ambiguous messages

## Non-Negotiable Architecture Decision

Do not model `chatId` as the patient conversation key.

Use separate concepts:

- Telegram account/chat
- patient link to that account
- patient-specific thread
- messages on that thread

## Proposed Model

### New tables

- `telegram_accounts`
  - `id`
  - `chat_id unique`
  - `active_patient_id nullable`
  - `created_at`
  - `updated_at`

- `patient_telegram_links`
  - `id`
  - `telegram_account_id`
  - `patient_id`
  - `relationship_to_patient nullable`
  - `linked_by nullable`
  - `linked_at`
  - `unlinked_at nullable`

### Changes to existing tables

- `telegram_threads`
  - add `telegram_account_id`
  - keep `patient_id`
  - change uniqueness from `chat_id unique` to `(telegram_account_id, patient_id) unique`

- `telegram_messages`
  - keep `thread_id`
  - add Telegram metadata needed for reply routing if missing
  - likely add:
    - `telegram_message_id nullable`
    - `reply_to_telegram_message_id nullable`
    - `direction`

### Compatibility

- keep `patients.telegram_chat_id` temporarily
- stop using it as the routing source of truth

## Routing Rules

### Inbound caregiver message

1. Resolve `chatId -> telegram_account`
2. If message is a reply to a known outbound Telegram message, route to that thread
3. Else if exactly one linked patient exists, route there
4. Else if `active_patient_id` exists, route there
5. Else prompt caregiver to choose a patient

### Inbound link code

1. Resolve or create `telegram_account` from `chatId`
2. Create `patient_telegram_link`
3. Create patient-specific `telegram_thread` if missing
4. Auto-switch `active_patient_id` to the newly linked patient
5. Confirm success and explain `/switch`

### Outbound clinician message

1. Clinician sends from a patient thread, not a chat ID
2. Backend looks up the owning Telegram account
3. Send to shared Telegram `chat_id`
4. Save only on the selected patient thread
5. If the Telegram account has multiple linked patients, prefix with localized `Message for {patientName}:`

## UX Decisions

### Caregiver UX

- add `/switch`
- add `/current`
- add `/patients`
- if inbound context is ambiguous, ask once with buttons
- do not force confirmation for every message
- prefer reply-to routing over repeated prompts

### Clinician UX

- show a visible banner for shared family Telegram accounts
- show active patient context in the Telegram header
- prefix outbound messages for shared accounts in the patient language
- never let a clinician think they are in a patient-specific thread when the backend is still routing by raw chat ID

## Workstreams

### 1. Schema and data migration

- [ ] Create `telegram_accounts`
- [ ] Create `patient_telegram_links`
- [ ] Add `telegram_account_id` to `telegram_threads`
- [ ] Add unique constraint for `(telegram_account_id, patient_id)`
- [ ] Backfill existing 1:1 data into the new tables
- [ ] Preserve legacy compatibility during transition

### 2. Helper layer and source of truth

- [ ] Add helpers to resolve account by `chatId`
- [ ] Add helpers to list linked patients for an account
- [ ] Add helper to resolve the correct inbound thread
- [ ] Add helper to fetch thread by `(telegram_account_id, patient_id)`
- [ ] Stop adding new logic that assumes `getTelegramThreadByChatId()` is sufficient

### 3. Bot routing

- [ ] Update link-code redemption to allow multiple patients on one account
- [ ] Add `/switch`
- [ ] Add `/current`
- [ ] Add `/patients`
- [ ] Persist and use `active_patient_id`
- [ ] Add reply-to-based routing using Telegram message IDs
- [ ] Make ambiguous inbound messages prompt for patient choice

### 4. Web clinician messaging

- [ ] Move clinician sends from `chatId` endpoints to `threadId` endpoints
- [ ] Move thread loading from `chatId` to `threadId`
- [ ] Update realtime subscriptions to be thread-scoped
- [ ] Update cache keys to be thread-scoped
- [ ] Add family-account banner and patient context UI
- [ ] Add localized outbound patient-name prefixes

### 5. Web media gallery

- [ ] Stop listing media by `chatId`
- [ ] Move gallery queries to thread-scoped media
- [ ] Update storage paths to avoid sibling media collisions
- [ ] Ensure patient delete only removes that patient's media

### 6. Intake flow

- [ ] Make intake tokens validate against the account/link model, not direct patient chat equality only
- [ ] Keep intake per child
- [ ] Make `/url` use active patient when unambiguous
- [ ] If multiple linked patients exist and no active context exists, prompt for selection

### 7. Mobile online/offline messaging

- [ ] Stop querying Telegram threads by `chat_id` only
- [ ] Move mobile queue keys from `telegramChatId` to `threadId`
- [ ] Carry `chatId` as delivery metadata only
- [ ] Update queue drain logic for `threadId`-scoped sends
- [ ] Update translation queueing to be thread-scoped
- [ ] Verify PowerSync sync rules and local schema still support the new thread model

### 8. Delete, unlink, export, and cleanup

- [ ] Patient delete should unlink or remove only the patient thread
- [ ] Do not delete shared account media by `chatId`
- [ ] Export should fetch the correct patient thread
- [ ] Add unlink flow for one patient without breaking siblings

### 9. Docs and guardrails

- [x] Add Telegram-specific `CLAUDE.md`
- [ ] Keep this rollout plan updated as tasks move
- [ ] Add migration notes for any new thread/account APIs

## Highest-Risk Existing Assumptions

- Web Telegram chart still loads by `telegramChatId`
- Web gallery still lists media by `chatId`
- Realtime currently filters by `chatId`
- Mobile offline queue uses `record_id = telegramChatId`
- Patient delete currently removes media and thread by shared `chatId`
- Intake validation still compares patient record `telegramChatId` directly
- Web still reads `telegram_threads.messages` JSON while mobile reads normalized `telegram_messages`

## Recommended Implementation Order

### Phase 1: foundation

- [ ] Add new schema
- [ ] Backfill existing data
- [ ] Add new helper functions
- [ ] Keep old single-patient behavior working

### Phase 2: safe routing

- [ ] Update link code flow
- [ ] Add account active-patient state
- [ ] Add bot `/switch` and ambiguity prompts
- [ ] Add reply-to routing support

### Phase 3: clinician correctness

- [ ] Convert web clinician messaging APIs to thread-based sends and loads
- [ ] Add shared-account banner and outbound prefixes
- [ ] Convert gallery to thread-scoped media

### Phase 4: mobile and offline

- [ ] Convert mobile thread loading to thread-based lookup
- [ ] Convert offline queue to thread-based keys
- [ ] Verify queue replay and translation replay

### Phase 5: cleanup

- [ ] Fix delete/export/intake validation flows
- [ ] Remove old `chatId == thread` assumptions where safe
- [ ] Decide when to retire legacy JSON thread reads

## Open Decisions

- [ ] exact schema names and columns
- [ ] whether outbound prefixing should always be localized or only for multi-patient accounts
- [ ] max linked patients per Telegram account
- [ ] whether discharged patients remain linked by default
- [ ] final media storage path format

## Tracking Notes

Use this section as a running log while implementing.

### Current status

- Telegram-specific guardrails doc created
- rollout plan created
- detailed codebase analysis complete

### Next suggested task

- build the schema migration and helper-layer plan in detail before editing code
