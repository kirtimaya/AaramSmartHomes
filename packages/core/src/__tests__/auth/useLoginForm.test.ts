/**
 * FUNCTIONAL TESTS — Phase 1.5: useLoginForm hook
 *
 * What's tested:
 *   - Empty-field validation blocks the network call
 *   - Successful login calls onSuccess callback
 *   - Auth error from Supabase surfaces in the error state
 *   - Loading flag toggles correctly around async calls
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoginForm } from '../../auth/useLoginForm';

const makeClient = (response: { error: { message: string } | null }) => ({
  auth: {
    signInWithPassword: vi.fn().mockResolvedValue(response),
  },
});

describe('useLoginForm', () => {
  let onSuccess: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSuccess = vi.fn();
  });

  it('blocks submit when email is empty', async () => {
    const client = makeClient({ error: null });
    const { result } = renderHook(() => useLoginForm(client, onSuccess));

    await act(async () => {
      result.current.setPassword('secret123');
      await result.current.submit();
    });

    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('blocks submit when password is empty', async () => {
    const client = makeClient({ error: null });
    const { result } = renderHook(() => useLoginForm(client, onSuccess));

    await act(async () => {
      result.current.setEmail('user@aaram.space');
      await result.current.submit();
    });

    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('calls onSuccess after successful login', async () => {
    const client = makeClient({ error: null });
    const { result } = renderHook(() => useLoginForm(client, onSuccess));

    // State setters must flush in a separate act so submit() closes over updated values
    act(() => {
      result.current.setEmail('user@aaram.space');
      result.current.setPassword('secret123');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@aaram.space',
      password: 'secret123',
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('surfaces auth error in error state', async () => {
    const client = makeClient({ error: { message: 'Invalid credentials' } });
    const { result } = renderHook(() => useLoginForm(client, onSuccess));

    act(() => {
      result.current.setEmail('user@aaram.space');
      result.current.setPassword('wrongpass');
    });
    await act(async () => { await result.current.submit(); });

    expect(result.current.error).toBe('Invalid credentials');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('trims whitespace from email before sending', async () => {
    const client = makeClient({ error: null });
    const { result } = renderHook(() => useLoginForm(client, onSuccess));

    act(() => {
      result.current.setEmail('  user@aaram.space  ');
      result.current.setPassword('secret123');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'user@aaram.space',
      password: 'secret123',
    });
  });

  it('resets loading to false after success', async () => {
    const client = makeClient({ error: null });
    const { result } = renderHook(() => useLoginForm(client, onSuccess));

    act(() => {
      result.current.setEmail('user@aaram.space');
      result.current.setPassword('secret123');
    });
    await act(async () => { await result.current.submit(); });

    expect(result.current.loading).toBe(false);
  });

  it('resets loading to false after error', async () => {
    const client = makeClient({ error: { message: 'Bad credentials' } });
    const { result } = renderHook(() => useLoginForm(client, onSuccess));

    act(() => {
      result.current.setEmail('user@aaram.space');
      result.current.setPassword('wrongpass');
    });
    await act(async () => { await result.current.submit(); });

    expect(result.current.loading).toBe(false);
  });
});
