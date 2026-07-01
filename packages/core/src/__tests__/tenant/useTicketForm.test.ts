import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useTicketForm } from '../../tenant/useTicketForm';
import type { TicketFormClient } from '../../tenant/useTicketForm';

// ── Mock factory ──────────────────────────────────────────────────────────────

function makeClient(insertError?: string): TicketFormClient {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { user: { id: 'user-001' } } } }),
    },
    from: vi.fn(() => ({
      insert: vi.fn().mockResolvedValue({
        error: insertError ? { message: insertError } : null,
      }),
    })),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useTicketForm', () => {
  it('initialises with default values', () => {
    const { result } = renderHook(() => useTicketForm(makeClient(), 'user-001'));
    expect(result.current.category).toBe('Maintenance');
    expect(result.current.priority).toBe('Medium');
    expect(result.current.description).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.submitted).toBe(false);
  });

  it('blocks submit when description is empty', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useTicketForm(client, 'user-001'));

    await act(async () => { await result.current.submit(); });

    expect(result.current.error).toMatch(/describe the issue/i);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('inserts ticket with correct payload on submit', async () => {
    const client = makeClient();
    const onSuccess = vi.fn();
    const { result } = renderHook(() => useTicketForm(client, 'user-001', onSuccess));

    act(() => {
      result.current.setCategory('Electrical');
      result.current.setPriority('High');
      result.current.setDescription('  AC not working  ');
    });
    await act(async () => { await result.current.submit(); });

    const insertFn = (client.from as ReturnType<typeof vi.fn>).mock.results[0].value.insert;
    expect(insertFn).toHaveBeenCalledWith({
      requester_id: 'user-001',
      requester_type: 'tenant',
      category: 'Electrical',
      priority: 'High',
      status: 'Pending',
      description: 'AC not working',
    });
    expect(result.current.submitted).toBe(true);
    expect(result.current.error).toBeNull();
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it('surfaces database error in error state', async () => {
    const client = makeClient('Row level security violation');
    const { result } = renderHook(() => useTicketForm(client, 'user-001'));

    act(() => { result.current.setDescription('Broken tap'); });
    await act(async () => { await result.current.submit(); });

    expect(result.current.error).toBe('Row level security violation');
    expect(result.current.submitted).toBe(false);
  });

  it('loading resets to false after successful submit', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useTicketForm(client, 'user-001'));

    act(() => { result.current.setDescription('Ceiling fan wobble'); });
    await act(async () => { await result.current.submit(); });

    expect(result.current.loading).toBe(false);
  });

  it('loading resets to false after error', async () => {
    const client = makeClient('DB error');
    const { result } = renderHook(() => useTicketForm(client, 'user-001'));

    act(() => { result.current.setDescription('Something broken'); });
    await act(async () => { await result.current.submit(); });

    expect(result.current.loading).toBe(false);
  });

  it('reset restores all fields to defaults', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useTicketForm(client, 'user-001'));

    act(() => {
      result.current.setCategory('Plumbing');
      result.current.setPriority('Urgent');
      result.current.setDescription('Leaking pipe');
    });
    await act(async () => { await result.current.submit(); });
    expect(result.current.submitted).toBe(true);

    act(() => { result.current.reset(); });
    expect(result.current.category).toBe('Maintenance');
    expect(result.current.priority).toBe('Medium');
    expect(result.current.description).toBe('');
    expect(result.current.submitted).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
