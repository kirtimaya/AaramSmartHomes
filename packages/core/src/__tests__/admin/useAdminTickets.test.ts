import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminTickets } from '../../admin/useAdminTickets';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeChain(tableData: unknown, dbError: unknown = null) {
  const resolved = { data: tableData, error: dbError };
  const chain: any = {
    select:  vi.fn().mockReturnThis(),
    eq:      vi.fn().mockReturnThis(),
    order:   vi.fn().mockReturnThis(),
    update:  vi.fn().mockReturnThis(),
    then(onFulfilled: any, onRejected?: any) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected);
    },
    catch(onRejected: any) { return Promise.resolve(resolved).catch(onRejected); },
    finally(onFinally: any) { return Promise.resolve(resolved).finally(onFinally); },
  };
  return chain;
}

const RAW_TICKETS = [
  {
    id: 'tkt-1', requester_id: 'u1', requester_type: 'tenant',
    category: 'Maintenance', priority: 'High', status: 'Pending',
    description: 'Leaky tap', admin_note: null, created_at: '2024-01-10T00:00:00Z',
    guests: null, tenants: { name: 'Alice' },
  },
  {
    id: 'tkt-2', requester_id: 'g1', requester_type: 'guest',
    category: 'Housekeeping', priority: 'Low', status: 'Resolved',
    description: 'Need towels', admin_note: 'Done', created_at: '2024-01-08T00:00:00Z',
    guests: { name: 'Bob' }, tenants: null,
  },
  {
    id: 'tkt-3', requester_id: 'u2', requester_type: 'tenant',
    category: 'Electrical', priority: 'Urgent', status: 'In-Progress',
    description: 'No power', admin_note: null, created_at: '2024-01-09T00:00:00Z',
    guests: null, tenants: { name: 'Carol' },
  },
];

function makeClient(tickets = RAW_TICKETS, dbError: unknown = null) {
  const ticketsChain = makeChain(tickets, dbError);
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'admin-1' } } } }),
    },
    from: vi.fn().mockReturnValue(ticketsChain),
    _ticketsChain: ticketsChain,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAdminTickets', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('starts in loading state', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTickets(client));
    expect(result.current.loading).toBe(true);
    expect(result.current.tickets).toEqual([]);
    await act(async () => {});
  });

  it('loads and maps tickets with requester names', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTickets(client));
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.tickets).toHaveLength(3);
    expect(result.current.tickets[0].requester_name).toBe('Alice');
    expect(result.current.tickets[1].requester_name).toBe('Bob');
    expect(result.current.tickets[1].requester_type).toBe('guest');
    expect(result.current.tickets[2].status).toBe('In-Progress');
  });

  it('returns not_authenticated when session is null', async () => {
    const client = makeClient();
    client.auth.getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAdminTickets(client));
    await act(async () => {});

    expect(result.current.error).toBe('not_authenticated');
    expect(result.current.tickets).toEqual([]);
  });

  it('surfaces DB errors', async () => {
    const client = makeClient(null as any, { message: 'db error' });
    const { result } = renderHook(() => useAdminTickets(client));
    await act(async () => {});

    expect(result.current.error).toBe('db error');
    expect(result.current.tickets).toEqual([]);
  });

  it('filters by status', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTickets(client));
    await act(async () => {});

    // All = 3
    expect(result.current.filtered).toHaveLength(3);

    act(() => { result.current.setFilter('Pending'); });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe('tkt-1');

    act(() => { result.current.setFilter('Resolved'); });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe('tkt-2');

    act(() => { result.current.setFilter('In-Progress'); });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe('tkt-3');

    act(() => { result.current.setFilter('All'); });
    expect(result.current.filtered).toHaveLength(3);
  });

  it('updateTicket calls update chain and does optimistic state update', async () => {
    const updateChain = {
      eq: vi.fn().mockReturnThis(),
      then(onFulfilled: any) { return Promise.resolve({ data: null, error: null }).then(onFulfilled); },
      catch(f: any) { return Promise.resolve({ data: null, error: null }).catch(f); },
      finally(f: any) { return Promise.resolve({ data: null, error: null }).finally(f); },
    };
    const client: any = makeClient();
    // Override 'from' to return update chain for update() calls
    const originalTicketChain = client._ticketsChain;
    client.from.mockImplementation((table: string) => {
      return { ...originalTicketChain, update: vi.fn().mockReturnValue(updateChain) };
    });

    const { result } = renderHook(() => useAdminTickets(client));
    await act(async () => {});

    await act(async () => {
      await result.current.updateTicket('tkt-1', 'In-Progress', 'Checked it out');
    });

    const updated = result.current.tickets.find(t => t.id === 'tkt-1');
    expect(updated?.status).toBe('In-Progress');
    expect(updated?.admin_note).toBe('Checked it out');
  });

  it('refresh re-fetches and resets refreshing flag', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTickets(client));
    await act(async () => {});

    await act(async () => { await result.current.refresh(); });

    expect(result.current.refreshing).toBe(false);
    expect(client.auth.getSession).toHaveBeenCalledTimes(2);
  });

  it('falls back requester_name to id slice when join is missing', async () => {
    const ticketsWithMissingJoin = [{
      ...RAW_TICKETS[0],
      tenants: null,
      requester_id: 'abcdefghijklmn',
    }];
    const client = makeClient(ticketsWithMissingJoin);
    const { result } = renderHook(() => useAdminTickets(client));
    await act(async () => {});

    expect(result.current.tickets[0].requester_name).toBe('abcdefgh');
  });

  it('empty ticket list is valid — no error', async () => {
    const client = makeClient([]);
    const { result } = renderHook(() => useAdminTickets(client));
    await act(async () => {});

    expect(result.current.tickets).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
