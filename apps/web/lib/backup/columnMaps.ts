// apps/web/lib/backup/columnMaps.ts
// Maps PowerSync snake_case columns → Drizzle camelCase columns for each backupable table.
// Only includes columns that exist in BOTH PowerSync and Drizzle schemas.

export interface TableColumnMap {
  /** PowerSync snake_case → Drizzle camelCase */
  columns: Record<string, string>;
  /** Columns (Drizzle camelCase names) that are json() type and need JSON.parse() */
  jsonColumns: string[];
}

/**
 * Column mappings for all backupable tables.
 * Key = PowerSync/DB table name (snake_case).
 */
export const TABLE_COLUMN_MAPS: Record<string, TableColumnMap> = {
  patients: {
    columns: {
      id: "id",
      first_name: "firstName",
      last_name: "lastName",
      phone: "phone",
      email: "email",
      telegram_chat_id: "telegramChatId",
      telegram_access_hash: "telegramAccessHash",
      bmi: "bmi",
      dob: "dob",
      gender: "gender",
      country: "country",
      city: "city",
      language: "language",
      occupation: "occupation",
      chief_complaint: "chiefComplaint",
      diagnosis: "diagnosis",
      diagnosis_cat: "diagnosisCat",
      icd10: "icd10",
      hospital: "hospital",
      priority: "priority",
      specialties: "specialties",
      status: "status",
      baseline_ambu: "baselineAmbu",
      pmhx: "pmhx",
      pshx: "pshx",
      famhx: "famhx",
      allergies: "allergies",
      current_meds: "currentMeds",
      prev_meds: "prevMeds",
      smoke_count: "smokeCount",
      drink_count: "drinkCount",
      other_drugs: "otherDrugs",
      coordinator_id: "coordinatorId",
      triaged_by: "triagedBy",
      care_team: "careTeam",
      is_patient: "isPatient",
      patient_relation: "patientRelation",
      gender_preference: "genderPreference",
      previously_registered: "previouslyRegistered",
      scheduled_vid_chat: "scheduledVidChat",
      surgery_date: "surgeryDate",
      dashboard_notes: "dashboardNotes",
      has_submitted_info: "hasSubmittedInfo",
      has_specialty_without_doctors: "hasSpecialtyWithoutDoctors",
      created_by_id: "createdById",
      mission_id: "missionId",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: ["phone", "triagedBy", "careTeam"],
  },

  notes: {
    columns: {
      id: "id",
      patient_id: "patientId",
      email: "email",
      note_type: "noteType",
      date: "date",
      author_name: "authorName",
      author_id: "authorId",
      attending_physician_id: "attendingPhysicianId",
      attending_physician_name: "attendingPhysicianName",
      content: "content",
      draft: "draft",
      last_editor_id: "lastEditorId",
      last_editor_name: "lastEditorName",
      last_editor_account_type: "lastEditorAccountType",
      last_editor_care_team_role: "lastEditorCareTeamRole",
      skip_edit_record: "skipEditRecord",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: ["content"],
  },

  note_edits: {
    columns: {
      id: "id",
      note_id: "noteId",
      editor_id: "editorId",
      editor_name: "editorName",
      editor_account_type: "editorAccountType",
      editor_care_team_role: "editorCareTeamRole",
      edit_type: "editType",
      content_snapshot: "contentSnapshot",
      created_at: "createdAt",
    },
    jsonColumns: ["contentSnapshot"],
  },

  med_orders: {
    columns: {
      id: "id",
      patient_id: "patientId",
      prescribing_dr: "prescribingDr",
      order_date: "orderDate",
      medications: "medications",
    },
    jsonColumns: ["medications"],
  },

  rx_orders: {
    columns: {
      id: "id",
      patient_id: "patientId",
      rx_order_id: "rxOrderId",
      doctor_specialty: "doctorSpecialty",
      prescribing_dr: "prescribingDr",
      dr_email: "drEmail",
      dr_id: "drId",
      prescribed_date: "prescribedDate",
      valid_till: "validTill",
      city: "city",
      prescriptions: "prescriptions",
      submitted: "submitted",

      // Fulfilment. Omitted until now, so a restore silently reopened every
      // dispensed and declined prescription as if the pharmacy had never
      // touched it.
      rx_status: "rxStatus",
      rx_dispenser_name: "rxDispenserName",
      rx_dispenser_contact: "rxDispenserContact",
      partial_rx_notes: "partialRxNotes",

      // Delivery + access state. Without these a restore reports every script
      // as never sent, and staff re-send scripts patients already have.
      patient_link_sent_at: "patientLinkSentAt",
      patient_link_sent_by: "patientLinkSentBy",
      patient_link_opened_at: "patientLinkOpenedAt",
      patient_link_open_count: "patientLinkOpenCount",
      patient_link_failed_count: "patientLinkFailedCount",
      patient_link_last_failed_at: "patientLinkLastFailedAt",
      patient_link_lock_state: "patientLinkLockState",
      pharmacy_link_opened_at: "pharmacyLinkOpenedAt",

      // Cancellation. A restore that drops these resurrects cancelled
      // prescriptions as live — the QR is gone but the record says active.
      cancelled_at: "cancelledAt",
      cancelled_by_role: "cancelledByRole",
      cancelled_by_user_id: "cancelledByUserId",
      cancellation_reason: "cancellationReason",
      cancellation_reason_code: "cancellationReasonCode",
    },
    jsonColumns: ["prescriptions"],
  },

  patient_media: {
    columns: {
      id: "id",
      patient_id: "patientId",
      url: "url",
      content_type: "contentType",
      source: "source",
      uploaded_at: "uploadedAt",
    },
    // `video_call_session_id` is deliberately omitted. It carries a foreign key
    // to `video_call_sessions`, which is not part of the backup set — that
    // table holds `invite_token`, the patient's join credential. Mapping the
    // column would make every video-call capture fail its INSERT on restore
    // (restore runs plain INSERTs, in FK order, with no deferral), silently
    // dropping patient photos. Restored rows keep `source = 'video_call'`, so
    // the provenance survives; only the link to the specific consult does not.
    jsonColumns: [],
  },

  patient_care_team: {
    columns: {
      id: "id",
      patient_id: "patientId",
      user_id: "userId",
      role: "role",
      is_lead: "isLead",
      assigned_at: "assignedAt",
      assigned_by: "assignedBy",
      removed_at: "removedAt",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: [],
  },

  care_team_conflicts: {
    columns: {
      id: "id",
      patient_id: "patientId",
      conflicting_user_ids: "conflictingUserIds",
      status: "status",
      resolved_by: "resolvedBy",
      resolved_at: "resolvedAt",
      resolution_notes: "resolutionNotes",
      created_at: "createdAt",
    },
    jsonColumns: [],
  },

  missions: {
    columns: {
      id: "id",
      name: "name",
      country: "country",
      city: "city",
      hospitals: "hospitals",
      description: "description",
      status: "status",
      start_date: "startDate",
      end_date: "endDate",
      is_active_intake: "isActiveIntake",
      default_intake_hospital: "defaultIntakeHospital",
      urls: "urls",
      group_chat_thread_id: "groupChatThreadId",
      created_by: "createdBy",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: ["hospitals", "urls"],
  },

  mission_attachments: {
    columns: {
      id: "id",
      mission_id: "missionId",
      uploaded_by: "uploadedBy",
      file_path: "filePath",
      file_name: "fileName",
      display_name: "displayName",
      file_size: "fileSize",
      content_type: "contentType",
      upload_type: "uploadType",
      created_at: "createdAt",
    },
    jsonColumns: [],
  },

  telegram_threads: {
    columns: {
      id: "id",
      chat_id: "chatId",
      patient_id: "patientId",
      participants: "participants",
      unread_count: "unreadCount",
      status: "status",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: [],
  },

  telegram_messages: {
    columns: {
      id: "id",
      thread_id: "threadId",
      text: "text",
      sender: "sender",
      sender_id: "senderId",
      timestamp: "timestamp",
      type: "type",
      media_url: "mediaUrl",
      reply_to: "replyTo",
      forwarded_from: "forwardedFrom",
      deleted_at: "deletedAt",
      updated_at: "updatedAt",
      translated_text: "translatedText",
      is_translated: "isTranslated",
      created_at: "createdAt",
    },
    jsonColumns: [],
  },

  telegram_thread_participants: {
    columns: {
      id: "id",
      thread_id: "threadId",
      user_id: "userId",
      joined_at: "joinedAt",
    },
    jsonColumns: [],
  },

  internal_message_threads: {
    columns: {
      id: "id",
      title: "title",
      participants: "participants",
      unread_count: "unreadCount",
      status: "status",
      last_activity: "lastActivity",
      created_by: "createdBy",
      is_group_chat: "isGroupChat",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: [],
  },

  internal_message_thread_participants: {
    columns: {
      id: "id",
      thread_id: "threadId",
      user_id: "userId",
      unread_count: "unreadCount",
      last_read_at: "lastReadAt",
      joined_at: "joinedAt",
      left_at: "leftAt",
    },
    jsonColumns: [],
  },

  internal_messages: {
    columns: {
      id: "id",
      thread_id: "threadId",
      text: "text",
      sender: "sender",
      sender_id: "senderId",
      timestamp: "timestamp",
      type: "type",
      media_url: "mediaUrl",
      reply_to: "replyTo",
      forwarded_from: "forwardedFrom",
      deleted_at: "deletedAt",
      updated_at: "updatedAt",
      read: "read",
      read_at: "readAt",
      created_at: "createdAt",
    },
    jsonColumns: [],
  },

  notifications: {
    columns: {
      id: "id",
      source_id: "sourceId",
      message: "message",
      type: "type",
      subject: "subject",
      patient_id: "patientId",
      redirect_to: "redirectTo",
      created_at: "createdAt",
    },
    jsonColumns: [],
  },

  notification_recipients: {
    columns: {
      id: "id",
      notification_id: "notificationId",
      user_id: "userId",
      created_at: "createdAt",
    },
    jsonColumns: [],
  },

  admin_notifications: {
    columns: {
      id: "id",
      title: "message",
      type: "type",
      sender_id: "senderId",
      action_url: "actionUrl",
      description: "description",
      links: "links",
      images: "images",
      created_at: "createdAt",
    },
    jsonColumns: ["links", "images"],
  },

  user_feedback: {
    columns: {
      id: "id",
      user_id: "userId",
      category: "category",
      title: "title",
      description: "description",
      attachments: "attachments",
      app_sections: "appSections",
      platform: "platform",
      mobile_platform: "mobilePlatform",
      status: "status",
      sync_diagnostics: "syncDiagnostics",
      app_version: "appVersion",
      admin_notes: "adminNotes",
      thread_id: "threadId",
      reviewed_by: "reviewedBy",
      reviewed_at: "reviewedAt",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: ["attachments", "appSections", "syncDiagnostics"],
  },

  patient_follow_ups: {
    columns: {
      id: "id",
      chat_id: "chatId",
      telegram_thread_id: "telegramThreadId",
      message: "message",
      follow_up_sent_at: "followUpSentAt",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: [],
  },

  user_messages: {
    columns: {
      id: "id",
      user_id: "userId",
      last_read_at: "lastReadAt",
      unread_count: "unreadCount",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: [],
  },

  // --- Full migration tables ---

  users: {
    columns: {
      id: "id",
      email: "email",
      first_name: "firstName",
      last_name: "lastName",
      account_type: "accountType",
      password: "password",
      doctor_specialty: "doctorSpecialty",
      languages: "languages",
      countries: "countries",
      missions: "missions",
      gender: "gender",
      dob: "dob",
      image: "image",
      medical_license: "medicalLicense",
      medical_licenses: "medicalLicenses",
      authorized: "authorized",
      approval_date: "approvalDate",
      denial_date: "denialDate",
      last_login: "lastLogin",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: ["medicalLicenses"],
  },

  admins: {
    columns: {
      id: "id",
      user_id: "userId",
      first_name: "firstName",
      last_name: "lastName",
      email: "email",
      created_at: "createdAt",
    },
    jsonColumns: [],
  },

  user_settings: {
    columns: {
      id: "id",
      user_id: "userId",
      media_cache_enabled: "mediaCacheEnabled",
      media_cache_wifi_only: "mediaCacheWifiOnly",
      data_sync_wifi_only: "dataSyncWifiOnly",
      translation_model_wifi_only: "translationModelWifiOnly",
      voice_sensitivity: "voiceSensitivity",
      call_transcription_mode: "callTranscriptionMode",
      patient_chart_view: "patientChartView",
      push_notifications_enabled: "pushNotificationsEnabled",
      notify_internal_messages: "notifyInternalMessages",
      notify_patient_messages: "notifyPatientMessages",
      notify_patient_actions: "notifyPatientActions",
      notify_calls: "notifyCalls",
      quiet_hours_enabled: "quietHoursEnabled",
      quiet_hours_start: "quietHoursStart",
      quiet_hours_end: "quietHoursEnd",
      quiet_hours_timezone: "quietHoursTimezone",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: [],
  },

  user_profile_logs: {
    columns: {
      id: "id",
      user_id: "userId",
      changed_by: "changedBy",
      changed_at: "changedAt",
      changes: "changes",
      is_admin_action: "isAdminAction",
      created_at: "createdAt",
    },
    jsonColumns: ["changes"],
  },

  telegram_link_codes: {
    columns: {
      id: "id",
      code: "code",
      patient_id: "patientId",
      created_by_id: "createdById",
      is_used: "isUsed",
      used_at: "usedAt",
      telegram_chat_id: "telegramChatId",
      expires_at: "expiresAt",
      created_at: "createdAt",
    },
    jsonColumns: [],
  },

  mission_requests: {
    columns: {
      id: "id",
      user_id: "userId",
      mission_id: "missionId",
      status: "status",
      reviewed_by: "reviewedBy",
      reviewed_at: "reviewedAt",
      review_notes: "reviewNotes",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: [],
  },

  // --- Auth credential tables ---
  // NOT part of CLINICAL_BACKUP_TABLES / FULL_MIGRATION_TABLES. These are only
  // ever exported/restored inside the encrypted "Include authentication" bundle
  // (see lib/backup/authBundle.ts), never in a plain backup. `transports` is a
  // Postgres text[] round-tripped through the json stringify/parse path.

  passkey_credentials: {
    columns: {
      id: "id",
      user_id: "userId",
      credential_id: "credentialId",
      public_key: "publicKey",
      counter: "counter",
      credential_device_type: "credentialDeviceType",
      credential_backed_up: "credentialBackedUp",
      transports: "transports",
      device_name: "deviceName",
      aaguid: "aaguid",
      is_active: "isActive",
      last_used_at: "lastUsedAt",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: ["transports"],
  },

  totp_credentials: {
    columns: {
      id: "id",
      user_id: "userId",
      encrypted_secret: "encryptedSecret",
      encryption_iv: "encryptionIv",
      encryption_tag: "encryptionTag",
      is_active: "isActive",
      is_verified: "isVerified",
      last_used_at: "lastUsedAt",
      created_at: "createdAt",
      updated_at: "updatedAt",
    },
    jsonColumns: [],
  },
};

/**
 * FK dependency order for restore: parent tables first, children last.
 */
export const TABLE_RESTORE_ORDER: string[] = [
  // Level 0: No FK deps within backup set
  "missions",
  "users",
  "admins",
  "user_settings",
  // Level 1: Depends on missions and/or users
  "patients",
  "mission_attachments",
  "mission_requests",
  "user_profile_logs",
  "user_messages",
  "user_feedback",
  "passkey_credentials",
  "totp_credentials",
  "telegram_link_codes",
  "notifications",
  "admin_notifications",
  "internal_message_threads",
  "telegram_threads",
  // Level 2: Depends on patients and/or threads
  "notes",
  "med_orders",
  "rx_orders",
  "patient_media",
  "patient_care_team",
  "care_team_conflicts",
  "patient_follow_ups",
  "notification_recipients",
  "telegram_thread_participants",
  "internal_message_thread_participants",
  // Level 3: Depends on notes or messages
  "note_edits",
  "telegram_messages",
  "internal_messages",
];

/**
 * Get reversed column map: Drizzle camelCase → PowerSync snake_case.
 * Used by server-side backup generator so server backups match mobile backup format.
 */
export function getReversedColumnMap(
  tableName: string,
): { columns: Record<string, string>; jsonColumns: string[] } | null {
  const tableMap = TABLE_COLUMN_MAPS[tableName];
  if (!tableMap) return null;

  const reversed: Record<string, string> = {};
  for (const [snakeCase, camelCase] of Object.entries(tableMap.columns)) {
    reversed[camelCase] = snakeCase;
  }

  return { columns: reversed, jsonColumns: tableMap.jsonColumns };
}
