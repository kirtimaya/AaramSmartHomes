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
    
    const email = session?.user?.email ?? '';
    if (email === 'kirtimayaswain@gmail.com' || email.includes('admin')) {
      return NextResponse.redirect(new URL('/admin', requestUrl.origin));
    }
    return NextResponse.redirect(new URL('/tenant', requestUrl.origin));
  }

  // No code — send back to login
  return NextResponse.redirect(new URL('/login', requestUrl.origin));
}
