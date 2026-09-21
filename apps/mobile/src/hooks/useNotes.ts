// apps/mobile/src/hooks/useNotes.ts
// PowerSync-based notes hook with filtering, real-time updates, and offline support

import { useMemo, useCallback } from 'react';
import { usePowerSyncQuery, usePowerSyncMutation, usePowerSync } from './powersync';
import { TABLES, generateId, dateToIsoString } from '@/db';
import { PowerSyncService } from '../services/powersync/PowerSyncService';
import type { Note, NoteType, NoteContent, NoteEdit } from '../types/notes';

interface NoteWithAuthor extends Note {
  authorFirstName?: string;
  authorLastName?: string;
  authorEmail?: string;
}

interface UseNotesReturn {
  notes: NoteWithAuthor[];
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  isRefetching: boolean;
}

interface UseNotesOptions {
  patientId?: string;
  noteType?: string;
  includeDrafts?: boolean;
  authorId?: string;
  limit?: number;
  offset?: number;
}

/**
 * PowerSync-based notes hook with filtering and real-time updates
 *
 * Features:
 * - Real-time updates (automatically re-renders on data changes)
 * - Offline-first (works without network)
 * - Filter by patient, note type, author
 * - Include/exclude drafts
 * - Author information via JOIN
 *
 * @example
 * ```tsx
 * function PatientNotes({ patientId }) {
 *   const { notes, loading, refresh } = useNotes({
 *     patientId,
 *     includeDrafts: false
 *   });
 *
 *   return <NotesList notes={notes} onRefresh={refresh} />;
 * }
 * ```
 */
export function useNotes(options: UseNotesOptions = {}): UseNotesReturn {
  const {
    patientId,
    noteType,
    includeDrafts = true,
    authorId,
    limit = 100,
    offset = 0,
  } = options;

  // Build query with optional author JOIN
  const { sql, params } = useMemo(() => {
    const conditions: string[] = [];
    const queryParams: any[] = [];

    // Patient filter
    if (patientId) {
      conditions.push('n.patient_id = ?');
      queryParams.push(patientId);
    }

    // Note type filter
    if (noteType) {
      conditions.push('n.note_type = ?');
      queryParams.push(noteType);
    }

    // Draft filter
    if (!includeDrafts) {
      conditions.push('n.draft = 0');
    }

    // Author filter
    if (authorId) {
      conditions.push('n.author_id = ?');
      queryParams.push(authorId);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        n.*,
        u.first_name as author_first_name,
        u.last_name as author_last_name,
        u.email as author_email
      FROM ${TABLES.NOTES} n
      LEFT JOIN ${TABLES.USERS} u ON n.author_id = u.id
      ${whereClause}
      ORDER BY n.date DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return { sql, params: queryParams };
  }, [patientId, noteType, includeDrafts, authorId, limit, offset]);

  // Query notes with author info
  const query = usePowerSyncQuery<any>(sql, params, {
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    staleTime: 10000,
  });

  // Convert database rows to typed Note objects
  const notes = useMemo(() => {
    if (!query.data) return [];

    return query.data.map((row): NoteWithAuthor => {
      // Parse JSON content if it's a string
      let content = row.content;
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch (e) {
          console.warn('Failed to parse note content:', e);
        }
      }

      // Convert draft integer to boolean
      const draft = row.draft === 1;

      return {
        id: row.id,
        patientId: row.patient_id,
        email: row.email,
        noteType: row.note_type,
        date: row.date,
        authorName: row.author_name,
        authorId: row.author_id,
        attendingPhysicianId: row.attending_physician_id || null,
        attendingPhysicianName: row.attending_physician_name || null,
        content,
        draft,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorFirstName: row.author_first_name,
        authorLastName: row.author_last_name,
        authorEmail: row.author_email,
      };
    });
  }, [query.data]);

  return {
    notes,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
    isRefetching: query.isRefetching,
  };
}

/**
 * Hook to get a single note by ID
 *
 * @param noteId - The note ID to fetch
 *
 * @example
 * ```tsx
 * function NoteDetailScreen({ route }) {
 *   const { noteId } = route.params;
 *   const { note, loading } = useNote(noteId);
 *
 *   if (loading) return <LoadingSpinner />;
 *   if (!note) return <NotFound />;
 *
 *   return <NoteDetail note={note} />;
 * }
 * ```
 */
export function useNote(
  noteId: string | undefined
): {
  note: NoteWithAuthor | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const query = usePowerSyncQuery<any>(
    `SELECT
       n.*,
       u.first_name as author_first_name,
       u.last_name as author_last_name,
       u.email as author_email
     FROM ${TABLES.NOTES} n
     LEFT JOIN ${TABLES.USERS} u ON n.author_id = u.id
     WHERE n.id = ?
     LIMIT 1`,
    noteId ? [noteId] : [],
    {
      enabled: !!noteId,
      refetchInterval: 10000,
    }
  );

  const note = useMemo(() => {
    if (!query.data?.[0]) return null;

    const row = query.data[0];

    // Parse JSON content if it's a string
    let content = row.content;
    if (typeof content === 'string') {
      try {
        content = JSON.parse(content);
      } catch (e) {
        console.warn('Failed to parse note content:', e);
      }
    }

    // Convert draft integer to boolean
    const draft = row.draft === 1;

    return {
      id: row.id,
      patientId: row.patient_id,
      email: row.email,
      noteType: row.note_type,
      date: row.date,
      authorName: row.author_name,
      authorId: row.author_id,
      content,
      draft,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      attendingPhysicianId: row.attending_physician_id || null,
      attendingPhysicianName: row.attending_physician_name || null,
      authorFirstName: row.author_first_name,
      authorLastName: row.author_last_name,
      authorEmail: row.author_email,
    };
  }, [query.data]);

  return {
    note,
    loading: query.isLoading,
    error: query.error,
    refresh: query.refetch,
  };
}

/**
 * Hook to get notes count by patient
 *
 * @example
 * ```tsx
 * function PatientHeader({ patientId }) {
 *   const { totalNotes, draftCount } = useNotesCount(patientId);
 *
 *   return (
 *     <Header>
 *       <Text>Notes: {totalNotes}</Text>
 *       {draftCount > 0 && <Badge>{draftCount} drafts</Badge>}
 *     </Header>
 *   );
 * }
 * ```
 */
export function useNotesCount(
  patientId: string | undefined
): {
  totalNotes: number;
  draftCount: number;
  publishedCount: number;
  loading: boolean;
} {
  const query = usePowerSyncQuery<{
    total: number;
    drafts: number;
    published: number;
  }>(
    `SELECT
       COUNT(*) as total,
       SUM(CASE WHEN draft = 1 THEN 1 ELSE 0 END) as drafts,
       SUM(CASE WHEN draft = 0 THEN 1 ELSE 0 END) as published
     FROM ${TABLES.NOTES}
     WHERE patient_id = ?`,
    patientId ? [patientId] : [],
    {
      enabled: !!patientId,
      refetchInterval: 30000,
    }
  );

  const result = query.data?.[0];

  return {
    totalNotes: result?.total || 0,
    draftCount: result?.drafts || 0,
    publishedCount: result?.published || 0,
    loading: query.isLoading,
  };
}

/**
 * Hook to get notes grouped by type
 *
 * @example
 * ```tsx
 * function NotesOverview({ patientId }) {
 *   const { notesByType, loading } = useNotesByType(patientId);
 *
 *   return (
 *     <Grid>
 *       {Object.entries(notesByType).map(([type, count]) => (
 *         <Card key={type}>
 *           <Text>{type}: {count}</Text>
 *         </Card>
 *       ))}
 *     </Grid>
 *   );
 * }
 * ```
 */
export function useNotesByType(
  patientId: string | undefined
): {
  notesByType: Record<string, number>;
  loading: boolean;
  error: Error | null;
} {
  const query = usePowerSyncQuery<{ note_type: string; count: number }>(
    `SELECT
       note_type,
       COUNT(*) as count
     FROM ${TABLES.NOTES}
     WHERE patient_id = ? AND draft = 0
     GROUP BY note_type
     ORDER BY count DESC`,
    patientId ? [patientId] : [],
    {
      enabled: !!patientId,
      refetchInterval: 30000,
    }
  );

  const notesByType = useMemo(() => {
    if (!query.data) return {};

    return query.data.reduce((acc, row) => {
      acc[row.note_type] = row.count;
      return acc;
    }, {} as Record<string, number>);
  }, [query.data]);

  return {
    notesByType,
    loading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook for note mutations (create, update, publish, delete)
 *
 * @example
 * ```tsx
 * function NoteEditor({ patientId, noteId }) {
 *   const { createNote, updateNote, publishNote, deleteNote } = useNoteMutations();
 *
 *   const handleSave = async (content) => {
 *     if (noteId) {
 *       await updateNote(noteId, { content });
 *     } else {
 *       await createNote({
 *         patientId,
 *         noteType: 'Progress',
 *         content,
 *         draft: true
 *       });
 *     }
 *   };
 *
 *   return <Editor onSave={handleSave} />;
 * }
 * ```
 */
export function useNoteMutations() {
  const { service, isInitialized } = usePowerSync();

  const mutation = usePowerSyncMutation(
    async (variables: { sql: string; params: any[] }) => {
      if (!isInitialized || !service) {
        throw new Error('PowerSync not initialized');
      }
      await service.execute(variables.sql, variables.params);
      return { success: true };
    },
    {
      onError: (error) => {
        console.error('❌ Note mutation failed:', error);
      },
    }
  );

  const createNote = useCallback(
    async (data: {
      patientId: string;
      noteType: NoteType;
      content: NoteContent;
      authorId?: string;
      authorName?: string;
      email: string;
      draft?: boolean;
      attendingPhysicianId?: string;
      attendingPhysicianName?: string;
      editorAccountType?: string;
      editorCareTeamRole?: string;
    }) => {
      const noteId = generateId();
      const now = dateToIsoString(new Date());
      const contentJson = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);

      // Server creates the canonical 'created' note_edit when it receives this via PowerSync sync.
      // We include last_editor_* so the server knows who created it.
      await mutation.mutateAsync({
        sql: `INSERT INTO ${TABLES.NOTES}
              (id, patient_id, email, note_type, date, author_name, author_id,
               attending_physician_id, attending_physician_name,
               content, draft,
               last_editor_id, last_editor_name, last_editor_account_type, last_editor_care_team_role,
               skip_edit_record,
               created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        params: [
          noteId,
          data.patientId,
          data.email,
          data.noteType,
          now,
          data.authorName || null,
          data.authorId || null,
          data.attendingPhysicianId || null,
          data.attendingPhysicianName || null,
          contentJson,
          data.draft === true ? 1 : 0,
          data.authorId || null,
          data.authorName || null,
          data.editorAccountType || null,
          data.editorCareTeamRole || null,
          0, // skip_edit_record = false for creates
          now,
          now,
        ],
      });

      return noteId;
    },
    [mutation]
  );

  const updateNote = useCallback(
    async (noteId: string, data: {
      content?: NoteContent;
      noteType?: NoteType;
      draft?: boolean;
      editorId?: string;
      editorName?: string;
      editorAccountType?: string;
      editorCareTeamRole?: string;
      /** When true, server will NOT create a note_edit entry (used for auto-saves) */
      skipEditRecord?: boolean;
    }) => {
      const updates: string[] = [];
      const params: any[] = [];

      if (data.content !== undefined) {
        updates.push('content = ?');
        const contentJson = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
        params.push(contentJson);
      }

      if (data.noteType !== undefined) {
        updates.push('note_type = ?');
        params.push(data.noteType);
      }

      if (data.draft !== undefined) {
        updates.push('draft = ?');
        params.push(data.draft ? 1 : 0);
      }

      // Always set transient editor metadata — these sync to server via PowerSync
      if (data.editorId) {
        updates.push('last_editor_id = ?');
        params.push(data.editorId);
      }
      if (data.editorName) {
        updates.push('last_editor_name = ?');
        params.push(data.editorName);
      }
      if (data.editorAccountType) {
        updates.push('last_editor_account_type = ?');
        params.push(data.editorAccountType);
      }
      if (data.editorCareTeamRole) {
        updates.push('last_editor_care_team_role = ?');
        params.push(data.editorCareTeamRole);
      }

      // Tell server whether to create a note_edit entry
      updates.push('skip_edit_record = ?');
      params.push(data.skipEditRecord ? 1 : 0);

      if (updates.length === 0) return;

      const now = dateToIsoString(new Date());
      updates.push('updated_at = ?');
      params.push(now);

      params.push(noteId);

      // Server creates the canonical note_edit when it receives this via PowerSync sync
      // (unless skip_edit_record is set). No local note_edits INSERT needed.
      await mutation.mutateAsync({
        sql: `UPDATE ${TABLES.NOTES} SET ${updates.join(', ')} WHERE id = ?`,
        params,
      });
    },
    [mutation]
  );

  const publishNote = useCallback(
    async (noteId: string, editorId?: string, editorName?: string, editorAccountType?: string, editorCareTeamRole?: string) => {
      const now = dateToIsoString(new Date());
      // Set editor metadata + skip_edit_record=0 so server creates a 'published' edit
      await mutation.mutateAsync({
        sql: `UPDATE ${TABLES.NOTES} SET draft = 0, updated_at = ?,
              last_editor_id = ?, last_editor_name = ?,
              last_editor_account_type = ?, last_editor_care_team_role = ?,
              skip_edit_record = 0
              WHERE id = ?`,
        params: [now, editorId || null, editorName || null, editorAccountType || null, editorCareTeamRole || null, noteId],
      });
    },
    [mutation]
  );

  const deleteNote = useCallback(
    async (noteId: string) => {
      // Query patient_id before delete — the upload handler needs it for the API URL
      // but opData is null for DELETE CrudEntries
      try {
        const rows = await service.query<{ patient_id: string }>(
          `SELECT patient_id FROM ${TABLES.NOTES} WHERE id = ? LIMIT 1`,
          [noteId],
        );
        if (rows[0]?.patient_id) {
          PowerSyncService.getInstance().registerPendingNoteDelete(noteId, rows[0].patient_id);
        }
      } catch (e) {
        console.warn('Could not pre-fetch patient_id for note delete:', e);
      }

      await mutation.mutateAsync({
        sql: `DELETE FROM ${TABLES.NOTES} WHERE id = ?`,
        params: [noteId],
      });
    },
    [mutation, service]
  );

  return {
    createNote,
    updateNote,
    publishNote,
    deleteNote,
    loading: mutation.loading,
    error: mutation.error,
  };
}

/**
 * Hook to get recent notes across all patients
 *
 * @param limit - Maximum number of notes to return
 *
 * @example
 * ```tsx
 * function RecentActivity() {
 *   const { notes, loading } = useRecentNotes(10);
 *
 *   return (
 *     <ActivityFeed>
 *       {notes.map(note => (
 *         <ActivityItem key={note.id} note={note} />
 *       ))}
 *     </ActivityFeed>
 *   );
 * }
 * ```
 */
export function useRecentNotes(
  limit: number = 20
): {
  notes: NoteWithAuthor[];
  loading: boolean;
  error: Error | null;
} {
  const query = usePowerSyncQuery<any>(
    `SELECT
       n.*,
       u.first_name as author_first_name,
       u.last_name as author_last_name,
       u.email as author_email,
       p.first_name as patient_first_name,
       p.last_name as patient_last_name
     FROM ${TABLES.NOTES} n
     LEFT JOIN ${TABLES.USERS} u ON n.author_id = u.id
     LEFT JOIN ${TABLES.PATIENTS} p ON n.patient_id = p.id
     WHERE n.draft = 0
     ORDER BY n.date DESC
     LIMIT ?`,
    [limit],
    {
      refetchInterval: 60000, // Refresh every minute
    }
  );

  const notes = useMemo(() => {
    if (!query.data) return [];

    return query.data.map((row): NoteWithAuthor => {
      // Parse JSON content if it's a string
      let content = row.content;
      if (typeof content === 'string') {
        try {
          content = JSON.parse(content);
        } catch (e) {
          console.warn('Failed to parse note content:', e);
        }
      }

      // Convert draft integer to boolean
      const draft = row.draft === 1;

      return {
        id: row.id,
        patientId: row.patient_id,
        email: row.email,
        noteType: row.note_type,
        date: row.date,
        authorName: row.author_name,
        authorId: row.author_id,
        attendingPhysicianId: row.attending_physician_id || null,
        attendingPhysicianName: row.attending_physician_name || null,
        content,
        draft,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        authorFirstName: row.author_first_name,
        authorLastName: row.author_last_name,
        authorEmail: row.author_email,
      };
    });
  }, [query.data]);

  return {
    notes,
    loading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook to get edit history for a specific note
 */
export function useNoteEdits(
  noteId: string | undefined
): {
  edits: NoteEdit[];
  loading: boolean;
  error: Error | null;
} {
  const query = usePowerSyncQuery<any>(
    `SELECT * FROM ${TABLES.NOTE_EDITS}
     WHERE note_id = ?
     ORDER BY created_at DESC`,
    noteId ? [noteId] : [],
    {
      enabled: !!noteId,
      refetchInterval: 30000,
    }
  );

  const edits = useMemo((): NoteEdit[] => {
    if (!query.data) return [];

    return query.data.map((row: any): NoteEdit => {
      let contentSnapshot = row.content_snapshot;
      if (typeof contentSnapshot === 'string') {
        try {
          contentSnapshot = JSON.parse(contentSnapshot);
        } catch {
          contentSnapshot = null;
        }
      }

      return {
        id: row.id,
        noteId: row.note_id,
        editorId: row.editor_id,
        editorName: row.editor_name,
        editorAccountType: row.editor_account_type || null,
        editorCareTeamRole: row.editor_care_team_role || null,
        editType: row.edit_type,
        contentSnapshot,
        createdAt: row.created_at,
      };
    });
  }, [query.data]);

  return {
    edits,
    loading: query.isLoading,
    error: query.error,
  };
}
