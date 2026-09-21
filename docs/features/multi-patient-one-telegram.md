# Multi-Patient Per Telegram Account

## Problem

A parent or guardian may have multiple children who are all patients, but only one Telegram account. The current system enforces a 1:1 relationship between Telegram chat IDs and patient records. If a parent tries to link a second child's patient record to the same Telegram account, the system rejects it.

## Current Constraints

- `patients.telegram_chat_id` is the key field — one value per patient
- `telegram_threads` has a unique constraint on `chat_id`, meaning one thread per Telegram chat
- The Go bot creates one patient record per new chat ID
- Link codes (v1) reject a second link attempt from the same chat ID

## Proposed Design

### Database Changes

- **Remove unique constraint** on `telegram_threads.chat_id` — allow multiple threads per chat ID, one per patient
- **Add `active_patient_id`** column to `telegram_threads` or a new `telegram_chat_sessions` table to track which patient is currently "active" per chat ID
- `patients.telegram_chat_id` can remain — multiple patients may share the same value

### Bot UX: Patient Context Switching

When a chat ID is linked to multiple patients, the bot needs to know which patient the messages are about.

**Option A: `/switch` command**

```
Parent: /switch
Bot: "Who is this conversation about?"
     1. Ali (DOB: 2015-03-12)
     2. Sara (DOB: 2018-07-25)
Parent: 1
Bot: "Switched to Ali. Messages will go to Ali's chart."
```

- Messages are routed to the active patient's thread
- Bot shows active patient name in responses
- Default: last-used patient

**Option B: Per-message tagging (more complex, not recommended)**

- Parent prefixes messages with patient name
- Too error-prone for non-tech-savvy users

### Message Routing

- Bot checks `active_patient_id` for the chat
- Routes incoming messages to the correct `telegram_thread` (by patient_id, not just chat_id)
- Doctor sees separate message histories per patient — no cross-contamination

### Link Code Flow (v2)

- When a parent sends a second link code from the same chat ID:
  - Instead of rejecting, create a new `telegram_thread` for the new patient with the same `chat_id`
  - Add the patient to the chat's "linked patients" list
  - Bot confirms: "You now have 2 patients linked. Use /switch to change."

### Privacy Considerations

- The parent/guardian sees all linked patients' conversations (they're all in the same chat)
- Each patient's chart (visible to doctors) only shows that patient's messages
- Consent: staff should verify the parent is the legal guardian before generating a link code for a child

### Notification Routing

- When a doctor sends a message to any linked patient, it goes to the same Telegram chat
- The bot should prefix messages with the patient name: "Message for Ali: ..."
- This prevents confusion when the parent has multiple linked patients

### Migration Path (v1 → v2)

1. No schema changes needed for existing 1:1 links — they continue working
2. Remove the "chat ID already linked" rejection in `redeemLinkCode()`
3. Add `active_patient_id` tracking (new table or column)
4. Add `/switch` command to Go bot
5. Update message routing in `save-message` and `send-text` to use active patient context
6. Update web/mobile UIs to handle the case where a thread's chat ID maps to multiple patients

## When to Build

After v1 linking is proven in the field (deployed, tested with real patients). This feature adds significant complexity to the bot and message routing — not worth building speculatively.

## Effort Estimate

- Database: small (add session tracking table, relax unique constraint)
- Go bot: medium (add /switch command, session management, message prefixing)
- Web API: medium (update message routing to use active patient context)
- Web/Mobile UI: small (no changes needed — each patient chart shows its own thread)
- Testing: high (many edge cases around context switching, concurrent messages, notification routing)

## Open Questions

- Should the bot auto-switch context when the parent sends a link code for a new patient?
- How to handle the intake form — does the parent fill it out per-child?
- Maximum number of linked patients per Telegram account?
- What happens if one patient is discharged — does the link remain?
