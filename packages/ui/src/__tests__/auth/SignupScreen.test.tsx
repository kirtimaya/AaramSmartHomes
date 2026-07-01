/**
 * FUNCTIONAL TESTS — Phase 1.5: SignupScreen component (web variant)
 *
 * What's tested:
 *   - Renders name, email, password fields
 *   - Shows success state after successful signup
 *   - Shows validation error on empty form submit
 *   - Shows Supabase error on failure
 *   - Calls onNavigateLogin when login link is clicked
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SignupScreen } from '../../auth/SignupScreen';

const makeClient = (response = { error: null }) => ({
  auth: {
    signUp: vi.fn().mockResolvedValue(response),
  },
});

describe('SignupScreen', () => {
  let onNavigateLogin: ReturnType<typeof vi.fn>;
  let onNavigateHome: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onNavigateLogin = vi.fn();
    onNavigateHome = vi.fn();
  });

  it('renders name, email, and password inputs', () => {
    render(
      <SignupScreen
        supabase={makeClient()}
        onNavigateLogin={onNavigateLogin}
        onNavigateHome={onNavigateHome}
      />,
    );
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('identity@aaram.space')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Minimum 6 characters')).toBeInTheDocument();
  });

  it('shows success state after successful signup', async () => {
    const user = userEvent.setup();
    const client = makeClient({ error: null });
    render(
      <SignupScreen
        supabase={client}
        onNavigateLogin={onNavigateLogin}
        onNavigateHome={onNavigateHome}
      />,
    );

    await user.type(screen.getByPlaceholderText('John Doe'), 'Alice');
    await user.type(screen.getByPlaceholderText('identity@aaram.space'), 'alice@aaram.space');
    await user.type(screen.getByPlaceholderText('Minimum 6 characters'), 'secure123');
    await user.click(screen.getByRole('button', { name: /initialize profile/i }));

    await waitFor(() => {
      expect(screen.getByText(/request received/i)).toBeInTheDocument();
    });
  });

  it('shows validation error on empty submit', async () => {
    const client = makeClient();
    const { container } = render(
      <SignupScreen
        supabase={client}
        onNavigateLogin={onNavigateLogin}
        onNavigateHome={onNavigateHome}
      />,
    );

    // Fire submit directly on the form to bypass browser `required` validation
    fireEvent.submit(container.querySelector('form')!);

    await waitFor(() => {
      expect(screen.getByText(/please fill in all fields/i)).toBeInTheDocument();
    });
    expect(client.auth.signUp).not.toHaveBeenCalled();
  });

  it('shows Supabase error on failure', async () => {
    const user = userEvent.setup();
    const client = makeClient({ error: { message: 'Email already taken' } });
    render(
      <SignupScreen
        supabase={client}
        onNavigateLogin={onNavigateLogin}
        onNavigateHome={onNavigateHome}
      />,
    );

    await user.type(screen.getByPlaceholderText('John Doe'), 'Bob');
    await user.type(screen.getByPlaceholderText('identity@aaram.space'), 'dup@aaram.space');
    await user.type(screen.getByPlaceholderText('Minimum 6 characters'), 'secure123');
    await user.click(screen.getByRole('button', { name: /initialize profile/i }));

    await waitFor(() =>
      expect(screen.getByText('Email already taken')).toBeInTheDocument(),
    );
  });

  it('calls onNavigateLogin when login link is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SignupScreen
        supabase={makeClient()}
        onNavigateLogin={onNavigateLogin}
        onNavigateHome={onNavigateHome}
      />,
    );

    await user.click(screen.getByRole('button', { name: /establish link/i }));
    expect(onNavigateLogin).toHaveBeenCalledTimes(1);
  });
});
