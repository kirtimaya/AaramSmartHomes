/**
 * FUNCTIONAL TESTS — Phase 1.5: useSignupForm hook
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSignupForm } from '../../auth/useSignupForm';

const makeClient = (response: { error: { message: string } | null }) => ({
  auth: {
    signUp: vi.fn().mockResolvedValue(response),
  },
});

describe('useSignupForm', () => {
  let onSuccess: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSuccess = vi.fn();
  });

  it('blocks submit when name is empty', async () => {
    const client = makeClient({ error: null });
    const { result } = renderHook(() => useSignupForm(client, onSuccess));

    act(() => {
      result.current.setEmail('user@aaram.space');
      result.current.setPassword('secure123');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.signUp).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it('blocks submit when email is empty', async () => {
    const client = makeClient({ error: null });
    const { result } = renderHook(() => useSignupForm(client, onSuccess));

    act(() => {
      result.current.setName('Alice');
      result.current.setPassword('secure123');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.signUp).not.toHaveBeenCalled();
  });

  it('blocks submit when password is empty', async () => {
    const client = makeClient({ error: null });
    const { result } = renderHook(() => useSignupForm(client, onSuccess));

    act(() => {
      result.current.setName('Alice');
      result.current.setEmail('user@aaram.space');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.signUp).not.toHaveBeenCalled();
  });

  it('blocks submit when password is shorter than 6 characters', async () => {
    const client = makeClient({ error: null });
    const { result } = renderHook(() => useSignupForm(client, onSuccess));

    act(() => {
      result.current.setName('Alice');
      result.current.setEmail('user@aaram.space');
      result.current.setPassword('12345');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.signUp).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/6 characters/i);
  });

  it('calls onSuccess after successful signup', async () => {
    const client = makeClient({ error: null });
    const { result } = renderHook(() => useSignupForm(client, onSuccess));

    act(() => {
      result.current.setName('Alice Resident');
      result.current.setEmail('alice@aaram.space');
      result.current.setPassword('secure123');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'alice@aaram.space',
      password: 'secure123',
      options: { data: { full_name: 'Alice Resident' } },
    });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('passes emailRedirectTo when provided', async () => {
    const client = makeClient({ error: null });
    const redirectTo = 'https://aaram.space/auth/callback';
    const { result } = renderHook(() => useSignupForm(client, onSuccess, redirectTo));

    act(() => {
      result.current.setName('Bob');
      result.current.setEmail('bob@aaram.space');
      result.current.setPassword('secure456');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.signUp).toHaveBeenCalledWith({
      email: 'bob@aaram.space',
      password: 'secure456',
      options: { data: { full_name: 'Bob' }, emailRedirectTo: redirectTo },
    });
  });

  it('surfaces Supabase error in error state', async () => {
    const client = makeClient({ error: { message: 'Email already registered' } });
    const { result } = renderHook(() => useSignupForm(client, onSuccess));

    act(() => {
      result.current.setName('Alice');
      result.current.setEmail('dup@aaram.space');
      result.current.setPassword('secure123');
    });
    await act(async () => { await result.current.submit(); });

    expect(result.current.error).toBe('Email already registered');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('trims whitespace from name and email', async () => {
    const client = makeClient({ error: null });
    const { result } = renderHook(() => useSignupForm(client, onSuccess));

    act(() => {
      result.current.setName('  Alice  ');
      result.current.setEmail('  alice@aaram.space  ');
      result.current.setPassword('secure123');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'alice@aaram.space',
        options: expect.objectContaining({ data: { full_name: 'Alice' } }),
      }),
    );
  });
});
