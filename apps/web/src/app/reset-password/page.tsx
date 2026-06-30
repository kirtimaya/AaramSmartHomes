'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { ResetPasswordScreen } from '@aaram/ui';

export default function ResetPasswordPage() {
  const [sessionReady, setSessionReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setSessionReady(true);
      } else {
        router.replace('/login');
      }
    });
  }, [router]);

  if (!sessionReady) return null;

  return (
    <ResetPasswordScreen
      supabase={supabase}
      onSuccess={() => router.push('/login')}
      onNavigateHome={() => router.push('/')}
    />
  );
}
