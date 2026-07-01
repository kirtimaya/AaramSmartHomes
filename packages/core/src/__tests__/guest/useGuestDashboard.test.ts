import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useGuestDashboard } from '../../guest/useGuestDashboard';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeChain(data: unknown, dbError: unknown = null) {
  const resolved = { data, error: dbError };
  const chain: any = {
    select:  vi.fn().mockReturnThis(),
    eq:      vi.fn().mockReturnThis(),
    order:   vi.fn().mockReturnThis(),
    limit:   vi.fn().mockReturnThis(),
    delete:  vi.fn().mockReturnThis(),
    insert:  vi.fn().mockResolvedValue({ data: null, error: null }),
    then(onFulfilled: any, onRejected?: any) {
      return Promise.resolve(resolved).then(onFulfilled, onRejected);
    },
    catch(f: any) { return Promise.resolve(resolved).catch(f); },
    finally(f: any) { return Promise.resolve(resolved).finally(f); },
  };
  return chain;
}

const PROPERTIES = [
  {
    id: 'p1', name: 'Aaram Heights', location: 'Bangalore',
    total_rooms: 4, property_type: 'Villa', image_url: null,
    rooms: [{ id: 'r1', occupancy_status: 'vacant' }, { id: 'r2', occupancy_status: 'occupied' }],
    benefits: [{ id: 'b1', name: 'Pool', icon: '🏊' }],
  },
];

const SHORTLIST = [{ property_id: 'p1' }];

const VISITS = [
  {
    id: 'v1', requester_id: 'g1', requester_type: 'guest',
    property_id: 'p1', preferred_date: '2024-03-15',
    message: 'Looking forward to seeing it', status: 'pending',
    created_at: '2024-03-01T00:00:00Z',
    properties: { name: 'Aaram Heights' },
  },
];

function makeClient(
  properties = PROPERTIES,
  shortlist  = SHORTLIST,
  visits     = VISITS,
  authed = true,
) {
  let callCount = 0;
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: authed ? { user: { id: 'g1' } } : null },
      }),
      signOut: vi.fn().mockResolvedValue({}),
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'properties')       return makeChain(properties);
      if (table === 'guest_shortlists') {
        callCount++;
        // first call = select, subsequent can be delete/insert
        return makeChain(callCount === 1 ? shortlist : []);
      }
      if (table === 'visit_requests') return makeChain(visits);
      return makeChain([]);
    }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useGuestDashboard', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('starts in loading state', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useGuestDashboard(client));
    expect(result.current.loading).toBe(true);
    await act(async () => {});
  });

  it('loads properties, shortlist, and visit requests', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useGuestDashboard(client));
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.properties).toHaveLength(1);
    expect(result.current.shortlisted.has('p1')).toBe(true);
    expect(result.current.visitRequests).toHaveLength(1);
    expect(result.current.visitRequests[0].property_name).toBe('Aaram Heights');
    expect(result.current.error).toBeNull();
  });

  it('sets guestId from session', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useGuestDashboard(client));
    await act(async () => {});
    expect(result.current.guestId).toBe('g1');
  });

  it('returns not_authenticated when session is null', async () => {
    const client = makeClient(PROPERTIES, SHORTLIST, VISITS, false);
    const { result } = renderHook(() => useGuestDashboard(client));
    await act(async () => {});

    expect(result.current.error).toBe('not_authenticated');
    expect(result.current.properties).toEqual([]);
  });

  it('empty shortlist results in empty Set', async () => {
    const client = makeClient(PROPERTIES, [], VISITS);
    const { result } = renderHook(() => useGuestDashboard(client));
    await act(async () => {});

    expect(result.current.shortlisted.size).toBe(0);
  });

  it('toggleShortlist adds to shortlist when not shortlisted', async () => {
    const client = makeClient(PROPERTIES, [], VISITS);
    const { result } = renderHook(() => useGuestDashboard(client));
    await act(async () => {});

    expect(result.current.shortlisted.has('p1')).toBe(false);

    await act(async () => { await result.current.toggleShortlist('p1'); });
    expect(result.current.shortlisted.has('p1')).toBe(true);
  });

  it('toggleShortlist removes from shortlist when already shortlisted', async () => {
    const client = makeClient(PROPERTIES, SHORTLIST, VISITS);
    const { result } = renderHook(() => useGuestDashboard(client));
    await act(async () => {});

    expect(result.current.shortlisted.has('p1')).toBe(true);

    await act(async () => { await result.current.toggleShortlist('p1'); });
    expect(result.current.shortlisted.has('p1')).toBe(false);
  });

  it('refresh re-fetches and resets refreshing flag', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useGuestDashboard(client));
    await act(async () => {});

    await act(async () => { await result.current.refresh(); });
    expect(result.current.refreshing).toBe(false);
    expect(client.auth.getSession).toHaveBeenCalledTimes(2);
  });

  it('empty properties and visits are valid — no error', async () => {
    const client = makeClient([], [], []);
    const { result } = renderHook(() => useGuestDashboard(client));
    await act(async () => {});

    expect(result.current.properties).toEqual([]);
    expect(result.current.visitRequests).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});
