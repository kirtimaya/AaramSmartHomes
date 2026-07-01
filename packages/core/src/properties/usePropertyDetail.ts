import { useState, useEffect, useCallback } from 'react';
import type { Property, Room } from '@aaram/types';

// ── Types ──────────────────────────────────────────────────────────────────────

export type PropertyDetailClient = {
  from: (table: string) => any;
};

export type PropertyDetailState = {
  property: Property | null;
  activeRoom: Room | null;
  setActiveRoom: (room: Room) => void;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function usePropertyDetail(
  client: PropertyDetailClient,
  propertyId: string | null,
): PropertyDetailState {
  const [property,   setProperty]   = useState<Property | null>(null);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!propertyId) {
      setLoading(false);
      setError('No property ID provided');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: dbErr } = await client
        .from('properties')
        .select('*, rooms(*), benefits(*)')
        .eq('id', propertyId)
        .maybeSingle();

      if (dbErr) throw new Error(dbErr.message);

      if (!data) {
        setError('Property not found');
        setProperty(null);
        return;
      }

      setProperty(data as Property);
      const rooms = (data as Property).rooms;
      if (rooms && rooms.length > 0) {
        setActiveRoom(rooms[0]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [client, propertyId]);

  useEffect(() => { load(); }, [load]);

  return { property, activeRoom, setActiveRoom, loading, error, refresh: load };
}
