import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useProperties } from '../../properties/useProperties';
import type { PropertiesClient } from '../../properties/useProperties';
import type { Property } from '@aaram/types';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PROPERTIES: Property[] = [
  {
    id: 'prop-1',
    name: 'Green Villa',
    location: 'Bhubaneswar',
    total_rooms: 4,
    property_type: 'Villa',
    image_url: 'https://example.com/img1.jpg',
    rooms: [
      { id: 'r1', name: 'Room 101', type: 'Standard', features: [], occupancy_status: 'Occupied' },
      { id: 'r2', name: 'Room 102', type: 'Standard', features: [], occupancy_status: 'Vacant' },
    ],
    benefits: [{ id: 'b1', name: 'Pool', icon: '🏊' }],
  },
  {
    id: 'prop-2',
    name: 'Sky Flat',
    location: 'Cuttack',
    total_rooms: 2,
    property_type: 'Flat',
    rooms: [],
    benefits: [],
  },
];

// ── Mock factory ──────────────────────────────────────────────────────────────
// Mirrors the shape used in useTenantDashboard tests: a thenable chain so
// direct `await query` and `.limit(n)` both resolve correctly.

function makeChain(resolvedData: unknown, error?: { message: string }) {
  const resolved = { data: resolvedData, error: error ?? null };
  const chain: any = {
    select:      vi.fn().mockReturnThis(),
    eq:          vi.fn().mockReturnThis(),
    order:       vi.fn().mockReturnThis(),
    limit:       vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue(resolved),
    then:   (onF: any, onR?: any) => Promise.resolve(resolved).then(onF, onR),
    catch:  (onR: any)            => Promise.resolve(resolved).catch(onR),
    finally:(fn: any)             => Promise.resolve(resolved).finally(fn),
  };
  return chain;
}

function makeClient(overrides?: {
  data?: Property[];
  dbError?: string;
  throwOnLoad?: boolean;
}): PropertiesClient {
  const { data = PROPERTIES, dbError, throwOnLoad = false } = overrides ?? {};

  return {
    from: throwOnLoad
      ? vi.fn().mockImplementation(() => { throw new Error('network failure'); })
      : vi.fn(() => makeChain(data, dbError ? { message: dbError } : undefined)),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useProperties', () => {
  it('starts in loading state', () => {
    const { result } = renderHook(() => useProperties(makeClient()));
    expect(result.current.loading).toBe(true);
    expect(result.current.properties).toHaveLength(0);
  });

  it('loads properties on mount', async () => {
    const { result } = renderHook(() => useProperties(makeClient()));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.properties).toHaveLength(2);
    expect(result.current.properties[0].name).toBe('Green Villa');
    expect(result.current.properties[0].rooms).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it('applies limit to the Supabase query', async () => {
    const client = makeClient();
    renderHook(() => useProperties(client, 1));
    await waitFor(() => {});

    const chain = (client.from as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(chain.limit).toHaveBeenCalledWith(1);
  });

  it('does not call .limit() when no limit is given', async () => {
    const client = makeClient();
    renderHook(() => useProperties(client));
    await waitFor(() => {});

    const chain = (client.from as ReturnType<typeof vi.fn>).mock.results[0].value;
    expect(chain.limit).not.toHaveBeenCalled();
  });

  it('sets error when Supabase returns a DB error', async () => {
    const client = makeClient({ data: [], dbError: 'permission denied' });
    const { result } = renderHook(() => useProperties(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('permission denied');
    expect(result.current.properties).toHaveLength(0);
  });

  it('sets error when Supabase throws', async () => {
    const client = makeClient({ throwOnLoad: true });
    const { result } = renderHook(() => useProperties(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('network failure');
  });

  it('handles empty properties array', async () => {
    const client = makeClient({ data: [] });
    const { result } = renderHook(() => useProperties(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.properties).toHaveLength(0);
    expect(result.current.error).toBeNull();
  });

  it('refresh re-fetches data', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useProperties(client));
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => { await result.current.refresh(); });

    expect(result.current.loading).toBe(false);
    expect(result.current.properties).toHaveLength(2);
    // from() called twice: initial mount + refresh
    expect(client.from).toHaveBeenCalledTimes(2);
  });
});
