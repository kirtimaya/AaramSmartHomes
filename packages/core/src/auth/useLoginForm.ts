import { useState } from 'react';

export type LoginAuthClient = {
  auth: {
    signInWithPassword: (opts: {
      email: string;
      password: string;
    }) => PromiseLike<{ error: { message: string } | null }>;
  };
};

export function useLoginForm(client: LoginAuthClient, onSuccess: () => void) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await client.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      onSuccess();
    }
  };

  return { email, setEmail, password, setPassword, loading, error, submit };
}
