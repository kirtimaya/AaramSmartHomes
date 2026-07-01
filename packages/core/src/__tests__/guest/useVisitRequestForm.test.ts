import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useVisitRequestForm } from '../../guest/useVisitRequestForm';

// ── Mock helpers ───────────────────────────────────────────────────────────────

function makeClient(dbError: unknown = null) {
  const insertChain = {
    then(onFulfilled: any) {
      return Promise.resolve({ data: null, error: dbError }).then(onFulfilled);
    },
    catch(f: any) { return Promise.resolve({ data: null, error: dbError }).catch(f); },
    finally(f: any) { return Promise.resolve({ data: null, error: dbError }).finally(f); },
  };
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'g1' } } },
      }),
    },
    from: vi.fn().mockReturnValue({ insert: vi.fn().mockReturnValue(insertChain) }),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useVisitRequestForm', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('initialises with default empty values', () => {
    const client = makeClient();
    const { result } = renderHook(() => useVisitRequestForm(client));

    expect(result.current.propertyId).toBe('');
    expect(result.current.preferredDate).toBe('');
    expect(result.current.message).toBe('');
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.submitted).toBe(false);
  });

  it('blocks submit when propertyId is empty', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useVisitRequestForm(client));

    await act(async () => {
      result.current.setPreferredDate('2024-03-15');
      await result.current.submit();
    });

    expect(result.current.error).toMatch(/property/i);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('blocks submit when preferredDate is empty', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useVisitRequestForm(client));

    act(() => { result.current.setPropertyId('p1'); });
    await act(async () => { await result.current.submit(); });

    expect(result.current.error).toMatch(/date/i);
    expect(client.from).not.toHaveBeenCalled();
  });

  it('inserts with correct payload on valid submit', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useVisitRequestForm(client));

    act(() => {
      result.current.setPropertyId('p1');
      result.current.setPreferredDate('2024-03-15');
      result.current.setMessage('Interested in Room 101');
    });
    await act(async () => { await result.current.submit(); });

    expect(result.current.submitted).toBe(true);
    expect(result.current.error).toBeNull();
    const insertFn = (client.from as any).mock.results[0].value.insert;
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({
      property_id:    'p1',
      preferred_date: '2024-03-15',
      message:        'Interested in Room 101',
      requester_type: 'guest',
      status:         'pending',
    }));
  });

  it('stores null message when message is empty/whitespace', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useVisitRequestForm(client));

    act(() => {
      result.current.setPropertyId('p1');
      result.current.setPreferredDate('2024-03-15');
      result.current.setMessage('  ');
    });
    await act(async () => { await result.current.submit(); });

    const insertFn = (client.from as any).mock.results[0].value.insert;
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ message: null }));
  });

  it('surfaces DB error and keeps submitted=false', async () => {
    const client = makeClient({ message: 'insert failed' });
    const { result } = renderHook(() => useVisitRequestForm(client));

    act(() => {
      result.current.setPropertyId('p1');
      result.current.setPreferredDate('2024-03-15');
    });
    await act(async () => { await result.current.submit(); });

    expect(result.current.error).toBe('insert failed');
    expect(result.current.submitted).toBe(false);
  });

  it('loading resets to false after successful submit', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useVisitRequestForm(client));

    act(() => {
      result.current.setPropertyId('p1');
      result.current.setPreferredDate('2024-03-15');
    });
    await act(async () => { await result.current.submit(); });

    expect(result.current.loading).toBe(false);
  });

  it('reset restores all fields to defaults', async () => {
    const client = makeClient();
    const { result } = renderHook(() => useVisitRequestForm(client));

    act(() => {
      result.current.setPropertyId('p1');
      result.current.setPreferredDate('2024-03-15');
      result.current.setMessage('Hello');
    });
    await act(async () => { await result.current.submit(); });

    act(() => { result.current.reset(); });
    expect(result.current.propertyId).toBe('');
    expect(result.current.preferredDate).toBe('');
    expect(result.current.message).toBe('');
    expect(result.current.submitted).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
