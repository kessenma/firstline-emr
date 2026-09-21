// apps/mobile/src/hooks/useMessagePatientSearch.ts
// Patient search hook for use in message threads — queries local PowerSync SQLite

import { useState, useMemo, useEffect } from 'react';
import { usePowerSyncQuery } from './powersync';
import { TABLES } from '@/db';
import type { Patient } from '@/types/patient';

function mapRowToSearchResult(row: any): Patient {
  let specialties: string[] | undefined;
  if (row.specialties) {
    try {
      specialties = typeof row.specialties === 'string'
        ? JSON.parse(row.specialties)
        : row.specialties;
    } catch {
      specialties = undefined;
    }
  }

  return {
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    status: row.status,
    priority: row.priority,
    specialties,
    hospital: row.hospital,
    chiefComplaint: row.chief_complaint,
    diagnosis: row.diagnosis,
    telegramChatId: row.telegram_chat_id,
    createdAt: row.created_at,
    country: row.country,
    city: row.city,
    gender: row.gender,
  } as Patient;
}

export interface MessagePatientSearchFilters {
  source?: 'telegram' | 'manual';
  specialty?: string;
  status?: string;
  priority?: string;
  city?: string;
  country?: string;
  telegramMessage?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useMessagePatientSearch(
  searchTerm: string,
  filters: MessagePatientSearchFilters = {},
  options: { limit?: number } = {},
): {
  patients: Patient[];
  loading: boolean;
  searching: boolean;
  error: Error | null;
  total: number;
  hasMore: boolean;
  refresh: () => Promise<any>;
} {
  const [debouncedTerm, setDebouncedTerm] = useState(searchTerm);
  const searchLimit = Math.max(1, options.limit ?? 50);

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Build dynamic SQL query
  const { sql, countSql, params } = useMemo(() => {
    const conditions: string[] = [];
    const queryParams: any[] = [];
    const telegramExpr = 'p.telegram_chat_id';

    // Name search
    if (debouncedTerm && debouncedTerm.trim().length >= 2) {
      const term = `%${debouncedTerm.trim()}%`;
      conditions.push(`(p.first_name LIKE ? OR p.last_name LIKE ? OR p.email LIKE ? OR ${telegramExpr} LIKE ?)`);
      queryParams.push(term, term, term, term);
    }

    // Source filter
    if (filters.source === 'telegram') {
      conditions.push(`${telegramExpr} IS NOT NULL AND TRIM(${telegramExpr}) != ''`);
    } else if (filters.source === 'manual') {
      conditions.push(`(${telegramExpr} IS NULL OR TRIM(${telegramExpr}) = '')`);
    }

    // Specialty filter (JSON text contains)
    if (filters.specialty) {
      conditions.push('p.specialties LIKE ?');
      queryParams.push(`%\"${filters.specialty}\"%`);
    }

    // Status filter
    if (filters.status) {
      conditions.push('p.status = ?');
      queryParams.push(filters.status);
    }

    // Priority filter
    if (filters.priority) {
      conditions.push('p.priority = ?');
      queryParams.push(filters.priority);
    }

    // City filter
    if (filters.city && filters.city.trim()) {
      conditions.push('p.city LIKE ?');
      queryParams.push(`%${filters.city.trim()}%`);
    }

    // Country filter
    if (filters.country && filters.country.trim()) {
      conditions.push('p.country LIKE ?');
      queryParams.push(`%${filters.country.trim()}%`);
    }

    // Telegram thread message search (queries normalized telegram_messages table)
    if (filters.telegramMessage && filters.telegramMessage.trim().length >= 2) {
      conditions.push(`EXISTS (
        SELECT 1 FROM ${TABLES.TELEGRAM_THREADS} tt
        INNER JOIN ${TABLES.TELEGRAM_MESSAGES} tm ON tm.thread_id = tt.id
        WHERE tt.patient_id = p.id
          AND tm.text LIKE ?
      )`);
      queryParams.push(`%${filters.telegramMessage.trim()}%`);
    }

    // Date range
    if (filters.dateFrom) {
      conditions.push('p.created_at >= ?');
      queryParams.push(filters.dateFrom);
    }
    if (filters.dateTo) {
      conditions.push('p.created_at <= ?');
      queryParams.push(filters.dateTo);
    }

    const hasConditions = conditions.length > 0;
    const whereClause = hasConditions ? `WHERE ${conditions.join(' AND ')}` : '';

    return {
      sql: `
        SELECT
          p.id,
          p.first_name,
          p.last_name,
          p.status,
          p.priority,
          p.specialties,
          p.hospital,
          p.chief_complaint,
          p.diagnosis,
          ${telegramExpr} as telegram_chat_id,
          p.created_at,
          p.country,
          p.city,
          p.gender
        FROM ${TABLES.PATIENTS} p
        ${whereClause}
        ORDER BY p.created_at DESC
        LIMIT ${searchLimit}
      `,
      countSql: `
        SELECT COUNT(*) as count
        FROM ${TABLES.PATIENTS} p
        ${whereClause}
      `,
      params: queryParams,
    };
  }, [
    debouncedTerm,
    filters.source,
    filters.specialty,
    filters.status,
    filters.priority,
    filters.city,
    filters.country,
    filters.telegramMessage,
    filters.dateFrom,
    filters.dateTo,
    searchLimit,
  ]);

  // Only run query if there are some search criteria
  const hasSearchCriteria = debouncedTerm.trim().length >= 2 ||
    filters.source || filters.specialty || filters.status ||
    filters.priority || filters.city || filters.country ||
    (filters.telegramMessage && filters.telegramMessage.trim().length >= 2) ||
    filters.dateFrom || filters.dateTo;

  const query = usePowerSyncQuery<any>(
    sql,
    params,
    {
      enabled: !!hasSearchCriteria,
      retry: false,
    },
  );
  const countQuery = usePowerSyncQuery<{ count: number }>(
    countSql,
    params,
    {
      enabled: !!hasSearchCriteria,
      retry: false,
    },
  );

  const patients = useMemo(() => {
    if (!query.data) return [];
    return query.data.map(mapRowToSearchResult);
  }, [query.data]);

  const total = countQuery.data?.[0]?.count || 0;
  const visiblePatients = hasSearchCriteria ? patients : [];
  const hasMore = visiblePatients.length < total;

  return {
    patients: visiblePatients,
    loading: query.isLoading,
    searching: query.isRefetching,
    error: query.error || null,
    total,
    hasMore,
    refresh: async () => {
      await Promise.all([query.refetch(), countQuery.refetch()]);
    },
  };
}
