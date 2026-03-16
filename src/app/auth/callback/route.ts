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
    
    const { data: { session } } = await supabase.auth.exchangeCodeForSession(code);
    
    const email = session?.user?.email?.toLowerCase() ?? '';
    const redirect = requestUrl.searchParams.get('redirect') || '/tenant';
    
    // Standard login has no additional check.
    // Admin checking is done at the Layout level using the dynamic admins table.
    return NextResponse.redirect(new URL(redirect, requestUrl.origin));
  }

  // No code — send back to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
