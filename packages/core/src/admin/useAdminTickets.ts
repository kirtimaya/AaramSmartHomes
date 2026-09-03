import { useState, useEffect, useCallback } from 'react';
import type { TicketStatus, TicketPriority } from '@aaram/types';

// ── Types ──────────────────────────────────────────────────────────────────────

export type AdminTicket = {
  id: string;
  requester_id: string;
  requester_type: 'guest' | 'tenant';
  requester_name: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  description: string;
  admin_note?: string;
  created_at: string;
};

export type AdminTicketsFilter = 'All' | TicketStatus;

export type AdminTicketsState = {
  tickets: AdminTicket[];
  filtered: AdminTicket[];
  filter: AdminTicketsFilter;
  setFilter: (f: AdminTicketsFilter) => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  updateTicket: (id: string, status: TicketStatus, adminNote?: string) => Promise<void>;
  refresh: () => Promise<void>;
};

export type AdminTicketsClient = {
  auth: {
    getSession: () => PromiseLike<{ data: { session: { user: { id: string } } | null } }>;
  };
  from: (table: string) => any;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAdminTickets(client: AdminTicketsClient): AdminTicketsState {
  const [tickets,    setTickets]    = useState<AdminTicket[]>([]);
  const [filter,     setFilter]     = useState<AdminTicketsFilter>('All');
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) { setError('not_authenticated'); return; }

      // Fetch tickets with inline requester name join (Supabase foreign tables)
      const { data, error: dbErr } = await client
        .from('tickets')
        .select('*, guests:requester_id(name), tenants:requester_id(name)')
        .order('created_at', { ascending: false });

      if (dbErr) throw new Error(dbErr.message);

      const rows: AdminTicket[] = ((data ?? []) as any[]).map((t: any) => ({
        id:             t.id,
        requester_id:   t.requester_id,
        requester_type: t.requester_type,
        requester_name: t.requester_type === 'guest'
          ? (t.guests?.name ?? t.requester_id.slice(0, 8))
          : (t.tenants?.name ?? t.requester_id.slice(0, 8)),
        category:   t.category,
        priority:   t.priority,
        status:     t.status,
        description: t.description,
        admin_note:  t.admin_note,
        created_at:  t.created_at,
      }));

      setTickets(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const updateTicket = useCallback(async (id: string, status: TicketStatus, adminNote?: string) => {
    const update: Record<string, string> = { status };
    if (adminNote !== undefined) update.admin_note = adminNote;

    const { error: dbErr } = await client.from('tickets').update(update).eq('id', id);
    if (dbErr) throw new Error(dbErr.message);

    // Optimistically update local state
    setTickets(prev => prev.map(t =>
      t.id === id ? { ...t, status, admin_note: adminNote ?? t.admin_note } : t,
    ));
  }, [client]);

  const filtered = filter === 'All'
    ? tickets
    : tickets.filter(t => t.status === filter);

  return { tickets, filtered, filter, setFilter, loading, refreshing, error, updateTicket, refresh };
}
