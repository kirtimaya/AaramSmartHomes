import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAdminTenants } from '../../admin/useAdminTenants';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeChain(tableData: unknown, dbError: unknown = null) {
  const resolved = { data: tableData, error: dbError };
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    order:  vi.fn().mockReturnThis(),
    then(onFulfilled: any, onRejected?: any) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected);
    },
    catch(onRejected: any) { return Promise.resolve(resolved).catch(onRejected); },
    finally(onFinally: any) { return Promise.resolve(resolved).finally(onFinally); },
  };
  return chain;
}

const RAW_TENANTS = [
  {
    id: 't1', name: 'Alice Sharma', email: 'alice@example.com', phone: '9876543210',
    status: 'active', room_id: 'r1', move_in_date: '2023-01-15', move_out_date: null, notice_date: null,
    rooms: { name: 'Room 101', property_id: 'p1', properties: { name: 'Aaram Heights' } },
  },
  {
    id: 't2', name: 'Bob Verma', email: 'bob@example.com', phone: null,
    status: 'notice', room_id: 'r2', move_in_date: '2022-06-01', move_out_date: null, notice_date: '2024-03-01',
    rooms: { name: 'Room 202', property_id: 'p1', properties: { name: 'Aaram Heights' } },
  },
  {
    id: 't3', name: 'Carol Rao', email: null, phone: '9123456789',
    status: 'moved_out', room_id: null, move_in_date: '2021-05-01', move_out_date: '2023-12-31', notice_date: null,
    rooms: null,
  },
];

function makeClient(tenants = RAW_TENANTS, dbError: unknown = null) {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'admin-1' } } } }),
    },
    from: vi.fn().mockReturnValue(makeChain(tenants, dbError)),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAdminTenants', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('starts in loading state', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTenants(client));
    expect(result.current.loading).toBe(true);
    expect(result.current.tenants).toEqual([]);
    await act(async () => {});
  });

  it('loads and maps tenants with room/property names', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTenants(client));
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.tenants).toHaveLength(3);

    const alice = result.current.tenants[0];
    expect(alice.name).toBe('Alice Sharma');
    expect(alice.room_name).toBe('Room 101');
    expect(alice.property_name).toBe('Aaram Heights');
    expect(alice.status).toBe('active');

    const carol = result.current.tenants[2];
    expect(carol.room_name).toBeNull();
    expect(carol.property_name).toBeNull();
  });

  it('returns not_authenticated when session is null', async () => {
    const client = makeClient();
    client.auth.getSession = vi.fn().mockResolvedValue({ data: { session: null } });
    const { result } = renderHook(() => useAdminTenants(client));
    await act(async () => {});

    expect(result.current.error).toBe('not_authenticated');
    expect(result.current.tenants).toEqual([]);
  });

  it('surfaces DB errors', async () => {
    const client = makeClient(null as any, { message: 'connection failed' });
    const { result } = renderHook(() => useAdminTenants(client));
    await act(async () => {});

    expect(result.current.error).toBe('connection failed');
    expect(result.current.tenants).toEqual([]);
  });

  it('filters by status', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTenants(client));
    await act(async () => {});

    // all = 3
    expect(result.current.filtered).toHaveLength(3);

    act(() => { result.current.setStatusFilter('active'); });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe('Alice Sharma');

    act(() => { result.current.setStatusFilter('notice'); });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe('Bob Verma');

    act(() => { result.current.setStatusFilter('moved_out'); });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].name).toBe('Carol Rao');

    act(() => { result.current.setStatusFilter('all'); });
    expect(result.current.filtered).toHaveLength(3);
  });

  it('filters by query — name match', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTenants(client));
    await act(async () => {});

    act(() => { result.current.setQuery('alice'); });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe('t1');
  });

  it('filters by query — email match', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTenants(client));
    await act(async () => {});

    act(() => { result.current.setQuery('bob@example'); });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe('t2');
  });

  it('filters by query — phone match', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTenants(client));
    await act(async () => {});

    act(() => { result.current.setQuery('9123456'); });
    expect(result.current.filtered).toHaveLength(1);
    expect(result.current.filtered[0].id).toBe('t3');
  });

  it('combines status + query filters', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTenants(client));
    await act(async () => {});

    act(() => {
      result.current.setStatusFilter('active');
      result.current.setQuery('bob');
    });
    // Bob is notice, not active — should be empty
    expect(result.current.filtered).toHaveLength(0);

    act(() => {
      result.current.setStatusFilter('all');
      result.current.setQuery('bob');
    });
    expect(result.current.filtered).toHaveLength(1);
  });

  it('refresh re-fetches and resets refreshing flag', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAdminTenants(client));
    await act(async () => {});

    await act(async () => { await result.current.refresh(); });

    expect(result.current.refreshing).toBe(false);
    expect(client.auth.getSession).toHaveBeenCalledTimes(2);
  });

  it('empty array is valid — no error', async () => {
    const client = makeClient([]);
    const { result } = renderHook(() => useAdminTenants(client));
    await act(async () => {});

    expect(result.current.tenants).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
