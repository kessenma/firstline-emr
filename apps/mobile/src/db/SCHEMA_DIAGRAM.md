# PowerSync Schema Diagram

## Database Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        POSTGRESQL BACKEND                            │
│                     (Production Database)                            │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ↕ PowerSync Service (Real-time sync)
                             │
┌────────────────────────────┴────────────────────────────────────────┐
│                    SQLITE LOCAL DATABASE                             │
│                     (Mobile App Storage)                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Core Entity Relationships

### User & Patient Management

```
┌─────────────┐
│    USERS    │ (Healthcare providers, staff)
├─────────────┤
│ id (PK)     │───┐
│ email       │   │
│ first_name  │   │
│ last_name   │   │
│ account_type│   │
└─────────────┘   │
                  │
                  │ coordinator_id (FK)
                  ↓
            ┌──────────────┐
            │   PATIENTS   │ (Patient records)
            ├──────────────┤
            │ id (PK)      │───┐
            │ first_name   │   │
            │ last_name    │   │
            │ status       │   │
            │ priority     │   │
            │coordinator_id│   │ patient_id (FK)
            └──────────────┘   │
                               │
                ┌──────────────┼──────────────┬──────────────┐
                │              │              │              │
                ↓              ↓              ↓              ↓
         ┌──────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐
         │  NOTES   │   │  VISITS  │  │TELEGRAM_ │  │ PATIENT_ │
         │          │   │          │  │ THREADS  │  │  PHOTOS  │
         ├──────────┤   ├──────────┤  ├──────────┤  ├──────────┤
         │ id (PK)  │   │ id (PK)  │  │ id (PK)  │  │ id (PK)  │
         │patient_id│   │patient_id│  │patient_id│  │patient_id│
         │author_id │   │visit_date│  │ chat_id  │  │   url    │
         │note_type │   │  vitals  │  │ messages │  └──────────┘
         │ content  │   │lab_result│  └──────────┘
         └──────────┘   └──────────┘
```

---

### Messaging System

```
┌─────────────┐
│    USERS    │
├─────────────┤
│ id (PK)     │───┐
└─────────────┘   │
                  │
                  │ user_id (FK)
                  ↓
         ┌────────────────────────┐
         │INTERNAL_MESSAGE_THREAD_│
         │     PARTICIPANTS       │
         ├────────────────────────┤
         │ id (PK)                │
         │ thread_id (FK)         │
         │ user_id (FK)           │
         │ unread_count           │
         │ last_read_at           │
         └───────────┬────────────┘
                     │
                     │ thread_id (FK)
                     ↓
            ┌──────────────────────┐
            │ INTERNAL_MESSAGE_    │
            │      THREADS         │
            ├──────────────────────┤
            │ id (PK)              │
            │ title                │
            │ participants (JSON)  │
            │ messages (JSON)      │
            │ is_group_chat        │
            │ last_activity        │
            └──────────────────────┘


┌─────────────┐
│  PATIENTS   │
├─────────────┤
│ id (PK)     │───┐
└─────────────┘   │
                  │ patient_id (FK)
                  ↓
            ┌──────────────────┐
            │ TELEGRAM_THREADS │
            ├──────────────────┤
            │ id (PK)          │
            │ chat_id          │
            │ patient_id (FK)  │
            │ messages (JSON)  │
            └──────────────────┘
                  │
                  │ thread_id (FK)
                  ↓
            ┌──────────────────────┐
            │TELEGRAM_THREAD_      │
            │   PARTICIPANTS       │
            ├──────────────────────┤
            │ id (PK)              │
            │ thread_id (FK)       │
            │ user_id (FK)         │
            └──────────────────────┘
```

---

### Notifications System

```
┌─────────────┐
│    USERS    │
├─────────────┤
│ id (PK)     │───┐
└─────────────┘   │
                  │ user_id (FK)
                  ↓
         ┌────────────────────┐
         │  NOTIFICATION_     │
         │   RECIPIENTS       │
         ├────────────────────┤
         │ id (PK)            │
         │ notification_id(FK)│
         │ user_id (FK)       │
         └─────────┬──────────┘
                   │
                   │ notification_id (FK)
                   ↓
            ┌──────────────┐
            │NOTIFICATIONS │
            ├──────────────┤
            │ id (PK)      │
            │ message      │
            │ type         │
            │ patient_id   │
            │ redirect_to  │
            └──────────────┘
```

---

### Prescription System

```
┌─────────────┐
│  PATIENTS   │
├─────────────┤
│ id (PK)     │───┐
└─────────────┘   │
                  │ patient_id (FK)
                  ├──────────────────┐
                  ↓                  ↓
           ┌─────────────┐    ┌─────────────┐
           │ MED_ORDERS  │    │  RX_ORDERS  │
           │  (Legacy)   │    │    (New)    │
           ├─────────────┤    ├─────────────┤
           │ id (PK)     │    │ id (PK)     │
           │ patient_id  │    │ patient_id  │
           │ dr_id       │    │ dr_id       │
           │medications  │    │prescriptions│
           │  (JSON)     │    │  (JSON)     │
           │ validated   │    │ rx_status   │
           └─────────────┘    └─────────────┘
```

---

### Medical Evacuation System

```
┌─────────────┐
│  PATIENTS   │
├─────────────┤
│ id (PK)     │───┐
└─────────────┘   │
                  │ patient_id (FK)
                  ↓
        ┌──────────────────────┐
        │  MED_EVAC_PATIENTS   │
        ├──────────────────────┤
        │ id (PK)              │
        │ patient_id (FK)      │
        │ urgency              │
        │ treatment_status     │
        │ hospital_acceptance_ │
        │   status             │
        │ medical_approval     │
        │ logistical_approval  │
        │ flight_details       │
        │ hosting_family_status│
        │ ... (80+ fields)     │
        └──────────────────────┘
```

---

## Local-Only Tables (Not Synced)

```
┌──────────────────────────────────────────┐
│         LOCAL DEVICE STORAGE             │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────┐  ┌──────────────┐       │
│  │  UI_STATE  │  │OFFLINE_QUEUE │       │
│  ├────────────┤  ├──────────────┤       │
│  │ key (PK)   │  │ id (PK)      │       │
│  │ value      │  │ operation    │       │
│  │ updated_at │  │ table_name   │       │
│  └────────────┘  │ record_id    │       │
│                  │ data (JSON)  │       │
│  ┌──────────────┤ retry_count  │       │
│  │SYNC_METADATA │ error        │       │
│  ├──────────────┤ created_at   │       │
│  │table_name(PK)│ attempted_at │       │
│  │last_sync_at  └──────────────┘       │
│  │last_sync_    │                       │
│  │  success     │                       │
│  │record_count  │                       │
│  └──────────────┘                       │
└──────────────────────────────────────────┘
```

---

## Table Categories

### 👥 User & Patient Management
- `users` - Healthcare providers and staff
- `patients` - Patient records and demographics

### 📝 Clinical Documentation
- `notes` - Clinical notes (intake, progress, discharge)
- `visits` - Visit records with vitals and lab results

### 💬 Messaging
- `internal_message_threads` - Staff-to-staff communication
- `internal_message_thread_participants` - Thread membership
- `telegram_threads` - Patient communication via Telegram
- `telegram_thread_participants` - Telegram membership

### 🔔 Notifications
- `notifications` - System notifications
- `notification_recipients` - Notification delivery

### 💊 Prescriptions
- `med_orders` - Legacy medication orders
- `rx_orders` - New prescription system

### 📎 Attachments
- `patient_photos` - Patient photo attachments

### ✈️ Medical Evacuation
- `med_evac_patients` - Comprehensive evacuation tracking

### 📱 Local Storage (Device Only)
- `ui_state` - UI preferences and filters
- `offline_queue` - Pending mutations
- `sync_metadata` - Sync status tracking

---

## Data Flow Patterns

### Read Flow (Offline-First)
```
1. Query local SQLite ──→ 2. Return cached data
                          3. PowerSync syncs in background
                          4. UI auto-updates on changes
```

### Write Flow (Write-Through)
```
1. Write to local SQLite ──→ 2. Instant UI update
                          3. Queue for sync
                          4. Background upload to PostgreSQL
                          5. Conflict resolution (if any)
```

### Sync Flow
```
PostgreSQL (Change) ──→ PowerSync Service ──→ Local SQLite ──→ UI Update
                       (Real-time detection)  (Incremental)   (Reactive)
```

---

## Index Strategy

### Foreign Key Indexes (All Tables)
Every foreign key column has an index for join performance:
- `patients.coordinator_id` → `users.id`
- `notes.patient_id` → `patients.id`
- `notes.author_id` → `users.id`
- ... (30+ foreign key indexes)

### Filter Indexes
Commonly filtered columns are indexed:
- `patients.status`, `patients.priority`
- `notes.note_type`, `notes.draft`
- `notifications.type`
- `telegram_threads.status`

### Composite Indexes
Multi-column indexes for common query patterns:
- `(thread_id, user_id)` for thread membership
- `(user_id, notification_id)` for notifications

### Sort Indexes
Timestamp columns used for sorting:
- `patients.created_at`
- `notes.date`
- `visits.visit_date`
- `internal_message_threads.last_activity`

---

## Field Naming Conventions

| Layer | Convention | Example |
|-------|-----------|---------|
| PostgreSQL | `snake_case` | `first_name`, `created_at` |
| SQLite (PowerSync) | `snake_case` | `first_name`, `created_at` |
| TypeScript | `camelCase` | `firstName`, `createdAt` |

**Automatic Conversion**: Field mapping utilities (Phase 2.2) handle conversion between conventions.

---

## Data Type Mapping

| PostgreSQL | SQLite | TypeScript | Storage |
|-----------|--------|-----------|---------|
| `UUID` | `TEXT` | `string` | "550e8400-e29b-41d4-a716-446655440000" |
| `VARCHAR(n)` | `TEXT` | `string` | "John Doe" |
| `BOOLEAN` | `INTEGER` | `number` | 0 or 1 |
| `TIMESTAMP` | `TEXT` | `string` | "2024-12-07T10:30:00.000Z" |
| `JSON/JSONB` | `TEXT` | `string` | '["value1", "value2"]' |
| `TEXT[]` | `TEXT` | `string` | '["array", "of", "strings"]' |
| `INTEGER` | `INTEGER` | `number` | 42 |
| `REAL` | `REAL` | `number` | 98.6 |

---

## Total Schema Statistics

- **Total Tables**: 17
- **Synced Tables**: 14
- **Local-Only Tables**: 3
- **Total Fields**: 300+
- **Total Indexes**: 53
- **Foreign Key Relationships**: 30+
- **JSON Fields**: 25+
- **Timestamp Fields**: 40+

---

## Related Documentation

- [Schema Definition](./powerSyncSchema.ts)
- [Helper Utilities](./helpers.ts)
- [Complete Documentation](./README.md)
- [Migration Plan](../../docs/sql-transtion/SQL_MOBILE_TRANSITION.md)