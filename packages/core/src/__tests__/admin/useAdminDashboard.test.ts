import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useAdminDashboard } from '../../admin/useAdminDashboard';
import type { AdminSupabaseClient } from '../../admin/useAdminDashboard';
import type { Ticket } from '@aaram/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: 'admin-001' }, access_token: 'tok' };

const PROPERTIES = [
  { id: 'p1', name: 'Green Villa', location: 'Bhubaneswar' },
  { id: 'p2', name: 'Sky Flat',    location: 'Cuttack' },
];

const ROOMS = [
  { id: 'r1', property_id: 'p1', occupancy_status: 'Occupied' },
  { id: 'r2', property_id: 'p1', occupancy_status: 'Vacant' },
  { id: 'r3', property_id: 'p2', occupancy_status: 'Occupied' },
  { id: 'r4', property_id: 'p2', occupancy_status: 'Notice Period' },
];

const TICKETS: Ticket[] = [
  {
    id: 't1', requester_id: 'user-1', requester_type: 'tenant',
    category: 'Electrical', priority: 'High', status: 'Pending',
    description: 'No power', created_at: '2025-06-01T10:00:00Z',
  },
  {
    id: 't2', requester_id: 'user-2', requester_type: 'tenant',
    category: 'Plumbing', priority: 'Low', status: 'Resolved',
    description: 'Fixed', created_at: '2025-06-02T10:00:00Z',
  },
];

const WATER_LOGS = [
  { id: 'w1', property_id: 'p1', level_percentage: 75, timestamp: '2025-06-10T09:00:00Z' },
  { id: 'w2', property_id: 'p1', level_percentage: 60, timestamp: '2025-06-09T09:00:00Z' }, // dup p1 — filtered
  { id: 'w3', property_id: 'p2', level_percentage: 20, timestamp: '2025-06-10T08:00:00Z' },
];

const REVENUE = [{ amount: 25000 }, { amount: 30000 }];

const TENANT_NAMES = [
  { id: 'user-1', name: 'Riya Singh' },
  { id: 'user-2', name: 'Arjun Patel' },
];

// ── Mock factory ──────────────────────────────────────────────────────────────
// Builds a thenable chain supporting the extended admin chain methods:
// .select().order().limit(), .select().eq().gte().lt(),
// .select('id', { count, head }).eq() — all resolve to the right table data.

function makeChain(tableData: unknown, countOverride?: number) {
  const resolved = { data: tableData, error: null, count: countOverride ?? null };

  const chain: any = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    in:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    limit:       vi.fn().mockReturnThis(),
    gte:         vi.fn().mockReturnThis(),
    lt:          vi.fn().mockReturnThis(),
    head:        vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
    then:   (onF: any, onR?: any) => Promise.resolve(resolved).then(onF, onR),
    catch:  (onR: any)            => Promise.resolve(resolved).catch(onR),
    finally:(fn: any)             => Promise.resolve(resolved).finally(fn),
  };
  return chain;
}

function makeClient(overrides?: {
  session?: typeof SESSION | null;
  throwOnLoad?: boolean;
}): AdminSupabaseClient {
  const { session = SESSION, throwOnLoad = false } = overrides ?? {};

  if (throwOnLoad) {
    return {
      auth: { getSession: vi.fn().mockRejectedValue(new Error('Network error')) },
      from: vi.fn(),
    };
  }

  const getSession = vi.fn().mockResolvedValue({ data: { session } });

  return {
    auth: { getSession },
    from: vi.fn((table: string) => {
      switch (table) {
        case 'properties':    return makeChain(PROPERTIES);
        case 'rooms':         return makeChain(ROOMS);
        case 'tickets':       return makeChain(TICKETS);
        case 'water_logs':    return makeChain(WATER_LOGS);
        case 'income_records':return makeChain(REVENUE);
        case 'tenants':       return makeChain(TENANT_NAMES, 1);  // notice count = 1
        default:              return makeChain([]);
      }
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAdminDashboard', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useAdminDashboard(makeClient()));
    expect(result.current.loading).toBe(true);
    expect(result.current.data.properties).toHaveLength(0);
  });

  it('loads all data on mount', async () => {
    const { result } = renderHook(() => useAdminDashboard(makeClient()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    const { data } = result.current;
    expect(data.properties).toHaveLength(2);
    expect(data.rooms).toHaveLength(4);
    expect(data.tickets).toHaveLength(2);
    expect(data.monthlyRevenue).toBe(55000);
    expect(result.current.error).toBeNull();
  });

  it('deduplicates water logs — keeps latest per property', async () => {
    const { result } = renderHook(() => useAdminDashboard(makeClient()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 3 raw logs for 2 properties → 2 latest-per-property logs
    expect(result.current.data.waterLogs).toHaveLength(2);
    expect(result.current.data.waterLogs[0].property_id).toBe('p1');
    expect(result.current.data.waterLogs[0].level_percentage).toBe(75);
  });

  it('computes occupancyRate correctly', async () => {
    const { result } = renderHook(() => useAdminDashboard(makeClient()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // 4 rooms: r1 Occupied, r3 Occupied, r4 Notice Period = 3/4 = 75%
    expect(result.current.data.occupancyRate).toBe(75);
  });

  it('computes openTickets — excludes Resolved', async () => {
    const { result } = renderHook(() => useAdminDashboard(makeClient()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // t1 Pending = 1 open; t2 Resolved = excluded
    expect(result.current.data.openTickets).toBe(1);
  });

  it('computes avgWaterLevel as integer average', async () => {
    const { result } = renderHook(() => useAdminDashboard(makeClient()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    // Math.round((75 + 20) / 2) = Math.round(47.5) = 48
    expect(result.current.data.avgWaterLevel).toBe(48);
  });

  it('builds tenantNameMap from tenants lookup', async () => {
    const { result } = renderHook(() => useAdminDashboard(makeClient()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data.tenantNameMap['user-1']).toBe('Riya Singh');
    expect(result.current.data.tenantNameMap['user-2']).toBe('Arjun Patel');
  });

  it('sets error="not_authenticated" when no session', async () => {
    const { result } = renderHook(() => useAdminDashboard(makeClient({ session: null })));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('not_authenticated');
  });

  it('sets error message on thrown exception', async () => {
    const { result } = renderHook(() => useAdminDashboard(makeClient({ throwOnLoad: true })));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Network error');
  });

  it('refresh re-fetches and resets refreshing flag', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminDashboard(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.refresh(); });

    expect(result.current.refreshing).toBe(false);
    expect(client.auth.getSession).toHaveBeenCalledTimes(2);
  });
});
