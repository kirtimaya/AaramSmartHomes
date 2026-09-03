import { useState, useCallback } from 'react';

// ── Types ──────────────────────────────────────────────────────────────────────

export type VisitRequestFormClient = {
  auth: {
    getSession: () => PromiseLike<{ data: { session: { user: { id: string } } | null } }>;
  };
  from: (table: string) => any;
};

export type VisitRequestFormState = {
  propertyId: string;
  setPropertyId: (id: string) => void;
  preferredDate: string;
  setPreferredDate: (d: string) => void;
  message: string;
  setMessage: (m: string) => void;
  loading: boolean;
  error: string | null;
  submitted: boolean;
  submit: () => Promise<void>;
  reset: () => void;
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useVisitRequestForm(client: VisitRequestFormClient): VisitRequestFormState {
  const [propertyId,    setPropertyId]    = useState('');
  const [preferredDate, setPreferredDate] = useState('');
  const [message,       setMessage]       = useState('');
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [submitted,     setSubmitted]     = useState(false);

  const submit = useCallback(async () => {
    if (!propertyId.trim()) { setError('Please select a property'); return; }
    if (!preferredDate.trim()) { setError('Please choose a preferred date'); return; }

    setError(null);
    setLoading(true);

    try {
      const { data: { session } } = await client.auth.getSession();
      if (!session) { setError('Not authenticated'); return; }

      const { error: dbErr } = await client.from('visit_requests').insert({
        requester_id:   session.user.id,
        requester_type: 'guest',
        property_id:    propertyId.trim(),
        preferred_date: preferredDate.trim(),
        message:        message.trim() || null,
        status:         'pending',
      });

      if (dbErr) throw new Error(dbErr.message);
      setSubmitted(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [client, propertyId, preferredDate, message]);

  const reset = useCallback(() => {
    setPropertyId('');
    setPreferredDate('');
    setMessage('');
    setError(null);
    setSubmitted(false);
  }, []);

  return {
    propertyId, setPropertyId,
    preferredDate, setPreferredDate,
    message, setMessage,
    loading, error, submitted,
    submit, reset,
  };
}
