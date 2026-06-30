'use client';

import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { LoginScreen } from '@aaram/ui';

export default function LoginPage() {
  const router = useRouter();

  const handleSuccess = async () => {
    // Fetch role and route accordingly
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (token) {
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      const { role } = await res.json();
      if (role === 'admin') { router.push('/admin'); return; }
      if (role === 'tenant') { router.push('/tenant'); return; }
    }
    router.push('/guest');
  };

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : typeof window !== 'undefined' ? window.location.origin : '');

  return (
    <LoginScreen
      supabase={supabase}
      onSuccess={handleSuccess}
      onNavigateSignup={() => router.push('/signup')}
      onNavigateHome={() => router.push('/')}
      forgotPasswordRedirectTo={`${siteUrl}/auth/callback?next=/reset-password`}
    />
  );
}
