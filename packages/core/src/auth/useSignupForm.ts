import { useState } from 'react';

type AuthClient = {
  auth: {
    signUp: (opts: {
      email: string;
      password: string;
      options?: { data?: Record<string, string>; emailRedirectTo?: string };
    }) => PromiseLike<{ error: { message: string } | null }>;
  };
};

export function useSignupForm(
  client: AuthClient,
  onSuccess: () => void,
  emailRedirectTo?: string,
) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await client.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: name.trim() },
        ...(emailRedirectTo ? { emailRedirectTo } : {}),
      },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      onSuccess();
    }
  };

  return { name, setName, email, setEmail, password, setPassword, loading, error, submit };
}
