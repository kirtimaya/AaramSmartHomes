import { useState, useEffect, useCallback, useMemo } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type AdminTenantStatus = 'active' | 'notice' | 'moved_out';

export type AdminTenantRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: AdminTenantStatus;
  room_id: string | null;
  room_name: string | null;
  property_name: string | null;
  move_in_date: string | null;
  move_out_date: string | null;
  notice_date: string | null;
};

export type AdminTenantsState = {
  tenants: AdminTenantRow[];
  filtered: AdminTenantRow[];
  query: string;
  setQuery: (q: string) => void;
  statusFilter: AdminTenantStatus | 'all';
  setStatusFilter: (s: AdminTenantStatus | 'all') => void;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export type AdminTenantsClient = {
  auth: {
    getSession: () => Promise<{ data: { session: { user: { id: string } } | null } }>;
  };
  from: (table: string) => any;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAdminTenants(client: AdminTenantsClient): AdminTenantsState {
  const [tenants,      setTenants]      = useState<AdminTenantRow[]>([]);
  const [query,        setQuery]        = useState('');
  const [statusFilter, setStatusFilter] = useState<AdminTenantStatus | 'all'>('all');
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) { setError('not_authenticated'); return; }

      const { data, error: dbErr } = await client
        .from('tenants')
        .select('*, rooms(name, property_id, properties(name))')
        .order('name', { ascending: true });

      if (dbErr) throw new Error(dbErr.message);

      const rows: AdminTenantRow[] = ((data ?? []) as any[]).map((t: any) => ({
        id:            t.id,
        name:          t.name,
        email:         t.email ?? null,
        phone:         t.phone ?? null,
        status:        t.status,
        room_id:       t.room_id ?? null,
        room_name:     t.rooms?.name ?? null,
        property_name: t.rooms?.properties?.name ?? null,
        move_in_date:  t.move_in_date ?? null,
        move_out_date: t.move_out_date ?? null,
        notice_date:   t.notice_date ?? null,
      }));

      setTenants(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const filtered = useMemo(() => {
    let result = tenants;
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.email?.toLowerCase().includes(q) ?? false) ||
        (t.phone?.includes(q) ?? false),
      );
    }
    return result;
  }, [tenants, statusFilter, query]);

  return {
    tenants, filtered, query, setQuery,
    statusFilter, setStatusFilter,
    loading, refreshing, error, refresh,
  };
}
