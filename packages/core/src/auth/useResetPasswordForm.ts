import { useState } from 'react';

export type ResetPasswordAuthClient = {
  auth: {
    updateUser: (opts: { password: string }) => PromiseLike<{ error: { message: string } | null }>;
  };
};

export type ForgotPasswordAuthClient = {
  auth: {
    resetPasswordForEmail: (
      email: string,
      opts?: { redirectTo?: string },
    ) => PromiseLike<{ error: { message: string } | null }>;
  };
};

export function useResetPasswordForm(client: ResetPasswordAuthClient, onSuccess: () => void) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await client.auth.updateUser({ password });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      onSuccess();
    }
  };

  return { password, setPassword, confirm, setConfirm, loading, error, submit };
}

export function useForgotPasswordForm(client: ForgotPasswordAuthClient, redirectTo?: string) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await client.auth.resetPasswordForEmail(email.trim(), {
      ...(redirectTo ? { redirectTo } : {}),
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  };

  return { email, setEmail, loading, error, sent, submit };
}
