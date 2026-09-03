import { useState, useEffect, useCallback } from 'react';
import type { Ticket } from '@aaram/types';

// ── Lightweight admin-only types ──────────────────────────────────────────────

export type AdminProperty = {
  id: string;
  name: string;
  location: string;
};

export type AdminRoom = {
  id: string;
  property_id: string;
  occupancy_status: string;
};

export type WaterLog = {
  id: string;
  property_id: string;
  level_percentage: number;
  timestamp: string;
};

export type AdminDashboardData = {
  properties:      AdminProperty[];
  rooms:           AdminRoom[];
  tickets:         Ticket[];
  waterLogs:       WaterLog[];
  tenantNameMap:   Record<string, string>;
  monthlyRevenue:  number;
  noticeTenants:   number;
  // Computed
  occupancyRate:   number;
  openTickets:     number;
  avgWaterLevel:   number;
};

export type AdminDashboardState = {
  data:       AdminDashboardData;
  loading:    boolean;
  refreshing: boolean;
  error:      string | null;
  refresh:    () => Promise<void>;
};

export type AdminSupabaseClient = {
  auth: {
    getSession: () => PromiseLike<{ data: { session: { user: { id: string }; access_token: string } | null } }>;
  };
  from: (table: string) => any;
};

const EMPTY_DATA: AdminDashboardData = {
  properties: [], rooms: [], tickets: [], waterLogs: [],
  tenantNameMap: {}, monthlyRevenue: 0, noticeTenants: 0,
  occupancyRate: 0, openTickets: 0, avgWaterLevel: 0,
};

export function useAdminDashboard(client: AdminSupabaseClient): AdminDashboardState {
  const [data,       setData]       = useState<AdminDashboardData>(EMPTY_DATA);
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

      const now        = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);

      const [propsRes, roomsRes, ticketsRes, waterRes, revenueRes] = await Promise.all([
        client.from('properties').select('id, name, location'),
        client.from('rooms').select('id, property_id, occupancy_status'),
        client.from('tickets')
          .select('id, category, priority, status, requester_id, requester_type, description, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
        client.from('water_logs')
          .select('id, property_id, level_percentage, timestamp')
          .order('timestamp', { ascending: false }),
        client.from('income_records')
          .select('amount')
          .eq('income_type', 'rent')
          .gte('income_date', monthStart)
          .lt('income_date', monthEnd),
      ]);

      const tickets: Ticket[] = (ticketsRes.data ?? []) as Ticket[];

      // Tenant name lookup for requester_ids
      const ids = [...new Set(tickets.map(t => t.requester_id))].filter(Boolean);
      const { data: tNames } = ids.length
        ? await client.from('tenants').select('id, name').in('id', ids)
        : { data: [] };

      // Latest water log per property (already sorted desc)
      const seen = new Set<string>();
      const latestLogs: WaterLog[] = ((waterRes.data ?? []) as WaterLog[]).filter(l => {
        if (seen.has(l.property_id)) return false;
        seen.add(l.property_id);
        return true;
      });

      // Notice tenant count
      const { count: noticeCount } = await client.from('tenants')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'notice');

      const rooms        = (roomsRes.data ?? []) as AdminRoom[];
      const properties   = (propsRes.data ?? []) as AdminProperty[];
      const totalRevenue = ((revenueRes.data ?? []) as { amount: number }[])
        .reduce((s, r) => s + (Number(r.amount) || 0), 0);

      const totalRooms    = rooms.length;
      const occupiedRooms = rooms.filter(r => r.occupancy_status === 'Occupied' || r.occupancy_status === 'Notice Period').length;
      const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
      const openTickets   = tickets.filter(t => t.status !== 'Resolved').length;
      const avgWaterLevel = latestLogs.length
        ? Math.round(latestLogs.reduce((s, l) => s + l.level_percentage, 0) / latestLogs.length)
        : 0;

      setData({
        properties,
        rooms,
        tickets,
        waterLogs: latestLogs,
        tenantNameMap: Object.fromEntries(((tNames ?? []) as { id: string; name: string }[]).map(t => [t.id, t.name])),
        monthlyRevenue: totalRevenue,
        noticeTenants:  noticeCount ?? 0,
        occupancyRate,
        openTickets,
        avgWaterLevel,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { data, loading, refreshing, error, refresh };
}
