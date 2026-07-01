import { useState } from 'react';

export type TicketCategory = 'Maintenance' | 'Electrical' | 'Plumbing' | 'Housekeeping' | 'Other' | 'Support';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TicketFormClient = {
  auth: {
    getSession: () => Promise<{ data: { session: { user: { id: string } } | null } }>;
  };
  from: (table: string) => {
    insert: (row: Record<string, unknown>) => Promise<{ error: { message: string } | null }>;
  };
};

export type TicketFormState = {
  category:    TicketCategory;
  setCategory: (c: TicketCategory) => void;
  priority:    TicketPriority;
  setPriority: (p: TicketPriority) => void;
  description: string;
  setDescription: (d: string) => void;
  loading:     boolean;
  error:       string | null;
  submitted:   boolean;
  submit:      () => Promise<void>;
  reset:       () => void;
};

export function useTicketForm(
  client: TicketFormClient,
  tenantId: string,
  onSuccess?: () => void,
): TicketFormState {
  const [category,    setCategory]    = useState<TicketCategory>('Maintenance');
  const [priority,    setPriority]    = useState<TicketPriority>('Medium');
  const [description, setDescription] = useState('');
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [submitted,   setSubmitted]   = useState(false);

  const submit = async () => {
    if (!description.trim()) {
      setError('Please describe the issue.');
      return;
    }
    setLoading(true);
    setError(null);

    const { error: dbError } = await client.from('tickets').insert({
      requester_id:   tenantId,
      requester_type: 'tenant',
      category,
      priority,
      status:         'Pending',
      description:    description.trim(),
    });

    setLoading(false);

    if (dbError) {
      setError(dbError.message);
    } else {
      setSubmitted(true);
      onSuccess?.();
    }
  };

  const reset = () => {
    setCategory('Maintenance');
    setPriority('Medium');
    setDescription('');
    setError(null);
    setSubmitted(false);
  };

  return { category, setCategory, priority, setPriority, description, setDescription, loading, error, submitted, submit, reset };
}
