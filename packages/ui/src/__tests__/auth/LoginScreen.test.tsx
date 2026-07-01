/**
 * FUNCTIONAL TESTS — Phase 1.5: LoginScreen component (web variant)
 *
 * What's tested:
 *   - Renders the form with email and password fields
 *   - Submit calls signInWithPassword with entered credentials
 *   - Displays validation error when fields are empty
 *   - Displays auth error returned from the client
 *   - Forgot password link opens the forgot-password overlay
 *   - Navigate-to-signup callback fires
 *
 * Note: HTML5 `required` attributes block form submission in jsdom, so empty-form
 * tests fire `submit` on the form element directly to test hook-level validation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginScreen } from '../../auth/LoginScreen';

const makeClient = (signInResponse = { error: null }) => ({
  auth: {
    signInWithPassword: vi.fn().mockResolvedValue(signInResponse),
    resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
    signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
  },
});

describe('LoginScreen', () => {
  let onSuccess: ReturnType<typeof vi.fn>;
  let onNavigateSignup: ReturnType<typeof vi.fn>;
  let onNavigateHome: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onSuccess = vi.fn();
    onNavigateSignup = vi.fn();
    onNavigateHome = vi.fn();
  });

  it('renders email and password inputs', () => {
    const client = makeClient();
    render(
      <LoginScreen
        supabase={client}
        onSuccess={onSuccess}
        onNavigateSignup={onNavigateSignup}
        onNavigateHome={onNavigateHome}
      />,
    );
    expect(screen.getByPlaceholderText('identity@aaram.space')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
  });

  it('shows hook validation error when submitting empty form', async () => {
    const client = makeClient({ error: null });
    const { container } = render(
      <LoginScreen
        supabase={client}
        onSuccess={onSuccess}
        onNavigateSignup={onNavigateSignup}
        onNavigateHome={onNavigateHome}
      />,
    );

    // Fire submit directly on the form to bypass browser `required` validation,
    // so we can test the hook-level validation message.
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText(/please enter your email and password/i)).toBeInTheDocument();
    });
    expect(client.auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('calls signInWithPassword with entered credentials', async () => {
    const user = userEvent.setup();
    const client = makeClient({ error: null });
    render(
      <LoginScreen
        supabase={client}
        onSuccess={onSuccess}
        onNavigateSignup={onNavigateSignup}
        onNavigateHome={onNavigateHome}
      />,
    );

    await user.type(screen.getByPlaceholderText('identity@aaram.space'), 'user@aaram.space');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret123');
    await user.click(screen.getByRole('button', { name: /establish connection/i }));

    await waitFor(() => {
      expect(client.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@aaram.space',
        password: 'secret123',
      });
    });
  });

  it('calls onSuccess after successful login', async () => {
    const user = userEvent.setup();
    const client = makeClient({ error: null });
    render(
      <LoginScreen
        supabase={client}
        onSuccess={onSuccess}
        onNavigateSignup={onNavigateSignup}
        onNavigateHome={onNavigateHome}
      />,
    );

    await user.type(screen.getByPlaceholderText('identity@aaram.space'), 'user@aaram.space');
    await user.type(screen.getByPlaceholderText('••••••••'), 'secret123');
    await user.click(screen.getByRole('button', { name: /establish connection/i }));

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
  });

  it('displays auth error from Supabase', async () => {
    const user = userEvent.setup();
    const client = makeClient({ error: { message: 'Invalid login credentials' } });
    render(
      <LoginScreen
        supabase={client}
        onSuccess={onSuccess}
        onNavigateSignup={onNavigateSignup}
        onNavigateHome={onNavigateHome}
      />,
    );

    await user.type(screen.getByPlaceholderText('identity@aaram.space'), 'user@aaram.space');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /establish connection/i }));

    await waitFor(() =>
      expect(screen.getByText('Invalid login credentials')).toBeInTheDocument(),
    );
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('opens forgot password overlay when Forgot? is clicked', async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(
      <LoginScreen
        supabase={client}
        onSuccess={onSuccess}
        onNavigateSignup={onNavigateSignup}
        onNavigateHome={onNavigateHome}
      />,
    );

    await user.click(screen.getByRole('button', { name: /forgot/i }));
    expect(screen.getByText(/reset password/i)).toBeInTheDocument();
  });

  it('calls onNavigateSignup when signup link is clicked', async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(
      <LoginScreen
        supabase={client}
        onSuccess={onSuccess}
        onNavigateSignup={onNavigateSignup}
        onNavigateHome={onNavigateHome}
      />,
    );

    await user.click(screen.getByRole('button', { name: /apply for entry/i }));
    expect(onNavigateSignup).toHaveBeenCalledTimes(1);
  });

  it('calls onNavigateHome when Aaram logo button is clicked', async () => {
    const user = userEvent.setup();
    const client = makeClient();
    render(
      <LoginScreen
        supabase={client}
        onSuccess={onSuccess}
        onNavigateSignup={onNavigateSignup}
        onNavigateHome={onNavigateHome}
      />,
    );

    await user.click(screen.getByRole('button', { name: /aaram/i }));
    expect(onNavigateHome).toHaveBeenCalledTimes(1);
  });
});
