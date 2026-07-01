import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePropertyDetail } from '../../properties/usePropertyDetail';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeChain(data: unknown, dbError: unknown = null) {
  const resolved = { data, error: dbError };
  const chain: any = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
  };
  return chain;
}

const PROPERTY = {
  id: 'p1', name: 'Aaram Heights', location: 'Bangalore', total_rooms: 4,
  property_type: 'Villa', image_url: null, description: 'A serene property',
  rooms: [
    { id: 'r1', name: 'Room 101', type: '1BHK', sqft: 450, features: ['Balcony'], has_ac: true, occupancy_status: 'vacant', image_urls: [] },
    { id: 'r2', name: 'Room 102', type: '2BHK', sqft: 620, features: ['Garden View'], has_ac: false, occupancy_status: 'occupied', tenant_name: 'Alice' },
  ],
  benefits: [
    { id: 'b1', name: 'Swimming Pool', icon: '🏊' },
    { id: 'b2', name: 'Gym', icon: '🏋️' },
  ],
};

function makeClient(data: unknown = PROPERTY, dbError: unknown = null) {
  return { from: vi.fn().mockReturnValue(makeChain(data, dbError)) };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePropertyDetail', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('starts in loading state', async () => {
    const client = makeClient();
    const { result } = renderHook(() => usePropertyDetail(client, 'p1'));
    expect(result.current.loading).toBe(true);
    expect(result.current.property).toBeNull();
    await act(async () => {});
  });

  it('loads property with rooms and benefits', async () => {
    const client = makeClient();
    const { result } = renderHook(() => usePropertyDetail(client, 'p1'));
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.property?.name).toBe('Aaram Heights');
    expect(result.current.property?.rooms).toHaveLength(2);
    expect(result.current.property?.benefits).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('sets activeRoom to first room on load', async () => {
    const client = makeClient();
    const { result } = renderHook(() => usePropertyDetail(client, 'p1'));
    await act(async () => {});

    expect(result.current.activeRoom?.id).toBe('r1');
    expect(result.current.activeRoom?.name).toBe('Room 101');
  });

  it('setActiveRoom switches the active room', async () => {
    const client = makeClient();
    const { result } = renderHook(() => usePropertyDetail(client, 'p1'));
    await act(async () => {});

    act(() => { result.current.setActiveRoom(PROPERTY.rooms[1] as any); });
    expect(result.current.activeRoom?.id).toBe('r2');
  });

  it('surfaces DB error', async () => {
    const client = makeClient(null, { message: 'not found in db' });
    const { result } = renderHook(() => usePropertyDetail(client, 'p1'));
    await act(async () => {});

    expect(result.current.error).toBe('not found in db');
    expect(result.current.property).toBeNull();
  });

  it('returns property-not-found error when data is null', async () => {
    const client = makeClient(null, null);
    const { result } = renderHook(() => usePropertyDetail(client, 'p1'));
    await act(async () => {});

    expect(result.current.error).toBe('Property not found');
    expect(result.current.property).toBeNull();
  });

  it('returns error when propertyId is null', async () => {
    const client = makeClient();
    const { result } = renderHook(() => usePropertyDetail(client, null));
    await act(async () => {});

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBe('No property ID provided');
    expect(result.current.from).toBeUndefined();
  });

  it('refresh re-fetches the property', async () => {
    const client = makeClient();
    const { result } = renderHook(() => usePropertyDetail(client, 'p1'));
    await act(async () => {});

    await act(async () => { await result.current.refresh(); });

    expect(client.from).toHaveBeenCalledTimes(2);
    expect(result.current.property?.name).toBe('Aaram Heights');
  });

  it('property with no rooms sets activeRoom to null', async () => {
    const propNoRooms = { ...PROPERTY, rooms: [] };
    const client = makeClient(propNoRooms);
    const { result } = renderHook(() => usePropertyDetail(client, 'p1'));
    await act(async () => {});

    expect(result.current.property?.rooms).toHaveLength(0);
    expect(result.current.activeRoom).toBeNull();
  });
});
