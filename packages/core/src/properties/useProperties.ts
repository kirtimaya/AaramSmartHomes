import { useState, useEffect, useCallback } from 'react';
import type { Property } from '@aaram/types';

export type PropertiesClient = {
  from: (table: string) => any;
};

export type PropertiesState = {
  properties: Property[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useProperties(client: PropertiesClient, limit?: number): PropertiesState {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let query = client.from('properties').select('*, rooms(*), benefits(*)');
      if (limit != null) query = query.limit(limit);
      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);
      setProperties((data as Property[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [client, limit]);

  useEffect(() => { load(); }, [load]);

  return { properties, loading, error, refresh: load };
}
