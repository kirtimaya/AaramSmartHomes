import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useTenantDashboard } from '../../tenant/useTenantDashboard';
import type { SupabaseClient } from '../../tenant/useTenantDashboard';
import type { Tenant, Ticket, BillSplit } from '@aaram/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const SESSION = { user: { id: 'user-001' }, access_token: 'tok' };

const TENANT: Tenant = {
  id: 'user-001',
  name: 'Kirtimaaya Swain',
  email: 'k@aaram.space',
  status: 'active',
};

const TICKETS: Ticket[] = [
  {
    id: 'ticket-1',
    requester_id: 'user-001',
    requester_type: 'tenant',
    category: 'Electrical',
    priority: 'High',
    status: 'Pending',
    description: 'AC not cooling',
    created_at: '2025-06-01T10:00:00Z',
  },
];

const BILLS: BillSplit[] = [
  {
    id: 'bill-1',
    bill_id: 'b-1',
    tenant_id: 'user-001',
    room_id: 'room-101',
    ac_units: 2,
    ac_charge: 1200,
    common_share: 400,
    total_payable: 1600,
  },
];

// ── Mock factory ──────────────────────────────────────────────────────────────
// Builds a thenable chain so both `.maybeSingle()` (tenants) and direct await
// (tickets, bill_splits) patterns from useTenantDashboard work correctly.

function makeChain(tableData: unknown) {
  const resolvedValue = { data: tableData };

  const chain: Record<string, unknown> = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    limit:       vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    // thenable — lets Promise.all await the chain directly (tickets / bills)
    then(onFulfilled: (v: unknown) => unknown, onRejected?: (e: unknown) => unknown) {
      return Promise.resolve(resolvedValue).then(onFulfilled, onRejected);
    },
    catch(onRejected: (e: unknown) => unknown) {
      return Promise.resolve(resolvedValue).catch(onRejected);
    },
    finally(onFinally: () => void) {
      return Promise.resolve(resolvedValue).finally(onFinally);
    },
  };

  return chain;
}

function makeClient(overrides?: Partial<{
  session: typeof SESSION | null;
  tenant: Tenant | null;
  tickets: Ticket[];
  bills: BillSplit[];
  throwOnLoad: boolean;
}>): SupabaseClient {
  const opts = {
    session: SESSION,
    tenant: TENANT,
    tickets: TICKETS,
    bills: BILLS,
    throwOnLoad: false,
    ...overrides,
  };

  const getSession = opts.throwOnLoad
    ? vi.fn().mockRejectedValue(new Error('network failure'))
    : vi.fn().mockResolvedValue({ data: { session: opts.session } });

  return {
    auth: {
      getSession,
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: vi.fn((table: string) => {
      if (table === 'tenants')     return makeChain(opts.tenant) as any;
      if (table === 'tickets')     return makeChain(opts.tickets) as any;
      if (table === 'bill_splits') return makeChain(opts.bills) as any;
      return makeChain(null) as any;
    }),
  } as unknown as SupabaseClient;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTenantDashboard', () => {
  it('starts in loading state', () => {
    const client = makeClient();
    const { result } = renderHook(() => useTenantDashboard(client));
    expect(result.current.loading).toBe(true);
    expect(result.current.tenant).toBeNull();
  });

  it('loads tenant, tickets, and bills on mount', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useTenantDashboard(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tenant?.id).toBe('user-001');
    expect(result.current.tenant?.name).toBe('Kirtimaaya Swain');
    expect(result.current.tickets).toHaveLength(1);
    expect(result.current.tickets[0].category).toBe('Electrical');
    expect(result.current.bills).toHaveLength(1);
    expect(result.current.bills[0].total_payable).toBe(1600);
    expect(result.current.error).toBeNull();
  });

  it('sets error="not_authenticated" when no session', async () => {
    const client = makeClient({ session: null });
    const { result } = renderHook(() => useTenantDashboard(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('not_authenticated');
    expect(result.current.tenant).toBeNull();
  });

  it('sets error message when supabase throws', async () => {
    const client = makeClient({ throwOnLoad: true });
    const { result } = renderHook(() => useTenantDashboard(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('network failure');
  });

  it('handles null tenant gracefully (tenant row missing)', async () => {
    const client = makeClient({ tenant: null });
    const { result } = renderHook(() => useTenantDashboard(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tenant).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('handles empty tickets and bills arrays', async () => {
    const client = makeClient({ tickets: [], bills: [] });
    const { result } = renderHook(() => useTenantDashboard(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.tickets).toHaveLength(0);
    expect(result.current.bills).toHaveLength(0);
  });

  it('refresh re-fetches data and resets refreshing flag', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useTenantDashboard(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.refresh(); });

    expect(result.current.refreshing).toBe(false);
    expect(result.current.tenant?.id).toBe('user-001');
    // getSession called twice: initial load + refresh
    expect(client.auth.getSession).toHaveBeenCalledTimes(2);
  });
});
