import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuditLog } from '../../admin/useAuditLog';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeChain(tableData: unknown, dbError: unknown = null) {
  const resolved = { data: tableData, error: dbError };
  const chain: any = {
    select:  vi.fn().mockReturnThis(),
    order:   vi.fn().mockReturnThis(),
    range:   vi.fn().mockReturnThis(),
    eq:      vi.fn().mockReturnThis(),
    ilike:   vi.fn().mockReturnThis(),
    gte:     vi.fn().mockReturnThis(),
    lte:     vi.fn().mockReturnThis(),
    then(onFulfilled: any, onRejected?: any) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected);
    },
    catch(onRejected: any) { return Promise.resolve(resolved).catch(onRejected); },
    finally(onFinally: any) { return Promise.resolve(resolved).finally(onFinally); },
  };
  return chain;
}

const ROW = (i: number) => ({
  id: `log-${i}`,
  actor_id: 'admin-1',
  actor_email: 'admin@test.com',
  actor_role: 'admin' as const,
  action: 'menu.upsert',
  entity_type: 'menu',
  entity_id: `menu-${i}`,
  before: null,
  after: { notes: `v${i}` },
  source: 'web' as const,
  created_at: `2026-07-0${i}T00:00:00Z`,
});

function makeClient(rows: unknown[] = [ROW(1), ROW(2)], dbError: unknown = null) {
  const chain = makeChain(rows, dbError);
  return { from: vi.fn().mockReturnValue(chain), _chain: chain };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAuditLog', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('starts in loading state', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAuditLog(client));
    expect(result.current.loading).toBe(true);
    expect(result.current.entries).toEqual([]);
    await act(async () => {});
  });

  it('loads entries', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAuditLog(client));
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.entries).toHaveLength(2);
    expect(result.current.entries[0].action).toBe('menu.upsert');
  });

  it('surfaces DB errors', async () => {
    const client = makeClient(null as any, { message: 'boom' });
    const { result } = renderHook(() => useAuditLog(client));
    await act(async () => {});

    expect(result.current.error).toBe('boom');
    expect(result.current.entries).toEqual([]);
  });

  it('applies entityType/actorEmail/source/date filters', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAuditLog(client));
    await act(async () => {});

    await act(async () => {
      result.current.setFilters({ entityType: 'menu', actorEmail: 'admin', source: 'web', from: '2026-07-01', to: '2026-07-31' });
    });
    await act(async () => {});

    expect(client._chain.eq).toHaveBeenCalledWith('entity_type', 'menu');
    expect(client._chain.ilike).toHaveBeenCalledWith('actor_email', '%admin%');
    expect(client._chain.eq).toHaveBeenCalledWith('source', 'web');
    expect(client._chain.gte).toHaveBeenCalledWith('created_at', '2026-07-01');
    expect(client._chain.lte).toHaveBeenCalledWith('created_at', '2026-07-31');
  });

  it('setFilters resets to page 0', async () => {
    const client = makeClient(Array.from({ length: 30 }, (_, i) => ROW(i)));
    const { result } = renderHook(() => useAuditLog(client, 25));
    await act(async () => {});

    await act(async () => { result.current.nextPage(); });
    expect(result.current.page).toBe(1);

    await act(async () => { result.current.setFilters({ source: 'aara' }); });
    expect(result.current.page).toBe(0);
  });

  it('hasMore is true when the fetch returns more than pageSize rows', async () => {
    // pageSize=1 fetches range(0,1) -> 2 rows returned means "1 extra" -> hasMore
    const client = makeClient([ROW(1), ROW(2)]);
    const { result } = renderHook(() => useAuditLog(client, 1));
    await act(async () => {});

    expect(result.current.entries).toHaveLength(1);
    expect(result.current.hasMore).toBe(true);
  });

  it('hasMore is false on the last page', async () => {
    const client = makeClient([ROW(1)]);
    const { result } = renderHook(() => useAuditLog(client, 25));
    await act(async () => {});

    expect(result.current.hasMore).toBe(false);
  });

  it('nextPage/prevPage move the page window and refetch with the new range', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAuditLog(client, 10));
    await act(async () => {});

    await act(async () => { result.current.nextPage(); });
    expect(result.current.page).toBe(1);
    expect(client._chain.range).toHaveBeenLastCalledWith(10, 20);

    await act(async () => { result.current.prevPage(); });
    expect(result.current.page).toBe(0);

    await act(async () => { result.current.prevPage(); }); // clamps at 0
    expect(result.current.page).toBe(0);
  });

  it('empty result set is valid — no error', async () => {
    const client = makeClient([]);
    const { result } = renderHook(() => useAuditLog(client));
    await act(async () => {});

    expect(result.current.entries).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('refresh re-fetches', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useAuditLog(client));
    await act(async () => {});

    await act(async () => { await result.current.refresh(); });

    expect(client.from).toHaveBeenCalledTimes(2);
  });
});
