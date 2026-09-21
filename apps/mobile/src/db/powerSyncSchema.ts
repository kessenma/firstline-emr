// apps/mobile/src/db/powerSyncSchema.ts
// PowerSync Schema Definition - Matches PostgreSQL schema structure
// This schema defines the local SQLite tables that will sync with PostgreSQL via PowerSync

import { column, Schema, Table } from '@powersync/react-native';

/**
 * Core Tables - Synced from PostgreSQL
 */

// Users table - Healthcare providers and staff
const users = new Table(
  {
    id: column.text, // UUID primary key
    email: column.text,
    first_name: column.text,
    last_name: column.text,
    account_type: column.text, // 'Doctor' | 'Triage'
    password: column.text,
    doctor_specialty: column.text, // JSON array as text
    languages: column.text, // JSON array as text
    countries: column.text, // JSON array as text
    missions: column.text, // JSON array of mission UUIDs as text
    gender: column.text, // 'Male' | 'Female' | 'Other' | 'Prefer Not to Say'
    dob: column.text, // ISO timestamp
    image: column.text,
    medical_license: column.text,
    medical_licenses: column.text, // JSON object as text
    authorized: column.integer, // boolean as 0/1
    approval_date: column.text, // ISO timestamp
    denial_date: column.text, // ISO timestamp
    google_id: column.text,
    google_email: column.text,
    google_image: column.text,
    last_login: column.text, // ISO timestamp
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      email_idx: ['email'],
      account_type_idx: ['account_type'],
      authorized_idx: ['authorized'],
    },
  },
);

// Patients table - Primary patient records
const patients = new Table(
  {
    id: column.text, // UUID primary key
    first_name: column.text,
    last_name: column.text,
    phone: column.text, // JSON object as text
    email: column.text,
    telegram_chat_id: column.text,
    telegram_access_hash: column.text,
    bmi: column.text,
    dob: column.text, // ISO timestamp
    gender: column.text, // 'Male' | 'Female' | 'Other' | 'Prefer Not to Say'
    country: column.text,
    city: column.text,
    language: column.text,
    occupation: column.text,
    chief_complaint: column.text,
    diagnosis: column.text,
    diagnosis_cat: column.text,
    icd10: column.text,
    hospital: column.text, // hospital name from mission hospitals
    priority: column.text, // 'Not Selected' | 'Routine' | 'Moderate' | 'Urgent' | 'Emergency'
    specialties: column.text, // JSON array as text
    status: column.text, // 'Pre-Op / Not Cleared' | 'Pre-Op / Cleared' | 'Peri-Op / In Surgery' | 'Post-Op / In-Patient' | 'Post-Op / Discharged'
    baseline_ambu: column.text,
    pmhx: column.text, // Past medical history
    pshx: column.text, // Past surgical history
    famhx: column.text, // Family history
    allergies: column.text,
    current_meds: column.text,
    prev_meds: column.text,
    smoke_count: column.text,
    drink_count: column.text,
    other_drugs: column.text,
    coordinator_id: column.text, // UUID foreign key to users.id
    triaged_by: column.text, // JSON object as text (legacy)
    care_team: column.text, // JSON array as text (care team members)
    is_patient: column.integer, // boolean as 0/1
    patient_relation: column.text,
    gender_preference: column.text,
    previously_registered: column.text,
    scheduled_vid_chat: column.text, // ISO timestamp
    surgery_date: column.text, // ISO timestamp
    dashboard_notes: column.text,
    has_submitted_info: column.integer, // boolean as 0/1
    has_specialty_without_doctors: column.integer, // boolean as 0/1
    created_by_id: column.text, // UUID foreign key to users.id — audit: who created this record
    mission_id: column.text, // UUID foreign key to missions.id
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      status_idx: ['status'],
      priority_idx: ['priority'],
      telegram_chat_id_idx: ['telegram_chat_id'],
      coordinator_id_idx: ['coordinator_id'],
      email_idx: ['email'],
      country_idx: ['country'],
      created_at_idx: ['created_at'],
      mission_id_idx: ['mission_id'],
      created_by_id_idx: ['created_by_id'],
    },
  },
);

// Notes table - Clinical notes and documentation
const notes = new Table(
  {
    id: column.text, // UUID primary key
    patient_id: column.text, // UUID foreign key to patients.id
    email: column.text,
    note_type: column.text, // 'Intake' | 'Progress' | 'Discharge' | 'Consultation' | 'Other'
    date: column.text, // ISO timestamp
    author_name: column.text,
    author_id: column.text, // UUID foreign key to users.id
    attending_physician_id: column.text, // UUID FK to users.id — snapshot of care team lead
    attending_physician_name: column.text, // denormalized for offline display
    content: column.text, // JSON object as text
    draft: column.integer, // boolean as 0/1
    last_editor_id: column.text, // UUID — transient: who last edited
    last_editor_name: column.text, // transient: editor display name
    last_editor_account_type: column.text, // transient: 'Doctor' | 'Triage'
    last_editor_care_team_role: column.text, // transient: 'surgeon' | 'assistant' | etc.
    skip_edit_record: column.integer, // boolean 0/1 — if 1, server skips creating note_edit
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      patient_id_idx: ['patient_id'],
      author_id_idx: ['author_id'],
      note_type_idx: ['note_type'],
      date_idx: ['date'],
      draft_idx: ['draft'],
    },
  },
);

// Internal message threads - Staff-to-staff communication
const internal_message_threads = new Table(
  {
    id: column.text, // UUID primary key
    title: column.text,
    participants: column.text, // JSON array of UUIDs as text
    unread_count: column.integer,
    status: column.text, // 'active' | 'archived'
    last_activity: column.text, // ISO timestamp
    created_by: column.text, // UUID foreign key to users.id
    is_group_chat: column.integer, // boolean as 0/1
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      status_idx: ['status'],
      last_activity_idx: ['last_activity'],
      created_by_idx: ['created_by'],
    },
  },
);

// Internal message thread participants - Join table for thread membership
const internal_message_thread_participants = new Table(
  {
    id: column.text, // UUID primary key
    thread_id: column.text, // UUID foreign key to internal_message_threads.id
    user_id: column.text, // UUID foreign key to users.id
    unread_count: column.integer,
    last_read_at: column.text, // ISO timestamp
    joined_at: column.text, // ISO timestamp
    left_at: column.text, // ISO timestamp, null = active participant
  },
  {
    indexes: {
      thread_id_idx: ['thread_id'],
      user_id_idx: ['user_id'],
      thread_user_idx: ['thread_id', 'user_id'],
    },
  },
);

// Internal messages - Individual messages in staff-to-staff threads (normalized)
const internal_messages = new Table(
  {
    id: column.text, // UUID primary key
    thread_id: column.text, // UUID foreign key to internal_message_threads.id
    text: column.text,
    sender: column.text,
    sender_id: column.text, // UUID foreign key to users.id
    timestamp: column.text, // ISO timestamp
    type: column.text, // 'text' | 'image' | 'video' | 'file' | 'reply' | 'forward' | 'audio' | 'patient-card'
    media_url: column.text,
    reply_to: column.text,
    forwarded_from: column.text,
    deleted_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
    read: column.integer, // boolean as 0/1
    read_at: column.text, // ISO timestamp
    created_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      thread_id_idx: ['thread_id'],
      sender_id_idx: ['sender_id'],
      timestamp_idx: ['timestamp'],
      thread_timestamp_idx: ['thread_id', 'timestamp'],
    },
  },
);

// Telegram messages - Individual messages in patient threads (normalized)
const telegram_messages = new Table(
  {
    id: column.text, // UUID primary key
    thread_id: column.text, // UUID foreign key to telegram_threads.id
    text: column.text,
    sender: column.text,
    sender_id: column.text,
    timestamp: column.text, // ISO timestamp
    type: column.text, // 'text' | 'image' | 'video' | 'file' | 'reply' | 'forward' | 'audio'
    media_url: column.text,
    reply_to: column.text,
    forwarded_from: column.text,
    deleted_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
    translated_text: column.text,
    is_translated: column.integer, // boolean as 0/1
    created_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      thread_id_idx: ['thread_id'],
      sender_id_idx: ['sender_id'],
      timestamp_idx: ['timestamp'],
      thread_timestamp_idx: ['thread_id', 'timestamp'],
    },
  },
);

// Telegram threads - Patient communication via Telegram
const telegram_threads = new Table(
  {
    id: column.text, // UUID primary key
    chat_id: column.text,
    patient_id: column.text, // UUID foreign key to patients.id
    participants: column.text, // JSON array of UUIDs as text
    unread_count: column.integer,
    status: column.text, // 'active' | 'archived'
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      chat_id_idx: ['chat_id'],
      patient_id_idx: ['patient_id'],
      status_idx: ['status'],
      updated_at_idx: ['updated_at'],
    },
  },
);

// Telegram thread participants - Join table for Telegram thread membership
const telegram_thread_participants = new Table(
  {
    id: column.text, // UUID primary key
    thread_id: column.text, // UUID foreign key to telegram_threads.id
    user_id: column.text, // UUID foreign key to users.id
    joined_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      thread_id_idx: ['thread_id'],
      user_id_idx: ['user_id'],
    },
  },
);

// User messages - Per-user message read tracking and unread counts
const user_messages = new Table(
  {
    id: column.text, // UUID primary key
    user_id: column.text, // UUID foreign key to users.id
    last_read_at: column.text, // ISO timestamp
    unread_count: column.integer,
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      user_id_idx: ['user_id'],
    },
  },
);

// Patient follow-ups - Scheduled follow-up messages for patients
const patient_follow_ups = new Table(
  {
    id: column.text, // UUID primary key
    chat_id: column.text,
    telegram_thread_id: column.text, // UUID foreign key to telegram_threads.id
    message: column.text,
    follow_up_sent_at: column.text, // ISO timestamp
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      chat_id_idx: ['chat_id'],
      telegram_thread_id_idx: ['telegram_thread_id'],
    },
  },
);

// Notifications - System notifications
const notifications = new Table(
  {
    id: column.text, // UUID primary key
    source_id: column.text, // UUID reference
    message: column.text,
    type: column.text, // 'message' | 'patient_update' | 'system' | 'alert'
    subject: column.text,
    patient_id: column.text, // UUID foreign key to patients.id
    redirect_to: column.text,
    created_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      patient_id_idx: ['patient_id'],
      type_idx: ['type'],
      created_at_idx: ['created_at'],
    },
  },
);

// Notification recipients - Join table for notification delivery
const notification_recipients = new Table(
  {
    id: column.text, // UUID primary key
    notification_id: column.text, // UUID foreign key to notifications.id
    user_id: column.text, // UUID foreign key to users.id
    created_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      notification_id_idx: ['notification_id'],
      user_id_idx: ['user_id'],
      user_notification_idx: ['user_id', 'notification_id'],
    },
  },
);

// Med orders - Medication orders (legacy, pruned to used columns)
const med_orders = new Table(
  {
    id: column.text, // UUID primary key
    patient_id: column.text, // UUID foreign key to patients.id
    prescribing_dr: column.text,
    order_date: column.text, // ISO timestamp
    medications: column.text, // JSON array as text
  },
  {
    indexes: {
      patient_id_idx: ['patient_id'],
      order_date_idx: ['order_date'],
    },
  },
);

// Rx orders - Prescription orders (pruned to used columns)
const rx_orders = new Table(
  {
    id: column.text, // UUID primary key
    patient_id: column.text, // UUID foreign key to patients.id
    rx_order_id: column.text,
    doctor_specialty: column.text,
    prescribing_dr: column.text,
    dr_email: column.text,
    dr_id: column.text, // UUID or string
    prescribed_date: column.text, // ISO timestamp
    valid_till: column.text, // ISO timestamp
    city: column.text,
    prescriptions: column.text, // JSON array as text
    submitted: column.integer, // boolean as 0/1
    // Patient-facing link + QR. Must stay in sync with the rx_orders SELECT in
    // apps/powersync-server/config/sync-rules.yaml — a column listed there but
    // missing here is dropped silently on the device.
    patient_rx_url: column.text,
    pharmacy_qr_url: column.text,
    pharmacy_qr_code: column.text, // data:image/png;base64,... payload
    // Delivery + access state. Drives the greyed-out "already sent" button,
    // the "opened / not opened yet" line and the suspicious-activity badge.
    // The access code hash and the attempt log are server-only and must never
    // be added here or to the sync rules.
    patient_link_sent_at: column.text, // ISO timestamp
    patient_link_sent_by: column.text, // UUID of the sending user
    patient_link_opened_at: column.text, // ISO timestamp, unlock POST only
    patient_link_open_count: column.integer,
    patient_link_failed_count: column.integer,
    patient_link_last_failed_at: column.text, // ISO timestamp
    patient_link_lock_state: column.text, // 'ok' | 'throttled' | 'locked'
    pharmacy_link_opened_at: column.text, // ISO timestamp
    // The pharmacy's fulfilment answer. Never synced before, so a doctor on
    // mobile could not see 'partially filled' or 'declined' at all.
    rx_status: column.text,
    // Cancellation — a separate axis from rx_status, read together via
    // describePrescriptionCancellation() in @fajr/shared/medications.
    cancelled_at: column.text, // ISO timestamp
    cancelled_by_role: column.text, // 'doctor' | 'pharmacist' | 'patient'
    cancelled_by_user_id: column.text, // null when the patient cancelled
    cancellation_reason: column.text,
    cancellation_reason_code: column.text,
  },
  {
    indexes: {
      patient_id_idx: ['patient_id'],
      prescribed_date_idx: ['prescribed_date'],
    },
  },
);

// Patient media - Patient media attachments (photos, PDFs, etc.)
const patient_media = new Table(
  {
    id: column.text, // UUID primary key
    patient_id: column.text, // UUID foreign key to patients.id
    url: column.text,
    content_type: column.text, // MIME type e.g. image/jpeg, application/pdf
    source: column.text, // 'upload' | 'video_call' | null for rows predating the column
    video_call_session_id: column.text, // set when source is 'video_call'
    uploaded_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      patient_id_idx: ['patient_id'],
    },
  },
);

// Patient care team - Many-to-many doctor/patient assignments with roles
const patient_care_team = new Table(
  {
    id: column.text, // UUID primary key
    patient_id: column.text, // UUID foreign key to patients.id
    user_id: column.text, // UUID foreign key to users.id
    role: column.text, // 'surgeon' | 'assistant' | 'consulting' | 'triage' | 'coordinator'
    is_lead: column.integer, // boolean as 0/1
    assigned_at: column.text, // ISO timestamp
    assigned_by: column.text, // UUID foreign key to users.id (nullable)
    removed_at: column.text, // ISO timestamp (nullable — soft delete)
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      patient_id_idx: ['patient_id'],
      user_id_idx: ['user_id'],
      patient_user_idx: ['patient_id', 'user_id'],
      patient_is_lead_idx: ['patient_id', 'is_lead'],
    },
  },
);

// Care team conflicts - Detected when multiple doctors claim lead offline
const care_team_conflicts = new Table(
  {
    id: column.text, // UUID primary key
    patient_id: column.text, // UUID foreign key to patients.id
    conflicting_user_ids: column.text, // text[] serialized as text
    status: column.text, // 'unresolved' | 'resolved'
    resolved_by: column.text, // UUID foreign key to users.id (nullable)
    resolved_at: column.text, // ISO timestamp (nullable)
    resolution_notes: column.text, // nullable
    created_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      patient_id_idx: ['patient_id'],
      status_idx: ['status'],
    },
  },
);

// Note edits - Audit trail for note create/update/publish actions
const note_edits = new Table(
  {
    id: column.text, // UUID primary key
    note_id: column.text, // UUID foreign key to notes.id
    editor_id: column.text, // UUID foreign key to users.id
    editor_name: column.text,
    editor_account_type: column.text, // 'Doctor' | 'Triage'
    editor_care_team_role: column.text, // 'surgeon' | 'assistant' | 'consulting' | etc.
    edit_type: column.text, // 'created' | 'updated' | 'published'
    content_snapshot: column.text, // JSON as text — content at time of edit
    created_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      note_id_idx: ['note_id'],
      created_at_idx: ['created_at'],
    },
  },
);

// Video call log - One row per video consult, shown in the patient chart.
// Written server-side by LiveKit webhooks; the client only reads it.
// invite_token is intentionally NOT synced — it is the patient's join
// credential and must not sit in local SQLite. See sync-rules.yaml.
const video_call_sessions = new Table(
  {
    id: column.text, // UUID primary key
    patient_id: column.text, // UUID foreign key to patients.id
    room_name: column.text, // LiveKit room, `patient-{id}-{suffix}`
    started_by_id: column.text, // UUID foreign key to users.id
    status: column.text, // 'pending' | 'active' | 'completed' | 'missed' | 'expired'
    started_at: column.text, // ISO timestamp — first participant joined
    patient_joined_at: column.text, // ISO timestamp — null means no-show
    ended_at: column.text, // ISO timestamp
    duration_seconds: column.integer,
    ended_reason: column.text,
    call_notes: column.text, // optional free text added after the call
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      patient_id_idx: ['patient_id'],
      started_at_idx: ['started_at'],
      status_idx: ['status'],
    },
  },
);

// Mission attachments - Files uploaded to missions (PDFs, images, etc.)
const mission_attachments = new Table(
  {
    id: column.text, // UUID primary key
    mission_id: column.text, // UUID foreign key to missions.id
    uploaded_by: column.text, // UUID foreign key to users.id
    file_path: column.text,
    file_name: column.text,
    display_name: column.text,
    file_size: column.integer,
    content_type: column.text, // MIME type
    upload_type: column.text, // 'admin_document' | 'member_photo'
    created_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      mission_id_idx: ['mission_id'],
      uploaded_by_idx: ['uploaded_by'],
    },
  },
);

// Missions table - Medical mission trips
const missions = new Table(
  {
    id: column.text, // UUID primary key
    name: column.text,
    country: column.text,
    city: column.text,
    hospitals: column.text, // JSON array of hospital name strings
    description: column.text,
    status: column.text, // 'planned' | 'active' | 'completed'
    start_date: column.text, // ISO timestamp
    end_date: column.text, // ISO timestamp
    is_active_intake: column.integer, // boolean as 0/1
    default_intake_hospital: column.text, // default hospital for new intake patients
    urls: column.text, // JSON array of {url, displayName} objects
    group_chat_thread_id: column.text, // UUID foreign key to internal_message_threads.id
    created_by: column.text, // UUID foreign key to users.id
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      status_idx: ['status'],
      active_intake_idx: ['is_active_intake'],
    },
  },
);

/**
 * Admin Tables - For admin dashboard features
 */

// Admins table - tracks admin users
const admins = new Table(
  {
    id: column.text,
    user_id: column.text, // Foreign key to users table
    created_at: column.text, // ISO 8601 datetime string

    // Denormalized user data for easier display (avoids JOIN)
    first_name: column.text,
    last_name: column.text,
    email: column.text,
  },
  {
    indexes: {
      // Index for user_id lookups
      user_id_idx: ['user_id'],
      // Index for creation date sorting
      created_at_idx: ['created_at'],
    },
  },
);

// User settings table - user preferences and configuration
const user_settings = new Table(
  {
    id: column.text,
    user_id: column.text, // Foreign key to users table

    // NOTE: languages / countries / doctor_specialty are NOT here — they live
    // on `users`, which this app already syncs. user_settings is preferences-only.

    // Mobile preferences
    media_cache_enabled: column.integer, // boolean as 0/1, default 1 (true)
    media_cache_wifi_only: column.integer, // boolean as 0/1, default 1 (true)
    data_sync_wifi_only: column.integer, // boolean as 0/1, default 0 (false)
    translation_model_wifi_only: column.integer, // boolean as 0/1, default 1 (true)
    voice_sensitivity: column.text, // 'adaptive' | 'high' | 'normal' | 'low'
    call_transcription_mode: column.text, // 'off' | 'live' | 'post_call'

    // Mobile UI preferences
    patient_chart_view: column.text, // 'tabs' | 'dashboard'

    // Notification preferences
    push_notifications_enabled: column.integer, // boolean as 0/1, default 1 (true)
    notify_internal_messages: column.integer, // boolean as 0/1, default 1 (true)
    notify_patient_messages: column.integer, // boolean as 0/1, default 1 (true)
    notify_patient_actions: column.integer, // boolean as 0/1, default 1 (true)
    // Incoming staff calls. Unlike the categories above, this one deliberately
    // bypasses quiet hours — see apps/web/lib/quietHours.ts. Turning it off is
    // the only way to be unreachable by call, and it makes the caller see
    // "not reachable" rather than a ring that never lands.
    notify_calls: column.integer, // boolean as 0/1, default 1 (true)

    // Quiet hours
    quiet_hours_enabled: column.integer, // boolean as 0/1, default 0 (false)
    quiet_hours_start: column.text, // "HH:mm" e.g. "22:00"
    quiet_hours_end: column.text, // "HH:mm" e.g. "07:00"
    quiet_hours_timezone: column.text, // IANA timezone e.g. "America/New_York"

    // Timestamps
    created_at: column.text, // ISO 8601 datetime string
    updated_at: column.text, // ISO 8601 datetime string
  },
  {
    indexes: {
      // Index for user_id lookups
      user_id_idx: ['user_id'],
    },
  },
);

// Admin notifications table - notifications sent by admins
const admin_notifications = new Table(
  {
    id: column.text,
    title: column.text,
    message: column.text,
    type: column.text, // 'info', 'warning', 'urgent', etc.
    sender_id: column.text, // Admin user who sent the notification

    // Target audience flags
    notify_doctors: column.integer, // 0 or 1
    notify_triage: column.integer, // 0 or 1

    // Rich content fields
    action_url: column.text, // Optional route path like "/profile"
    description: column.text, // Optional markdown body
    links: column.text, // JSON string of AdminNotificationLink[]
    images: column.text, // JSON string of AdminNotificationImage[]

    // Timestamp
    created_at: column.text, // ISO 8601 datetime string
  },
  {
    indexes: {
      // Index for creation date sorting
      created_at_idx: ['created_at'],
      // Index for sender lookups
      sender_id_idx: ['sender_id'],
      // Index for type filtering
      type_idx: ['type'],
    },
  },
);

// User Profile Logs table - audit trail for user profile changes
// Profile update requests - user-requested field changes awaiting admin review.
// Synced by the `global` (admins-only) bucket and read by
// useProfileUpdateRequestsViewModel. The table was previously missing here
// entirely, so its `SELECT * FROM user_profile_update_requests` hit a table that
// did not exist locally and the admin section surfaced a query error.
//
// No `id` column is declared: PowerSync adds one automatically and rejects a
// custom one (Table.validate throws "custom id columns are not supported").
// The older tables in this file predate that rule — see the note in
// patient-chart/CLAUDE.md.
const user_profile_update_requests = new Table(
  {
    user_id: column.text, // UUID of the requesting user
    field_name: column.text, // 'doctorSpecialty' | 'accountType'
    current_value: column.text, // JSON as text
    requested_value: column.text, // JSON as text
    status: column.text, // 'pending' | 'approved' | 'denied'
    user_email: column.text,
    user_name: column.text,
    reviewed_by: column.text, // UUID (nullable)
    reviewed_by_email: column.text, // nullable
    reviewed_by_name: column.text, // nullable
    reviewed_at: column.text, // ISO timestamp (nullable)
    review_notes: column.text, // nullable
    requested_at: column.text, // ISO timestamp
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      user_id_idx: ['user_id'],
      status_idx: ['status'],
      requested_at_idx: ['requested_at'],
    },
  },
);

const user_profile_logs = new Table(
  {
    id: column.text, // UUID primary key
    user_id: column.text, // User whose profile changed
    changed_by: column.text, // User who made the change
    changed_at: column.text, // ISO timestamp
    changes: column.text, // JSON array of ProfileChange objects
    is_admin_action: column.integer, // 0 or 1
    created_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      user_id_idx: ['user_id'],
      changed_by_idx: ['changed_by'],
      changed_at_idx: ['changed_at'],
      is_admin_action_idx: ['is_admin_action'],
      user_changed_at_idx: ['user_id', 'changed_at'],
    },
  },
);

// User feedback - submissions from users for admin review
const user_feedback = new Table(
  {
    id: column.text, // UUID primary key
    user_id: column.text, // UUID foreign key to users.id
    category: column.text, // feedback_category enum
    title: column.text,
    description: column.text,
    attachments: column.text, // JSON array as text
    app_sections: column.text, // JSON array as text
    platform: column.text, // 'mobile' | 'web' | 'both'
    mobile_platform: column.text, // 'ios' | 'android'
    status: column.text, // feedback_status enum
    sync_diagnostics: column.text, // JSON object as text
    app_version: column.text, // App version at time of submission
    admin_notes: column.text,
    thread_id: column.text, // UUID foreign key to internal_message_threads.id
    reviewed_by: column.text, // UUID foreign key to users.id
    reviewed_at: column.text, // ISO timestamp
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    indexes: {
      user_id_idx: ['user_id'],
      status_idx: ['status'],
      category_idx: ['category'],
      created_at_idx: ['created_at'],
    },
  },
);

/**
 * Local-Only Tables - Not synced, stored only on device
 */

// UI state - Local app state (filters, preferences, etc.)
const ui_state = new Table(
  {
    key: column.text, // Primary key - state identifier
    value: column.text, // JSON value as text
    updated_at: column.text, // ISO timestamp
  },
  {
    localOnly: true, // This table is not synced with the server
    indexes: {
      key_idx: ['key'],
    },
  },
);

// Offline queue - Pending mutations to sync when online
const offline_queue = new Table(
  {
    id: column.text, // UUID primary key
    operation: column.text, // 'create' | 'update' | 'delete'
    table_name: column.text,
    record_id: column.text, // UUID of the record
    data: column.text, // JSON object as text
    retry_count: column.integer,
    error: column.text,
    created_at: column.text, // ISO timestamp
    attempted_at: column.text, // ISO timestamp
  },
  {
    localOnly: true,
    indexes: {
      table_record_idx: ['table_name', 'record_id'],
      created_at_idx: ['created_at'],
    },
  },
);

// Media cache - Downloaded media stored as base64 data URIs for offline access
const media_cache = new Table(
  {
    id: column.text, // The mediaUrl / storage file path (used as key)
    data_uri: column.text, // Full data URI: data:image/jpeg;base64,...
    content_type: column.text, // MIME type e.g. image/jpeg, audio/mp4
    file_size: column.integer, // Original file size in bytes
    cached_at: column.text, // ISO timestamp of when this was cached
  },
  {
    localOnly: true,
    indexes: {
      cached_at_idx: ['cached_at'],
    },
  },
);

// Sync metadata - Track sync status per table
const sync_metadata = new Table(
  {
    table_name: column.text, // Primary key
    last_sync_at: column.text, // ISO timestamp
    last_sync_success: column.integer, // boolean as 0/1
    last_sync_error: column.text,
    record_count: column.integer,
    pending_uploads: column.integer,
  },
  {
    localOnly: true,
    indexes: {
      table_name_idx: ['table_name'],
    },
  },
);

// Patient drafts - local-only auto-save for in-progress patient creation
// NOT synced via PowerSync — drafts live locally until published
const patient_drafts = new Table(
  {
    first_name: column.text,
    last_name: column.text,
    phone: column.text, // JSON as text
    email: column.text,
    dob: column.text, // ISO timestamp
    gender: column.text,
    country: column.text,
    city: column.text,
    language: column.text,
    chief_complaint: column.text,
    allergies: column.text,
    current_meds: column.text,
    specialties: column.text, // JSON array as text
    hospital: column.text,
    mission_id: column.text,
    created_by_id: column.text,
    created_at: column.text, // ISO timestamp
    updated_at: column.text, // ISO timestamp
  },
  {
    localOnly: true,
    indexes: {
      created_by_id_idx: ['created_by_id'],
      updated_at_idx: ['updated_at'],
    },
  },
);

// Telegram link codes - for connecting manually-created patients to Telegram
const telegram_link_codes = new Table(
  {
    id: column.text,
    code: column.text,
    patient_id: column.text,
    created_by_id: column.text,
    is_used: column.integer, // boolean as 0/1
    used_at: column.text,
    telegram_chat_id: column.text,
    expires_at: column.text,
    created_at: column.text,
  },
  {
    indexes: {
      code_idx: ['code'],
      patient_id_idx: ['patient_id'],
      created_by_id_idx: ['created_by_id'],
    },
  },
);

/**
 * PowerSync Schema Export
 * This schema will be used to initialize the PowerSync database
 */
export const powerSyncSchema = new Schema({
  // Core synced tables
  users,
  patients,
  notes,
  internal_message_threads,
  internal_message_thread_participants,
  internal_messages,
  telegram_threads,
  telegram_messages,
  telegram_thread_participants,
  user_messages,
  patient_follow_ups,
  notifications,
  notification_recipients,
  med_orders,
  rx_orders,
  patient_media,

  // Care team tables
  patient_care_team,
  care_team_conflicts,

  // Telegram link codes
  telegram_link_codes,

  // Note audit trail
  note_edits,

  // Video consult log
  video_call_sessions,

  // Mission tables
  missions,
  mission_attachments,

  // Admin-specific tables
  admins,
  user_settings,
  admin_notifications,
  user_profile_logs,
  user_profile_update_requests,
  user_feedback,

  // Local-only tables
  patient_drafts,
  ui_state,
  offline_queue,
  media_cache,
  sync_metadata,
});

/**
 * Type exports for TypeScript type safety
 */
export type PowerSyncTableName = keyof typeof powerSyncSchema.tables;

// Table name constants for type-safe queries
export const TABLES = {
  USERS: 'users',
  PATIENTS: 'patients',
  NOTES: 'notes',
  INTERNAL_MESSAGE_THREADS: 'internal_message_threads',
  INTERNAL_MESSAGE_THREAD_PARTICIPANTS: 'internal_message_thread_participants',
  INTERNAL_MESSAGES: 'internal_messages',
  TELEGRAM_THREADS: 'telegram_threads',
  TELEGRAM_MESSAGES: 'telegram_messages',
  TELEGRAM_THREAD_PARTICIPANTS: 'telegram_thread_participants',
  USER_MESSAGES: 'user_messages',
  PATIENT_FOLLOW_UPS: 'patient_follow_ups',
  NOTIFICATIONS: 'notifications',
  NOTIFICATION_RECIPIENTS: 'notification_recipients',
  MED_ORDERS: 'med_orders',
  RX_ORDERS: 'rx_orders',
  PATIENT_MEDIA: 'patient_media',
  PATIENT_CARE_TEAM: 'patient_care_team',
  CARE_TEAM_CONFLICTS: 'care_team_conflicts',
  TELEGRAM_LINK_CODES: 'telegram_link_codes',
  NOTE_EDITS: 'note_edits',
  VIDEO_CALL_SESSIONS: 'video_call_sessions',
  MISSIONS: 'missions',
  MISSION_ATTACHMENTS: 'mission_attachments',
  ADMINS: 'admins',
  USER_SETTINGS: 'user_settings',
  ADMIN_NOTIFICATIONS: 'admin_notifications',
  USER_PROFILE_LOGS: 'user_profile_logs',
  USER_PROFILE_UPDATE_REQUESTS: 'user_profile_update_requests',
  USER_FEEDBACK: 'user_feedback',
  PATIENT_DRAFTS: 'patient_drafts',
  UI_STATE: 'ui_state',
  OFFLINE_QUEUE: 'offline_queue',
  MEDIA_CACHE: 'media_cache',
  SYNC_METADATA: 'sync_metadata',
} as const;

export default powerSyncSchema;
