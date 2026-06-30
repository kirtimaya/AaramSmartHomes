'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { SignupScreen } from '@aaram/ui';

function SignupContent() {
  const router = useRouter();

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL
      ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
      : typeof window !== 'undefined' ? window.location.origin : '');

  return (
    <SignupScreen
      supabase={supabase}
      onNavigateLogin={() => router.push('/login')}
      onNavigateHome={() => router.push('/')}
      emailRedirectTo={`${siteUrl}/auth/callback`}
    />
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
      </div>
    }>
      <SignupContent />
    </Suspense>
  );
}
