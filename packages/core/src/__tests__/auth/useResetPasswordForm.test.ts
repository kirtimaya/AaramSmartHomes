/**
 * FUNCTIONAL TESTS — Phase 1.5: useResetPasswordForm + useForgotPasswordForm hooks
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useResetPasswordForm, useForgotPasswordForm } from '../../auth/useResetPasswordForm';

// ── useResetPasswordForm ──────────────────────────────────────────────────────

const makeResetClient = (response: { error: { message: string } | null }) => ({
  auth: { updateUser: vi.fn().mockResolvedValue(response) },
});

describe('useResetPasswordForm', () => {
  let onSuccess: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSuccess = vi.fn();
  });

  it('blocks submit when passwords do not match', async () => {
    const client = makeResetClient({ error: null });
    const { result } = renderHook(() => useResetPasswordForm(client, onSuccess));

    act(() => {
      result.current.setPassword('NewPass1!');
      result.current.setConfirm('DifferentPass!');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.updateUser).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/do not match/i);
  });

  it('blocks submit when password is shorter than 8 characters', async () => {
    const client = makeResetClient({ error: null });
    const { result } = renderHook(() => useResetPasswordForm(client, onSuccess));

    act(() => {
      result.current.setPassword('short');
      result.current.setConfirm('short');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.updateUser).not.toHaveBeenCalled();
    expect(result.current.error).toMatch(/8 characters/i);
  });

  it('calls onSuccess after successful password reset', async () => {
    const client = makeResetClient({ error: null });
    const { result } = renderHook(() => useResetPasswordForm(client, onSuccess));

    act(() => {
      result.current.setPassword('NewSecure1!');
      result.current.setConfirm('NewSecure1!');
    });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.updateUser).toHaveBeenCalledWith({ password: 'NewSecure1!' });
    expect(onSuccess).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it('surfaces Supabase error in error state', async () => {
    const client = makeResetClient({ error: { message: 'Token expired' } });
    const { result } = renderHook(() => useResetPasswordForm(client, onSuccess));

    act(() => {
      result.current.setPassword('NewSecure1!');
      result.current.setConfirm('NewSecure1!');
    });
    await act(async () => { await result.current.submit(); });

    expect(result.current.error).toBe('Token expired');
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('resets loading to false after success', async () => {
    const client = makeResetClient({ error: null });
    const { result } = renderHook(() => useResetPasswordForm(client, onSuccess));

    act(() => {
      result.current.setPassword('NewSecure1!');
      result.current.setConfirm('NewSecure1!');
    });
    await act(async () => { await result.current.submit(); });

    expect(result.current.loading).toBe(false);
  });
});

// ── useForgotPasswordForm ─────────────────────────────────────────────────────

const makeForgotClient = (response: { error: { message: string } | null }) => ({
  auth: { resetPasswordForEmail: vi.fn().mockResolvedValue(response) },
});

describe('useForgotPasswordForm', () => {
  it('blocks submit when email is empty', async () => {
    const client = makeForgotClient({ error: null });
    const { result } = renderHook(() => useForgotPasswordForm(client));

    await act(async () => { await result.current.submit(); });

    expect(client.auth.resetPasswordForEmail).not.toHaveBeenCalled();
    expect(result.current.error).toBeTruthy();
  });

  it('sets sent=true after successful email dispatch', async () => {
    const client = makeForgotClient({ error: null });
    const { result } = renderHook(() => useForgotPasswordForm(client));

    act(() => { result.current.setEmail('user@aaram.space'); });
    await act(async () => { await result.current.submit(); });

    expect(result.current.sent).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('passes trimmed email to resetPasswordForEmail', async () => {
    const client = makeForgotClient({ error: null });
    const { result } = renderHook(() => useForgotPasswordForm(client));

    act(() => { result.current.setEmail('  user@aaram.space  '); });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@aaram.space',
      expect.any(Object),
    );
  });

  it('passes redirectTo when provided', async () => {
    const client = makeForgotClient({ error: null });
    const redirectTo = 'https://aaram.space/reset';
    const { result } = renderHook(() => useForgotPasswordForm(client, redirectTo));

    act(() => { result.current.setEmail('user@aaram.space'); });
    await act(async () => { await result.current.submit(); });

    expect(client.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'user@aaram.space',
      { redirectTo },
    );
  });

  it('surfaces Supabase error and keeps sent=false', async () => {
    const client = makeForgotClient({ error: { message: 'User not found' } });
    const { result } = renderHook(() => useForgotPasswordForm(client));

    act(() => { result.current.setEmail('ghost@aaram.space'); });
    await act(async () => { await result.current.submit(); });

    expect(result.current.error).toBe('User not found');
    expect(result.current.sent).toBe(false);
  });
});
