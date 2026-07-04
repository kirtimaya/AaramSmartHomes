import { useState, useEffect, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type AuditLogEntry = {
  id: string;
  actor_id: string | null;
  actor_email: string;
  actor_role: 'admin' | 'tenant' | 'guest' | 'system';
  action: string;
  entity_type: string;
  entity_id: string | null;
  before: unknown;
  after: unknown;
  source: 'web' | 'mobile' | 'aara' | 'whatsapp' | 'alexa' | 'system';
  created_at: string;
};

export type AuditLogFilters = {
  entityType?: string;
  actorEmail?: string;
  source?: string;
  from?: string; // ISO date, inclusive
  to?: string;   // ISO date, inclusive
};

export type AuditLogState = {
  entries: AuditLogEntry[];
  loading: boolean;
  error: string | null;
  filters: AuditLogFilters;
  setFilters: (f: AuditLogFilters) => void;
  page: number;
  pageSize: number;
  hasMore: boolean;
  nextPage: () => void;
  prevPage: () => void;
  refresh: () => Promise<void>;
};

export type AuditLogClient = {
  from: (table: string) => any;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuditLog(client: AuditLogClient, pageSize = 25): AuditLogState {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<AuditLogFilters>({});
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = client
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(page * pageSize, page * pageSize + pageSize); // fetch one extra to detect hasMore

      if (filters.entityType) query = query.eq('entity_type', filters.entityType);
      if (filters.actorEmail) query = query.ilike('actor_email', `%${filters.actorEmail}%`);
      if (filters.source) query = query.eq('source', filters.source);
      if (filters.from) query = query.gte('created_at', filters.from);
      if (filters.to) query = query.lte('created_at', filters.to);

      const { data, error: dbErr } = await query;
      if (dbErr) throw new Error(dbErr.message);

      const rows = (data ?? []) as AuditLogEntry[];
      setHasMore(rows.length > pageSize);
      setEntries(rows.slice(0, pageSize));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [client, page, pageSize, filters]);

  useEffect(() => { load(); }, [load]);

  const setFilters = useCallback((f: AuditLogFilters) => {
    setFiltersState(f);
    setPage(0);
  }, []);

  const nextPage = useCallback(() => setPage(p => p + 1), []);
  const prevPage = useCallback(() => setPage(p => Math.max(0, p - 1)), []);

  return { entries, loading, error, filters, setFilters, page, pageSize, hasMore, nextPage, prevPage, refresh: load };
}
