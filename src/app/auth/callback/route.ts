import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
    }

    const rawRedirect = requestUrl.searchParams.get('redirect') || '/tenant';
    // Only allow relative paths; block open redirects like //evil.com or https://evil.com
    const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/tenant';

    return NextResponse.redirect(new URL(redirect, requestUrl.origin));
  }

  // No code — send back to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
