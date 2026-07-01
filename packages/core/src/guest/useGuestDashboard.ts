import { useState, useEffect, useCallback } from 'react';
import type { Property, VisitRequest } from '@aaram/types';

// ── Types ──────────────────────────────────────────────────────────────────────

export type GuestDashboardClient = {
  auth: {
    getSession: () => Promise<{ data: { session: { user: { id: string } } | null } }>;
    signOut: () => Promise<void>;
  };
  from: (table: string) => any;
};

export type GuestDashboardState = {
  guestId: string | null;
  properties: Property[];
  shortlisted: Set<string>;
  visitRequests: VisitRequest[];
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  toggleShortlist: (propertyId: string) => Promise<void>;
  refresh: () => Promise<void>;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useGuestDashboard(client: GuestDashboardClient): GuestDashboardState {
  const [guestId,       setGuestId]       = useState<string | null>(null);
  const [properties,    setProperties]    = useState<Property[]>([]);
  const [shortlisted,   setShortlisted]   = useState<Set<string>>(new Set());
  const [visitRequests, setVisitRequests] = useState<VisitRequest[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else           setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) { setError('not_authenticated'); return; }

      const uid = session.user.id;
      setGuestId(uid);

      const [propertiesRes, shortlistRes, visitsRes] = await Promise.all([
        client.from('properties').select('*, rooms(*), benefits(*)').limit(20),
        client.from('guest_shortlists').select('property_id').eq('guest_id', uid),
        client.from('visit_requests')
          .select('*, properties(name)')
          .eq('requester_id', uid)
          .eq('requester_type', 'guest')
          .order('created_at', { ascending: false }),
      ]);

      if (propertiesRes.error) throw new Error(propertiesRes.error.message);
      if (shortlistRes.error) throw new Error(shortlistRes.error.message);
      if (visitsRes.error)    throw new Error(visitsRes.error.message);

      setProperties((propertiesRes.data as Property[]) ?? []);

      const shortlistSet = new Set<string>(
        ((shortlistRes.data ?? []) as any[]).map((r: any) => r.property_id as string),
      );
      setShortlisted(shortlistSet);

      const visits: VisitRequest[] = ((visitsRes.data ?? []) as any[]).map((v: any) => ({
        ...v,
        property_name: v.properties?.name ?? undefined,
      }));
      setVisitRequests(visits);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const toggleShortlist = useCallback(async (propertyId: string) => {
    const { data: { session } } = await client.auth.getSession();
    if (!session) return;
    const uid = session.user.id;

    if (shortlisted.has(propertyId)) {
      await client
        .from('guest_shortlists')
        .delete()
        .eq('guest_id', uid)
        .eq('property_id', propertyId);
      setShortlisted(prev => { const next = new Set(prev); next.delete(propertyId); return next; });
    } else {
      await client.from('guest_shortlists').insert({ guest_id: uid, property_id: propertyId });
      setShortlisted(prev => new Set([...prev, propertyId]));
    }
  }, [client, shortlisted]);

  return {
    guestId, properties, shortlisted, visitRequests,
    loading, refreshing, error,
    toggleShortlist, refresh,
  };
}
