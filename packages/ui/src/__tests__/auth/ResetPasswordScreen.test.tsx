/**
 * FUNCTIONAL TESTS — Phase 1.5: ResetPasswordScreen component (web variant)
 *
 * What's tested:
 *   - Renders new password and confirm password fields
 *   - Shows error when passwords don't match
 *   - Shows error when password is too short
 *   - Shows success state after successful reset
 *   - onSuccess is called after 2500ms delay (tested with fake setTimeout only)
 *   - Shows Supabase error on failure
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResetPasswordScreen } from '../../auth/ResetPasswordScreen';

const makeClient = (response: { error: { message: string } | null } = { error: null }) => ({
  auth: {
    updateUser: vi.fn().mockResolvedValue(response),
  },
});

describe('ResetPasswordScreen', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders new password and confirm password inputs', () => {
    render(
      <ResetPasswordScreen
        supabase={makeClient()}
        onSuccess={vi.fn()}
        onNavigateHome={vi.fn()}
      />,
    );
    expect(screen.getByPlaceholderText('Min 8 characters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Repeat password')).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(
      <ResetPasswordScreen
        supabase={makeClient()}
        onSuccess={vi.fn()}
        onNavigateHome={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Min 8 characters'), 'NewPass1!');
    await user.type(screen.getByPlaceholderText('Repeat password'), 'DifferentPass!');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() =>
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument(),
    );
  });

  it('shows error when password is shorter than 8 characters', async () => {
    const user = userEvent.setup();
    render(
      <ResetPasswordScreen
        supabase={makeClient()}
        onSuccess={vi.fn()}
        onNavigateHome={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Min 8 characters'), 'short');
    await user.type(screen.getByPlaceholderText('Repeat password'), 'short');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() =>
      expect(screen.getByText(/8 characters/i)).toBeInTheDocument(),
    );
  });

  it('shows success message after successful reset', async () => {
    const user = userEvent.setup();
    render(
      <ResetPasswordScreen
        supabase={makeClient({ error: null })}
        onSuccess={vi.fn()}
        onNavigateHome={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Min 8 characters'), 'NewPass1!');
    await user.type(screen.getByPlaceholderText('Repeat password'), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() =>
      expect(screen.getByText(/password updated/i)).toBeInTheDocument(),
    );
  });

  it('calls onSuccess after the success-state delay', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();

    render(
      <ResetPasswordScreen
        supabase={makeClient({ error: null })}
        onSuccess={onSuccess}
        onNavigateHome={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Min 8 characters'), 'NewPass1!');
    await user.type(screen.getByPlaceholderText('Repeat password'), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    // Success state is shown immediately
    await waitFor(() => screen.getByText(/password updated/i));

    // onSuccess fires after the 2500ms auto-redirect delay
    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1), { timeout: 4000 });
  }, 8000);

  it('shows Supabase error on failure', async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    render(
      <ResetPasswordScreen
        supabase={makeClient({ error: { message: 'Reset token expired' } })}
        onSuccess={onSuccess}
        onNavigateHome={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText('Min 8 characters'), 'NewPass1!');
    await user.type(screen.getByPlaceholderText('Repeat password'), 'NewPass1!');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() =>
      expect(screen.getByText('Reset token expired')).toBeInTheDocument(),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });
});
