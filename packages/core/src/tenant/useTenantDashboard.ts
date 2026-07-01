import { useState, useEffect, useCallback } from 'react';
import type { Tenant, Ticket, BillSplit } from '@aaram/types';

export type SupabaseClient = {
  auth: {
    getSession: () => Promise<{ data: { session: { user: { id: string }; access_token: string } | null } }>;
    signOut: () => Promise<void>;
  };
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: unknown }>;
        in: (col2: string, vals: string[]) => { maybeSingle: () => Promise<{ data: unknown }> };
        order: (col2: string, opts: { ascending: boolean }) => {
          limit: (n: number) => Promise<{ data: unknown[] | null }>;
        };
      };
      order: (col: string, opts: { ascending: boolean }) => Promise<{ data: unknown[] | null }>;
    };
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
};

export type DashboardState = {
  tenant:     Tenant | null;
  tickets:    Ticket[];
  bills:      BillSplit[];
  loading:    boolean;
  refreshing: boolean;
  error:      string | null;
  refresh:    () => Promise<void>;
};

export function useTenantDashboard(supabase: SupabaseClient): DashboardState {
  const [tenant,     setTenant]     = useState<Tenant | null>(null);
  const [tickets,    setTickets]    = useState<Ticket[]>([]);
  const [bills,      setBills]      = useState<BillSplit[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);

    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('not_authenticated');
        return;
      }

      const userId = session.user.id;

      const [tenantRes, ticketRes, billRes] = await Promise.all([
        supabase.from('tenants').select('*').eq('id', userId).maybeSingle(),
        (supabase.from('tickets').select('*') as any)
          .eq('requester_id', userId)
          .order('created_at', { ascending: false }),
        (supabase.from('bill_splits').select('*') as any)
          .eq('tenant_id', userId)
          .order('id', { ascending: false })
          .limit(6),
      ]);

      setTenant((tenantRes.data as Tenant | null) ?? null);
      setTickets((ticketRes.data as Ticket[]) ?? []);
      setBills((billRes.data as BillSplit[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { tenant, tickets, bills, loading, refreshing, error, refresh };
}
